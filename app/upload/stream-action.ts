"use server";

import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkContent } from "@/lib/chunking";

export async function processPdfFileWithProgress(formData: FormData) {
  const file = formData.get("pdf") as File;
  
  async function* streamGenerator() {
    try {
      yield { status: "parsing", message: "Extracting text from PDF..." };
      
      // Convert File to Buffer and extract text
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      await parser.destroy();

      if (!data.text || data.text.trim().length === 0) {
        yield { status: "error", message: "No text found in PDF" };
        return;
      }

      yield { status: "chunking", message: "Splitting text into chunks..." };
      
      // Chunk the text
      const chunks = await chunkContent(data.text);
      yield { status: "chunking", message: `Created ${chunks.length} text chunks` };

      yield { status: "embedding", message: "Generating embeddings..." };
      
      // Generate embeddings in batches
      const embeddings = await generateEmbeddings(chunks);
      yield { status: "embedding", message: `Generated ${embeddings.length} embeddings` };

      yield { status: "storing", message: "Saving to database..." };
      
      // Store in database
      const records = chunks.map((chunk, index) => ({
        content: chunk,
        embedding: embeddings[index],
      }));

      await db.insert(documents).values(records);
      
      yield { 
        status: "complete", 
        message: `Successfully processed ${file.name} - created ${records.length} searchable chunks` 
      };
    } catch (error) {
      console.error("PDF processing error:", error);
      yield { 
        status: "error", 
        message: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of streamGenerator()) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch {
          const errorData = `data: ${JSON.stringify({ status: "error", message: "Stream error" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    }
  );
}