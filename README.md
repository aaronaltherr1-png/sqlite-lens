<div align="center">

# 🔍 SQLiteLens Studio 2.0

### *Desktop-Grade SQLite Workbench & Visual ERD Studio in Your Browser*

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Engine: WebAssembly](https://img.shields.io/badge/Engine-SQLite%203.x%20WASM-38bdf8.svg?style=flat-square)](https://sqlite.org)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20In--Memory-10b981.svg?style=flat-square)](#-overview)
[![Zero Install](https://img.shields.io/badge/Zero%20Install-Studio%202.0-f59e0b.svg?style=flat-square)](https://aaronaltherr1-png.github.io/sqlite-lens)

<p align="center">
  <b>Instant boot. Full CRUD database workbench. Zero cloud telemetry.</b><br>
  Inline cell editing, binary <code>.sqlite</code> export, infinite-canvas visual ERD diagrams, multi-tab SQL query studio, CSV/JSON table importer, and column data profiler.
</p>

[**🚀 Launch SQLiteLens Studio Live**](https://aaronaltherr1-png.github.io/sqlite-lens) • [**Report an Issue**](https://github.com/aaronaltherr1-png/sqlite-lens/issues) • [**Request Feature**](https://github.com/aaronaltherr1-png/sqlite-lens/issues)

<br><br>

<p align="center">
  <img src="media/preview.svg" alt="SQLiteLens Studio Interface Preview" width="100%">
</p>

</div>

---

## ⚡ Overview

**SQLiteLens Studio 2.0** is engineered for developers, data analysts, and systems engineers who want the speed and keyboard-first workflow of desktop clients like TablePlus and DataGrip — without 300MB downloads, license fees, or cloud privacy risks.

Powered by SQLite 3.x compiled to WebAssembly (`sql.js`), your database is mounted strictly in local browser memory. **Zero bytes ever leave your machine.**

---

## ✨ Key Capabilities in Studio 2.0

* **✏️ Full Inline CRUD & Binary `.sqlite` Export:**
  * **Double-click any cell** in the data grid for instant inline editing, or click to open the full Cell Inspector & JSON Editor.
  * **Insert & Delete Rows** with schema-aware modal forms (`+ Insert Row`).
  * **Visual Table Creator (`+ New Table`)** to design new tables and constraints on the fly.
  * **Save `.sqlite` Binary:** Export your modified database back to disk as a native `.sqlite` binary file or complete `.sql` dump.
* **📥 Instant CSV & JSON Dataset Importer:**
  * Drag and drop any `.csv` or `.json` file to automatically infer column types (`INTEGER`, `REAL`, `TEXT`), build a SQLite table, and run SQL joins immediately.
* **🕸️ Infinite-Canvas Visual ERD (Entity Relationship Diagram):**
  * **Topological Auto-Layout** organizing parent and child tables automatically.
  * **Dynamic SVG Bézier Cables** linking foreign keys to target primary keys with hover relation highlighting.
  * Smooth canvas panning, zooming, fit-to-view, and **1-Click Standalone SVG Diagram Export**.
* **⚡ Multi-Tab SQL Studio & Execution History:**
  * **Multi-Tab Query Workspace** persisted in local storage.
  * Line-numbered code editor with **1-Click SQL Formatter**, `EXPLAIN QUERY PLAN` analyzer, and sub-millisecond timers.
  * **Execution History Drawer** logging every query, status, row count, and latency.
  * Export query results to **CSV**, **JSON**, or **GitHub Markdown Tables**.
* **🔬 Column Data Quality Profiler & DDL Inspector:**
  * Inspect column cardinality (distinct values, completeness %, null count, min/max bounds).
  * Dedicated **Schema & DDL Inspector** with syntax-highlighted `CREATE TABLE` definitions and index metadata.
  * One-click `PRAGMA integrity_check` and `VACUUM` compaction.

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

Open `http://localhost:5173` in your browser.

---

## 📦 Production Build

```bash
npm run build
```

The resulting `dist/` folder contains optimized static assets ready for deployment to GitHub Pages, Cloudflare Pages, Vercel, or Netlify.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
