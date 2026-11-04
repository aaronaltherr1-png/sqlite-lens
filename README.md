<div align="center">

# 🔍 SQLiteLens Studio

### *Professional Desktop-Grade SQLite Workbench in Your Browser*

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Engine: WebAssembly](https://img.shields.io/badge/Engine-SQLite%20WASM-38bdf8.svg?style=flat-square)](https://sqlite.org)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20In--Memory-10b981.svg?style=flat-square)](#-100-privacy-guarantee)
[![Zero Install](https://img.shields.io/badge/Zero%20Install-Web%20Studio-f59e0b.svg?style=flat-square)](#)

<p align="center">
  <b>Instant boot. Full desktop workbench interface. Zero telemetry.</b><br>
  Interactive visual ERD diagrams, high-performance data grid, SQL query console with execution timers, command palette (<code>⌘K</code>), and comprehensive data export.
</p>

[**🚀 Launch SQLiteLens Studio Live**](https://aaronaltherr1-png.github.io/sqlite-lens) • [**Report an Issue**](https://github.com/aaronaltherr1-png/sqlite-lens/issues) • [**Request Feature**](https://github.com/aaronaltherr1-png/sqlite-lens/issues)

<br><br>

<p align="center">
  <img src="media/preview.svg" alt="SQLiteLens Studio Interface Preview" width="100%">
</p>

</div>

---

## ⚡ Overview

**SQLiteLens Studio** is built for engineers and data analysts who need the speed and keyboard-first workflow of desktop tools like TablePlus and DataGrip, but without heavy 300MB downloads, license costs, or cloud privacy risks.

Running 100% client-side via SQLite 3.x compiled to WebAssembly, your database is mounted strictly in local browser memory. Zero bytes leave your machine.

---

## ✨ Features & Capabilities

* **🖥️ Desktop Workbench UI:**
  * Native macOS-inspired window controls and titlebar breadcrumbs.
  * Multi-workspace sidebar with 1-click database cluster switching.
  * Integrated **Command Palette (`Ctrl+K` / `⌘K`)** for lightning-fast table jumping and action dispatching.
  * Desktop bottom status bar with memory, encoding, and execution latency telemetry.
* **📊 High-Performance Data Grid:**
  * Realtime fuzzy filtering across all active columns.
  * Instant column sorting (ASC/DESC).
  * Typed column pill indicators (`INTEGER`, `TEXT`, `REAL`, `BLOB`, `🔑 PK`, `🔗 FK`).
  * Cell inspection drawer with pretty-printed JSON formatting.
  * Configurable pagination.
* **⚡ SQL Studio & Query Console:**
  * Monospace code editor with quick snippet pills.
  * Keyboard execution shortcut (`Ctrl+Enter` / `Cmd+Enter`).
  * Query execution timer with sub-millisecond precision (`✓ 45 rows in 0.4ms`).
  * Direct `EXPLAIN QUERY PLAN` helper for bytecode and index performance tuning.
* **🕸️ Interactive Visual ERD (Entity Relationship Diagram):**
  * Automatic schema graph generation with draggable cards.
  * Dynamic SVG Bézier cables pinning foreign key columns directly to parent primary keys.
  * Canvas zoom, auto-layout, and relation highlight effects.
* **📈 Diagnostics & Health Telemetry:**
  * Realtime storage allocation KPIs and table volume distributions.
  * SQLite PRAGMA inspection (`page_size`, `journal_mode`, `encoding`, `user_version`).
  * One-click `PRAGMA integrity_check` execution.
* **📤 Comprehensive Data Exports:**
  * Active table export to **CSV** or **JSON**.
  * Query dataset export to **CSV**.
  * Complete `.sql` schema & data dump creation.

---

## 🚀 Local Development

```bash
# 1. Clone the repository
git clone https://github.com/aaronaltherr1-png/sqlite-lens.git
cd sqlite-lens

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📦 Production Build

```bash
npm run build
```

The resulting `dist/` folder contains optimized static assets ready for deployment to GitHub Pages, Cloudflare Pages, Vercel, or Netlify.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
