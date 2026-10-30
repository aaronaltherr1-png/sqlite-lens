import initSqlJs from 'sql.js';
import fs from 'fs';

async function generateSampleDatabases() {
  const SQL = await initSqlJs();
  
  // 1. E-Commerce Database
  const dbEcommerce = new SQL.Database();
  dbEcommerce.run(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL,
      balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      rating REAL DEFAULT 4.5,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_amount REAL NOT NULL,
      status TEXT CHECK(status IN ('pending', 'completed', 'shipped', 'cancelled')) DEFAULT 'pending'
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );

    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      customer_id INTEGER REFERENCES customers(id),
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_orders_customer ON orders(customer_id);
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_items_order ON order_items(order_id);
  `);

  dbEcommerce.run(`
    INSERT INTO categories (name, slug) VALUES 
      ('Electronics', 'electronics'),
      ('Audio & Sound', 'audio-sound'),
      ('Accessories', 'accessories'),
      ('Smart Home', 'smart-home');

    INSERT INTO products (category_id, name, price, stock, rating, is_active) VALUES
      (1, 'UltraBook Pro 16"', 1899.99, 45, 4.8, 1),
      (1, 'Mechanical Keyboard RGB', 129.50, 110, 4.7, 1),
      (2, 'Noise-Cancelling Headphones Max', 349.00, 68, 4.9, 1),
      (2, 'Wireless Earbuds Pro', 179.99, 140, 4.6, 1),
      (3, 'USB-C Thunderbolt Hub 10-in-1', 79.99, 215, 4.5, 1),
      (3, 'Ergonomic Vertical Mouse', 59.95, 85, 4.3, 1),
      (4, 'Smart Ambient LED Bar', 89.00, 95, 4.6, 1),
      (4, 'Smart Plug Mini (4-Pack)', 39.99, 320, 4.4, 1);

    INSERT INTO customers (first_name, last_name, email, country, balance) VALUES
      ('Alexander', 'Schmidt', 'alex.schmidt@berlin.de', 'Germany', 450.00),
      ('Sophia', 'Chen', 'sophia.chen@techcorp.io', 'USA', 120.50),
      ('Elena', 'Rostova', 'elena.rostova@mail.eu', 'France', 890.00),
      ('Lucas', 'Silva', 'lucas.silva@devs.br', 'Brazil', 0.00),
      ('Liam', 'O''Connor', 'liam.oc@dublin.ie', 'Ireland', 310.25),
      ('Mia', 'Müller', 'mia.mueller@zurich.ch', 'Switzerland', 1450.00),
      ('Kenji', 'Takahashi', 'kenji.t@tokyo.jp', 'Japan', 75.00),
      ('Amira', 'Mansour', 'amira.m@cairo.eg', 'Egypt', 220.00);

    INSERT INTO orders (customer_id, total_amount, status) VALUES
      (1, 2029.49, 'completed'),
      (2, 349.00, 'shipped'),
      (3, 139.94, 'pending'),
      (5, 1899.99, 'completed'),
      (6, 428.99, 'shipped'),
      (7, 59.95, 'completed');

    INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
      (1, 1, 1, 1899.99),
      (1, 2, 1, 129.50),
      (2, 3, 1, 349.00),
      (3, 3, 1, 79.99),
      (3, 4, 1, 59.95),
      (4, 1, 1, 1899.99),
      (5, 3, 1, 349.00),
      (5, 4, 1, 79.99),
      (6, 6, 1, 59.95);

    INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES
      (1, 1, 5, 'Superb build quality, the screen is incredible for programming!'),
      (3, 2, 5, 'Best active noise cancellation on flights. Extremely comfortable.'),
      (2, 5, 4, 'Tactile clicky switches feel great, software could be slightly simpler.');
  `);

  const binaryEcommerce = dbEcommerce.export();
  fs.writeFileSync('public/sample-ecommerce.db', Buffer.from(binaryEcommerce));
  console.log('✓ Created public/sample-ecommerce.db (' + binaryEcommerce.length + ' bytes)');

  // 2. SaaS Analytics Database
  const dbAnalytics = new SQL.Database();
  dbAnalytics.run(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_name TEXT NOT NULL,
      tier TEXT CHECK(tier IN ('free', 'starter', 'pro', 'enterprise')) DEFAULT 'free',
      mrr REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER REFERENCES accounts(id),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('owner', 'admin', 'member')) DEFAULT 'member',
      last_login DATETIME
    );

    CREATE TABLE feature_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      description TEXT,
      enabled BOOLEAN DEFAULT 0,
      rollout_percent INTEGER DEFAULT 100
    );

    CREATE TABLE activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      metadata JSON,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO accounts (org_name, tier, mrr) VALUES
      ('Acme Corp', 'enterprise', 2400.00),
      ('Starlight Studio', 'pro', 499.00),
      ('NextWave Labs', 'starter', 99.00),
      ('Solo Indie Dev', 'free', 0.00);

    INSERT INTO users (account_id, name, email, role, last_login) VALUES
      (1, 'Sarah Connor', 'sarah@acme.com', 'owner', '2026-10-30 14:22:00'),
      (1, 'John Smith', 'john@acme.com', 'admin', '2026-10-29 09:15:00'),
      (2, 'Elena Gilbert', 'elena@starlight.io', 'owner', '2026-10-30 16:45:00'),
      (3, 'David Kim', 'david@nextwave.dev', 'owner', '2026-10-28 11:30:00'),
      (4, 'Marco Rossi', 'marco@indie.it', 'owner', '2026-10-30 17:01:00');

    INSERT INTO feature_flags (key, description, enabled, rollout_percent) VALUES
      ('ai_copilot_v2', 'New agentic assistant in chat', 1, 50),
      ('dark_mode_oled', 'True pitch black OLED theme', 1, 100),
      ('enterprise_sso', 'SAML 2.0 / Okta integration', 1, 100),
      ('realtime_sync', 'WebSocket bidirectional delta replication', 0, 10);

    INSERT INTO activity_logs (user_id, action, metadata, ip_address) VALUES
      (1, 'user.login', '{"browser": "Chrome", "os": "macOS"}', '192.168.1.10'),
      (1, 'project.deploy', '{"env": "production", "commit": "a8f3b2"}', '192.168.1.10'),
      (2, 'subscription.upgrade', '{"plan": "pro", "interval": "yearly"}', '84.112.5.30'),
      (3, 'api_key.create', '{"scopes": ["read", "write"]}', '178.62.90.11'),
      (5, 'export.csv', '{"table": "analytics_oct"}', '92.204.14.77');
  `);

  const binaryAnalytics = dbAnalytics.export();
  fs.writeFileSync('public/sample-analytics.db', Buffer.from(binaryAnalytics));
  console.log('✓ Created public/sample-analytics.db (' + binaryAnalytics.length + ' bytes)');
}

generateSampleDatabases().catch(console.error);
