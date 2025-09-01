-- Script to clean up phantom users created before the fix
-- Run this in your Supabase SQL editor to remove existing phantom participants

-- Remove phantom participants with generated usernames
DELETE FROM chat_participants 
WHERE username LIKE 'User_%' 
   OR username LIKE 'Guest_%' 
   OR username ~ '^User_[a-z0-9]{6}$'
   OR username ~ '^Guest_[a-z0-9]{6}$';

-- Optional: Also remove messages from phantom users
DELETE FROM chat_messages 
WHERE username LIKE 'User_%' 
   OR username LIKE 'Guest_%' 
   OR username ~ '^User_[a-z0-9]{6}$'
   OR username ~ '^Guest_[a-z0-9]{6}$';

-- Check for any remaining phantom users (should return 0 rows)
SELECT COUNT(*) as phantom_count 
FROM chat_participants 
WHERE username LIKE 'User_%' 
   OR username LIKE 'Guest_%' 
   OR username ~ '^User_[a-z0-9]{6}$'
   OR username ~ '^Guest_[a-z0-9]{6}$';

-- Show current participants (should only show real users now)
SELECT room_id, username, joined_at, is_online 
FROM chat_participants 
ORDER BY joined_at DESC;