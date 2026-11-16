-- Additive Admin Dashboard foundation. Existing customer/order/menu records are preserved.
ALTER TABLE menu_items ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN discount_price_ngn INTEGER;
ALTER TABLE menu_items ADD COLUMN special_starts_at TEXT;
ALTER TABLE menu_items ADD COLUMN special_ends_at TEXT;
ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Unspecified';
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Unconfirmed';
ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
CREATE TABLE IF NOT EXISTS menu_categories (
 id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, sort_order INTEGER NOT NULL DEFAULT 0,
 is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO menu_categories(id,name,sort_order) SELECT lower(replace(category,' ','-')),category,MIN(sort_order) FROM menu_items GROUP BY category;
CREATE TABLE IF NOT EXISTS site_content (
 content_key TEXT PRIMARY KEY, content_value TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_by TEXT
);
CREATE TABLE IF NOT EXISTS analytics_events (
 id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL, event_type TEXT NOT NULL,
 page_path TEXT NOT NULL, referrer_host TEXT NOT NULL DEFAULT '', device_type TEXT NOT NULL DEFAULT 'unknown',
 country_code TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id,created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_type,created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status,created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_method,payment_status);
