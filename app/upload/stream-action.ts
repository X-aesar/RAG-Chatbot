"use server";

import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkContent } from "@/lib/chunking";

export async function processPdfFileWithProgress(formData: FormData) {
  const file = formData.get("pdf") as File;
  
  // Validate file
  if (!file) {
    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const errorData = `data: ${JSON.stringify({ status: "error", message: "No file provided" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain" } }
    );
  }
  
  // Check file type and size
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const errorData = `data: ${JSON.stringify({ status: "error", message: "Only PDF files are allowed" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain" } }
    );
  }
  
  // Limit file size to 10MB
  if (file.size > 10 * 1024 * 1024) {
    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const errorData = `data: ${JSON.stringify({ status: "error", message: "File size must be less than 10MB" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain" } }
    );
  }
  
  async function* streamGenerator() {
    try {
      yield { status: "parsing", message: "Extracting text from PDF..." };
      
      // Convert File to Buffer and extract text
      yield { status: "parsing", message: "Converting file to buffer..." };
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      yield { status: "parsing", message: `Buffer created (${Math.round(buffer.length/1024)}KB), parsing PDF...` };
      
      const parser = new PDFParse({ data: buffer });
      yield { status: "parsing", message: "Extracting text from PDF..." };
      const data = await parser.getText();
      await parser.destroy();
      yield { status: "parsing", message: `Text extracted (${Math.round((data.text?.length || 0)/1024)}KB)` };

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
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
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