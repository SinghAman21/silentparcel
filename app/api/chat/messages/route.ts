import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { roomId, username, message, messageType = 'text' } = await request.json();

    if (!roomId || !username || !message) {
      return NextResponse.json(
        { error: 'Room ID, username, and message are required' },
        { status: 400 }
      );
    }

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

    // Insert message
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id: roomId,
        username: username,
        message: message,
        message_type: messageType,
        user_id: `user_${Math.random().toString(36).substring(2, 8)}`
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error inserting message:', messageError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: {
        id: newMessage.id,
        roomId: newMessage.room_id,
        username: newMessage.username,
        message: newMessage.message,
        messageType: newMessage.message_type,
        createdAt: newMessage.created_at
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
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages.map((msg:any) => ({
        id: msg.id,
        roomId: msg.room_id,
        username: msg.username,
        message: msg.message,
        messageType: msg.message_type,
        createdAt: msg.created_at
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