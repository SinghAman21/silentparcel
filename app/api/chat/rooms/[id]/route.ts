import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get room information
    const room = await prisma.chat_rooms.findFirst({ where: { room_id: roomId, is_active: true } });
    if (!room) {
      console.log('chat - get room info failed (room not found)');
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if room has expired
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      console.log('chat - get room info failed (room expired)');
      return NextResponse.json({ error: 'Room has expired' }, { status: 410 });
    }

    // Get participants count
    let participantCount = 0;
    try {
      participantCount = await prisma.chat_participants.count({ where: { room_id: roomId, is_online: true } });
    } catch (err) {
      console.error('Error getting participant count:', err);
    }

    // Get recent messages count
    let messageCount = 0;
    try {
      messageCount = await prisma.chat_messages.count({ where: { room_id: roomId } });
    } catch (err) {
      console.error('Error getting message count:', err);
    }

    // Get code documents count for collaborative rooms
    let codeDocumentCount = 0;
    if (room.room_type !== 'chat') {
      try {
        codeDocumentCount = await prisma.collaborative_code_documents.count({ where: { room_id: roomId, is_active: true } });
      } catch (err) {
        console.error('Error getting code document count:', err);
      }
    }

    console.log('chat - get room info complete');
    return NextResponse.json({
      success: true,
      room: {
        id: room.room_id,
        name: room.name,
        expiryTime: room.expiry_time,
        expiresAt: room.expires_at,
        createdAt: room.created_at,
        participantCount: participantCount || 0,
        messageCount: messageCount || 0,
        roomType: room.room_type || 'chat',
        // Removed: defaultLanguage, collaborativeMode
        codeDocumentCount
      }
    });

  } catch (error) {
    console.error('Error getting room info:', error);
    console.log('chat - get room info failed');
    return NextResponse.json(
      { error: 'Failed to get room information' },
      { status: 500 }
    );
  }
}