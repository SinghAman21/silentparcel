# Collaborative Coding Features

This document describes the collaborative coding features implemented in SilentParcel, which enable real-time collaborative code editing with custom cursors for each user.

## Overview

The collaborative coding system is built on top of:
- **Y.js**: For real-time collaborative data structures
- **y-monaco**: For Monaco Editor integration
- **y-webrtc**: For WebRTC-based peer-to-peer communication
- **Monaco Editor**: For the code editing experience

## Features

### Real-time Collaboration
- **Live cursor tracking**: See where other users are typing in real-time
- **Real-time code synchronization**: Changes are instantly synchronized across all participants
- **Conflict resolution**: Automatic conflict resolution using Y.js operational transformation
- **Offline support**: Changes are queued and synchronized when connection is restored

### Custom Cursors
- **Unique colors**: Each user gets a unique cursor color based on their username
- **Cursor positions**: Real-time display of cursor positions in the sidebar
- **Selection tracking**: See what text other users have selected
- **User identification**: Cursor shows the username of the person typing

### Multi-language Support
- **JavaScript/TypeScript**: Full support with syntax highlighting and IntelliSense
- **Python**: Syntax highlighting and basic completion
- **Java**: Syntax highlighting and error detection
- **C/C++**: Syntax highlighting and compilation hints
- **HTML/CSS**: Full web development support
- **JSON**: JSON validation and formatting
- **Markdown**: Live preview support

### Developer Experience
- **Syntax highlighting**: Full language-specific syntax highlighting
- **Code completion**: Intelligent code completion and suggestions
- **Error detection**: Real-time error detection and highlighting
- **Auto-save**: Automatic saving of code changes
- **File download**: Download code files with proper extensions
- **Theme support**: Dark/light theme support

## Room Types

### Chat Rooms
Traditional text-based chat rooms without code editing capabilities.

### Code Editor Rooms
Dedicated collaborative code editing rooms with:
- Full-featured Monaco Editor
- Real-time cursor tracking
- Chat functionality in a separate tab
- Language-specific features

### Mixed Mode Rooms
Combined chat and code editing in one room:
- Tabbed interface for switching between chat and code
- Shared participant list
- Unified room management

## Technical Implementation

### Database Schema

#### New Tables
```sql
-- Collaborative code documents
CREATE TABLE collaborative_code_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(8) NOT NULL,
  document_name VARCHAR(255) NOT NULL DEFAULT 'main.js',
  language VARCHAR(20) NOT NULL DEFAULT 'javascript',
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

-- User cursors for real-time tracking
CREATE TABLE user_cursors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(8) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  cursor_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

#### Updated Tables
- `chat_rooms`: Added `room_type`, `default_language`, `collaborative_mode`
- `chat_participants`: Added `cursor_position`, `cursor_color`, `is_typing`

### API Endpoints

#### Room Management
- `GET /api/chat/rooms/[id]` - Get room information including type
- `POST /api/chat/rooms/create` - Create rooms with type specification
- `POST /api/chat/rooms/verify` - Verify room access

#### Document Management
- `GET /api/chat/rooms/[id]/documents` - List code documents
- `POST /api/chat/rooms/[id]/documents` - Create new document
- `GET /api/chat/rooms/[id]/documents/[documentId]` - Get specific document
- `PUT /api/chat/rooms/[id]/documents/[documentId]` - Update document
- `DELETE /api/chat/rooms/[id]/documents/[documentId]` - Delete document

### Frontend Components

#### CollaborativeCodeInterface
Main component for collaborative coding rooms featuring:
- Monaco Editor with Y.js integration
- Real-time cursor tracking
- Chat interface in tabs
- Language selection
- File download functionality

#### Key Features
- **Y.js Integration**: Seamless integration with Monaco Editor
- **WebRTC Provider**: Peer-to-peer communication for low latency
- **Awareness**: Real-time cursor and selection tracking
- **Error Handling**: Graceful handling of connection issues
- **Performance**: Optimized for smooth real-time collaboration

## Setup and Configuration

### Environment Variables
```bash
# Required for Y.js WebRTC
NEXT_PUBLIC_YJS_SIGNALING_URL=wss://signaling.yjs.dev

# Optional: Custom signaling server
NEXT_PUBLIC_YJS_SIGNALING_URLS=["wss://your-signaling-server.com"]
```

### Dependencies
```json
{
  "yjs": "^13.6.27",
  "y-monaco": "^0.1.6",
  "y-webrtc": "^10.3.0",
  "@monaco-editor/react": "^4.7.0"
}
```

## Usage

### Creating a Code Room
1. Navigate to `/rooms/create`
2. Select "Code Editor" or "Mixed (Chat + Code)" room type
3. Choose default programming language
4. Set expiration time
5. Create room and share the link/password

### Joining a Code Room
1. Use the room link or enter room ID
2. Enter the room password
3. Choose a username (optional)
4. Start coding collaboratively

### Features in Action
- **Real-time editing**: See changes as they happen
- **Cursor tracking**: Watch other users' cursors move
- **Chat communication**: Discuss code in the chat tab
- **Language switching**: Change programming language on the fly
- **File download**: Download the current code file

## Maintenance

### Cleanup Scripts
```bash
# Clean up expired rooms and stale data
npm run cleanup:rooms

# Clean up stale cursors only
npm run cleanup:cursors

# Clean up offline participants
npm run cleanup:participants

# View room statistics
npm run stats:rooms
```

### Database Maintenance
- Automatic cleanup of expired rooms
- Stale cursor cleanup (older than 5 minutes)
- Offline participant cleanup (inactive for 10 minutes)
- Soft deletion of documents and cursors

## Performance Considerations

### Optimization
- **WebRTC**: Direct peer-to-peer communication reduces latency
- **Y.js**: Efficient operational transformation for conflict resolution
- **Monaco Editor**: Optimized for large code files
- **Caching**: Intelligent caching of editor state

### Scalability
- **Room limits**: Maximum 10 participants per room
- **Document size**: Optimized for typical code file sizes
- **Connection management**: Automatic cleanup of stale connections
- **Resource cleanup**: Automatic cleanup of expired rooms

## Security

### Privacy
- **Anonymous**: No registration required
- **Ephemeral**: Rooms auto-delete after expiration
- **Password protected**: Secure room access
- **No persistence**: Code is not permanently stored

### Data Protection
- **Encryption**: WebRTC communication is encrypted
- **Temporary storage**: Data is only stored during room lifetime
- **Access control**: Password-based room access
- **Audit logging**: Room creation and access logging

## Troubleshooting

### Common Issues

#### Connection Problems
- Check WebRTC support in browser
- Verify signaling server connectivity
- Check firewall settings for WebRTC

#### Cursor Not Showing
- Ensure awareness is properly initialized
- Check user permissions and room access
- Verify Y.js provider connection

#### Code Not Syncing
- Check Y.js document binding
- Verify Monaco Editor integration
- Check for JavaScript errors in console

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('yjs-debug', 'true');
```

## Future Enhancements

### Planned Features
- **Multiple documents**: Support for multiple files per room
- **Git integration**: Direct Git repository integration
- **Code execution**: Built-in code execution environment
- **Screen sharing**: Integrated screen sharing for pair programming
- **Voice chat**: Real-time voice communication
- **Code review**: Built-in code review tools

### Performance Improvements
- **Compression**: Optimize data transfer with compression
- **Caching**: Improved caching strategies
- **Load balancing**: Better load distribution for signaling servers
- **Mobile optimization**: Enhanced mobile experience

## Contributing

When contributing to collaborative coding features:

1. **Test thoroughly**: Test with multiple users and different scenarios
2. **Performance**: Ensure changes don't impact real-time performance
3. **Security**: Follow security best practices for real-time features
4. **Documentation**: Update this documentation for any new features
5. **Backward compatibility**: Maintain compatibility with existing rooms

## Support

For issues related to collaborative coding:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify network connectivity
4. Test with different browsers
5. Report issues with detailed reproduction steps
