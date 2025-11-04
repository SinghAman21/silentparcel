import { NextRequest, NextResponse } from 'next/server';
import { generateId, getClientIP } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { roomId, password, username } = await request.json();

    // Validate required fields
    if (!roomId || !password) {
      return NextResponse.json(
        { error: 'Room ID and password are required' },
        { status: 400 }
      );
    }

    // Check if room exists and password is correct
    const room = await prisma.chat_rooms.findFirst({ where: { room_id: roomId, password, is_active: true } });
    if (!room) {
      console.log('chat - verify room failed (invalid credentials)');
      return NextResponse.json({ error: 'Invalid room ID or password' }, { status: 404 });
    }

    // Check if room has expired
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      console.log('chat - verify room failed (room expired)');
      return NextResponse.json({ error: 'Room has expired' }, { status: 410 });
    }

    // FIXED: Don't automatically generate phantom users
    // Only verify room exists and return room info - don't create participants here
    if (!username) {
      // Just return room info without creating a participant
      return NextResponse.json({
        success: true,
        room: {
          id: roomId,
          name: room.name,
          expiryTime: room.expiry_time,
          expiresAt: room.expires_at
        },
        requiresUsername: true
      });
    }
    
    const userDisplayName = username.trim();
    const userId = generateId();

    // Check if user already exists in this room
    const existingParticipant = await prisma.chat_participants.findFirst({ where: { room_id: roomId, username: userDisplayName } });
    if (existingParticipant) {
      // Update existing participant
      try {
        await prisma.chat_participants.update({ where: { id: existingParticipant.id }, data: { last_seen: new Date(), is_online: true } });
      } catch (updateError) {
        console.error('Error updating participant:', updateError);
      }

      console.log('chat - verify room (existing user) complete');
      return NextResponse.json({
        success: true,
        room: { id: roomId, name: room.name, expiryTime: room.expiry_time, expiresAt: room.expires_at },
        user: { id: existingParticipant.user_id, username: userDisplayName, isCreator: existingParticipant.user_id === room.created_by }
      });
    }

    // Create new participant
    try {
      await prisma.chat_participants.create({ data: { room_id: roomId, username: userDisplayName, user_id: userId, is_online: true } });
    } catch (participantError) {
      console.error('Error creating participant:', participantError);
      console.log('chat - verify room failed (participant creation error)');
      return NextResponse.json({ error: 'Failed to join room. Please try again.' }, { status: 500 });
    }

    // Log audit event
    try {
      await prisma.audit_logs.create({ data: { action: 'room_join', resource_type: 'chat_room', resource_id: roomId, user_id: userId, ip_address: getClientIP(request), metadata: { roomName: room.name, username: userDisplayName } } });
    } catch (auditError) {
      console.error('Error logging audit event:', auditError);
    }

    console.log('chat - verify room (new user) complete');
    return NextResponse.json({
      success: true,
      room: {
        id: roomId,
        name: room.name,
        expiryTime: room.expiry_time,
        expiresAt: room.expires_at
      },
      user: {
        id: userId,
        username: userDisplayName,
        isCreator: false
      }
    });

  } catch (error) {
    console.error('Room verification error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'Room has expired' },
          { status: 410 }
        );
      }
    }
    
    console.log('chat - verify room failed');
    return NextResponse.json(
      { error: 'Failed to join room. Please try again.' },
      { status: 500 }
    );
  }
} 