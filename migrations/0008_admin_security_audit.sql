-- Phase 6: security controls and auditable administration. Additive; no business records are removed.
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_actor ON admin_activity_logs(admin_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
