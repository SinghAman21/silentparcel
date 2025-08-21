CREATE TABLE zip_subfile_metadata (
    id SERIAL PRIMARY KEY,
    zip_id INTEGER NOT NULL REFERENCES zip_file_metadata(id) ON DELETE CASCADE, 
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,  -- full path inside the zip archive
    size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    file_token VARCHAR(64) UNIQUE,  -- optional, for downloading individual file
    extracted BOOLEAN DEFAULT FALSE,
    downloaded_at TIMESTAMP NOT NULL DEFAULT now()   --default time zone is UTC
);

CREATE TABLE zip_file_metadata (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    download_token VARCHAR(64) UNIQUE NOT NULL,
    edit_token VARCHAR(64) UNIQUE NOT NULL,
    password VARCHAR(255),
    expiry_date TIMESTAMP,
    max_downloads INTEGER DEFAULT 10,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now(),
    uploaded_by VARCHAR(45) NOT NULL,
    last_downloaded_at TIMESTAMP NOT NULL DEFAULT now(), 
    appwrite_id VARCHAR(64) NOT NULL,
    encrypted_key TEXT NOT NULL,
    CONSTRAINT unique_appwrite_id UNIQUE (appwrite_id)
);

CREATE TABLE files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    download_token VARCHAR(64) NOT NULL,
    edit_token VARCHAR(64) NOT NULL,
    password VARCHAR(255),
    expiry_date TIMESTAMP,
    max_downloads INTEGER,
    download_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now(),  --default time zone is UTC
    uploaded_by VARCHAR(45) NOT NULL,
    last_downloaded_at TIMESTAMP
);

-- Optional: Add indexes for fast lookup by token and upload date
CREATE UNIQUE INDEX idx_files_download_token ON files(download_token);
CREATE UNIQUE INDEX idx_files_edit_token ON files(edit_token);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    ip_address INET,
    -- user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now()  --default time zone is UTC
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON public.audit_logs(ip_address);

-- Add comments for documentation
COMMENT ON TABLE public.audit_logs IS 'Stores audit trail for all system activities';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (file_upload, file_download, room_create, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource (file, chat_room, user, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID of the resource being acted upon';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID of the user performing the action (nullable for anonymous actions)';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address of the client';
-- COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent string from the client';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional metadata about the action in JSON format';

-- Create RLS (Row Level Security) policies if needed
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to read/write everything
CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create a view for common audit queries
CREATE OR REPLACE VIEW public.audit_summary AS
SELECT 
    action,
    resource_type,
    COUNT(*) as count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM public.audit_logs 
GROUP BY action, resource_type
ORDER BY count DESC;

-- Create a function to get audit logs for a specific resource
CREATE OR REPLACE FUNCTION get_resource_audit_logs(
    p_resource_type VARCHAR(50),
    p_resource_id VARCHAR(100),
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    action VARCHAR(50),
    user_id VARCHAR(100),
    ip_address INET,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
AS $$
    SELECT 
        audit_logs.id,
        audit_logs.action,
        audit_logs.user_id,
        audit_logs.ip_address,
        audit_logs.metadata,
        audit_logs.created_at
    FROM public.audit_logs
    WHERE 
        resource_type = p_resource_type 
        AND resource_id = p_resource_id
    ORDER BY created_at DESC
    LIMIT p_limit;
$$;
