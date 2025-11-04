import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const document = await prisma.collaborative_code_documents.findFirst({ where: { id: documentId, room_id: roomId, is_active: true } });
    if (!document) {
      console.log('chat - get document failed (document not found)');
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    console.log('chat - get document complete');
    return NextResponse.json({ success: true, document: {
      id: document.id,
      roomId: document.room_id,
      documentName: document.document_name,
      language: document.language,
      content: document.content,
      createdAt: document.created_at ? new Date(document.created_at).toISOString() : null,
      updatedAt: document.updated_at ? new Date(document.updated_at).toISOString() : null,
      createdBy: document.created_by,
      lastEditedBy: document.last_edited_by,
      isActive: document.is_active
    }});

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

    // Ensure document exists and belongs to room
    const existing = await prisma.collaborative_code_documents.findFirst({ where: { id: documentId, room_id: roomId, is_active: true } });
    if (!existing) {
      console.error('Document not found for update');
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    try {
      const updated = await prisma.collaborative_code_documents.update({ where: { id: existing.id }, data: updateData });
      console.log('chat - update document complete');
      return NextResponse.json({ success: true, document: {
        id: updated.id,
        roomId: updated.room_id,
        documentName: updated.document_name,
        language: updated.language,
        content: updated.content,
        createdAt: updated.created_at ? new Date(updated.created_at).toISOString() : null,
        updatedAt: updated.updated_at ? new Date(updated.updated_at).toISOString() : null,
        createdBy: updated.created_by,
        lastEditedBy: updated.last_edited_by,
        isActive: updated.is_active
      }});
    } catch (err) {
      console.error('Error updating document:', err);
      console.log('chat - update document failed (database error)');
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

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
    try {
      await prisma.collaborative_code_documents.updateMany({ where: { id: documentId, room_id: roomId }, data: { is_active: false } });
      console.log('chat - delete document complete');
      return NextResponse.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
      console.error('Error deleting document:', err);
      console.log('chat - delete document failed (database error)');
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting document:', error);
    console.log('chat - delete document failed');
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
