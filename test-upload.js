// Test script to debug upload functionality
const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function testPdfParsing() {
  try {
    console.log('Testing PDF parsing...');
    
    // Test if pdf-parse is properly imported
    console.log('PDFParse imported successfully');
    
    // Create a simple test buffer (not a real PDF, just testing the import)
    const testBuffer = Buffer.from('test');
    
    // This will fail but we can see the error
    const parser = new PDFParse({ data: testBuffer });
    console.log('PDFParse constructor works');
    
  } catch (error) {
    console.error('PDF parsing test failed:', error);
  }
}

testPdfParsing();