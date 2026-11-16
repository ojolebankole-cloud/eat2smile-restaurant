-- Phase 3: secure online payments and WhatsApp-coordinated manual payments.
-- Additive only: existing orders and payment records are preserved.
ALTER TABLE orders ADD COLUMN customer_email TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('flutterwave')),
  tx_ref TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT UNIQUE,
  amount_ngn INTEGER NOT NULL CHECK(amount_ngn >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL CHECK(status IN ('Pending','Successful','Failed','Cancelled','Expired')) DEFAULT 'Pending',
  checkout_url TEXT,
  provider_reference TEXT,
  payment_type TEXT,
  failure_reason TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status,updated_at);
