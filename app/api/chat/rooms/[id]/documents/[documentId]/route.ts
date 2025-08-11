import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: roomId, documentId } = await params;

    if (!roomId || !documentId) {
      return NextResponse.json(
        { error: 'Room ID and Document ID are required' },
        { status: 400 }
      );
    }

    // Get specific document
    const { data: document, error } = await supabaseAdmin
      .from('collaborative_code_documents')
      .select('*')
      .eq('id', documentId)
      .eq('room_id', roomId)
      .eq('is_active', true)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('Error getting document:', error);
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: roomId, documentId } = await params;
    const { content, language, documentName } = await request.json();

    if (!roomId || !documentId) {
      return NextResponse.json(
        { error: 'Room ID and Document ID are required' },
        { status: 400 }
      );
    }

    // Update document
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (language !== undefined) updateData.language = language;
    if (documentName !== undefined) updateData.document_name = documentName;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: document, error } = await supabaseAdmin
      .from('collaborative_code_documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('room_id', roomId)
      .eq('is_active', true)
      .select()
      .single();

    if (error || !document) {
      console.error('Error updating document:', error);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: roomId, documentId } = await params;

    if (!roomId || !documentId) {
      return NextResponse.json(
        { error: 'Room ID and Document ID are required' },
        { status: 400 }
      );
    }

    // Soft delete document
    const { error } = await supabaseAdmin
      .from('collaborative_code_documents')
      .update({ is_active: false })
      .eq('id', documentId)
      .eq('room_id', roomId);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
