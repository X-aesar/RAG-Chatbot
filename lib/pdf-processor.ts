import pdfParse from 'pdf-parse';

export class PDFProcessor {
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async extractMetadata(buffer: Buffer): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pageCount?: number;
  }> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate,
        modificationDate: data.info?.ModDate,
        pageCount: data.numpages
      };
    } catch (error) {
      console.error('PDF metadata extraction failed:', error);
      return {};
    }
  }
}

export const pdfProcessor = new PDFProcessor();