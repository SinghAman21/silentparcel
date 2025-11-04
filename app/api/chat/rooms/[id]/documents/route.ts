import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

interface DocumentRecord {
  id: string;
  room_id: string;
  document_name: string;
  language: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_edited_by: string;
  is_active: boolean;
}

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

    // First verify the room exists and is accessible
    const room = await prisma.chat_rooms.findFirst({ where: { room_id: roomId } });
    if (!room) {
      console.log(`chat - get documents failed (room ${roomId} not found)`);
      return NextResponse.json({ error: 'Room not found', details: `Room ${roomId} does not exist` }, { status: 404 });
    }
    if (!room.is_active) {
      console.log(`chat - get documents failed (room ${roomId} is inactive)`);
      return NextResponse.json({ error: 'Room is inactive', details: `Room ${roomId} has been deactivated` }, { status: 410 });
    }

    // Get code documents for the room
    let documents = [];
    try {
      documents = await prisma.collaborative_code_documents.findMany({ where: { room_id: roomId, is_active: true }, orderBy: { created_at: 'asc' } });
    } catch (err) {
      console.error('Error getting documents:', err);
      console.log('chat - get documents failed (database error)');
      return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 });
    }

    console.log('chat - get documents complete');
    return NextResponse.json({
      success: true,
      documents: documents?.map((doc:any) => ({
        id: doc.id,
        roomId: doc.room_id,
        documentName: doc.document_name,
        language: doc.language,
        content: doc.content,
        createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : null,
        updatedAt: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
        createdBy: doc.created_by,
        lastEditedBy: doc.last_edited_by,
        isActive: doc.is_active
      })) || []
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
    const { documentName, language, content, createdBy, userId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Use provided userId or generate one
    const documentCreatedBy = createdBy || userId || crypto.randomUUID();
    const docName = documentName || 'main.js';
    const docLanguage = language || 'javascript';

    // Verify room exists and is active with detailed error reporting
    const room = await prisma.chat_rooms.findFirst({ where: { room_id: roomId } });
    if (!room) {
      console.error('Room not found:', roomId);
      return NextResponse.json({ error: 'Room not found', details: `Room ${roomId} does not exist in the database` }, { status: 404 });
    }
    if (!room.is_active) return NextResponse.json({ error: 'Room is inactive', details: `Room ${roomId} has been deactivated` }, { status: 410 });
    if (room.expires_at && new Date(room.expires_at) < new Date()) return NextResponse.json({ error: 'Room has expired', details: `Room ${roomId} expired at ${room.expires_at}` }, { status: 410 });
    if (room.room_type === 'chat') return NextResponse.json({ error: 'Code documents are not supported in chat-only rooms' }, { status: 400 });

    // Check if document already exists and update it, or create new one
    const existingDoc = await prisma.collaborative_code_documents.findFirst({ where: { room_id: roomId, document_name: docName, is_active: true } });

    let document;
    if (existingDoc) {
      // Update existing document
      try {
        const updatedDoc = await prisma.collaborative_code_documents.update({ where: { id: existingDoc.id }, data: { content: content || existingDoc.content, language: docLanguage, last_edited_by: documentCreatedBy, updated_at: new Date() } });
        document = updatedDoc;
      } catch (updateError) {
        console.error('Error updating document:', updateError);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
      }
    } else {
      // Create new document
      try {
        const newDoc = await prisma.collaborative_code_documents.create({ data: { room_id: roomId, document_name: docName, language: docLanguage, content: content || '', created_by: documentCreatedBy, last_edited_by: documentCreatedBy } });
        document = newDoc;
      } catch (createError) {
        console.error('Error creating document:', createError);
        console.log('chat - create document failed (database error)');
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
      }
    }

    console.log('chat - document operation complete');
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
    console.error('Error managing document:', error);
    console.log('chat - document operation failed');
    return NextResponse.json(
      { error: 'Failed to manage document' },
      { status: 500 }
    );
  }
}
