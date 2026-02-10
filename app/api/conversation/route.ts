import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/rag-system';

export async function POST(req: NextRequest) {
  try {
    await ragSystem.initialize();

    const { conversationId, query, options = {} } = await req.json();

    if (!conversationId || !query) {
      return NextResponse.json(
        { error: 'conversationId and query are required' },
        { status: 400 }
      );
    }

    const result = await ragSystem.processQuery(conversationId, query, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Query API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await ragSystem.initialize();

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const conversation = await ragSystem.getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Get conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}