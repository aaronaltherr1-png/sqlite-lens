/**
 * SQLiteLens Studio — Enterprise-Grade Client-Side Database Engine
 * 100% In-Memory WebAssembly SQLite 3.x Engine with Full CRUD, Binary Export & Profiling
 */

class DatabaseEngine {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.dbName = '';
    this.dbSize = 0;
    this.isModified = false;
    this.initPromise = this.initWasm();
  }

  async initWasm() {
    if (this.SQL) return this.SQL;
    if (typeof window.initSqlJs !== 'function') {
      throw new Error('sql.js WebAssembly runtime is not loaded. Ensure sql-wasm.js is available.');
    }
    const baseUrl = import.meta.env.BASE_URL || './';
    this.SQL = await window.initSqlJs({
      locateFile: file => `${baseUrl}${file}`
    });
    return this.SQL;
  }

  async loadFromFile(file) {
    await this.initPromise;
    const arrayBuffer = await file.arrayBuffer();
    const uInt8Array = new Uint8Array(arrayBuffer);

    if (this.db) {
      try { this.db.close(); } catch (_) { /* ignore */ }
    }

    this.db = new this.SQL.Database(uInt8Array);
    this.dbName = file.name;
    this.dbSize = file.size;
    this.isModified = false;

    return this.getDatabaseSummary();
  }

  async loadFromUrl(url, displayName) {
    await this.initPromise;
    const baseUrl = import.meta.env.BASE_URL || './';
    const targetUrl = url.startsWith('http') ? url : `${baseUrl}${url.replace(/^\//, '')}`;

    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${targetUrl}: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const uInt8Array = new Uint8Array(arrayBuffer);

    if (this.db) {
      try { this.db.close(); } catch (_) { /* ignore */ }
    }

    this.db = new this.SQL.Database(uInt8Array);
    this.dbName = displayName;
    this.dbSize = arrayBuffer.byteLength;
    this.isModified = false;

    return this.getDatabaseSummary();
  }

  refreshSize() {
    if (!this.db) return;
    try {
      const pageCountRes = this.db.exec('PRAGMA page_count');
      const pageSizeRes = this.db.exec('PRAGMA page_size');
      if (pageCountRes.length && pageSizeRes.length) {
        const count = Number(pageCountRes[0].values[0][0]) || 0;
        const size = Number(pageSizeRes[0].values[0][0]) || 4096;
        if (count > 0) this.dbSize = count * size;
      }
    } catch (_) {
      // Fallback to existing size
    }
  }

  getDatabaseSummary() {
    if (!this.db) return null;
    this.refreshSize();
    const tables = this.getTables();
    const views = this.getViews();
    const indexes = this.getIndexes();
    const triggers = this.getTriggers();
    const pragmas = this.getPragmas();

    let totalRows = 0;
    let totalFkCount = 0;
    tables.forEach(t => {
      totalRows += t.rowCount;
      t.columns.forEach(c => {
        if (c.isFk) totalFkCount++;
      });
    });

    return {
      name: this.dbName,
      size: this.dbSize,
      formattedSize: this.formatBytes(this.dbSize),
      isModified: this.isModified,
      tables,
      views,
      indexes,
      triggers,
      totalRows,
      totalFkCount,
      pragmas
    };
  }

  getTables() {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' 
      ORDER BY name ASC;
    `);

    const tables = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let rowCount = 0;
      try {
        const countRes = this.db.exec(`SELECT COUNT(*) as c FROM "${this.escapeId(row.name)}"`);
        rowCount = countRes.length > 0 && countRes[0].values.length > 0 ? Number(countRes[0].values[0][0]) : 0;
      } catch (_) {
        rowCount = 0;
      }
      const columns = this.getTableColumns(row.name);

      tables.push({
        name: row.name,
        sql: row.sql || '',
        rowCount,
        columns
      });
    }
    stmt.free();
    return tables;
  }

  getViews() {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='view' 
      ORDER BY name ASC;
    `);

    const views = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let rowCount = 0;
      try {
        const countRes = this.db.exec(`SELECT COUNT(*) FROM "${this.escapeId(row.name)}"`);
        rowCount = countRes.length && countRes[0].values.length ? Number(countRes[0].values[0][0]) : 0;
      } catch (_) { /* ignore */ }

      views.push({
        name: row.name,
        sql: row.sql || '',
        rowCount,
        columns: this.getTableColumns(row.name)
      });
    }
    stmt.free();
    return views;
  }

  getIndexes() {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT name, tbl_name as tableName, sql 
      FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name;
    `);
    if (!res.length) return [];
    const cols = res[0].columns;
    return res[0].values.map(val => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = val[i]);
      return obj;
    });
  }

  getTriggers() {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT name, tbl_name as tableName, sql 
      FROM sqlite_master 
      WHERE type='trigger'
      ORDER BY name;
    `);
    if (!res.length) return [];
    const cols = res[0].columns;
    return res[0].values.map(val => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = val[i]);
      return obj;
    });
  }

  getTableColumns(tableName) {
    if (!this.db) return [];
    const safeTable = this.escapeId(tableName);
    const infoRes = this.db.exec(`PRAGMA table_info("${safeTable}")`);
    if (!infoRes.length) return [];

    const columns = infoRes[0].values.map(v => ({
      cid: v[0],
      name: v[1],
      type: (v[2] || 'ANY').toUpperCase(),
      notNull: Boolean(v[3]),
      defaultValue: v[4],
      isPk: Boolean(v[5]),
      pkIndex: Number(v[5]) || 0,
      isFk: false,
      fkTargetTable: null,
      fkTargetCol: null
    }));

    try {
      const fkRes = this.db.exec(`PRAGMA foreign_key_list("${safeTable}")`);
      if (fkRes.length) {
        fkRes[0].values.forEach(fk => {
          const fromCol = fk[3];
          const toTable = fk[2];
          const toCol = fk[4];
          const colObj = columns.find(c => c.name === fromCol);
          if (colObj) {
            colObj.isFk = true;
            colObj.fkTargetTable = toTable;
            colObj.fkTargetCol = toCol || 'id';
          }
        });
      }
    } catch (_) {
      // Ignore views or virtual tables
    }

    return columns;
  }

  getTableData(tableName, { page = 1, pageSize = 50, filter = '', sortCol = null, sortDir = 'ASC' } = {}) {
    if (!this.db) return { columns: [], columnMeta: [], rows: [], rowIds: [], totalCount: 0, executionTimeMs: 0 };

    const startTime = performance.now();
    const safeTable = this.escapeId(tableName);
    const columns = this.getTableColumns(tableName);

    let whereClause = '';
    const params = [];
    if (filter && filter.trim()) {
      const textFilter = filter.trim();
      const conditions = columns.map(col => `CAST("${this.escapeId(col.name)}" AS TEXT) LIKE ?`);
      if (conditions.length) {
        whereClause = `WHERE ${conditions.join(' OR ')}`;
        columns.forEach(() => params.push(`%${textFilter}%`));
      }
    }

    const countSql = `SELECT COUNT(*) FROM "${safeTable}" ${whereClause}`;
    let totalCount = 0;
    try {
      const countRes = this.db.exec(countSql, params);
      totalCount = countRes.length && countRes[0].values.length ? Number(countRes[0].values[0][0]) : 0;
    } catch (_) {
      totalCount = 0;
    }

    let orderClause = '';
    if (sortCol) {
      const safeDir = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY "${this.escapeId(sortCol)}" ${safeDir}`;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;

    // Try selecting with _rowid_ for reliable CRUD on tables without explicit single PK
    let hasRowId = true;
    let dataRes = [];
    try {
      const colSelect = columns.map(c => `"${this.escapeId(c.name)}"`).join(', ');
      const dataSql = `SELECT _rowid_ AS "__sqlitelens_rowid__", ${colSelect} FROM "${safeTable}" ${whereClause} ${orderClause} LIMIT ${Number(pageSize)} OFFSET ${Number(offset)};`;
      dataRes = this.db.exec(dataSql, params);
    } catch (_) {
      hasRowId = false;
      const dataSql = `SELECT * FROM "${safeTable}" ${whereClause} ${orderClause} LIMIT ${Number(pageSize)} OFFSET ${Number(offset)};`;
      dataRes = this.db.exec(dataSql, params);
    }

    let rows = [];
    let rowIds = [];
    let columnNames = columns.map(c => c.name);

    if (dataRes.length) {
      if (hasRowId) {
        columnNames = dataRes[0].columns.slice(1);
        dataRes[0].values.forEach(r => {
          rowIds.push(r[0]);
          rows.push(r.slice(1));
        });
      } else {
        columnNames = dataRes[0].columns;
        rows = dataRes[0].values;
        rowIds = rows.map(() => null);
      }
    }

    const executionTimeMs = (performance.now() - startTime).toFixed(2);

    return {
      columns: columnNames,
      columnMeta: columns,
      rows,
      rowIds,
      hasRowId,
      totalCount,
      page: safePage,
      pageSize,
      totalPages,
      executionTimeMs
    };
  }

  /**
   * Update a single cell in a table
   */
  updateCell(tableName, { rowId, pkCol, pkVal, column, newValue }) {
    if (!this.db) throw new Error('No database connected');
    const safeTable = this.escapeId(tableName);
    const safeCol = this.escapeId(column);

    let sql = '';
    let params = [];

    if (rowId !== null && rowId !== undefined) {
      sql = `UPDATE "${safeTable}" SET "${safeCol}" = ? WHERE _rowid_ = ?;`;
      params = [newValue, rowId];
    } else if (pkCol) {
      sql = `UPDATE "${safeTable}" SET "${safeCol}" = ? WHERE "${this.escapeId(pkCol)}" = ?;`;
      params = [newValue, pkVal];
    } else {
      throw new Error('Cannot update row: table has no ROWID or Primary Key.');
    }

    this.db.run(sql, params);
    this.isModified = true;
    return this.db.getRowsModified();
  }

  /**
   * Insert a new row into a table
   */
  insertRow(tableName, rowObject) {
    if (!this.db) throw new Error('No database connected');
    const safeTable = this.escapeId(tableName);
    const entries = Object.entries(rowObject).filter(([_, val]) => val !== undefined);

    if (!entries.length) {
      this.db.run(`INSERT INTO "${safeTable}" DEFAULT VALUES;`);
    } else {
      const colNames = entries.map(([k]) => `"${this.escapeId(k)}"`).join(', ');
      const placeholders = entries.map(() => '?').join(', ');
      const values = entries.map(([_, v]) => v);
      this.db.run(`INSERT INTO "${safeTable}" (${colNames}) VALUES (${placeholders});`, values);
    }

    this.isModified = true;
    return this.db.getRowsModified();
  }

  /**
   * Delete a row from a table
   */
  deleteRow(tableName, { rowId, pkCol, pkVal }) {
    if (!this.db) throw new Error('No database connected');
    const safeTable = this.escapeId(tableName);

    if (rowId !== null && rowId !== undefined) {
      this.db.run(`DELETE FROM "${safeTable}" WHERE _rowid_ = ?;`, [rowId]);
    } else if (pkCol) {
      this.db.run(`DELETE FROM "${safeTable}" WHERE "${this.escapeId(pkCol)}" = ?;`, [pkVal]);
    } else {
      throw new Error('Cannot delete row: table has no ROWID or Primary Key.');
    }

    this.isModified = true;
    return this.db.getRowsModified();
  }

  /**
   * Import an array of objects (from CSV or JSON) into a new SQLite table
   */
  importDatasetToTable(tableName, records) {
    if (!this.db) throw new Error('No database connected');
    if (!Array.isArray(records) || !records.length) {
      throw new Error('Dataset is empty or invalid.');
    }

    const cleanName = tableName.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, 't_$&') || 'imported_table';
    const safeTable = this.escapeId(cleanName);

    const sample = records[0];
    const rawCols = Object.keys(sample);
    if (!rawCols.length) throw new Error('No columns detected in dataset.');

    // Infer column types from first 25 rows
    const colDefs = rawCols.map(col => {
      let isInt = true;
      let isReal = true;
      let hasVal = false;

      for (let i = 0; i < Math.min(records.length, 25); i++) {
        const v = records[i][col];
        if (v === null || v === undefined || v === '') continue;
        hasVal = true;
        const num = Number(v);
        if (Number.isNaN(num)) {
          isInt = false;
          isReal = false;
          break;
        }
        if (!Number.isInteger(num)) {
          isInt = false;
        }
      }

      const sqlType = !hasVal ? 'TEXT' : isInt ? 'INTEGER' : isReal ? 'REAL' : 'TEXT';
      return `"${this.escapeId(col)}" ${sqlType}`;
    });

    this.db.run('BEGIN TRANSACTION;');
    try {
      this.db.run(`DROP TABLE IF EXISTS "${safeTable}";`);
      this.db.run(`CREATE TABLE "${safeTable}" (${colDefs.join(', ')});`);

      const colList = rawCols.map(c => `"${this.escapeId(c)}"`).join(', ');
      const placeholders = rawCols.map(() => '?').join(', ');
      const stmt = this.db.prepare(`INSERT INTO "${safeTable}" (${colList}) VALUES (${placeholders});`);

      records.forEach(rec => {
        const vals = rawCols.map(c => {
          const val = rec[c];
          if (val === undefined || val === '') return null;
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          return val;
        });
        stmt.run(vals);
      });

      stmt.free();
      this.db.run('COMMIT;');
      this.isModified = true;
      return { tableName: cleanName, rowCount: records.length, columnCount: rawCols.length };
    } catch (err) {
      try { this.db.run('ROLLBACK;'); } catch (_) { /* ignore */ }
      throw err;
    }
  }

  /**
   * Execute arbitrary SQL statements and return multi-result sets + affected row counts
   */
  executeQuery(sql) {
    if (!this.db) throw new Error('No database connected');
    const startTime = performance.now();

    try {
      const results = this.db.exec(sql);
      const executionTimeMs = (performance.now() - startTime).toFixed(2);
      const rowsModified = this.db.getRowsModified();

      const upperSql = sql.toUpperCase();
      const isMutating = /\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE|VACUUM)\b/.test(upperSql);
      if (isMutating) {
        this.isModified = true;
      }

      if (!results.length) {
        return {
          columns: [],
          rows: [],
          resultSets: [],
          rowCount: 0,
          rowsModified,
          isMutating,
          executionTimeMs,
          message: isMutating
            ? `Statement executed successfully. ${rowsModified} row(s) affected.`
            : 'Query executed successfully. 0 rows returned.'
        };
      }

      const first = results[0];
      return {
        columns: first.columns,
        rows: first.values,
        resultSets: results.map((r, i) => ({
          index: i + 1,
          columns: r.columns,
          rows: r.values,
          rowCount: r.values.length
        })),
        rowCount: first.values.length,
        rowsModified,
        isMutating,
        executionTimeMs
      };
    } catch (err) {
      const executionTimeMs = (performance.now() - startTime).toFixed(2);
      return {
        error: err.message,
        executionTimeMs
      };
    }
  }

  explainQuery(sql) {
    if (!this.db) throw new Error('No database connected');
    const clean = sql.replace(/^\s*EXPLAIN\s+QUERY\s+PLAN\s+/i, '');
    return this.executeQuery(`EXPLAIN QUERY PLAN ${clean}`);
  }

  /**
   * Profile a specific column for Insights & Data Quality analysis
   */
  getColumnProfile(tableName, colName) {
    if (!this.db) return null;
    const safeTable = this.escapeId(tableName);
    const safeCol = this.escapeId(colName);

    try {
      const statsRes = this.db.exec(`
        SELECT 
          COUNT(*) as total,
          COUNT("${safeCol}") as non_null,
          COUNT(*) - COUNT("${safeCol}") as nulls,
          COUNT(DISTINCT "${safeCol}") as distinct_vals,
          MIN("${safeCol}") as min_val,
          MAX("${safeCol}") as max_val
        FROM "${safeTable}";
      `);

      const topRes = this.db.exec(`
        SELECT "${safeCol}" as val, COUNT(*) as freq
        FROM "${safeTable}"
        WHERE "${safeCol}" IS NOT NULL
        GROUP BY "${safeCol}"
        ORDER BY freq DESC
        LIMIT 5;
      `);

      const s = statsRes[0].values[0];
      const topValues = topRes.length ? topRes[0].values.map(v => ({ value: v[0], count: v[1] })) : [];

      return {
        total: Number(s[0]) || 0,
        nonNull: Number(s[1]) || 0,
        nulls: Number(s[2]) || 0,
        distinct: Number(s[3]) || 0,
        min: s[4],
        max: s[5],
        topValues
      };
    } catch (_) {
      return null;
    }
  }

  getPragmas() {
    if (!this.db) return {};
    const pragmas = {};
    const pragmaKeys = [
      'sqlite_version',
      'user_version',
      'page_size',
      'page_count',
      'encoding',
      'journal_mode',
      'synchronous',
      'foreign_keys',
      'auto_vacuum'
    ];

    pragmaKeys.forEach(k => {
      try {
        const res = k === 'sqlite_version'
          ? this.db.exec('SELECT sqlite_version();')
          : this.db.exec(`PRAGMA ${k}`);
        if (res.length && res[0].values.length) {
          pragmas[k] = res[0].values[0][0];
        }
      } catch (_) {
        pragmas[k] = 'N/A';
      }
    });

    return pragmas;
  }

  checkIntegrity() {
    if (!this.db) return 'No database loaded';
    const res = this.db.exec('PRAGMA integrity_check');
    if (res.length && res[0].values.length) {
      return res[0].values.map(v => v[0]).join('\n');
    }
    return 'ok';
  }

  /**
   * Export binary .sqlite Uint8Array
   */
  exportBinaryDatabase() {
    if (!this.db) return null;
    return this.db.export();
  }

  exportTableToCsv(tableName) {
    if (!this.db) return '';
    const res = this.db.exec(`SELECT * FROM "${this.escapeId(tableName)}"`);
    if (!res.length) return '';
    return this.exportQueryToCsv(res[0].columns, res[0].values);
  }

  exportTableToJson(tableName) {
    if (!this.db) return '[]';
    const res = this.db.exec(`SELECT * FROM "${this.escapeId(tableName)}"`);
    if (!res.length) return '[]';
    return this.exportQueryToJson(res[0].columns, res[0].values);
  }

  exportQueryToCsv(columns, rows) {
    const escapeCsv = val => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = columns.map(escapeCsv).join(',');
    const body = rows.map(r => r.map(escapeCsv).join(','));
    return [header, ...body].join('\n');
  }

  exportQueryToJson(columns, rows) {
    const arrayObj = rows.map(r => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = r[i];
      });
      return obj;
    });
    return JSON.stringify(arrayObj, null, 2);
  }

  exportQueryToMarkdown(columns, rows) {
    if (!columns.length) return '';
    const escapeMd = val => {
      if (val === null || val === undefined) return '`NULL`';
      return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    };
    const header = `| ${columns.map(escapeMd).join(' | ')} |`;
    const divider = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = rows.slice(0, 200).map(r => `| ${r.map(escapeMd).join(' | ')} |`);
    return [header, divider, ...body].join('\n');
  }

  exportFullSqlDump() {
    if (!this.db) return '';
    const tables = this.getTables();
    const views = this.getViews();
    const indexes = this.getIndexes();

    let dump = `-- ==========================================================\n`;
    dump += `-- SQLiteLens Studio Pro — Full Database SQL Dump\n`;
    dump += `-- Database: ${this.dbName}\n`;
    dump += `-- Generated: ${new Date().toISOString()}\n`;
    dump += `-- ==========================================================\n\n`;
    dump += `PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n`;

    tables.forEach(t => {
      dump += `-- ----------------------------------------------------------\n`;
      dump += `-- Table: ${t.name} (${t.rowCount} rows)\n`;
      dump += `-- ----------------------------------------------------------\n`;
      dump += `DROP TABLE IF EXISTS "${this.escapeId(t.name)}";\n`;
      dump += `${t.sql};\n\n`;

      const dataRes = this.db.exec(`SELECT * FROM "${this.escapeId(t.name)}"`);
      if (dataRes.length && dataRes[0].values.length) {
        const cols = dataRes[0].columns.map(c => `"${this.escapeId(c)}"`).join(', ');
        dataRes[0].values.forEach(row => {
          const values = row.map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (val instanceof Uint8Array) {
              const hex = Array.from(val).map(b => b.toString(16).padStart(2, '0')).join('');
              return `X'${hex}'`;
            }
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');
          dump += `INSERT INTO "${this.escapeId(t.name)}" (${cols}) VALUES (${values});\n`;
        });
        dump += '\n';
      }
    });

    indexes.forEach(idx => {
      if (idx.sql) {
        dump += `-- Index: ${idx.name}\n${idx.sql};\n\n`;
      }
    });

    views.forEach(v => {
      if (v.sql) {
        dump += `-- View: ${v.name}\n${v.sql};\n\n`;
      }
    });

    dump += `COMMIT;\nPRAGMA foreign_keys = ON;\n`;
    return dump;
  }

  escapeId(identifier) {
    return String(identifier).replace(/"/g, '""');
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const dbEngine = new DatabaseEngine();
