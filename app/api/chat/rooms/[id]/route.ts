import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { data: room, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
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

    // Get participants count
    const { count: participantCount, error: countError } = await supabaseAdmin
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_online', true);

    if (countError) {
      console.error('Error getting participant count:', countError);
    }

    // Get recent messages count
    const { count: messageCount, error: messageCountError } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (messageCountError) {
      console.error('Error getting message count:', messageCountError);
    }

    // Get code documents count for collaborative rooms
    let codeDocumentCount = 0;
    if (room.room_type !== 'chat') {
      const { count: docCount, error: docCountError } = await supabaseAdmin
        .from('collaborative_code_documents')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (!docCountError) {
        codeDocumentCount = docCount || 0;
      }
    }

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
        defaultLanguage: room.default_language || 'javascript',
        collaborativeMode: room.collaborative_mode || false,
        codeDocumentCount
      }
    });

  } catch (error) {
    console.error('Error getting room info:', error);
    return NextResponse.json(
      { error: 'Failed to get room information' },
      { status: 500 }
    );
  }
} 