import { Document, DocumentChunk, DocumentMetadata, ChunkMetadata } from '../core/types';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { pdfProcessor } from '../pdf-processor';

export class DocumentProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""],
    });
  }

  async processDocument(
    buffer: Buffer,
    fileName: string,
    userId: string,
    fileType: string
  ): Promise<Document> {
    // Extract metadata
    const metadata = await this.extractMetadata(buffer, fileName, userId, fileType);
    
    // Extract content
    const content = await this.extractContent(buffer, fileType);
    
    // Update metadata with content stats
    metadata.wordCount = content.split(/\s+/).length;
    
    // Create document object
    const document: Document = {
      id: this.generateDocumentId(),
      content,
      metadata,
    };

    // Generate chunks
    document.chunks = await this.createChunks(document);

    return document;
  }

  private async extractMetadata(
    buffer: Buffer,
    fileName: string,
    userId: string,
    fileType: string
  ): Promise<DocumentMetadata> {
    const baseMetadata: DocumentMetadata = {
      fileName,
      fileSize: buffer.length,
      fileType,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceType: this.mapFileType(fileType),
    };

    // Extract PDF-specific metadata
    if (fileType === 'pdf') {
      try {
        const pdfMetadata = await pdfProcessor.extractMetadata(buffer);
        return {
          ...baseMetadata,
          title: pdfMetadata.title || fileName.replace(/\.[^/.]+$/, ""),
          pageCount: pdfMetadata.pageCount,
          language: 'en', // Default to English
        };
      } catch (error) {
        console.warn('Failed to extract PDF metadata:', error);
        return baseMetadata;
      }
    }

    return {
      ...baseMetadata,
      title: fileName.replace(/\.[^/.]+$/, ""),
      language: 'en',
    };
  }

  private async extractContent(buffer: Buffer, fileType: string): Promise<string> {
    switch (fileType) {
      case 'pdf':
        return await pdfProcessor.extractText(buffer);
      
      case 'txt':
        return buffer.toString('utf-8');
      
      case 'md':
        return this.extractMarkdownContent(buffer.toString('utf-8'));
      
      case 'json':
        return this.extractJsonContent(buffer.toString('utf-8'));
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private extractMarkdownContent(rawContent: string): string {
    // Remove markdown syntax, keep text content
    return rawContent
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
      .replace(/^\s*[-*+]\s+/gm, '') // List items
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
      .replace(/^\s*>\s+/gm, '') // Blockquotes
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines
      .trim();
  }

  private extractJsonContent(rawContent: string): string {
    try {
      const parsed = JSON.parse(rawContent);
      return this.extractTextFromJson(parsed);
    } catch (error) {
      console.warn('Failed to parse JSON content:', error);
      return rawContent;
    }
  }

  private extractTextFromJson(obj: any): string {
    if (typeof obj === 'string') {
      return obj;
    } else if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj.toString();
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.extractTextFromJson(item)).join(' ');
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj)
        .map(value => this.extractTextFromJson(value))
        .join(' ');
    }
    return '';
  }

  private async createChunks(document: Document): Promise<DocumentChunk[]> {
    const chunks = await this.textSplitter.splitText(document.content);
    
    return chunks.map((chunk, index) => ({
      id: this.generateChunkId(document.id, index),
      documentId: document.id,
      content: chunk,
      embedding: [], // Will be populated later
      chunkIndex: index,
      metadata: {
        startIndex: document.content.indexOf(chunk),
        endIndex: document.content.indexOf(chunk) + chunk.length,
        page: document.metadata.pageCount ? Math.floor((index / chunks.length) * document.metadata.pageCount) + 1 : undefined,
        semanticCoherence: this.calculateSemanticCoherence(chunk),
        importance: this.calculateImportance(chunk),
      },
    }));
  }

  private calculateSemanticCoherence(chunk: string): number {
    // Simple heuristic for semantic coherence
    const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 1) return 1.0;
    
    // Check for topic consistency (simplified)
    const words = chunk.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    
    // Higher coherence for moderate repetition and complete sentences
    return Math.max(0, Math.min(1, 1 - repetitionRatio + (sentences.length / 10)));
  }

  private calculateImportance(chunk: string): number {
    // Simple heuristic for importance based on content characteristics
    let score = 0.5; // Base score
    
    const lowerChunk = chunk.toLowerCase();
    
    // Boost for containing numbers, dates, or specific terms
    if (/\d+/.test(chunk)) score += 0.1; // Contains numbers
    if (/\b(important|critical|significant|key|essential|primary|major)\b/.test(lowerChunk)) {
      score += 0.2; // Contains importance indicators
    }
    
    // Boost for proper length
    if (chunk.length > 200 && chunk.length < 800) score += 0.1;
    
    // Boost for sentence structure
    const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 5) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private mapFileType(fileType: string): DocumentMetadata['sourceType'] {
    switch (fileType) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'txt': return 'txt';
      case 'md': return 'md';
      case 'html': return 'html';
      case 'json': return 'json';
      default: return 'txt';
    }
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChunkId(documentId: string, chunkIndex: number): string {
    return `${documentId}_chunk_${chunkIndex}`;
  }

  async processBatch(
    files: Array<{ buffer: Buffer; fileName: string; fileType: string }>,
    userId: string
  ): Promise<Document[]> {
    const documents: Document[] = [];
    
    for (const file of files) {
      try {
        const document = await this.processDocument(
          file.buffer,
          file.fileName,
          userId,
          file.fileType
        );
        documents.push(document);
      } catch (error) {
        console.error(`Failed to process ${file.fileName}:`, error);
        // Continue processing other files
      }
    }
    
    return documents;
  }

  validateFile(buffer: Buffer, fileName: string): { valid: boolean; error?: string } {
    // Check file size (max 50MB)
    if (buffer.length > 50 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }
    
    // Check file type
    const allowedTypes = ['pdf', 'txt', 'md', 'json', 'docx'];
    const fileType = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileType || !allowedTypes.includes(fileType)) {
      return { valid: false, error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}` };
    }
    
    // Check if buffer is not empty
    if (buffer.length === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    return { valid: true };
  }
}

export const documentProcessor = new DocumentProcessor();