-- ==========================================
-- Session Lifecycle Pipeline Tables
-- For Villa Hadad Photo Studio
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Table: sessions
-- Stores photoshoot session information
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    
    -- Storage paths
    nas_path TEXT,                              -- Local NAS/Synology path
    cloud_gallery_url TEXT,                     -- Public R2 gallery URL
    
    -- Session status
    status TEXT NOT NULL DEFAULT 'ingesting' 
        CHECK (status IN ('ingesting', 'selecting', 'editing', 'printing', 'completed')),
    
    -- Selection method
    selection_method TEXT NOT NULL DEFAULT 'studio'
        CHECK (selection_method IN ('studio', 'remote', 'hybrid')),
    
    -- Image counts
    total_images INTEGER NOT NULL DEFAULT 0,
    selected_images INTEGER NOT NULL DEFAULT 0,
    uploaded_images INTEGER NOT NULL DEFAULT 0,
    edited_images INTEGER NOT NULL DEFAULT 0,
    final_images INTEGER NOT NULL DEFAULT 0,
    
    -- Progress
    upload_progress INTEGER NOT NULL DEFAULT 0 CHECK (upload_progress >= 0 AND upload_progress <= 100),
    selection_progress INTEGER NOT NULL DEFAULT 0 CHECK (selection_progress >= 0 AND selection_progress <= 100),
    editing_progress INTEGER NOT NULL DEFAULT 0 CHECK (editing_progress >= 0 AND editing_progress <= 100),
    printing_progress INTEGER NOT NULL DEFAULT 0 CHECK (printing_progress >= 0 AND printing_progress <= 100),
    
    -- Timeline
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Selection deadline
    selection_deadline TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_booking_id ON sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- ==========================================
-- Table: session_images
-- Stores individual images within a session
-- ==========================================
CREATE TABLE IF NOT EXISTS session_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- File information
    file_name TEXT NOT NULL,
    original_path TEXT,                         -- Path to original file on NAS
    cloud_url TEXT,                             -- URL to compressed version on R2
    thumbnail_url TEXT,                         -- URL to thumbnail
    
    -- Image metadata
    file_size BIGINT,                           -- Size in bytes
    width INTEGER,
    height INTEGER,
    format TEXT,                                -- jpg, png, raw, cr2, etc.
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'selected', 'rejected', 'editing', 'edited', 'final', 'archived')),
    
    -- Selection info
    selected_by TEXT CHECK (selected_by IN ('client', 'selector', 'designer')),
    selected_at TIMESTAMPTZ,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    like_count INTEGER NOT NULL DEFAULT 0,
    
    -- Client notes/comments
    client_notes TEXT,
    editor_notes TEXT,
    
    -- Sorting and organization
    sort_order INTEGER NOT NULL DEFAULT 0,
    category TEXT,                              -- For grouping (e.g., "ceremony", "portraits")
    
    -- Upload/sync tracking
    uploaded_at TIMESTAMPTZ,
    synced_to_cloud BOOLEAN NOT NULL DEFAULT FALSE,
    cloud_uploaded_at TIMESTAMPTZ,
    
    -- Processing flags
    has_watermark BOOLEAN NOT NULL DEFAULT FALSE,
    has_retouch BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    exif_data JSONB DEFAULT '{}'::jsonb,        -- Camera EXIF data
    ai_tags JSONB DEFAULT '[]'::jsonb,          -- Auto-detected tags
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for session_images
CREATE INDEX IF NOT EXISTS idx_session_images_session_id ON session_images(session_id);
CREATE INDEX IF NOT EXISTS idx_session_images_booking_id ON session_images(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_images_status ON session_images(status);
CREATE INDEX IF NOT EXISTS idx_session_images_selected_by ON session_images(selected_by) WHERE selected_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_images_sort_order ON session_images(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_session_images_synced ON session_images(synced_to_cloud) WHERE synced_to_cloud = FALSE;

-- ==========================================
-- Functions and Triggers
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session_images
DROP TRIGGER IF EXISTS update_session_images_updated_at ON session_images;
CREATE TRIGGER update_session_images_updated_at
    BEFORE UPDATE ON session_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Realtime Subscriptions
-- ==========================================

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_images;

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sessions for their organization's bookings
CREATE POLICY "Users can view sessions for their bookings"
    ON sessions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.id = sessions.booking_id
    ));

-- Policy: Users can view images for their sessions
CREATE POLICY "Users can view images for their sessions"
    ON session_images FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM sessions
        WHERE sessions.id = session_images.session_id
    ));

-- Policy: Staff can insert/update sessions
CREATE POLICY "Staff can manage sessions"
    ON sessions FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Staff can manage session images
CREATE POLICY "Staff can manage session images"
    ON session_images FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- Sample Query Helpers
-- ==========================================

-- View: Session summary with image counts
CREATE OR REPLACE VIEW session_summary AS
SELECT 
    s.*,
    b.client_name as booking_client_name,
    b.status as booking_status,
    COUNT(si.id) as actual_image_count,
    COUNT(si.id) FILTER (WHERE si.status = 'selected') as actual_selected_count,
    COUNT(si.id) FILTER (WHERE si.synced_to_cloud = TRUE) as synced_count
FROM sessions s
LEFT JOIN bookings b ON s.booking_id = b.id
LEFT JOIN session_images si ON s.id = si.session_id
GROUP BY s.id, b.client_name, b.status;

-- Comment explaining the tables
COMMENT ON TABLE sessions IS 'Photoshoot sessions with dual-path storage (NAS + R2)';
COMMENT ON TABLE session_images IS 'Individual images with metadata and selection status';
