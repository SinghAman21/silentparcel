import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
    const { data: room, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found or inactive' },
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

    // Check if participant already exists
    const { data: existingParticipant } = await supabaseAdmin
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('username', username)
      .single();

    if (existingParticipant) {
      // Update last seen and online status
      const { data: updatedParticipant, error: updateError } = await supabaseAdmin
        .from('chat_participants')
        .update({
          last_seen: new Date().toISOString(),
          is_online: true
        })
        .eq('id', existingParticipant.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating participant:', updateError);
        return NextResponse.json(
          { error: 'Failed to update participant' },
          { status: 500 }
        );
      }

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
    }

    // Insert new participant
    const { data: newParticipant, error: insertError } = await supabaseAdmin
      .from('chat_participants')
      .insert({
        room_id: roomId,
        username: username,
        user_id: participantUserId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting participant:', insertError);
      return NextResponse.json(
        { error: 'Failed to join room' },
        { status: 500 }
      );
    }

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
    const { data: participants, error } = await supabaseAdmin
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      );
    }

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

    // Update participant status
    const { data: updatedParticipant, error } = await supabaseAdmin
      .from('chat_participants')
      .update({
        last_seen: new Date().toISOString(),
        is_online: isOnline !== undefined ? isOnline : false
      })
      .eq('room_id', roomId)
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('Error updating participant status:', error);
      return NextResponse.json(
        { error: 'Failed to update participant status' },
        { status: 500 }
      );
    }

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