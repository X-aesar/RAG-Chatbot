// src/lib/embeddings.ts
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replaceAll("\n", " ");

  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: input,
  });

  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const inputs = texts.map((text) => text.replaceAll("\n", " "));
  
  // Process in batches of 100 to avoid rate limits and improve performance
  const batchSize = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(inputs.length / batchSize)}`);
    
    const { embeddings: batchEmbeddings } = await embedMany({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      values: batch,
    });
    
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}