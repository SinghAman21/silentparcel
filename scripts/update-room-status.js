require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables for Supabase');
  throw new Error('Missing required environment variables for Supabase');
}

// Initialize Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deactivateExpiredRooms() {
  try {
    console.log('Starting deactivation of expired chat rooms...');
    const startTime = new Date();
    console.log('Current time:', startTime.toISOString());

    // Get all rooms and filter by GMT-adjusted expiry time
    console.log('Fetching rooms from database and checking GMT-adjusted expiry...');
    const { data: allRooms, error: fetchError } = await supabaseAdmin
      .from('chat_rooms')
      .select('room_id, name, room_type, created_by, expires_at, created_at')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching rooms:', fetchError);
      return;
    }

    // Filter rooms that are expired after converting expires_at to GMT (+5:30)
    const currentGMT = new Date();
    const expiredRooms = allRooms.filter(room => {
      if (!room.expires_at) return false;
      
      // Convert expires_at to GMT by adding 5:30 hours (IST offset)
      const expiryTime = new Date(room.expires_at);
      const gmtExpiryTime = new Date(expiryTime.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5:30 hours
      
      console.log(`Room ${room.room_id}: Original expiry: ${expiryTime.toISOString()}, GMT adjusted: ${gmtExpiryTime.toISOString()}, Current GMT: ${currentGMT.toISOString()}`);
      
      return gmtExpiryTime <= currentGMT;
    });

    if (!expiredRooms || expiredRooms.length === 0) {
      console.log('No expired rooms found.');
      return;
    }

    console.log(`Found ${expiredRooms.length} expired rooms to deactivate.`);
    
    let successCount = 0;
    let errorCount = 0;

    // Process each room individually
    for (const room of expiredRooms) {
      try {
        console.log(`\nProcessing expired room: ${room.room_id} (${room.name || 'Unnamed'}) - Type: ${room.room_type || 'chat'}`);
        // Calculate GMT-adjusted expiry time for logging
        const originalExpiry = new Date(room.expires_at);
        const gmtExpiry = new Date(originalExpiry.getTime() + (5.5 * 60 * 60 * 1000));
        console.log(`Room expired at: ${room.expires_at} (Original), GMT adjusted: ${gmtExpiry.toISOString()}, created at: ${room.created_at}`);
        
        // Deactivate the room
        console.log(`Deactivating room ${room.room_id}...`);
        const { error: deactivateError } = await supabaseAdmin
          .from('chat_rooms')
          .update({ is_active: false })
          .eq('room_id', room.room_id);

        if (deactivateError) {
          console.error(`Error deactivating room ${room.room_id}:`, deactivateError);
          errorCount++;
          continue;
        }
        
        console.log(`✅ Successfully deactivated room ${room.room_id}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing room ${room.room_id}:`, error);
        errorCount++;
      }
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n📊 Deactivation Summary:`);
    console.log(`   Total rooms processed: ${expiredRooms.length}`);
    console.log(`   Successfully deactivated: ${successCount}`);
    console.log(`   Errors encountered: ${errorCount}`);
    console.log(`   Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   Completed at: ${endTime.toISOString()}`);

  } catch (error) {
    console.error('❌ Deactivation script failed with error:', error);
    throw error;
  }
}

// Run deactivation if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      await deactivateExpiredRooms();
      console.log('\n🎉 Deactivation completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Deactivation failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { 
  deactivateExpiredRooms
};
