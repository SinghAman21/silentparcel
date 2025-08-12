import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Get code documents for the room
    const { data: documents, error } = await supabaseAdmin
      .from('collaborative_code_documents')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting documents:', error);
      console.log('chat - get documents failed (database error)');
      return NextResponse.json(
        { error: 'Failed to get documents' },
        { status: 500 }
      );
    }

    console.log('chat - get documents complete');
    return NextResponse.json({
      success: true,
      documents: documents || []
    });

  } catch (error) {
    console.error('Error getting documents:', error);
    console.log('chat - get documents failed');
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const { documentName, language, content, createdBy } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    if (!documentName || !language) {
      return NextResponse.json(
        { error: 'Document name and language are required' },
        { status: 400 }
      );
    }

    // Verify room exists and is active
    const { data: room, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('room_type')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      console.log('chat - create document failed (room not found)');
      return NextResponse.json(
        { error: 'Room not found or inactive' },
        { status: 404 }
      );
    }

    if (room.room_type === 'chat') {
      console.log('chat - create document failed (chat-only room)');
      return NextResponse.json(
        { error: 'Code documents are not supported in chat-only rooms' },
        { status: 400 }
      );
    }

    // Create new document
    const { data: document, error } = await supabaseAdmin
      .from('collaborative_code_documents')
      .insert({
        room_id: roomId,
        document_name: documentName,
        language: language,
        content: content || '',
        created_by: createdBy || 'anonymous'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      console.log('chat - create document failed (database error)');
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      );
    }

    console.log('chat - create document complete');
    return NextResponse.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('Error creating document:', error);
    console.log('chat - create document failed');
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
