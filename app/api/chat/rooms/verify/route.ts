import { NextRequest, NextResponse } from 'next/server';
import { generateId, getClientIP } from '@/lib/security';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { data: room, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('*')
      .eq('room_id', roomId)
      .eq('password', password)
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Invalid room ID or password' },
        { status: 404 }
      );
    }

    // Check if room has expired
    if (new Date(room.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Room has expired' },
        { status: 410 }
      );
    }

    // Generate user data
    const userId = generateId();
    const userDisplayName = username || `User_${Math.random().toString(36).substr(2, 6)}`;

    // Check if user already exists in this room
    const { data: existingParticipant } = await supabaseAdmin
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('username', userDisplayName)
      .single();

    if (existingParticipant) {
      // Update existing participant
      try {
        await supabaseAdmin
          .from('chat_participants')
          .update({
            last_seen: new Date().toISOString(),
            is_online: true
          })
          .eq('id', existingParticipant.id);
      } catch (updateError) {
        console.error('Error updating participant:', updateError);
      }

      return NextResponse.json({
        success: true,
        room: {
          id: roomId,
          name: room.name,
          expiryTime: room.expiry_time,
          expiresAt: room.expires_at
        },
        user: {
          id: existingParticipant.user_id,
          username: userDisplayName,
          isCreator: existingParticipant.user_id === room.created_by
        }
      });
    }

    // Create new participant
    const { error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .insert({
        room_id: roomId,
        username: userDisplayName,
        user_id: userId,
        is_online: true
      });

    if (participantError) {
      console.error('Error creating participant:', participantError);
      return NextResponse.json(
        { error: 'Failed to join room. Please try again.' },
        { status: 500 }
      );
    }

    // Log audit event
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'room_join',
        resource_type: 'chat_room',
        resource_id: roomId,
        user_id: userId,
        ip_address: getClientIP(request),
        metadata: {
          roomName: room.name,
          username: userDisplayName
        }
      });
    } catch (auditError) {
      console.error('Error logging audit event:', auditError);
      // Don't fail the request if audit logging fails
    }

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
    
    return NextResponse.json(
      { error: 'Failed to join room. Please try again.' },
      { status: 500 }
    );
  }
} 