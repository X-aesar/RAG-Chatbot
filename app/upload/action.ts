// src/app/upload/actions.ts
"use server";

import { PDFParse } from "pdf-parse";


import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkContent } from "@/lib/chunking";

export async function processPdfFile(formData: FormData) {
  try {
    const file = formData.get("pdf") as File;

    // Convert File to Buffer and extract text
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    
    if (!result.text || result.text.trim().length === 0) {
      return {
        success: false,
        error: "No text found in PDF",
      };
    }

    // Chunk the text
    console.log("Chunking text...");
    const chunks = await chunkContent(result.text);
    console.log(`Created ${chunks.length} chunks`);

    // Generate embeddings in batches to avoid rate limits
    console.log("Generating embeddings...");
    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);

    // Store in database
    console.log("Storing in database...");
    const records = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));

    await db.insert(documents).values(records);
    console.log(`Stored ${records.length} records`);

    return {
      success: true,
      message: `Created ${records.length} searchable chunks from ${file.name}`,
    };
  } catch (error) {
    console.error("PDF processing error:", error);
    return {
      success: false,
      error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}