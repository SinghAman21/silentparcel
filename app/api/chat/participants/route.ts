import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { roomId, username, userId } = await request.json();

    if (!roomId || !username) {
      return NextResponse.json(
        { error: 'Room ID and username are required' },
        { status: 400 }
      );
    }

    // Use provided userId or generate one
    const participantUserId = userId || crypto.randomUUID();

    // Verify room exists and is active
    const room = await prisma.chat_rooms.findFirst({ where: { room_id: roomId, is_active: true } });
    if (!room) return NextResponse.json({ error: 'Room not found or inactive' }, { status: 404 });

    // Check if room has expired
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Room has expired' }, { status: 410 });
    }

    // Check if participant already exists
    const existingParticipant = await prisma.chat_participants.findFirst({ where: { room_id: roomId, username } });
    if (existingParticipant) {
      // Return error for duplicate username to trigger frontend handling
      return NextResponse.json(
        { 
          error: 'Username already exists in this room',
          code: 'USERNAME_EXISTS',
          existingUser: {
            username: existingParticipant.username,
            joinedAt: existingParticipant.joined_at
          }
        },
        { status: 409 } // Conflict status code
      );
    }

    // Insert new participant
    const newParticipant = await prisma.chat_participants.create({
      data: {
        room_id: roomId,
        username,
        user_id: participantUserId
      }
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: newParticipant.id,
        roomId: newParticipant.room_id,
        username: newParticipant.username,
        joinedAt: newParticipant.joined_at,
        lastSeen: newParticipant.last_seen,
        isOnline: newParticipant.is_online,
        userId: newParticipant.user_id
      }
    });

  } catch (error) {
    console.error('Error in participant management:', error);
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

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Get participants for the room
    const participants = await prisma.chat_participants.findMany({ where: { room_id: roomId }, orderBy: { joined_at: 'asc' } });

    return NextResponse.json({
      success: true,
      participants: participants.map((participant:any) => ({
        id: participant.id,
        roomId: participant.room_id,
        username: participant.username,
        joinedAt: participant.joined_at,
        lastSeen: participant.last_seen,
        isOnline: participant.is_online,
        userId: participant.user_id
      }))
    });

  } catch (error) {
    console.error('Error in participant fetching:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { roomId, username, userId, isOnline } = await request.json();

    if (!roomId || !username) {
      return NextResponse.json(
        { error: 'Room ID and username are required' },
        { status: 400 }
      );
    }

    // Update participant status: find then update
    const existing = await prisma.chat_participants.findFirst({ where: { room_id: roomId, username } });
    if (!existing) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

    const updatedParticipant = await prisma.chat_participants.update({
      where: { id: existing.id },
      data: {
        last_seen: new Date(),
        is_online: isOnline !== undefined ? isOnline : false
      }
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: updatedParticipant.id,
        roomId: updatedParticipant.room_id,
        username: updatedParticipant.username,
        joinedAt: updatedParticipant.joined_at,
        lastSeen: updatedParticipant.last_seen,
        isOnline: updatedParticipant.is_online,
        userId: updatedParticipant.user_id
      }
    });

  } catch (error) {
    console.error('Error in participant status update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { roomId, targetUsername, adminUsername, adminUserId } = await request.json();

    if (!roomId || !targetUsername || !adminUsername) {
      return NextResponse.json(
        { error: 'Room ID, target username, and admin username are required' },
        { status: 400 }
      );
    }

    // Verify room exists and is active
    const room = await prisma.chat_rooms.findFirst({ where: { room_id: roomId, is_active: true } });
    if (!room) return NextResponse.json({ error: 'Room not found or inactive' }, { status: 404 });

    // Verify admin is the first participant (has admin privileges)
    const participants = await prisma.chat_participants.findMany({ where: { room_id: roomId }, orderBy: { joined_at: 'asc' } });
    if (!participants || participants.length === 0) return NextResponse.json({ error: 'No participants found' }, { status: 404 });

    // Check if the admin is actually the first user (room admin)
    const firstParticipant = participants[0];
    if (firstParticipant.username !== adminUsername) {
      return NextResponse.json(
        { error: 'Only the room admin can kick participants' },
        { status: 403 }
      );
    }

    // Cannot kick yourself
    if (targetUsername === adminUsername) {
      return NextResponse.json(
        { error: 'Cannot kick yourself' },
        { status: 400 }
      );
    }

    // Find the target participant
    const targetParticipant = participants.find((p: any) => p.username === targetUsername);
    if (!targetParticipant) {
      return NextResponse.json(
        { error: 'Target participant not found' },
        { status: 404 }
      );
    }

    // Remove the participant from the room
    try {
      await prisma.chat_participants.delete({ where: { id: targetParticipant.id } });
    } catch (err) {
      console.error('Error removing participant:', err);
      return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
    }

    // Send a system message about the kick
    try {
      await prisma.chat_messages.create({ data: {
        room_id: roomId,
        username: 'System',
        user_id: 'system',
        message: `${targetUsername} has been removed from the room by ${adminUsername}`,
        message_type: 'system'
      }});
    } catch (err) {
      console.error('Error sending system message:', err);
      // Don't fail the request if system message fails
    }

    return NextResponse.json({ success: true, message: `${targetUsername} has been removed from the room` });

  } catch (error) {
    console.error('Error in participant removal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}