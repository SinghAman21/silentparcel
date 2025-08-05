-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'e9edc828fd6f24858da92576ad6fece5b989cda34ed8d30153dbe6738a55eea11e9f530bb13215aede003252e828422e9edc828fd6f248582ada7e62a6895c29ae3d007a44ca201';

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  expiry_time VARCHAR(10) NOT NULL DEFAULT '1h',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(8) NOT NULL,
  username VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id VARCHAR(255)
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(8) NOT NULL,
  username VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  user_id VARCHAR(255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_id ON chat_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_expires_at ON chat_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_username ON chat_participants(username);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_rooms
CREATE POLICY "Allow public read access to active chat rooms" ON chat_rooms
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Allow insert for chat room creation" ON chat_rooms
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow update for room expiry" ON chat_rooms
  FOR UPDATE USING (TRUE);

-- Create policies for chat_messages
CREATE POLICY "Allow read access to messages in active rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.room_id = chat_messages.room_id 
      AND chat_rooms.is_active = TRUE
    )
  );

CREATE POLICY "Allow insert for new messages" ON chat_messages
  FOR INSERT WITH CHECK (TRUE);

-- Create policies for chat_participants
CREATE POLICY "Allow read access to participants in active rooms" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.room_id = chat_participants.room_id 
      AND chat_rooms.is_active = TRUE
    )
  );

CREATE POLICY "Allow insert for new participants" ON chat_participants
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow update for participant status" ON chat_participants
  FOR UPDATE USING (TRUE);

-- Create function to automatically set expiry time
CREATE OR REPLACE FUNCTION set_room_expiry()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.expiry_time
    WHEN '30m' THEN NEW.expires_at := NOW() + INTERVAL '30 minutes';
    WHEN '1h' THEN NEW.expires_at := NOW() + INTERVAL '1 hour';
    WHEN '2h' THEN NEW.expires_at := NOW() + INTERVAL '2 hours';
    WHEN '6h' THEN NEW.expires_at := NOW() + INTERVAL '6 hours';
    WHEN '24h' THEN NEW.expires_at := NOW() + INTERVAL '24 hours';
    ELSE NEW.expires_at := NOW() + INTERVAL '1 hour';
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expiry time
CREATE TRIGGER set_room_expiry_trigger
  BEFORE INSERT ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_expiry();

-- Create function to clean up expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  UPDATE chat_rooms 
  SET is_active = FALSE 
  WHERE expires_at < NOW() AND is_active = TRUE;
  
  DELETE FROM chat_messages 
  WHERE room_id IN (
    SELECT room_id FROM chat_rooms WHERE is_active = FALSE
  );
  
  DELETE FROM chat_participants 
  WHERE room_id IN (
    SELECT room_id FROM chat_rooms WHERE is_active = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Enable real-time for tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants; 