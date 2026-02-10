// Test upload components step by step
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

async function testUploadComponents() {
  console.log('Testing upload components...');
  
  // Test 1: Database connection
  try {
    if (!process.env.NEON_DATABASE_URL) {
      console.error('❌ NEON_DATABASE_URL not found');
      return;
    }
    
    const sql = neon(process.env.NEON_DATABASE_URL);
    const db = drizzle(sql);
    console.log('✅ Database connection works');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return;
  }
  
  // Test 2: OpenAI embeddings
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found');
      return;
    }
    
    const { embedding } = await embed({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      value: "test text",
    });
    console.log('✅ OpenAI embeddings work');
  } catch (error) {
    console.error('❌ OpenAI embeddings failed:', error.message);
    return;
  }
  
  console.log('✅ All upload components working');
}

testUploadComponents().catch(console.error);