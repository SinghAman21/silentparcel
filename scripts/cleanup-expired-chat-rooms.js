const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupExpiredRooms() {
  try {
    console.log('Starting cleanup of expired chat rooms...');

    // Get all expired rooms
    const { data: expiredRooms, error: expiredError } = await supabase
      .from('chat_rooms')
      .select('room_id')
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (expiredError) {
      console.error('Error fetching expired rooms:', expiredError);
      return;
    }

    if (!expiredRooms || expiredRooms.length === 0) {
      console.log('No expired rooms found.');
      return;
    }

    console.log(`Found ${expiredRooms.length} expired rooms to cleanup.`);

    const roomIds = expiredRooms.map(room => room.room_id);

    // Deactivate expired rooms
    const { error: deactivateError } = await supabase
      .from('chat_rooms')
      .update({ is_active: false })
      .in('room_id', roomIds);

    if (deactivateError) {
      console.error('Error deactivating expired rooms:', deactivateError);
      return;
    }

    // Delete messages from expired rooms
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .in('room_id', roomIds);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // Delete participants from expired rooms
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .delete()
      .in('room_id', roomIds);

    if (participantsError) {
      console.error('Error deleting participants:', participantsError);
    }

    console.log(`Successfully cleaned up ${expiredRooms.length} expired rooms.`);

  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupExpiredRooms()
    .then(() => {
      console.log('Cleanup completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredRooms }; 