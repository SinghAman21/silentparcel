# Supabase Real-time Chat Setup Guide

This guide will help you set up the new Supabase real-time chat functionality for your file sharing application.

## Prerequisites

1. A Supabase project (create one at https://supabase.com)
2. Node.js and npm/pnpm installed
3. Your existing file sharing application

## Setup Steps

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

You can find these values in your Supabase project dashboard under Settings > API.

### 2. Database Schema

Run the SQL schema in your Supabase SQL editor. Copy and paste the contents of `scripts/supabase-chat-schema.sql` into the SQL editor and execute it.

This will create:
- `chat_rooms` table for room management
- `chat_messages` table for real-time messages
- `chat_participants` table for user tracking
- Row Level Security policies
- Real-time subscriptions
- Automatic expiry triggers

### 3. Enable Real-time

In your Supabase dashboard:
1. Go to Database > Replication
2. Enable real-time for the following tables:
   - `chat_rooms`
   - `chat_messages`
   - `chat_participants`

### 4. Install Dependencies

The required dependencies are already in your `package.json`:
- `@supabase/supabase-js` - Supabase client
- All other dependencies are already installed

### 5. File Structure

The new chat system includes:

```
app/
├── api/chat/
│   ├── rooms/route.ts          # Room creation and verification
│   ├── messages/route.ts       # Message handling
│   └── participants/route.ts   # Participant management
├── rooms/
│   ├── create/page.tsx         # New separate create room page
│   ├── [id]/page.tsx           # Updated room page with Supabase
│   └── page.tsx                # Updated rooms listing
components/
├── supabase-chat-interface.tsx # New Supabase chat interface
└── chat-interface.tsx          # Original interface (kept for reference)
hooks/
└── use-supabase-chat.ts        # Supabase real-time hook
scripts/
├── supabase-chat-schema.sql    # Database schema
└── cleanup-expired-chat-rooms.js # Cleanup script
```

## Features

### Real-time Chat
- Instant message delivery using Supabase real-time
- Live participant status updates
- Connection status indicators
- Automatic reconnection

### Room Management
- Secure room creation with auto-generated passwords
- Room expiry with automatic cleanup
- Password-protected access
- Separate create room route for cleaner code

### User Experience
- Anonymous usernames with auto-generation
- Real-time participant list
- Online/offline status
- Message timestamps
- Auto-scroll to latest messages

## API Endpoints

### Rooms
- `POST /api/chat/rooms` - Create a new room
- `GET /api/chat/rooms?roomId=X&password=Y` - Verify room access

### Messages
- `POST /api/chat/messages` - Send a message
- `GET /api/chat/messages?roomId=X` - Get room messages

### Participants
- `POST /api/chat/participants` - Join room
- `GET /api/chat/participants?roomId=X` - Get room participants
- `PUT /api/chat/participants` - Update participant status

## Cleanup Script

The cleanup script automatically removes expired rooms and their data:

```bash
node scripts/cleanup-expired-chat-rooms.js
```

You can set up a cron job to run this periodically:

```bash
# Run every hour
0 * * * * cd /path/to/your/app && node scripts/cleanup-expired-chat-rooms.js
```

## Usage

1. **Create a Room**: Navigate to `/rooms` and click "Create Secret Room"
2. **Join a Room**: Use the room link or enter the room ID and password
3. **Chat**: Messages are delivered in real-time to all participants
4. **Leave**: Click "Leave Room" to exit

## Security Features

- Row Level Security (RLS) policies
- Password-protected rooms
- Anonymous usernames
- Automatic room expiry
- No message persistence after room expiry

## Troubleshooting

### Connection Issues
- Check your Supabase URL and keys
- Verify real-time is enabled in Supabase dashboard
- Check browser console for errors

### Database Issues
- Ensure the schema is properly applied
- Check RLS policies are active
- Verify table permissions

### Real-time Not Working
- Confirm real-time is enabled for all tables
- Check network connectivity
- Verify Supabase project status

## Migration from Old System

The old chat system is preserved in `components/chat-interface.tsx` for reference. The new system is completely separate and doesn't affect existing functionality.

## Performance Considerations

- Messages are limited to 100 per room by default
- Rooms auto-expire to prevent data accumulation
- Real-time subscriptions are properly cleaned up
- Participant status updates are debounced

## Future Enhancements

- File sharing in chat
- Typing indicators
- Message reactions
- Room moderation tools
- Message encryption
- Custom room themes 