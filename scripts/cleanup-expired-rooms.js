// scripts/cleanup-expired-rooms.js
// This script deletes chat rooms where is_active is FALSE and creates audit logs.
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

async function deleteInactiveRooms() {
  try {
    console.log('Starting deletion of inactive chat rooms...');
    const startTime = new Date();
    console.log('Current time:', startTime.toISOString());

    // Get all rooms where is_active is FALSE
    console.log('Fetching inactive rooms from database...');
    const { data: inactiveRooms, error: fetchError } = await supabaseAdmin
      .from('chat_rooms')
      .select('room_id, name, room_type, created_by, expires_at, created_at')
      .eq('is_active', false);

    if (fetchError) {
      console.error('Error fetching inactive rooms:', fetchError);
      return;
    }

    if (!inactiveRooms || inactiveRooms.length === 0) {
      console.log('No inactive rooms found to delete.');
      return;
    }

    console.log(`Found ${inactiveRooms.length} inactive rooms to delete.`);
    
    let successCount = 0;
    let errorCount = 0;

    // Process each inactive room individually
    for (const room of inactiveRooms) {
      try {
        console.log(`\nDeleting inactive room: ${room.room_id} (${room.name || 'Unnamed'}) - Type: ${room.room_type || 'chat'}`);
        
        // Delete the inactive room record
        console.log(`Deleting room record ${room.room_id}...`);
        const { error: deleteError } = await supabaseAdmin
          .from('chat_rooms')
          .delete()
          .eq('room_id', room.room_id)
          .eq('is_active', false); // Extra safety check

        if (deleteError) {
          console.error(`Error deleting room ${room.room_id}:`, deleteError);
          errorCount++;
          continue;
        }
        
        // Insert audit log for room deletion
        console.log(`Inserting audit log for deleted room ${room.room_id}...`);
        const { error: auditError } = await supabaseAdmin
          .from('audit_logs')
          .insert({
            action: 'room_record_deleted',
            resource_type: 'chat_room',
            resource_id: room.room_id,
            user_id: room.created_by || null,
            metadata: {
              room_name: room.name,
              room_type: room.room_type,
              expired_at: room.expires_at,
              created_at: room.created_at,
              reason: 'inactive room record deleted',
              deletion_time: new Date().toISOString()
            }
          });

        if (auditError) {
          console.error(`Failed to insert audit log for deleted room ${room.room_id}:`, auditError);
        }
        
        console.log(`✅ Successfully deleted inactive room ${room.room_id}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing inactive room ${room.room_id}:`, error);
        errorCount++;
      }
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n📊 Deletion Summary:`);
    console.log(`   Total inactive rooms processed: ${inactiveRooms.length}`);
    console.log(`   Successfully deleted: ${successCount}`);
    console.log(`   Errors encountered: ${errorCount}`);
    console.log(`   Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   Completed at: ${endTime.toISOString()}`);

  } catch (error) {
    console.error('❌ Cleanup script failed with error:', error);
    throw error;
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      await deleteInactiveRooms();
      console.log('\n🎉 Cleanup completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { 
  deleteInactiveRooms
}; 