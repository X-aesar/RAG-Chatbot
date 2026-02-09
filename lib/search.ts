
// src/lib/search.ts
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { generateEmbedding } from "./embeddings";

config({ path: ".env.local" });
const sql = neon(process.env.NEON_DATABASE_URL!);

/**
 * Search for similar documents using raw SQL with pgvector
 */
export async function searchDocuments(
  query: string,
  limit: number = 5,
  threshold: number = 0.5
) {
  try {
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Use raw SQL for the search with pgvector
    const similarDocuments = await sql`
      SELECT id, content, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM documents
      WHERE 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    // Convert similarity to number and ensure proper typing
    return similarDocuments.map(doc => ({
      id: doc.id,
      content: doc.content,
      similarity: parseFloat(doc.similarity)
    }));
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}
