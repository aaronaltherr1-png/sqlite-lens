import initSqlJs from 'sql.js';
import fs from 'fs';

async function createTestDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE kunden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vorname TEXT NOT NULL,
      nachname TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      stadt TEXT NOT NULL,
      guthaben REAL DEFAULT 0.0,
      registriert_am DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE kategorien (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE produkte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kategorie_id INTEGER REFERENCES kategorien(id),
      titel TEXT NOT NULL,
      preis REAL NOT NULL,
      lagerbestand INTEGER DEFAULT 0,
      bewertung REAL DEFAULT 4.5
    );

    CREATE TABLE bestellungen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kunde_id INTEGER REFERENCES kunden(id),
      bestelldatum DATETIME DEFAULT CURRENT_TIMESTAMP,
      gesamtbetrag REAL NOT NULL,
      status TEXT CHECK(status IN ('offen', 'bezahlt', 'versendet', 'storniert')) DEFAULT 'offen'
    );

    CREATE TABLE bestellpositionen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bestellung_id INTEGER REFERENCES bestellungen(id) ON DELETE CASCADE,
      produkt_id INTEGER REFERENCES produkte(id),
      anzahl INTEGER NOT NULL,
      einzelpreis REAL NOT NULL
    );

    CREATE INDEX idx_bestellungen_kunde ON bestellungen(kunde_id);
    CREATE INDEX idx_produkte_kategorie ON produkte(kategorie_id);

    INSERT INTO kategorien (name) VALUES 
      ('Hardware'), 
      ('Audio'), 
      ('Gaming'), 
      ('Bürobedarf');

    INSERT INTO produkte (kategorie_id, titel, preis, lagerbestand, bewertung) VALUES
      (1, 'MacBook Pro M3 Max 16"', 2499.00, 15, 4.9),
      (1, '4K UltraWide Monitor 34"', 649.90, 28, 4.7),
      (2, 'Sony WH-1000XM5 Noise Cancelling', 329.00, 45, 4.8),
      (2, 'Podcast Mikrofon Shure SM7B', 389.00, 20, 4.9),
      (3, 'Mechanische Custom Tastatur (Brown Switches)', 149.99, 60, 4.6),
      (3, 'Wireless Gaming Maus Superlight', 119.50, 85, 4.7),
      (4, 'Ergonomischer Bürostuhl Mesh Pro', 499.00, 12, 4.5),
      (4, 'Elektrisch Höhenverstellbarer Schreibtisch', 589.00, 18, 4.8);

    INSERT INTO kunden (vorname, nachname, email, stadt, guthaben) VALUES
      ('Max', 'Mustermann', 'max.mustermann@web.de', 'Berlin', 250.00),
      ('Laura', 'Schneider', 'laura.schneider@gmail.com', 'München', 89.50),
      ('Felix', 'Bauer', 'felix.bauer@outlook.de', 'Hamburg', 1420.00),
      ('Sarah', 'Wagner', 'sarah.wagner@posteo.de', 'Köln', 0.00),
      ('Tim', 'Fischer', 'tim.fischer@techmail.com', 'Frankfurt', 510.20),
      ('Julia', 'Weber', 'julia.weber@gmx.de', 'Stuttgart', 75.00),
      ('David', 'Hoffmann', 'david.h@freemail.de', 'Düsseldorf', 330.00),
      ('Anna', 'Zimmermann', 'anna.z@swissmail.ch', 'Zürich', 980.00);

    INSERT INTO bestellungen (kunde_id, gesamtbetrag, status) VALUES
      (1, 2828.00, 'versendet'),
      (2, 329.00, 'bezahlt'),
      (3, 1148.90, 'versendet'),
      (5, 149.99, 'offen'),
      (6, 1088.00, 'bezahlt'),
      (7, 119.50, 'versendet');

    INSERT INTO bestellpositionen (bestellung_id, produkt_id, anzahl, einzelpreis) VALUES
      (1, 1, 1, 2499.00),
      (1, 3, 1, 329.00),
      (2, 3, 1, 329.00),
      (3, 2, 1, 649.90),
      (3, 7, 1, 499.00),
      (4, 5, 1, 149.99),
      (5, 7, 1, 499.00),
      (5, 8, 1, 589.00),
      (6, 6, 1, 119.50);
  `);

  const binary = Buffer.from(db.export());

  // Save in Downloads so user can drag & drop or browse
  fs.writeFileSync('/home/aaron/Downloads/test_datenbank.db', binary);
  // Also save in public for direct download via browser
  fs.writeFileSync('public/test_datenbank.db', binary);

  console.log('✓ Successfully created /home/aaron/Downloads/test_datenbank.db (' + binary.length + ' bytes)');
  console.log('✓ Successfully created public/test_datenbank.db');
}

createTestDb().catch(console.error);
