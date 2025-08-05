import { NextRequest, NextResponse } from 'next/server';
import { strictRateLimiter } from '@/lib/middleware/rateLimiter';
import { generateId, generateRoomPassword, getClientIP } from '@/lib/security';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for room creation
    const rateLimitResult = await strictRateLimiter.isAllowed(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many room creation attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { captchaToken, roomName, expiryTime } = await request.json();

    // Validate required fields
    if (!captchaToken) {
      return NextResponse.json(
        { error: 'CAPTCHA verification required' },
        { status: 400 }
      );
    }

    // Verify CAPTCHA (only if HCAPTCHA_SECRET_KEY is set)
    if (process.env.HCAPTCHA_SECRET_KEY) {
      try {
        const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${process.env.HCAPTCHA_SECRET_KEY}&response=${captchaToken}`
        });

        const captchaData = await captchaResponse.json();
        if (!captchaData.success) {
          return NextResponse.json(
            { error: 'CAPTCHA verification failed' },
            { status: 400 }
          );
        }
      } catch (captchaError) {
        console.error('CAPTCHA verification error:', captchaError);
        // Continue without CAPTCHA if there's an error
        console.warn('Proceeding without CAPTCHA verification due to error');
      }
    } else {
      console.warn('HCAPTCHA_SECRET_KEY not set, skipping CAPTCHA verification');
    }

    // Generate room data
    const roomId = generateId().substring(0, 8); // Ensure 8 characters
    const roomPassword = generateRoomPassword();
    const creatorId = generateId();
    const creatorUsername = `User_${Math.random().toString(36).substr(2, 6)}`;

    // Create room in Supabase
    const { data: room, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({
        room_id: roomId,
        name: roomName || 'Anonymous Room',
        password: roomPassword,
        expiry_time: expiryTime || '1h',
        created_by: creatorId,
        is_active: true
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return NextResponse.json(
        { error: 'Failed to create room. Please try again.' },
        { status: 500 }
      );
    }

    // Create creator as participant
    const { error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .insert({
        room_id: roomId,
        username: creatorUsername,
        user_id: creatorId,
        is_online: true
      });

    if (participantError) {
      console.error('Error creating participant:', participantError);
      // Don't fail the request, just log the error
    }

    // Log audit event
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'room_create',
        resource_type: 'chat_room',
        resource_id: roomId,
        user_id: creatorId,
        ip_address: getClientIP(request),
        metadata: {
          roomName: roomName || 'Anonymous Room',
          username: creatorUsername,
          expiryTime: expiryTime || '1h'
        }
      });
    } catch (auditError) {
      console.error('Error logging audit event:', auditError);
      // Don't fail the request if audit logging fails
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const roomUrl = `${baseUrl}/rooms/${roomId}`;

    return NextResponse.json({
      success: true,
      room: {
        id: roomId,
        name: roomName || 'Anonymous Room',
        password: roomPassword,
        url: roomUrl,
        expiryTime: expiryTime || '1h',
        expiresAt: room.expires_at
      },
      user: {
        id: creatorId,
        username: creatorUsername,
        isCreator: true
      }
    });

  } catch (error) {
    console.error('Room creation error:', error);
    
    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('database')) {
        return NextResponse.json(
          { error: 'Database error. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create room. Please try again.' },
      { status: 500 }
    );
  }
}
