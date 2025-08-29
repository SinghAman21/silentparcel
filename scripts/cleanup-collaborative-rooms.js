const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupCollaborativeRooms() {
  console.log('Starting cleanup of collaborative rooms...');
  
  try {
    // Get expired rooms
    const { data: expiredRooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('room_id, room_type, name, expires_at')
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (roomsError) {
      console.error('Error fetching expired rooms:', roomsError);
      return;
    }

    if (!expiredRooms || expiredRooms.length === 0) {
      console.log('No expired rooms found');
      return;
    }

    console.log(`Found ${expiredRooms.length} expired rooms`);

    for (const room of expiredRooms) {
      console.log(`Cleaning up room: ${room.name} (${room.room_id}) - Type: ${room.room_type}`);
      
      const roomId = room.room_id;

      // Mark room as inactive
      const { error: roomUpdateError } = await supabase
        .from('chat_rooms')
        .update({ is_active: false })
        .eq('room_id', roomId);

      if (roomUpdateError) {
        console.error(`Error deactivating room ${roomId}:`, roomUpdateError);
        continue;
      }

      // Delete messages
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);

      if (messagesError) {
        console.error(`Error deleting messages for room ${roomId}:`, messagesError);
      }

      // Delete participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', roomId);

      if (participantsError) {
        console.error(`Error deleting participants for room ${roomId}:`, participantsError);
      }

      // Delete code documents for collaborative rooms
      if (room.room_type !== 'chat') {
        const { error: documentsError } = await supabase
          .from('collaborative_code_documents')
          .delete()
          .eq('room_id', roomId);

        if (documentsError) {
          console.error(`Error deleting code documents for room ${roomId}:`, documentsError);
        } else {
          console.log(`✓ Deleted code documents for room ${roomId}`);
        }
      }

      // Delete user cursors
      const { error: cursorsError } = await supabase
        .from('user_cursors')
        .delete()
        .eq('room_id', roomId);

      if (cursorsError) {
        console.error(`Error deleting user cursors for room ${roomId}:`, cursorsError);
      }

      console.log(`✓ Cleaned up room ${roomId}`);
    }

    console.log('Collaborative room cleanup completed successfully');

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

async function cleanupStaleCursors() {
  console.log('Cleaning up stale cursors...');
  
  try {
    // Delete cursors older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: deletedCursors, error } = await supabase
      .from('user_cursors')
      .delete()
      .lt('last_updated', fiveMinutesAgo);

    if (error) {
      console.error('Error cleaning up stale cursors:', error);
      return;
    }

    console.log(`Cleaned up ${deletedCursors?.length || 0} stale cursors`);

  } catch (error) {
    console.error('Error during cursor cleanup:', error);
  }
}

async function cleanupOfflineParticipants() {
  console.log('Cleaning up offline participants...');
  
  try {
    // Mark participants as offline if they haven't been seen in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: updatedParticipants, error } = await supabase
      .from('chat_participants')
      .update({ is_online: false })
      .lt('last_seen', tenMinutesAgo)
      .eq('is_online', true);

    if (error) {
      console.error('Error updating offline participants:', error);
      return;
    }

    console.log(`Marked ${updatedParticipants?.length || 0} participants as offline`);

  } catch (error) {
    console.error('Error during participant cleanup:', error);
  }
}

async function getRoomStats() {
  console.log('Getting room statistics...');
  
  try {
    // Get room counts by type
    const { data: roomStats, error } = await supabase
      .from('chat_rooms')
      .select('room_type, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('Error getting room stats:', error);
      return;
    }

    const stats = {
      total: roomStats.length,
      chat: roomStats.filter(r => r.room_type === 'chat').length,
      code: roomStats.filter(r => r.room_type === 'code').length,
      mixed: roomStats.filter(r => r.room_type === 'mixed').length
    };

    console.log('Active rooms by type:', stats);

    // Get participant count
    const { count: participantCount, error: participantError } = await supabase
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);

    if (!participantError) {
      console.log(`Total online participants: ${participantCount || 0}`);
    }

    // Get document count
    const { count: documentCount, error: documentError } = await supabase
      .from('collaborative_code_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (!documentError) {
      console.log(`Total active code documents: ${documentCount || 0}`);
    }

  } catch (error) {
    console.error('Error getting stats:', error);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'cleanup':
      await cleanupCollaborativeRooms();
      await cleanupStaleCursors();
      await cleanupOfflineParticipants();
      break;
    case 'cursors':
      await cleanupStaleCursors();
      break;
    case 'participants':
      await cleanupOfflineParticipants();
      break;
    case 'stats':
      await getRoomStats();
      break;
    default:
      console.log('Usage: node cleanup-collaborative-rooms.js [cleanup|cursors|participants|stats]');
      console.log('');
      console.log('Commands:');
      console.log('  cleanup     - Clean up expired rooms, stale cursors, and offline participants');
      console.log('  cursors     - Clean up stale cursors only');
      console.log('  participants - Clean up offline participants only');
      console.log('  stats       - Show room statistics');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  cleanupCollaborativeRooms,
  cleanupStaleCursors,
  cleanupOfflineParticipants,
  getRoomStats
};
