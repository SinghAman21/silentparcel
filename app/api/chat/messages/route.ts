import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { roomId, username, userId, message, messageType = 'text' } = await request.json();

    console.log('🐻 API received message:', {
      roomId,
      username,
      messageLength: message?.length,
      isEncrypted: message?.includes(':') && message?.split(':').length === 3,
      messagePreview: message?.substring(0, 50) + '...'
    });

    if (!roomId || !username || !message) {
      return NextResponse.json(
        { error: 'Room ID, username, and message are required' },
        { status: 400 }
      );
    }

    // Use provided userId or generate one
    const messageUserId = userId || crypto.randomUUID();

    // Verify room exists and is active
    const room = await prisma.chat_rooms.findFirst({
      where: { room_id: roomId, is_active: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or inactive' }, { status: 404 });
    }

    // Check if room has expired
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Room has expired' }, { status: 410 });
    }

    // Insert message
    const newMessage = await prisma.chat_messages.create({
      data: {
        room_id: roomId,
        username,
        message,
        message_type: messageType,
        user_id: messageUserId
      }
    });

    return NextResponse.json({
      success: true,
      message: {
        id: newMessage.id,
        roomId: newMessage.room_id,
        username: newMessage.username,
        message: newMessage.message,
        messageType: newMessage.message_type,
        createdAt: newMessage.created_at,
        userId: newMessage.user_id
      }
    });

  } catch (error) {
    console.error('Error in message creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Get messages for the room
    const messages = await prisma.chat_messages.findMany({
      where: { room_id: roomId },
      orderBy: { created_at: 'asc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id,
        roomId: msg.room_id,
        username: msg.username,
        message: msg.message,
        messageType: msg.message_type,
        createdAt: msg.created_at,
        userId: msg.user_id
      }))
    });

  } catch (error) {
    console.error('Error in message fetching:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 