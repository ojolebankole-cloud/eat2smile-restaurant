-- Phase 2: richer, privacy-minimised business analytics. Additive only.
ALTER TABLE analytics_events ADD COLUMN session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE analytics_events ADD COLUMN event_data TEXT NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_analytics_type_created ON analytics_events(event_type,created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_created ON analytics_events(page_path,created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id,created_at);
