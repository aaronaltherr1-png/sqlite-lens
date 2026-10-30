import initSqlJs from 'sql.js';
import fs from 'fs';

async function generateProDatabases() {
  const SQL = await initSqlJs();

  // ==========================================
  // 1. SaaS Cloud Production Database (Default)
  // ==========================================
  const dbSaas = new SQL.Database();
  dbSaas.run(`
    CREATE TABLE organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      tier TEXT CHECK(tier IN ('free', 'starter', 'growth', 'enterprise')) DEFAULT 'starter',
      monthly_revenue REAL DEFAULT 0.0,
      billing_email TEXT NOT NULL,
      region TEXT DEFAULT 'us-east-1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('owner', 'admin', 'developer', 'viewer')) DEFAULT 'developer',
      mfa_enabled BOOLEAN DEFAULT 1,
      last_active_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      plan_name TEXT NOT NULL,
      seat_count INTEGER DEFAULT 5,
      price_per_month REAL NOT NULL,
      status TEXT CHECK(status IN ('active', 'past_due', 'trialing', 'canceled')) DEFAULT 'active',
      renews_at DATETIME
    );

    CREATE TABLE api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      scopes TEXT DEFAULT 'read:all,write:events',
      is_active BOOLEAN DEFAULT 1,
      rate_limit_per_min INTEGER DEFAULT 1000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      invoice_number TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT CHECK(status IN ('paid', 'pending', 'failed')) DEFAULT 'paid',
      due_date DATETIME,
      paid_at DATETIME
    );

    CREATE TABLE audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      event_type TEXT NOT NULL,
      severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
      ip_address TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_users_org ON users(org_id);
    CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
    CREATE INDEX idx_invoices_org ON invoices(org_id);
    CREATE INDEX idx_audit_user ON audit_events(user_id);
  `);

  dbSaas.run(`
    INSERT INTO organizations (name, slug, tier, monthly_revenue, billing_email, region) VALUES
      ('Acme Cloud Technologies', 'acme-cloud', 'enterprise', 4850.00, 'billing@acmecloud.io', 'us-east-1'),
      ('HyperScale Data Labs', 'hyperscale-data', 'growth', 1250.00, 'finance@hyperscale.dev', 'eu-central-1'),
      ('Vanguard AI Systems', 'vanguard-ai', 'enterprise', 8900.00, 'ops@vanguard.ai', 'us-west-2'),
      ('PixelCraft Design Studio', 'pixelcraft', 'starter', 299.00, 'hello@pixelcraft.studio', 'eu-west-1'),
      ('PulseMetrics Health', 'pulsemetrics', 'growth', 1890.00, 'accounts@pulsemetrics.health', 'us-east-2'),
      ('IndieFlow Tools', 'indieflow', 'starter', 149.00, 'founder@indieflow.co', 'ap-southeast-1');

    INSERT INTO users (org_id, full_name, email, role, mfa_enabled, last_active_at) VALUES
      (1, 'Marcus Vance', 'marcus.v@acmecloud.io', 'owner', 1, '2026-10-30 18:24:10'),
      (1, 'Elena Rostova', 'elena.r@acmecloud.io', 'admin', 1, '2026-10-30 17:10:45'),
      (1, 'David Chen', 'david.c@acmecloud.io', 'developer', 1, '2026-10-30 16:55:00'),
      (2, 'Sarah Jenkins', 'sarah@hyperscale.dev', 'owner', 1, '2026-10-30 18:02:19'),
      (2, 'Liam Thorne', 'liam@hyperscale.dev', 'developer', 0, '2026-10-29 11:42:00'),
      (3, 'Dr. Aris Thorne', 'aris@vanguard.ai', 'owner', 1, '2026-10-30 18:15:33'),
      (3, 'Katarina Novak', 'k.novak@vanguard.ai', 'admin', 1, '2026-10-30 17:48:12'),
      (4, 'Chloe Dupont', 'chloe@pixelcraft.studio', 'owner', 1, '2026-10-28 09:20:11'),
      (5, 'Mateo Alvarez', 'mateo@pulsemetrics.health', 'owner', 1, '2026-10-30 14:11:00'),
      (6, 'Kenji Sato', 'kenji@indieflow.co', 'owner', 0, '2026-10-30 18:29:50');

    INSERT INTO subscriptions (org_id, plan_name, seat_count, price_per_month, status, renews_at) VALUES
      (1, 'Enterprise Shield Plus', 45, 4850.00, 'active', '2026-11-20 00:00:00'),
      (2, 'Growth Scale Pro', 15, 1250.00, 'active', '2026-11-15 00:00:00'),
      (3, 'Ultra AI Dedicated Cluster', 90, 8900.00, 'active', '2026-12-01 00:00:00'),
      (4, 'Team Starter Kit', 5, 299.00, 'active', '2026-11-10 00:00:00'),
      (5, 'HIPAA Compliant Growth', 20, 1890.00, 'active', '2026-11-25 00:00:00'),
      (6, 'Indie Solo License', 2, 149.00, 'active', '2026-11-05 00:00:00');

    INSERT INTO api_keys (org_id, name, key_prefix, scopes, is_active, rate_limit_per_min) VALUES
      (1, 'Production Webhook Dispatcher', 'ak_live_8f99', 'read:all,write:events,execute:pipeline', 1, 5000),
      (1, 'CI/CD Automated Deploy Bot', 'ak_live_12b3', 'deploy:read,deploy:write', 1, 1000),
      (2, 'Realtime Analytics Ingest', 'ak_live_7c44', 'write:telemetry', 1, 10000),
      (3, 'Inference Gateway Cluster', 'ak_live_99d1', 'admin:full_access', 1, 20000),
      (5, 'Telemetry Node Worker', 'ak_live_45a0', 'write:metrics', 1, 2500);

    INSERT INTO invoices (org_id, invoice_number, amount, currency, status, due_date, paid_at) VALUES
      (1, 'INV-2026-10-001', 4850.00, 'USD', 'paid', '2026-10-20 00:00:00', '2026-10-18 14:10:00'),
      (2, 'INV-2026-10-002', 1250.00, 'USD', 'paid', '2026-10-15 00:00:00', '2026-10-15 09:30:00'),
      (3, 'INV-2026-10-003', 8900.00, 'USD', 'paid', '2026-10-01 00:00:00', '2026-10-01 10:05:00'),
      (4, 'INV-2026-10-004', 299.00, 'USD', 'paid', '2026-10-10 00:00:00', '2026-10-09 20:15:00'),
      (5, 'INV-2026-10-005', 1890.00, 'USD', 'paid', '2026-10-25 00:00:00', '2026-10-24 16:45:00');

    INSERT INTO audit_events (user_id, event_type, severity, ip_address, metadata) VALUES
      (1, 'org.member_invited', 'info', '192.168.1.10', '{"invited_email": "tim@acmecloud.io", "role": "developer"}'),
      (1, 'api_key.rotated', 'warning', '192.168.1.10', '{"key_id": 1, "reason": "regular_security_cadence"}'),
      (2, 'security.mfa_enforced', 'info', '84.112.5.30', '{"policy": "strict_totp"}'),
      (3, 'database.replica_promoted', 'warning', '178.62.90.11', '{"cluster": "us-east-primary-01"}'),
      (6, 'inference.model_swapped', 'critical', '54.210.12.9', '{"previous": "llama-3-8b", "current": "deepseek-coder"}');
  `);

  const binarySaas = Buffer.from(dbSaas.export());
  fs.writeFileSync('public/saas-production.db', binarySaas);
  console.log('✓ Generated public/saas-production.db (' + binarySaas.length + ' bytes)');

  // ==========================================
  // 2. E-Commerce Store Database (English)
  // ==========================================
  const dbEcom = new SQL.Database();
  dbEcom.run(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL,
      product_count INTEGER DEFAULT 0
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      title TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      rating REAL DEFAULT 4.5,
      is_featured BOOLEAN DEFAULT 1
    );

    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      city TEXT NOT NULL,
      country_code TEXT DEFAULT 'US',
      lifetime_value REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_usd REAL NOT NULL,
      status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'cancelled')) DEFAULT 'completed'
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );

    INSERT INTO categories (name, slug, product_count) VALUES
      ('Developer Workstations', 'workstations', 4),
      ('Mechanical Keyboards', 'keyboards', 8),
      ('Studio Audio Gear', 'audio', 6),
      ('Ergonomic Furniture', 'furniture', 3);

    INSERT INTO products (category_id, title, sku, price, stock_quantity, rating) VALUES
      (1, 'MacBook Pro 16" M3 Max (64GB RAM)', 'HW-MBP-16-M3', 3499.00, 14, 4.9),
      (1, 'ThinkPad P1 Gen 6 Workstation', 'HW-TP-P1-G6', 2899.00, 9, 4.8),
      (2, 'Keychron Q1 Pro Wireless Custom', 'KB-KC-Q1P', 199.99, 45, 4.7),
      (2, 'HHKB Professional Hybrid Type-S', 'KB-HHKB-HYB', 320.00, 22, 4.9),
      (3, 'Sony WH-1000XM5 Studio Edition', 'AU-SNY-XM5', 399.00, 60, 4.8),
      (3, 'Shure SM7B Vocal Dynamic Mic', 'AU-SHR-SM7B', 389.00, 31, 4.9),
      (4, 'Herman Miller Aeron Chair (Size B)', 'FR-HM-AERON', 1495.00, 12, 4.9),
      (4, 'Jarvis Bamboo Standing Desk 72x30', 'FR-JR-BAM72', 749.00, 18, 4.7);

    INSERT INTO customers (first_name, last_name, email, city, country_code, lifetime_value) VALUES
      ('Alexander', 'Wright', 'alex.wright@hey.com', 'San Francisco', 'US', 5394.00),
      ('Sophia', 'Nakamura', 'sophia.n@techlabs.jp', 'Tokyo', 'JP', 3219.00),
      ('Felix', 'Vanderbilt', 'felix.v@amsterdam.dev', 'Amsterdam', 'NL', 1895.00),
      ('Amara', 'Okonkwo', 'amara.o@cloudscale.ng', 'Lagos', 'NG', 4288.00),
      ('Liam', 'MacKenzie', 'liam.m@edinburgh.uk', 'Edinburgh', 'UK', 1069.00);

    INSERT INTO orders (customer_id, total_usd, status) VALUES
      (1, 3698.99, 'completed'),
      (2, 3219.00, 'completed'),
      (3, 1895.00, 'completed'),
      (4, 3888.00, 'processing'),
      (5, 1069.00, 'completed');

    INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
      (1, 1, 1, 3499.00),
      (1, 3, 1, 199.99),
      (2, 2, 1, 2899.00),
      (2, 4, 1, 320.00),
      (3, 7, 1, 1495.00),
      (3, 5, 1, 399.00),
      (4, 1, 1, 3499.00),
      (4, 6, 1, 389.00),
      (5, 8, 1, 749.00),
      (5, 4, 1, 320.00);
  `);

  const binaryEcom = Buffer.from(dbEcom.export());
  fs.writeFileSync('public/ecommerce-store.db', binaryEcom);
  console.log('✓ Generated public/ecommerce-store.db (' + binaryEcom.length + ' bytes)');
}

generateProDatabases().catch(console.error);
