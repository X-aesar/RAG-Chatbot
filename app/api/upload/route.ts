import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/rag-system';

export async function POST(req: NextRequest) {
  try {
    // Initialize system if not already done
    await ragSystem.initialize();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process document
    const result = await ragSystem.processDocument(buffer, file.name, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        message: `Successfully processed ${file.name}`,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}