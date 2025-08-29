-- Migration script to fix user_id fields for UUID compatibility
-- Run this if you're getting UUID validation errors

-- Option 1: Keep VARCHAR but ensure it's long enough for UUIDs
-- UUIDs are 36 characters long (including hyphens)
ALTER TABLE chat_messages ALTER COLUMN user_id TYPE VARCHAR(36);
ALTER TABLE chat_participants ALTER COLUMN user_id TYPE VARCHAR(36);  
ALTER TABLE user_cursors ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE collaborative_code_documents ALTER COLUMN created_by TYPE VARCHAR(36);
ALTER TABLE chat_rooms ALTER COLUMN created_by TYPE VARCHAR(36);
ALTER TABLE audit_logs ALTER COLUMN user_id TYPE VARCHAR(36);

-- Option 2: Convert to actual UUID type (uncomment if you prefer this)
-- Note: This will require data migration if you have existing data
/*
-- First, create a backup and clean any invalid data
-- Then alter the columns to UUID type

ALTER TABLE chat_messages ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE chat_participants ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE user_cursors ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE collaborative_code_documents ALTER COLUMN created_by TYPE UUID USING created_by::UUID;
ALTER TABLE chat_rooms ALTER COLUMN created_by TYPE UUID USING created_by::UUID;
ALTER TABLE audit_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
*/

-- Update any existing invalid user_id values with proper UUIDs
-- (Only run this if you have existing data with invalid formats)
/*
UPDATE chat_participants SET user_id = gen_random_uuid()::text WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE chat_messages SET user_id = gen_random_uuid()::text WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE user_cursors SET user_id = gen_random_uuid()::text WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
*/