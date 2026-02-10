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
    
    // Validate file
    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }
    
    // Check file type and size
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return {
        success: false,
        error: "Only PDF files are allowed",
      };
    }
    
    // Limit file size to 10MB to avoid timeout
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: "File size must be less than 10MB",
      };
    }

    // Convert File to Buffer and extract text
    console.log("Step 1: Converting file to buffer...");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log("Step 2: Buffer created, size:", buffer.length);
    
    console.log("Step 3: Starting PDF parsing...");
    const parser = new PDFParse({ data: buffer });
    console.log("Step 4: Parser created, extracting text...");
    const data = await parser.getText();
    console.log("Step 5: Text extracted, length:", data.text?.length || 0);
    await parser.destroy();
    console.log("Step 6: Parser destroyed");

    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: "No text found in PDF",
      };
    }

    // Chunk the text
    console.log("Chunking text...");
    const chunks = await chunkContent(data.text);
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
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}