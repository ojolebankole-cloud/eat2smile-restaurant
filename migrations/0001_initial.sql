PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS customers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
 full_name TEXT NOT NULL, phone TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
 id_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);
CREATE TABLE IF NOT EXISTS menu_items (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 price_ngn INTEGER NOT NULL CHECK(price_ngn >= 0), image_url TEXT NOT NULL DEFAULT '', tag TEXT,
 is_available INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, order_reference TEXT NOT NULL UNIQUE, customer_id TEXT NOT NULL REFERENCES customers(id),
 idempotency_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('New','Accepted','Cooking','Ready for Pickup','On Delivery','Delivered','Cancelled')) DEFAULT 'New',
 order_type TEXT NOT NULL CHECK(order_type IN ('Delivery','Pickup')),
 customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL, delivery_address TEXT,
 delivery_instructions TEXT NOT NULL DEFAULT '', subtotal_ngn INTEGER NOT NULL CHECK(subtotal_ngn >= 0),
 delivery_fee_ngn INTEGER NOT NULL DEFAULT 0 CHECK(delivery_fee_ngn >= 0), total_ngn INTEGER NOT NULL CHECK(total_ngn >= 0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(customer_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(order_reference);
CREATE TABLE IF NOT EXISTS order_items (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 menu_item_id TEXT REFERENCES menu_items(id), item_name TEXT NOT NULL, unit_price_ngn INTEGER NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 50), line_total_ngn INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_status_events (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', changed_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_events ON order_status_events(order_id, created_at);
CREATE TABLE IF NOT EXISTS staff_users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL CHECK(role IN ('admin','manager','kitchen')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS login_attempts (
 key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started TEXT NOT NULL
);
