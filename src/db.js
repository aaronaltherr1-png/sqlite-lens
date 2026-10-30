/**
 * SQLiteLens — Database Engine Layer
 * Wraps sql.js (WebAssembly) with high-level schema inspection,
 * pagination, sorting, query execution, and export tools.
 */

class DatabaseEngine {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.dbName = '';
    this.dbSize = 0;
    this.initPromise = this.initWasm();
  }

  async initWasm() {
    if (this.SQL) return this.SQL;
    if (typeof window.initSqlJs !== 'function') {
      throw new Error('sql.js is not loaded. Please ensure /sql-wasm.js is accessible.');
    }
    this.SQL = await window.initSqlJs({
      locateFile: file => `/${file}`
    });
    return this.SQL;
  }

  async loadFromFile(file) {
    await this.initPromise;
    const arrayBuffer = await file.arrayBuffer();
    const uInt8Array = new Uint8Array(arrayBuffer);
    
    if (this.db) {
      try { this.db.close(); } catch (e) { /* ignore */ }
    }

    this.db = new this.SQL.Database(uInt8Array);
    this.dbName = file.name;
    this.dbSize = file.size;

    return this.getDatabaseSummary();
  }

  async loadFromUrl(url, displayName) {
    await this.initPromise;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const uInt8Array = new Uint8Array(arrayBuffer);

    if (this.db) {
      try { this.db.close(); } catch (e) { /* ignore */ }
    }

    this.db = new this.SQL.Database(uInt8Array);
    this.dbName = displayName;
    this.dbSize = arrayBuffer.byteLength;

    return this.getDatabaseSummary();
  }

  getDatabaseSummary() {
    if (!this.db) return null;
    const tables = this.getTables();
    const views = this.getViews();
    const indexes = this.getIndexes();
    const pragmas = this.getPragmas();

    let totalRows = 0;
    tables.forEach(t => totalRows += t.rowCount);

    return {
      name: this.dbName,
      size: this.dbSize,
      formattedSize: this.formatBytes(this.dbSize),
      tables,
      views,
      indexes,
      totalRows,
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
      const countRes = this.db.exec(`SELECT COUNT(*) as c FROM "${row.name}"`);
      const rowCount = countRes.length > 0 && countRes[0].values.length > 0 ? countRes[0].values[0][0] : 0;
      const columns = this.getTableColumns(row.name);

      tables.push({
        name: row.name,
        sql: row.sql,
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
      views.push({
        name: row.name,
        sql: row.sql,
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
      WHERE type='index' AND name NOT LIKE 'sqlite_%';
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
    
    // 1. Column info (name, type, notnull, pk)
    const infoRes = this.db.exec(`PRAGMA table_info("${tableName}")`);
    if (!infoRes.length) return [];

    const columns = infoRes[0].values.map(v => ({
      cid: v[0],
      name: v[1],
      type: (v[2] || 'ANY').toUpperCase(),
      notNull: Boolean(v[3]),
      defaultValue: v[4],
      isPk: Boolean(v[5]),
      isFk: false,
      fkTargetTable: null,
      fkTargetCol: null
    }));

    // 2. Foreign keys info
    try {
      const fkRes = this.db.exec(`PRAGMA foreign_key_list("${tableName}")`);
      if (fkRes.length) {
        fkRes[0].values.forEach(fk => {
          const fromCol = fk[3];
          const toTable = fk[2];
          const toCol = fk[4];
          const colObj = columns.find(c => c.name === fromCol);
          if (colObj) {
            colObj.isFk = true;
            colObj.fkTargetTable = toTable;
            colObj.fkTargetCol = toCol;
          }
        });
      }
    } catch (e) {
      // Ignore if PRAGMA foreign_key_list fails
    }

    return columns;
  }

  getTableData(tableName, { page = 1, pageSize = 50, filter = '', sortCol = null, sortDir = 'ASC' } = {}) {
    if (!this.db) return { columns: [], rows: [], totalCount: 0, executionTimeMs: 0 };

    const startTime = performance.now();
    const columns = this.getTableColumns(tableName);

    // Build WHERE clause
    let whereClause = '';
    const params = [];
    if (filter.trim()) {
      const textFilter = filter.trim();
      const conditions = columns.map(col => `CAST("${col.name}" AS TEXT) LIKE ?`);
      whereClause = `WHERE ${conditions.join(' OR ')}`;
      columns.forEach(() => params.push(`%${textFilter}%`));
    }

    // Count query
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${whereClause}`;
    const countRes = this.db.exec(countSql, params);
    const totalCount = countRes.length && countRes[0].values.length ? countRes[0].values[0][0] : 0;

    // Order By
    let orderClause = '';
    if (sortCol) {
      const safeDir = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY "${sortCol}" ${safeDir}`;
    }

    // Data query with LIMIT & OFFSET
    const offset = (page - 1) * pageSize;
    const dataSql = `SELECT * FROM "${tableName}" ${whereClause} ${orderClause} LIMIT ${pageSize} OFFSET ${offset};`;
    const dataRes = this.db.exec(dataSql, params);

    const rows = dataRes.length ? dataRes[0].values : [];
    const columnNames = dataRes.length ? dataRes[0].columns : columns.map(c => c.name);

    const executionTimeMs = (performance.now() - startTime).toFixed(2);

    return {
      columns: columnNames,
      columnMeta: columns,
      rows,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      executionTimeMs
    };
  }

  executeQuery(sql) {
    if (!this.db) throw new Error('No database loaded');
    const startTime = performance.now();

    try {
      const results = this.db.exec(sql);
      const executionTimeMs = (performance.now() - startTime).toFixed(2);

      if (!results.length) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs,
          message: 'Query executed successfully. 0 rows returned.'
        };
      }

      const first = results[0];
      return {
        columns: first.columns,
        rows: first.values,
        rowCount: first.values.length,
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
    if (!this.db) throw new Error('No database loaded');
    const explainSql = `EXPLAIN QUERY PLAN ${sql}`;
    return this.executeQuery(explainSql);
  }

  getPragmas() {
    if (!this.db) return {};
    const pragmas = {};
    const pragmaKeys = [
      'user_version',
      'page_size',
      'page_count',
      'encoding',
      'journal_mode',
      'synchronous',
      'auto_vacuum'
    ];

    pragmaKeys.forEach(k => {
      try {
        const res = this.db.exec(`PRAGMA ${k}`);
        if (res.length && res[0].values.length) {
          pragmas[k] = res[0].values[0][0];
        }
      } catch (e) {
        pragmas[k] = 'N/A';
      }
    });

    return pragmas;
  }

  checkIntegrity() {
    if (!this.db) return 'No database open';
    const res = this.db.exec('PRAGMA integrity_check');
    if (res.length && res[0].values.length) {
      return res[0].values.map(v => v[0]).join('\n');
    }
    return 'ok';
  }

  exportTableToCsv(tableName) {
    if (!this.db) return '';
    const res = this.db.exec(`SELECT * FROM "${tableName}"`);
    if (!res.length) return '';

    const cols = res[0].columns;
    const rows = res[0].values;

    const escapeCsv = val => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = cols.map(escapeCsv).join(',');
    const rowLines = rows.map(r => r.map(escapeCsv).join(','));
    return [headerLine, ...rowLines].join('\n');
  }

  exportTableToJson(tableName) {
    if (!this.db) return '[]';
    const res = this.db.exec(`SELECT * FROM "${tableName}"`);
    if (!res.length) return '[]';

    const cols = res[0].columns;
    const rows = res[0].values;
    const arrayObj = rows.map(r => {
      const obj = {};
      cols.forEach((col, i) => {
        obj[col] = r[i];
      });
      return obj;
    });

    return JSON.stringify(arrayObj, null, 2);
  }

  exportQueryToCsv(columns, rows) {
    const escapeCsv = val => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = columns.map(escapeCsv).join(',');
    const body = rows.map(r => r.map(escapeCsv).join(','));
    return [header, ...body].join('\n');
  }

  exportFullSqlDump() {
    if (!this.db) return '';
    const tables = this.getTables();
    let dump = `-- ==========================================================\n`;
    dump += `-- SQLiteLens Database Dump\n`;
    dump += `-- Database: ${this.dbName}\n`;
    dump += `-- Generated: ${new Date().toISOString()}\n`;
    dump += `-- ==========================================================\n\n`;

    tables.forEach(t => {
      dump += `-- Table: ${t.name}\n`;
      dump += `${t.sql};\n\n`;

      const dataRes = this.db.exec(`SELECT * FROM "${t.name}"`);
      if (dataRes.length && dataRes[0].values.length) {
        const cols = dataRes[0].columns.map(c => `"${c}"`).join(', ');
        dataRes[0].values.forEach(row => {
          const values = row.map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');
          dump += `INSERT INTO "${t.name}" (${cols}) VALUES (${values});\n`;
        });
        dump += '\n';
      }
    });

    return dump;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const dbEngine = new DatabaseEngine();
