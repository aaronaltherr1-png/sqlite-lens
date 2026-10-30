<div align="center">

# 🔍 SQLiteLens

### *The modern, privacy-first SQLite studio that doesn't look like Windows 98.*

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Engine: WebAssembly](https://img.shields.io/badge/Engine-SQLite%20WASM-38bdf8.svg?style=flat-square)](https://sqlite.org)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side-10b981.svg?style=flat-square)](#-100-privacy-guarantee)
[![Zero Install](https://img.shields.io/badge/Zero%20Install-In--Browser-f59e0b.svg?style=flat-square)](#)

<p align="center">
  <b>Zero install. Zero telemetry. Instant startup.</b><br>
  Drag and drop any <code>.sqlite</code>, <code>.db</code>, or <code>.sqlite3</code> file to inspect schemas, explore data, generate interactive visual ERD diagrams, run queries, and export reports.
</p>

[**🚀 Try the Live Demo**](https://aaronaltherr1-png.github.io/sqlite-lens) • [**Report a Bug**](https://github.com/aaronaltherr1-png/sqlite-lens/issues) • [**Request Feature**](https://github.com/aaronaltherr1-png/sqlite-lens/issues)

</div>

---

## ⚡ Why SQLiteLens?

Almost every developer regularly works with SQLite — whether for iOS/Android mobile apps, local web development (Next.js, Django, Rails), edge computing (Cloudflare D1, Turso), or data science.

Yet the current tooling ecosystem forces developers to choose between:
1. **Ancient, clunky UIs** (like *DB Browser for SQLite*, built in the early 2000s).
2. **Expensive commercial tools** (like *TablePlus*, costing $89+).
3. **Bloated 300MB Electron apps** that take seconds to start and chew through battery.

**SQLiteLens** solves this. It gives you the aesthetics and keyboard-first speed of a premium tool, but 100% open-source, free, and lightweight via pure WebAssembly.

---

## 📊 Feature Comparison

| Feature | **SQLiteLens** | **DB Browser for SQLite** | **TablePlus** | **Beekeeper Studio** |
| :--- | :---: | :---: | :---: | :---: |
| **Price** | **100% Free** | 100% Free | $89+ | Freemium ($69/yr) |
| **License** | **MIT Open Source** | GPL v3 | Proprietary | Mix (GPL/Commercial) |
| **Startup Speed** | **< 100 ms** | Fast | Fast | Slow (Electron) |
| **Interactive Visual ERD** | **✅ Built-in** | ❌ No | ⚠️ Paid only | ❌ No |
| **Zero-Install (Browser/PWA)**| **✅ Yes** | ❌ No | ❌ No | ❌ No |
| **Modern Dark Mode & UI** | **✅ Polished** | ❌ Windows 98 style | ✅ Polished | ✅ Good |
| **100% Client-Side Privacy** | **✅ Zero Network** | ✅ Offline | ⚠️ Cloud Sync | ⚠️ Cloud Sync |

---

## ✨ Key Features

* **🏎️ Instant WebAssembly Engine:** Powered by compiled SQLite WASM (`sql.js`). Loads and parses multi-megabyte databases in milliseconds directly in memory.
* **🕸️ Interactive Visual ERD (Entity Relationship Diagram):** Automatically analyzes tables, Primary Keys (`🔑`), and Foreign Keys (`🔗`), rendering interactive draggable nodes with dynamic SVG Bézier curves.
* **📊 High-Performance Data Grid:**
  * Real-time fuzzy text search across all columns.
  * Instant column sorting (ASC/DESC).
  * Column data type indicators (`INTEGER`, `TEXT`, `REAL`, `BLOB`).
  * Cell inspector modal for formatted JSON and long text blobs.
  * Pagination with configurable page sizes.
* **⚡ SQL Query Studio:**
  * Syntax-highlighted scratchpad with keyboard shortcuts (`Ctrl+Enter` / `Cmd+Enter`).
  * Query execution timer with millisecond resolution (`✓ 124 rows in 1.2ms`).
  * Instant `EXPLAIN QUERY PLAN` helper to analyze SQLite bytecode and indexing.
  * Pre-configured quick query templates.
* **📈 Database Insights & Pragmas:**
  * KPI overview (Database size, table counts, row counts, index counts).
  * Visual bar charts for table row distributions.
  * Inspect low-level SQLite PRAGMAs (`page_size`, `encoding`, `journal_mode`, `user_version`).
  * One-click `PRAGMA integrity_check`.
* **📤 Comprehensive Export Options:**
  * Export any active table to **CSV** or **JSON**.
  * Export SQL query results to **CSV**.
  * Generate a full, complete `.sql` database dump with `CREATE TABLE` and `INSERT` statements.
* **🔒 100% Client-Side Privacy:**
  * Your database file never leaves your machine. No servers, no telemetry, no tracking. Everything runs strictly in your local browser sandbox.

---

## 🚀 Quickstart (Running Locally)

You can clone and run SQLiteLens locally in 3 simple steps:

```bash
# 1. Clone the repository
git clone https://github.com/aaronaltherr1-png/sqlite-lens.git
cd sqlite-lens

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open `http://localhost:3000` in your browser. You're ready to go!

---

## 📦 Building for Production / Self-Hosting

SQLiteLens generates a static bundle that can be deployed to any static host (GitHub Pages, Cloudflare Pages, Vercel, Netlify, or an internal NGINX server):

```bash
npm run build
```

The resulting `dist/` folder contains pure static HTML, CSS, JavaScript, and WASM files with zero server runtime dependencies.

A ready-to-use GitHub Actions workflow is provided in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for automated 1-click GitHub Pages deployment.

---

## 🛠️ Tech Stack & Architecture

* **Engine:** SQLite 3.x compiled to WebAssembly via [sql.js](https://github.com/sql-js/sql.js)
* **Structure & Logic:** Semantic HTML5 & Modern Vanilla ES Modules
* **Styling:** Bespoke, high-performance Vanilla CSS Design System with dark/light themes and glassmorphism (Zero heavy CSS utility bloat)
* **Icons:** [Lucide Icons](https://lucide.dev)
* **Dev Server & Bundler:** [Vite 5](https://vitejs.dev)

---

## 🤝 Contributing

Contributions, issues, and feature requests are very welcome!
Check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

If SQLiteLens helped you inspect your databases, consider giving it a ⭐️ on GitHub!

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
