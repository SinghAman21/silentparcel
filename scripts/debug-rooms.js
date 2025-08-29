// Debug script for room and document issues
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRoom(roomId) {
  console.log(`🔍 Debugging room: ${roomId}`);
  console.log('=' .repeat(50));
  
  try {
    // Check if room exists
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (roomError) {
      console.log('❌ Room Error:', roomError.message);
      console.log('   Details:', roomError.details || 'None');
      console.log('   Code:', roomError.code || 'Unknown');
      
      // Check if any rooms exist at all
      const { data: allRooms, error: allRoomsError } = await supabase
        .from('chat_rooms')
        .select('room_id, name, is_active, created_at')
        .limit(5);
        
      if (!allRoomsError && allRooms) {
        console.log('\\n📋 Recent rooms in database:');
        allRooms.forEach(r => {
          console.log(`   ${r.room_id} - ${r.name} (${r.is_active ? 'active' : 'inactive'}) - ${r.created_at}`);
        });
      }
      return;
    }

    if (!room) {
      console.log('❌ Room not found in database');
      return;
    }

    console.log('✅ Room found:');
    console.log('   ID:', room.room_id);
    console.log('   Name:', room.name);
    console.log('   Type:', room.room_type);
    console.log('   Active:', room.is_active);
    console.log('   Created:', room.created_at);
    console.log('   Expires:', room.expires_at);
    console.log('   Expired:', new Date(room.expires_at) < new Date() ? 'YES' : 'NO');
    
    // Check participants
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId);
      
    if (!participantsError && participants) {
      console.log(`\\n👥 Participants (${participants.length}):`);
      participants.forEach(p => {
        console.log(`   ${p.username} (${p.user_id}) - ${p.is_online ? 'online' : 'offline'}`);
      });
    }
    
    // Check documents
    const { data: documents, error: documentsError } = await supabase
      .from('collaborative_code_documents')
      .select('*')
      .eq('room_id', roomId);
      
    if (!documentsError && documents) {
      console.log(`\\n📄 Documents (${documents.length}):`);
      documents.forEach(d => {
        console.log(`   ${d.document_name} (${d.language}) - ${d.is_active ? 'active' : 'inactive'}`);
        console.log(`      Created: ${d.created_at}`);
        console.log(`      Updated: ${d.updated_at}`);
        console.log(`      Content length: ${d.content ? d.content.length : 0} chars`);
      });
    } else if (documentsError) {
      console.log('❌ Error fetching documents:', documentsError.message);
    }
    
    // Check messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (!messagesError && messages) {
      console.log(`\\n💬 Recent messages (${messages.length}):`);
      messages.forEach(m => {
        console.log(`   ${m.username}: ${m.message.substring(0, 50)}... (${m.created_at})`);
      });
    }
    
  } catch (error) {
    console.error('🚨 Debug error:', error);
  }
}

async function listRecentRooms() {
  console.log('🏠 Recent Rooms');
  console.log('=' .repeat(30));
  
  try {
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select('room_id, name, room_type, is_active, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('No rooms found in database');
      return;
    }
    
    rooms.forEach(room => {
      const expired = new Date(room.expires_at) < new Date();
      const status = !room.is_active ? 'INACTIVE' : expired ? 'EXPIRED' : 'ACTIVE';
      console.log(`${room.room_id} - ${room.name} (${room.room_type}) [${status}]`);
      console.log(`   Created: ${room.created_at}`);
      console.log(`   Expires: ${room.expires_at}`);
    });
    
  } catch (error) {
    console.error('Error listing rooms:', error);
  }
}

async function checkTableExists() {
  console.log('🗄️  Table Existence Check');
  console.log('=' .repeat(30));
  
  const tables = [
    'chat_rooms',
    'chat_participants', 
    'chat_messages',
    'collaborative_code_documents',
    'user_cursors'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: OK`);
      }
    } catch (error) {
      console.log(`🚨 ${table}: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const roomId = process.argv[3];
  
  switch (command) {
    case 'debug':
      if (!roomId) {
        console.log('Usage: node debug-rooms.js debug <room_id>');
        return;
      }
      await debugRoom(roomId);
      break;
      
    case 'list':
      await listRecentRooms();
      break;
      
    case 'tables':
      await checkTableExists();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node debug-rooms.js debug <room_id>  - Debug specific room');
      console.log('  node debug-rooms.js list             - List recent rooms');
      console.log('  node debug-rooms.js tables           - Check table existence');
      console.log('');
      console.log('Example:');
      console.log('  node debug-rooms.js debug Ix77TcpV');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  debugRoom,
  listRecentRooms,
  checkTableExists
};