
// src/lib/search.ts
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { generateEmbedding } from "./embeddings";

config({ path: ".env.local" });
const sql = neon(process.env.NEON_DATABASE_URL!);

export interface SearchResult {
  id: number;
  content: string;
  similarity: number;
  title?: string;
  fileName?: string;
  chunkIndex?: number;
}

/**
 * Search for similar documents using raw SQL with pgvector
 */
export async function searchDocuments(
  query: string,
  userId: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Use raw SQL for the search with pgvector, filtered by user
    const similarDocuments = await sql`
      SELECT id, content, title, file_name, chunk_index, 
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM documents
      WHERE user_id = ${userId}
        AND 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    // Convert similarity to number and ensure proper typing
    return similarDocuments.map(doc => ({
      id: doc.id,
      content: doc.content,
      similarity: parseFloat(doc.similarity),
      title: doc.title,
      fileName: doc.file_name,
      chunkIndex: doc.chunk_index
    }));
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string) {
  try {
    const documents = await sql`
      SELECT DISTINCT title, file_name, COUNT(*) as chunk_count, 
             MIN(created_at) as created_at
      FROM documents
      WHERE user_id = ${userId}
      GROUP BY title, file_name
      ORDER BY created_at DESC
    `;

    return documents.map(doc => ({
      title: doc.title,
      fileName: doc.file_name,
      chunkCount: parseInt(doc.chunk_count),
      createdAt: doc.created_at
    }));
  } catch (error) {
    console.error("Get user documents error:", error);
    return [];
  }
}

/**
 * Delete a document and all its chunks
 */
export async function deleteDocument(userId: string, fileName: string) {
  try {
    const result = await sql`
      DELETE FROM documents
      WHERE user_id = ${userId} AND file_name = ${fileName}
    `;
    
    return { success: true, deletedCount: result.length };
  } catch (error) {
    console.error("Delete document error:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
