-- Migration: Setup collaborative_code_documents table (fresh install, no migration)
-- Run this script in your Supabase SQL editor

-- Drop the old simple documents table (if it exists)
DROP TABLE IF EXISTS public.documents CASCADE;

-- Drop the new table if it already exists
DROP TABLE IF EXISTS collaborative_code_documents CASCADE;

-- Create the new structured collaborative_code_documents table
CREATE TABLE collaborative_code_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(8) NOT NULL REFERENCES chat_rooms(room_id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL DEFAULT 'main.js',
  language VARCHAR(20) NOT NULL DEFAULT 'javascript',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255), -- Matching chat_participants.user_id
  last_edited_by VARCHAR(255), -- Matching chat_participants.user_id  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Unique constraint: one document per room (can adjust if multiple docs needed)
  UNIQUE(room_id, document_name)
);

-- Ensure updated_at always refreshes on update
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_document_timestamp_trigger ON collaborative_code_documents;
CREATE TRIGGER update_document_timestamp_trigger
  BEFORE UPDATE ON collaborative_code_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_timestamp();

-- ✅ Enable Row Level Security
ALTER TABLE collaborative_code_documents ENABLE ROW LEVEL SECURITY;

-- 🔒 Policies for access control

-- Allow read access to documents in active rooms
CREATE POLICY "Allow read access to documents in active rooms" 
ON collaborative_code_documents
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.room_id = collaborative_code_documents.room_id 
    AND chat_rooms.is_active = TRUE
  )
);

-- Allow insert for new documents
CREATE POLICY "Allow insert for new documents" 
ON collaborative_code_documents
FOR INSERT 
WITH CHECK (TRUE);

-- Allow update for documents
CREATE POLICY "Allow update for documents" 
ON collaborative_code_documents
FOR UPDATE 
USING (TRUE);

-- Allow delete for cleanup
CREATE POLICY "Allow delete for cleanup" 
ON collaborative_code_documents
FOR DELETE 
USING (TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_code_documents_room_id ON collaborative_code_documents(room_id);
CREATE INDEX IF NOT EXISTS idx_code_documents_language ON collaborative_code_documents(language);
CREATE INDEX IF NOT EXISTS idx_code_documents_updated_at ON collaborative_code_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_code_documents_is_active ON collaborative_code_documents(is_active);

-- Enable real-time for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE collaborative_code_documents;

-- Final note
COMMENT ON TABLE collaborative_code_documents IS 'Stores collaborative code documents with proper structure and security';
