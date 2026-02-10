import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/rag-system';

export async function GET(req: NextRequest) {
  try {
    await ragSystem.initialize();

    const health = await ragSystem.healthCheck();

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ragSystem.initialize();

    const metrics = await ragSystem.getSystemMetrics();

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
}