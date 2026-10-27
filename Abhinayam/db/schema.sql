-- Abhinayam Silks – database schema (SQLite)
-- Idempotent: safe to run on every start-up.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  slug         TEXT    NOT NULL UNIQUE,
  description  TEXT    NOT NULL DEFAULT '',
  image_url    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sku          TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  fabric       TEXT    NOT NULL DEFAULT '',
  color        TEXT    NOT NULL DEFAULT '',
  price        REAL    NOT NULL CHECK (price >= 0),
  mrp          REAL             CHECK (mrp IS NULL OR mrp >= 0),
  description  TEXT    NOT NULL DEFAULT '',
  stock_qty    INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_featured  INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);

CREATE TABLE IF NOT EXISTS product_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT    NOT NULL,
  alt         TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no        TEXT    NOT NULL UNIQUE,
  customer_name   TEXT    NOT NULL,
  phone           TEXT    NOT NULL,
  address         TEXT    NOT NULL,
  city            TEXT    NOT NULL DEFAULT '',
  pincode         TEXT    NOT NULL DEFAULT '',
  notes           TEXT    NOT NULL DEFAULT '',
  total           REAL    NOT NULL CHECK (total >= 0),
  status          TEXT    NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','confirmed','shipped','delivered','cancelled')),
  payment_status  TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending','paid','refunded')),
  payment_ref     TEXT    NOT NULL DEFAULT '',
  tracking_info   TEXT    NOT NULL DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT    NOT NULL,
  sku           TEXT    NOT NULL,
  unit_price    REAL    NOT NULL CHECK (unit_price >= 0),
  qty           INTEGER NOT NULL CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Portal users. role 'admin' = full access; role 'staff' = stock management only.
-- Older databases are upgraded with the extra columns automatically (see src/db.js).
CREATE TABLE IF NOT EXISTS admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','staff')),
  display_name   TEXT    NOT NULL DEFAULT '',
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  last_login_at  TEXT,
  created_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail of manual stock changes made from the admin / staff portal
CREATE TABLE IF NOT EXISTS stock_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  sku         TEXT    NOT NULL,
  product_name TEXT   NOT NULL,
  old_qty     INTEGER NOT NULL,
  new_qty     INTEGER NOT NULL,
  note        TEXT    NOT NULL DEFAULT '',
  changed_by  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_log_created ON stock_log(created_at);

-- Editable site content & contact details (managed from the admin panel)
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL DEFAULT ''
);
