-- ProResto — PostgreSQL Schema
-- Run once on your Neon / Supabase / Railway DB

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  pwd_hash    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'client',  -- 'superadmin' | 'client'
  status      TEXT NOT NULL DEFAULT 'pending', -- 'active' | 'pending' | 'suspended'
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  verify_code TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed super-admin (password: Admin@2026)
INSERT INTO users (id, email, pwd_hash, name, role, status, verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'yahiakholy2@gmail.com',
  crypt('Admin@2026', gen_salt('bf')),
  'Yahia El-Kholy',
  'superadmin',
  'active',
  TRUE
) ON CONFLICT DO NOTHING;

-- Seed demo client (password: Demo@123)
INSERT INTO users (id, email, pwd_hash, name, role, status, verified)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'demo@restaurant.com',
  crypt('Demo@123', gen_salt('bf')),
  'The Italian Corner',
  'client',
  'active',
  TRUE
) ON CONFLICT DO NOTHING;

-- ── Branches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  unit        TEXT NOT NULL DEFAULT 'kg',
  unit_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
  waste_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recipes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  name_ar    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  inv_id     UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  grams      NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ── Menu Items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  recipe_id   UUID REFERENCES recipes(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  category    TEXT,
  category_ar TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  sales_vol   INTEGER NOT NULL DEFAULT 0,
  manual_cost NUMERIC(10,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Waste Log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  inv_id     UUID REFERENCES inventory(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  qty        NUMERIC(10,3) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  reason     TEXT,
  reason_ar  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── P&L Channels & Categories ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnl_channels (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  name_ar   TEXT,
  comm_rate NUMERIC(5,2),   -- NULL = no commission
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pnl_categories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  name_ar   TEXT,
  is_cogs   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- ── P&L Entries (flat time-series) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnl_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  entry_type  TEXT NOT NULL,  -- 'rev' | 'exp'
  cat_id      UUID,           -- references pnl_channels.id or pnl_categories.id
  entry_date  DATE NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_user   ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_user       ON waste_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pnl_entries_user ON pnl_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_menu_user        ON menu_items(user_id);
