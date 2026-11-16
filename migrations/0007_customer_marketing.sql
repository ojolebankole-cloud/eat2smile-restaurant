-- Phase 4-5: guest customer engagement, reviews, promotions, coupons and rewards.
-- Additive migration; preserves existing orders, menu items and analytics.
ALTER TABLE orders ADD COLUMN coupon_code TEXT;
ALTER TABLE orders ADD COLUMN discount_ngn INTEGER NOT NULL DEFAULT 0 CHECK(discount_ngn >= 0);
ALTER TABLE orders ADD COLUMN referral_code TEXT;
CREATE TABLE IF NOT EXISTS customer_reviews (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), menu_item_id TEXT REFERENCES menu_items(id),
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), title TEXT NOT NULL DEFAULT '', comment TEXT NOT NULL,
 display_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(order_id,menu_item_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_public ON customer_reviews(status,created_at DESC);
CREATE TABLE IF NOT EXISTS coupons (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE, description TEXT NOT NULL DEFAULT '',
 discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')), discount_value INTEGER NOT NULL CHECK(discount_value>0),
 min_order_ngn INTEGER NOT NULL DEFAULT 0, max_discount_ngn INTEGER, starts_at TEXT, ends_at TEXT,
 usage_limit INTEGER, per_phone_limit INTEGER NOT NULL DEFAULT 1, usage_count INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
 id TEXT PRIMARY KEY, coupon_id TEXT NOT NULL REFERENCES coupons(id), order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
 phone_hash TEXT NOT NULL, discount_ngn INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupon_phone ON coupon_redemptions(coupon_id,phone_hash);
CREATE TABLE IF NOT EXISTS marketing_campaigns (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, campaign_type TEXT NOT NULL CHECK(campaign_type IN ('announcement','promotion','new_item','daily_special','limited_offer')),
 starts_at TEXT, ends_at TEXT, image_url TEXT, link_url TEXT, active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS guest_favorites (
 id TEXT PRIMARY KEY, visitor_hash TEXT NOT NULL, menu_item_id TEXT NOT NULL REFERENCES menu_items(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(visitor_hash,menu_item_id)
);
CREATE TABLE IF NOT EXISTS guest_notification_subscriptions (
 id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, visitor_hash TEXT NOT NULL,
 new_items INTEGER NOT NULL DEFAULT 1, promotions INTEGER NOT NULL DEFAULT 1,
 verified_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(email,visitor_hash)
);
CREATE TABLE IF NOT EXISTS loyalty_accounts (
 id TEXT PRIMARY KEY, phone_hash TEXT NOT NULL UNIQUE, points INTEGER NOT NULL DEFAULT 0 CHECK(points>=0), referral_code TEXT NOT NULL UNIQUE,
 referred_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS loyalty_ledger (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES loyalty_accounts(id), order_id TEXT REFERENCES orders(id),
 points_delta INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(account_id,order_id,reason)
);
CREATE INDEX IF NOT EXISTS idx_loyalty_phone ON loyalty_accounts(phone_hash);
