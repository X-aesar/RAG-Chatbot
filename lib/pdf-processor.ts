import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class PDFProcessor {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async extractText(buffer: Buffer): Promise<string> {
    await this.ensureTempDir();
    
    const tempPath = path.join(this.tempDir, `temp-${Date.now()}.pdf`);
    
    try {
      await fs.writeFile(tempPath, buffer);
      
      // Use pdftotext for reliable server-side PDF processing
      const { stdout } = await execAsync(`pdftotext "${tempPath}" -`);
      return stdout.trim();
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    } finally {
      // Cleanup
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
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
    await this.ensureTempDir();
    
    const tempPath = path.join(this.tempDir, `temp-${Date.now()}.pdf`);
    
    try {
      await fs.writeFile(tempPath, buffer);
      
      // Use pdfinfo to extract metadata
      const { stdout } = await execAsync(`pdfinfo "${tempPath}"`);
      
      const metadata: any = {};
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          switch (key.toLowerCase()) {
            case 'title':
            case 'author':
            case 'subject':
            case 'creator':
            case 'producer':
              metadata[key.toLowerCase()] = value;
              break;
            case 'pages':
              metadata.pageCount = parseInt(value);
              break;
            case 'creationdate':
            case 'moddate':
              metadata[key.toLowerCase() === 'moddate' ? 'modificationDate' : 'creationDate'] = value;
              break;
          }
        }
      }
      
      return metadata;
    } catch (error) {
      console.error('PDF metadata extraction failed:', error);
      return {};
    } finally {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export const pdfProcessor = new PDFProcessor();