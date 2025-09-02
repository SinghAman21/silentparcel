import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as crypto from 'crypto';

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
      console.log('chat - get document failed (document not found)');
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('chat - get document complete');
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        roomId: document.room_id,
        documentName: document.document_name,
        language: document.language,
        content: document.content,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        createdBy: document.created_by,
        lastEditedBy: document.last_edited_by,
        isActive: document.is_active
      }
    });

  } catch (error) {
    console.error('Error getting document:', error);
    console.log('chat - get document failed');
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
    const { content, language, documentName, userId, lastEditedBy } = await request.json();

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
    
    // Track who last edited the document
    if (lastEditedBy || userId) {
      updateData.last_edited_by = lastEditedBy || userId || crypto.randomUUID();
    }

    if (Object.keys(updateData).length === 0) {
      console.log('chat - update document failed (no fields to update)');
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
      console.log('chat - update document failed (database error)');
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    console.log('chat - update document complete');
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        roomId: document.room_id,
        documentName: document.document_name,
        language: document.language,
        content: document.content,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        createdBy: document.created_by,
        lastEditedBy: document.last_edited_by,
        isActive: document.is_active
      }
    });

  } catch (error) {
    console.error('Error updating document:', error);
    console.log('chat - update document failed');
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
      console.log('chat - delete document failed (database error)');
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    console.log('chat - delete document complete');
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    console.log('chat - delete document failed');
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
