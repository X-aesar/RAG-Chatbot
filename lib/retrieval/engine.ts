import { RetrievalQuery, RetrievalResult, RetrievedChunk, RetrievalStrategy } from '../core/types';
import { generateEmbedding } from '../embeddings';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });
const sql = neon(process.env.NEON_DATABASE_URL!);

export class AdvancedRetrievalEngine {
  private cache: Map<string, { result: RetrievalResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }

    let result: RetrievalResult;

    switch (query.strategy) {
      case 'semantic':
        result = await this.semanticSearch(query);
        break;
      case 'hybrid':
        result = await this.hybridSearch(query);
        break;
      case 'keyword':
        result = await this.keywordSearch(query);
        break;
      case 'adaptive':
        result = await this.adaptiveSearch(query);
        break;
      default:
        result = await this.semanticSearch(query);
    }

    result.executionTime = Date.now() - startTime;
    
    // Cache the result
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  private async semanticSearch(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query.query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build SQL query with filters
    let sqlQuery = `
      SELECT id, content, embedding, title, file_name, user_id, chunk_index,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM documents
      WHERE user_id = ${query.userId}
    `;

    // Add filters
    if (query.filters?.fileType?.length) {
      const fileTypes = query.filters.fileType.map(ft => `'${ft}'`).join(',');
      sqlQuery += ` AND file_type IN (${fileTypes})`;
    }

    if (query.filters?.dateRange) {
      sqlQuery += ` AND created_at >= '${query.filters.dateRange.start.toISOString()}'`;
      sqlQuery += ` AND created_at <= '${query.filters.dateRange.end.toISOString()}'`;
    }

    // Add similarity threshold
    const threshold = query.threshold || 0.5;
    sqlQuery += ` AND 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}`;

    // Order and limit
    sqlQuery += ` ORDER BY similarity DESC LIMIT ${query.limit}`;

    const results = await sql.query(sqlQuery);

    const chunks: RetrievedChunk[] = results.map((row: any) => ({
      id: row.id.toString(),
      documentId: row.id.toString(),
      content: row.content,
      embedding: row.embedding,
      chunkIndex: row.chunk_index,
      metadata: {
        startIndex: 0,
        endIndex: row.content.length,
        title: row.title,
        fileName: row.file_name
      },
      score: parseFloat(row.similarity),
      matchType: 'semantic'
    }));

    return {
      chunks,
      queryEmbedding,
      strategy: 'semantic',
      totalResults: chunks.length,
      executionTime: Date.now() - startTime,
      metadata: {
        searchTime: Date.now() - startTime,
        filtersApplied: !!query.filters,
        queryRewrite: undefined,
        expansionTerms: []
      }
    };
  }

  private async keywordSearch(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    // Extract keywords from query
    const keywords = this.extractKeywords(query.query);
    
    // Build full-text search query
    let sqlQuery = `
      SELECT id, content, title, file_name, user_id, chunk_index,
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as rank
      FROM documents
      WHERE user_id = ${query.userId}
      AND to_tsvector('english', content) @@ plainto_tsquery('english', $1)
    `;

    // Add filters similar to semantic search
    if (query.filters?.fileType?.length) {
      const fileTypes = query.filters.fileType.map(ft => `'${ft}'`).join(',');
      sqlQuery += ` AND file_type IN (${fileTypes})`;
    }

    sqlQuery += ` ORDER BY rank DESC LIMIT ${query.limit}`;

    const keywordQuery = keywords.join(' ');
    const results = await sql.query(sqlQuery, [keywordQuery]);

    // Generate dummy embedding for consistency
    const queryEmbedding = await generateEmbedding(query.query);

    const chunks: RetrievedChunk[] = results.map((row: any) => ({
      id: row.id.toString(),
      documentId: row.id.toString(),
      content: row.content,
      embedding: [], // No embedding for keyword search
      chunkIndex: row.chunk_index,
      metadata: {
        startIndex: 0,
        endIndex: row.content.length,
        title: row.title,
        fileName: row.file_name
      },
      score: parseFloat(row.rank),
      matchType: 'keyword'
    }));

    return {
      chunks,
      queryEmbedding,
      strategy: 'keyword',
      totalResults: chunks.length,
      executionTime: Date.now() - startTime,
      metadata: {
        searchTime: Date.now() - startTime,
        filtersApplied: !!query.filters,
        queryRewrite: undefined,
        expansionTerms: keywords
      }
    };
  }

  private async hybridSearch(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    // Perform both semantic and keyword searches
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch({ ...query, limit: Math.ceil(query.limit * 1.5) }),
      this.keywordSearch({ ...query, limit: Math.ceil(query.limit * 1.5) })
    ]);

    // Combine and re-rank results
    const combinedResults = this.combineResults(semanticResults.chunks, keywordResults.chunks);
    
    // Limit to requested number
    const finalResults = combinedResults.slice(0, query.limit);

    return {
      chunks: finalResults,
      queryEmbedding: semanticResults.queryEmbedding,
      strategy: 'hybrid',
      totalResults: finalResults.length,
      executionTime: Date.now() - startTime,
      metadata: {
        searchTime: Date.now() - startTime,
        reRankingTime: Date.now() - startTime,
        filtersApplied: !!query.filters,
        queryRewrite: undefined,
        expansionTerms: keywordResults.metadata.expansionTerms
      }
    };
  }

  private async adaptiveSearch(query: RetrievalQuery): Promise<RetrievalResult> {
    // Analyze query type to choose best strategy
    const queryType = this.analyzeQueryType(query.query);
    
    switch (queryType) {
      case 'factual':
        return this.hybridSearch(query);
      case 'conceptual':
        return this.semanticSearch(query);
      case 'navigational':
        return this.keywordSearch(query);
      default:
        return this.hybridSearch(query);
    }
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'what', 'how', 'when', 'where', 'why']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private combineResults(semanticChunks: RetrievedChunk[], keywordChunks: RetrievedChunk[]): RetrievedChunk[] {
    const combined = new Map<string, RetrievedChunk>();
    
    // Add semantic results
    semanticChunks.forEach(chunk => {
      combined.set(chunk.id, { ...chunk, score: chunk.score * 0.6 }); // Weight semantic results
    });
    
    // Add keyword results and merge if needed
    keywordChunks.forEach(chunk => {
      const existing = combined.get(chunk.id);
      if (existing) {
        // Combine scores
        existing.score = Math.max(existing.score, chunk.score * 0.4);
        existing.matchType = 'hybrid';
      } else {
        combined.set(chunk.id, { ...chunk, score: chunk.score * 0.4 });
      }
    });
    
    // Sort by combined score
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  private analyzeQueryType(query: string): 'factual' | 'conceptual' | 'navigational' {
    const lowerQuery = query.toLowerCase();
    
    // Factual queries often ask for specific information
    if (lowerQuery.includes('what is') || lowerQuery.includes('how many') || lowerQuery.includes('when did') || lowerQuery.includes('who is')) {
      return 'factual';
    }
    
    // Conceptual queries ask for explanations or comparisons
    if (lowerQuery.includes('explain') || lowerQuery.includes('compare') || lowerQuery.includes('difference') || lowerQuery.includes('relationship')) {
      return 'conceptual';
    }
    
    // Navigational queries look for specific documents or sections
    if (lowerQuery.includes('find') || lowerQuery.includes('locate') || lowerQuery.includes('show me') || lowerQuery.includes('where is')) {
      return 'navigational';
    }
    
    // Default to factual
    return 'factual';
  }

  private generateCacheKey(query: RetrievalQuery): string {
    return `${query.query}-${query.userId}-${query.strategy}-${JSON.stringify(query.filters)}-${query.limit}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    // In a real implementation, track hits and misses
    return {
      size: this.cache.size,
      hitRate: 0.7 // Placeholder
    };
  }
}

export const retrievalEngine = new AdvancedRetrievalEngine();