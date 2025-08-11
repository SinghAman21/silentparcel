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

    const { roomName, expiryTime, roomType = 'chat', defaultLanguage = 'javascript' } = await request.json();

    // Validate room type
    const validRoomTypes = ['chat', 'code', 'mixed'];
    if (!validRoomTypes.includes(roomType)) {
      return NextResponse.json(
        { error: 'Invalid room type. Must be one of: chat, code, mixed' },
        { status: 400 }
      );
    }

    // Validate default language for code rooms
    const validLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'html', 'css', 'json', 'markdown'];
    if (roomType !== 'chat' && !validLanguages.includes(defaultLanguage)) {
      return NextResponse.json(
        { error: 'Invalid default language for code room' },
        { status: 400 }
      );
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
        name: roomName || (roomType === 'code' ? 'Collaborative Code Room' : 'Anonymous Room'),
        password: roomPassword,
        expiry_time: expiryTime || '1h',
        created_by: creatorId,
        is_active: true,
        room_type: roomType,
        default_language: defaultLanguage,
        collaborative_mode: roomType !== 'chat'
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
        is_online: true,
        cursor_color: getRandomColor()
      });

    if (participantError) {
      console.error('Error creating participant:', participantError);
      // Don't fail the request, just log the error
    }

    // Create initial code document for code rooms
    if (roomType !== 'chat') {
      const { error: documentError } = await supabaseAdmin
        .from('collaborative_code_documents')
        .insert({
          room_id: roomId,
          document_name: `main.${getFileExtension(defaultLanguage)}`,
          language: defaultLanguage,
          content: getDefaultContent(defaultLanguage),
          created_by: creatorId
        });

      if (documentError) {
        console.error('Error creating code document:', documentError);
        // Don't fail the request, just log the error
      }
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
          roomName: roomName || (roomType === 'code' ? 'Collaborative Code Room' : 'Anonymous Room'),
          username: creatorUsername,
          expiryTime: expiryTime || '1h',
          roomType,
          defaultLanguage
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
        name: roomName || (roomType === 'code' ? 'Collaborative Code Room' : 'Anonymous Room'),
        password: roomPassword,
        url: roomUrl,
        expiryTime: expiryTime || '1h',
        expiresAt: room.expires_at,
        roomType,
        defaultLanguage,
        collaborativeMode: roomType !== 'chat'
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

function getRandomColor(): string {
  const colors = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65', '#7986cb'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md'
  };
  return extensions[language] || 'txt';
}

function getDefaultContent(language: string): string {
  const templates: { [key: string]: string } = {
    javascript: `// Welcome to collaborative JavaScript coding!
console.log("Hello, World!");

function greet(name) {
  return \`Hello, \${name}!\`;
}

// Start coding together...
`,
    typescript: `// Welcome to collaborative TypeScript coding!
console.log("Hello, World!");

function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

// Start coding together...
`,
    python: `# Welcome to collaborative Python coding!
print("Hello, World!")

def greet(name):
    return f"Hello, {name}!"

# Start coding together...
`,
    java: `// Welcome to collaborative Java coding!
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}

// Start coding together...
`,
    cpp: `// Welcome to collaborative C++ coding!
#include <iostream>
#include <string>

using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}

// Start coding together...
`,
    c: `// Welcome to collaborative C coding!
#include <stdio.h>
#include <string.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}

// Start coding together...
`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaborative HTML</title>
</head>
<body>
    <h1>Welcome to collaborative HTML coding!</h1>
    <p>Start coding together...</p>
</body>
</html>`,
    css: `/* Welcome to collaborative CSS coding! */

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

h1 {
    color: #333;
    text-align: center;
}

/* Start coding together... */`,
    json: `{
  "message": "Welcome to collaborative JSON coding!",
  "timestamp": "2024-01-01T00:00:00Z",
  "participants": [],
  "description": "Start coding together..."
}`,
    markdown: `# Welcome to collaborative Markdown coding!

This is a collaborative markdown document where you can write together.

## Features
- Real-time collaboration
- Live cursor tracking
- Auto-save functionality

Start writing together...
`
  };
  
  return templates[language] || `// Welcome to collaborative coding!
// Start coding together...`;
}
