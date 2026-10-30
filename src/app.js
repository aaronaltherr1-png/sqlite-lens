import { dbEngine } from './db.js';
import { ErdViewer } from './erd.js';

class SQLiteLensStudio {
  constructor() {
    this.activeTable = null;
    this.currentPage = 1;
    this.pageSize = 50;
    this.filterText = '';
    this.sortCol = null;
    this.sortDir = 'ASC';
    this.erdViewer = null;
    this.paletteIndex = 0;
    this.paletteActions = [];

    this.initDOMElements();
    this.bindEvents();
    this.initTheme();
    this.bootstrapApp();
  }

  initDOMElements() {
    // Window Header & Status Elements
    this.activeDbPill = document.getElementById('active-db-pill');
    this.activeDbName = document.getElementById('active-db-name');
    this.activeDbSize = document.getElementById('active-db-size');
    this.activeTableMetaText = document.getElementById('active-table-meta-text');
    this.btnImportFile = document.getElementById('btn-import-file');
    this.filePickerInput = document.getElementById('file-picker-input');
    this.btnExportDump = document.getElementById('btn-export-dump');
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');

    // Drag overlay
    this.dragOverlay = document.getElementById('drag-overlay');

    // Sidebar
    this.connSaas = document.getElementById('conn-saas');
    this.connEcom = document.getElementById('conn-ecom');
    this.sidebarFilterInput = document.getElementById('sidebar-filter-input');
    this.sidebarTablesList = document.getElementById('sidebar-tables-list');
    this.sidebarTablesCount = document.getElementById('sidebar-tables-count');
    this.sidebarViewsBlock = document.getElementById('sidebar-views-block');
    this.sidebarViewsList = document.getElementById('sidebar-views-list');
    this.sidebarViewsCount = document.getElementById('sidebar-views-count');

    // Mode Tabs
    this.modeTabs = document.querySelectorAll('.mode-tab-btn');

    // Grid View
    this.gridTableTitle = document.getElementById('grid-table-title');
    this.gridActiveTableName = document.getElementById('grid-active-table-name');
    this.gridRowCountBadge = document.getElementById('grid-row-count-badge');
    this.gridSearchFilter = document.getElementById('grid-search-filter');
    this.mainTableHead = document.getElementById('main-table-head');
    this.mainTableBody = document.getElementById('main-table-body');
    this.gridPaginationLabel = document.getElementById('grid-pagination-label');
    this.gridPaginationPage = document.getElementById('grid-pagination-page');
    this.btnGridPrev = document.getElementById('btn-grid-prev');
    this.btnGridNext = document.getElementById('btn-grid-next');
    this.btnGridExportCsv = document.getElementById('btn-grid-export-csv');
    this.btnGridExportJson = document.getElementById('btn-grid-export-json');
    this.btnGridRefresh = document.getElementById('btn-grid-refresh');

    // SQL Studio View
    this.sqlEditorInput = document.getElementById('sql-editor-input');
    this.btnQueryRun = document.getElementById('btn-query-run');
    this.btnQueryExplain = document.getElementById('btn-query-explain');
    this.queryQuickTemplates = document.getElementById('query-quick-templates');
    this.queryExecutionStatus = document.getElementById('query-execution-status');
    this.queryOutputHead = document.getElementById('query-output-head');
    this.queryOutputBody = document.getElementById('query-output-body');
    this.btnQueryExportCsv = document.getElementById('btn-query-export-csv');
    this.lastQueryResults = null;

    // Visual ERD View
    this.btnErdAutoLayout = document.getElementById('btn-erd-auto-layout');
    this.btnErdZoomIn = document.getElementById('btn-erd-zoom-in');
    this.btnErdZoomOut = document.getElementById('btn-erd-zoom-out');

    // Insights View
    this.kpiStorage = document.getElementById('kpi-storage');
    this.kpiTables = document.getElementById('kpi-tables');
    this.kpiRows = document.getElementById('kpi-rows');
    this.kpiIndices = document.getElementById('kpi-indices');
    this.insightsBarChart = document.getElementById('insights-bar-chart');
    this.insightsPragmaKv = document.getElementById('insights-pragma-kv');
    this.btnRunIntegrityCheck = document.getElementById('btn-run-integrity-check');

    // Bottom Status Bar
    this.sbDbInfo = document.getElementById('sb-db-info');
    this.sbEncoding = document.getElementById('sb-encoding');
    this.sbPerfTime = document.getElementById('sb-perf-time');

    // Command Palette
    this.btnOpenPalette = document.getElementById('btn-open-palette');
    this.paletteOverlay = document.getElementById('palette-overlay');
    this.paletteSearchInput = document.getElementById('palette-search-input');
    this.paletteResultsList = document.getElementById('palette-results-list');

    // Cell Inspector
    this.modalCellInspector = document.getElementById('modal-cell-inspector');
    this.modalInspectorTitle = document.getElementById('modal-inspector-title');
    this.modalInspectorBody = document.getElementById('modal-inspector-body');
    this.btnCloseInspector = document.getElementById('btn-close-inspector');
    this.btnDoneInspector = document.getElementById('btn-done-inspector');
    this.btnCopyInspector = document.getElementById('btn-copy-inspector');

    // Toasts
    this.toastShelf = document.getElementById('toast-shelf');
  }

  bindEvents() {
    // Mode Switcher Tabs
    this.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchMode(tab.dataset.tab);
      });
    });

    // Workspace Connection Switchers
    this.connSaas.addEventListener('click', () => {
      this.switchWorkspace('saas-production.db', 'saas-production.db', this.connSaas);
    });

    this.connEcom.addEventListener('click', () => {
      this.switchWorkspace('ecommerce-store.db', 'ecommerce-store.db', this.connEcom);
    });

    // File import trigger
    this.btnImportFile.addEventListener('click', () => this.filePickerInput.click());
    this.filePickerInput.addEventListener('change', e => {
      if (e.target.files.length) this.loadFile(e.target.files[0]);
    });

    // Full SQL Dump Export
    this.btnExportDump.addEventListener('click', () => {
      const dump = dbEngine.exportFullSqlDump();
      this.downloadFile(dump, `${dbEngine.dbName || 'cluster'}_dump.sql`, 'text/sql');
      this.showToast('Generated full SQL database dump', 'success');
    });

    // Full Window Drag & Drop
    window.addEventListener('dragover', e => {
      e.preventDefault();
      this.dragOverlay.classList.add('active');
    });

    this.dragOverlay.addEventListener('dragleave', e => {
      e.preventDefault();
      this.dragOverlay.classList.remove('active');
    });

    window.addEventListener('drop', e => {
      e.preventDefault();
      this.dragOverlay.classList.remove('active');
      if (e.dataTransfer.files.length) {
        this.loadFile(e.dataTransfer.files[0]);
      }
    });

    // Sidebar table search
    this.sidebarFilterInput.addEventListener('input', e => {
      const query = e.target.value.toLowerCase();
      this.sidebarTablesList.querySelectorAll('.table-item').forEach(item => {
        const name = item.dataset.table.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
      });
    });

    // Grid search & pagination
    this.gridSearchFilter.addEventListener('input', e => {
      this.filterText = e.target.value;
      this.currentPage = 1;
      this.renderGridData();
    });

    this.btnGridPrev.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderGridData();
      }
    });

    this.btnGridNext.addEventListener('click', () => {
      this.currentPage++;
      this.renderGridData();
    });

    this.btnGridRefresh.addEventListener('click', () => {
      this.renderGridData();
      this.showToast('Table synchronized', 'info');
    });

    this.btnGridExportCsv.addEventListener('click', () => {
      if (!this.activeTable) return;
      const csv = dbEngine.exportTableToCsv(this.activeTable);
      this.downloadFile(csv, `${this.activeTable}.csv`, 'text/csv');
      this.showToast(`Exported ${this.activeTable}.csv`, 'success');
    });

    this.btnGridExportJson.addEventListener('click', () => {
      if (!this.activeTable) return;
      const json = dbEngine.exportTableToJson(this.activeTable);
      this.downloadFile(json, `${this.activeTable}.json`, 'application/json');
      this.showToast(`Exported ${this.activeTable}.json`, 'success');
    });

    // SQL Studio
    this.btnQueryRun.addEventListener('click', () => this.executeSql());
    this.btnQueryExplain.addEventListener('click', () => this.explainSql());
    this.btnQueryExportCsv.addEventListener('click', () => {
      if (!this.lastQueryResults) return;
      const csv = dbEngine.exportQueryToCsv(this.lastQueryResults.columns, this.lastQueryResults.rows);
      this.downloadFile(csv, 'query_export.csv', 'text/csv');
      this.showToast('Query dataset exported to CSV', 'success');
    });

    this.sqlEditorInput.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.executeSql();
      }
    });

    // ERD Canvas Controls
    this.btnErdAutoLayout.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.resetLayout();
    });
    this.btnErdZoomIn.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.setZoom(0.15);
    });
    this.btnErdZoomOut.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.setZoom(-0.15);
    });

    // Diagnostics
    this.btnRunIntegrityCheck.addEventListener('click', () => {
      const report = dbEngine.checkIntegrity();
      this.openInspectorModal('PRAGMA integrity_check Report', report);
    });

    // Command Palette Omnibar
    this.btnOpenPalette.addEventListener('click', () => this.openPalette());
    this.paletteSearchInput.addEventListener('input', () => this.filterPalette());
    this.paletteSearchInput.addEventListener('keydown', e => this.handlePaletteKeydown(e));
    this.paletteOverlay.addEventListener('click', e => {
      if (e.target === this.paletteOverlay) this.closePalette();
    });

    // Inspector Modal
    this.btnCloseInspector.addEventListener('click', () => this.closeInspectorModal());
    this.btnDoneInspector.addEventListener('click', () => this.closeInspectorModal());
    this.btnCopyInspector.addEventListener('click', () => {
      navigator.clipboard.writeText(this.modalInspectorBody.textContent);
      this.showToast('Copied to clipboard', 'success');
    });

    // Keyboard Shortcuts (Ctrl+K, Esc)
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openPalette();
      }
      if (e.key === 'Escape') {
        this.closePalette();
        this.closeInspectorModal();
      }
    });
  }

  initTheme() {
    const saved = localStorage.getItem('sqlitelens_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    this.btnThemeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sqlitelens_theme', next);
      this.showToast(`Switched to ${next} theme`, 'info');
    });
  }

  async bootstrapApp() {
    // Immediately boot into full software studio with SaaS production cluster
    try {
      this.showToast('Connecting to in-memory SQLite WASM cluster...', 'info');
      await this.switchWorkspace('saas-production.db', 'saas-production.db', this.connSaas);
    } catch (err) {
      console.error(err);
      this.showToast(`Initialization note: ${err.message}`, 'error');
    }
  }

  async switchWorkspace(dbUrl, displayName, activeBtn) {
    try {
      document.querySelectorAll('.connection-item').forEach(c => c.classList.remove('active'));
      if (activeBtn) activeBtn.classList.add('active');

      const summary = await dbEngine.loadFromUrl(dbUrl, displayName);
      this.onDatabaseLoaded(summary);
      this.showToast(`Connected to ${displayName}`, 'success');
    } catch (err) {
      console.error(err);
      this.showToast(`Failed to connect: ${err.message}`, 'error');
    }
  }

  async loadFile(file) {
    if (!file) return;
    try {
      this.showToast(`Mounting ${file.name}...`, 'info');
      const summary = await dbEngine.loadFromFile(file);
      document.querySelectorAll('.connection-item').forEach(c => c.classList.remove('active'));
      this.onDatabaseLoaded(summary);
      this.showToast(`Mounted ${file.name} successfully!`, 'success');
    } catch (err) {
      console.error(err);
      this.showToast(`Failed to mount database: ${err.message}`, 'error');
    }
  }

  onDatabaseLoaded(summary) {
    this.activeDbName.textContent = summary.name;
    this.activeDbSize.textContent = summary.formattedSize;
    this.sbDbInfo.textContent = `Database: ${summary.name} (${summary.formattedSize})`;
    this.sbEncoding.textContent = `Encoding: ${summary.pragmas.encoding || 'UTF-8'}`;

    // Render Sidebar Tables
    this.renderSidebar(summary.tables, summary.views);

    // Initialize ERD Canvas
    if (!this.erdViewer) {
      this.erdViewer = new ErdViewer('erd-canvas-viewport', 'erd-svg-layer', 'erd-nodes-container');
    }
    this.erdViewer.render(summary.tables);

    // Render Insights
    this.renderInsights(summary);

    // Populate Query Snippets
    this.renderQuerySnippets(summary.tables);

    // Build Palette Index
    this.buildPaletteActions(summary.tables);

    // Select first table
    if (summary.tables.length > 0) {
      this.selectTable(summary.tables[0].name);
    }
  }

  renderSidebar(tables, views) {
    this.sidebarTablesCount.textContent = tables.length;
    this.sidebarTablesList.innerHTML = '';

    tables.forEach(t => {
      const li = document.createElement('li');
      li.className = 'table-item';
      li.dataset.table = t.name;
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span>${t.name}</span>
        </div>
        <span class="table-badge-rows">${t.rowCount}</span>
      `;

      li.addEventListener('click', () => this.selectTable(t.name));
      this.sidebarTablesList.appendChild(li);
    });

    if (views && views.length) {
      this.sidebarViewsBlock.style.display = 'block';
      this.sidebarViewsCount.textContent = views.length;
      this.sidebarViewsList.innerHTML = '';

      views.forEach(v => {
        const li = document.createElement('li');
        li.className = 'table-item';
        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 7px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>${v.name}</span>
          </div>
        `;
        li.addEventListener('click', () => this.selectTable(v.name));
        this.sidebarViewsList.appendChild(li);
      });
    } else {
      this.sidebarViewsBlock.style.display = 'none';
    }
  }

  selectTable(tableName) {
    this.activeTable = tableName;
    this.currentPage = 1;
    this.sortCol = null;
    this.sortDir = 'ASC';
    this.filterText = '';
    this.gridSearchFilter.value = '';

    this.sidebarTablesList.querySelectorAll('.table-item').forEach(item => {
      item.classList.toggle('active', item.dataset.table === tableName);
    });

    this.gridActiveTableName.textContent = tableName;
    this.sqlEditorInput.value = `SELECT * FROM "${tableName}" LIMIT 50;`;

    this.renderGridData();
  }

  renderGridData() {
    if (!this.activeTable) return;

    const res = dbEngine.getTableData(this.activeTable, {
      page: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterText,
      sortCol: this.sortCol,
      sortDir: this.sortDir
    });

    this.gridRowCountBadge.textContent = `${res.totalCount} rows (${res.executionTimeMs}ms)`;
    this.activeTableMetaText.textContent = `${this.activeTable} • ${res.totalCount} rows • ${res.executionTimeMs}ms`;
    this.sbPerfTime.textContent = `Latency: ${res.executionTimeMs}ms`;

    // Headers
    let thead = '<tr><th class="row-num-cell">#</th>';
    res.columnMeta.forEach(col => {
      let icon = '';
      if (col.isPk) icon = '<span style="color: var(--accent-amber); margin-right: 3px;" title="Primary Key">🔑</span>';
      else if (col.isFk) icon = `<span style="color: var(--accent-cyan); margin-right: 3px;" title="Foreign Key -> ${col.fkTargetTable}">🔗</span>`;

      let sortArrow = '';
      if (this.sortCol === col.name) {
        sortArrow = this.sortDir === 'ASC' ? ' ↑' : ' ↓';
      }

      thead += `
        <th data-column="${col.name}">
          <div class="th-inner">
            <span>${icon}${col.name}${sortArrow}</span>
            <span class="type-pill">${col.type}</span>
          </div>
        </th>
      `;
    });
    thead += '</tr>';
    this.mainTableHead.innerHTML = thead;

    // Header sort events
    this.mainTableHead.querySelectorAll('th[data-column]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.column;
        if (this.sortCol === col) {
          this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
        } else {
          this.sortCol = col;
          this.sortDir = 'ASC';
        }
        this.renderGridData();
      });
    });

    // Rows
    if (!res.rows.length) {
      this.mainTableBody.innerHTML = `
        <tr>
          <td colspan="${res.columnMeta.length + 1}" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No records found matching the active filter.
          </td>
        </tr>
      `;
    } else {
      let tbody = '';
      const startIdx = (res.page - 1) * res.pageSize;

      res.rows.forEach((row, rIdx) => {
        tbody += `<tr><td class="row-num-cell">${startIdx + rIdx + 1}</td>`;
        row.forEach((val, cIdx) => {
          let formatted = '';
          if (val === null || val === undefined) {
            formatted = '<span class="badge-null">NULL</span>';
          } else {
            formatted = this.escapeHtml(String(val));
          }
          tbody += `<td data-row="${rIdx}" data-col="${cIdx}" style="cursor: pointer;">${formatted}</td>`;
        });
        tbody += '</tr>';
      });

      this.mainTableBody.innerHTML = tbody;

      this.mainTableBody.querySelectorAll('td[data-row]').forEach(td => {
        td.addEventListener('click', () => {
          const r = parseInt(td.dataset.row);
          const c = parseInt(td.dataset.col);
          const raw = res.rows[r][c];
          const colName = res.columns[c];
          this.openInspectorModal(`${this.activeTable} › ${colName}`, raw);
        });
      });
    }

    // Pagination
    const startNum = res.totalCount === 0 ? 0 : (res.page - 1) * res.pageSize + 1;
    const endNum = Math.min(res.page * res.pageSize, res.totalCount);
    this.gridPaginationLabel.textContent = `Showing rows ${startNum}-${endNum} of ${res.totalCount}`;
    this.gridPaginationPage.textContent = `${res.page} / ${res.totalPages}`;
    this.btnGridPrev.disabled = res.page <= 1;
    this.btnGridNext.disabled = res.page >= res.totalPages;
  }

  executeSql() {
    const sql = this.sqlEditorInput.value.trim();
    if (!sql) return;

    this.queryExecutionStatus.innerHTML = '<span style="color: var(--accent-cyan);">Executing query against cluster...</span>';

    try {
      const res = dbEngine.executeQuery(sql);

      if (res.error) {
        this.queryExecutionStatus.innerHTML = `
          <span style="color: var(--accent-rose); font-family: var(--font-mono);">
            ✕ Error: ${this.escapeHtml(res.error)} (${res.executionTimeMs}ms)
          </span>
        `;
        this.queryOutputHead.innerHTML = '';
        this.queryOutputBody.innerHTML = '';
        this.btnQueryExportCsv.style.display = 'none';
        return;
      }

      this.lastQueryResults = res;
      this.queryExecutionStatus.innerHTML = `
        <span style="color: var(--accent-emerald); font-family: var(--font-mono);">
          ✓ ${res.rowCount} rows fetched in ${res.executionTimeMs}ms
        </span>
      `;
      this.btnQueryExportCsv.style.display = res.rowCount > 0 ? 'inline-flex' : 'none';
      this.sbPerfTime.textContent = `Latency: ${res.executionTimeMs}ms`;

      if (!res.columns.length) {
        this.queryOutputHead.innerHTML = '';
        this.queryOutputBody.innerHTML = `
          <tr>
            <td style="padding: 24px; text-align: center; color: var(--text-muted);">
              ${res.message || 'Query completed successfully. 0 rows returned.'}
            </td>
          </tr>
        `;
        return;
      }

      let thead = '<tr><th class="row-num-cell">#</th>';
      res.columns.forEach(col => {
        thead += `<th>${this.escapeHtml(col)}</th>`;
      });
      thead += '</tr>';
      this.queryOutputHead.innerHTML = thead;

      let tbody = '';
      res.rows.forEach((row, i) => {
        tbody += `<tr><td class="row-num-cell">${i + 1}</td>`;
        row.forEach(cell => {
          let formatted = cell === null ? '<span class="badge-null">NULL</span>' : this.escapeHtml(String(cell));
          tbody += `<td>${formatted}</td>`;
        });
        tbody += '</tr>';
      });
      this.queryOutputBody.innerHTML = tbody;

    } catch (err) {
      this.queryExecutionStatus.innerHTML = `<span style="color: var(--accent-rose);">Execution error: ${err.message}</span>`;
    }
  }

  explainSql() {
    const sql = this.sqlEditorInput.value.trim();
    if (!sql) return;
    this.sqlEditorInput.value = `EXPLAIN QUERY PLAN ${sql}`;
    this.executeSql();
    this.showToast('Generated execution plan', 'info');
  }

  renderQuerySnippets(tables) {
    this.queryQuickTemplates.innerHTML = '<span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700;">SNIPPETS:</span>';
    if (!tables.length) return;

    const first = tables[0].name;
    const snippets = [
      { label: `Scan ${first}`, sql: `SELECT * FROM "${first}" LIMIT 50;` },
      { label: 'Cluster Summary', sql: `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view');` },
      { label: 'Schema Columns', sql: `SELECT m.name as tbl, p.name as col, p.type FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table';` }
    ];

    snippets.forEach(s => {
      const pill = document.createElement('span');
      pill.className = 'template-badge';
      pill.textContent = s.label;
      pill.addEventListener('click', () => {
        this.sqlEditorInput.value = s.sql;
        this.executeSql();
      });
      this.queryQuickTemplates.appendChild(pill);
    });
  }

  renderInsights(summary) {
    this.kpiStorage.textContent = summary.formattedSize;
    this.kpiTables.textContent = summary.tables.length;
    this.kpiRows.textContent = summary.totalRows.toLocaleString();
    this.kpiIndices.textContent = summary.indexes.length;

    let bars = '';
    const maxRows = Math.max(1, ...summary.tables.map(t => t.rowCount));

    summary.tables.forEach(t => {
      const pct = Math.min(100, Math.max(4, (t.rowCount / maxRows) * 100));
      bars += `
        <div class="bar-row">
          <div class="bar-meta">
            <span style="font-weight: 600;">${t.name}</span>
            <span style="font-family: var(--font-mono); color: var(--text-muted);">${t.rowCount} rows</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });
    this.insightsBarChart.innerHTML = bars;

    let pragmaHtml = '';
    for (const [k, v] of Object.entries(summary.pragmas)) {
      pragmaHtml += `
        <tr>
          <td>PRAGMA ${k}</td>
          <td>${v}</td>
        </tr>
      `;
    }
    this.insightsPragmaKv.innerHTML = pragmaHtml;
  }

  switchMode(tab) {
    this.modeTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    document.querySelectorAll('.view-panel').forEach(p => {
      p.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tab}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    if (tab === 'erd' && this.erdViewer) {
      requestAnimationFrame(() => this.erdViewer.updateAllConnections());
    }
  }

  /* Command Palette Omnibar (Ctrl+K) */
  buildPaletteActions(tables) {
    this.paletteActions = [
      { type: 'command', title: 'Switch to SaaS Production Database', action: () => this.switchWorkspace('saas-production.db', 'saas-production.db', this.connSaas) },
      { type: 'command', title: 'Switch to E-Commerce Cloud Database', action: () => this.switchWorkspace('ecommerce-store.db', 'ecommerce-store.db', this.connEcom) },
      { type: 'command', title: 'Export Full Database SQL Dump', action: () => this.btnExportDump.click() },
      { type: 'command', title: 'Open SQL Studio Console', action: () => this.switchMode('query') },
      { type: 'command', title: 'Open Interactive Visual ERD', action: () => this.switchMode('erd') },
      { type: 'command', title: 'Open Diagnostics & Health', action: () => this.switchMode('insights') },
      { type: 'command', title: 'Toggle Dark / Light Theme', action: () => this.btnThemeToggle.click() },
    ];

    tables.forEach(t => {
      this.paletteActions.push({
        type: 'table',
        title: `Jump to table: ${t.name}`,
        subtitle: `${t.rowCount} rows • ${t.columns.length} columns`,
        action: () => {
          this.switchMode('grid');
          this.selectTable(t.name);
        }
      });
    });
  }

  openPalette() {
    this.paletteOverlay.classList.add('active');
    this.paletteSearchInput.value = '';
    this.paletteIndex = 0;
    this.filterPalette();
    this.paletteSearchInput.focus();
  }

  closePalette() {
    this.paletteOverlay.classList.remove('active');
  }

  filterPalette() {
    const q = this.paletteSearchInput.value.toLowerCase().trim();
    const filtered = this.paletteActions.filter(a => a.title.toLowerCase().includes(q));
    this.paletteResultsList.innerHTML = '';

    if (!filtered.length) {
      this.paletteResultsList.innerHTML = `
        <li style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No matching commands or tables found.
        </li>
      `;
      return;
    }

    filtered.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = `palette-item ${idx === this.paletteIndex ? 'selected' : ''}`;
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.85rem;">${item.type === 'table' ? '📊' : '⚡'}</span>
          <span>${item.title}</span>
        </div>
        <span style="font-size: 0.725rem; opacity: 0.7;">${item.subtitle || 'Action'}</span>
      `;
      li.addEventListener('click', () => {
        item.action();
        this.closePalette();
      });
      this.paletteResultsList.appendChild(li);
    });
  }

  handlePaletteKeydown(e) {
    const items = this.paletteResultsList.querySelectorAll('.palette-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.paletteIndex = (this.paletteIndex + 1) % items.length;
      this.updatePaletteSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.paletteIndex = (this.paletteIndex - 1 + items.length) % items.length;
      this.updatePaletteSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[this.paletteIndex]) items[this.paletteIndex].click();
    }
  }

  updatePaletteSelection(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === this.paletteIndex);
      if (idx === this.paletteIndex) item.scrollIntoView({ block: 'nearest' });
    });
  }

  openInspectorModal(title, value) {
    this.modalInspectorTitle.textContent = title;
    let formatted = String(value);

    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        formatted = JSON.stringify(JSON.parse(value), null, 2);
      } catch (e) { /* keep raw */ }
    }

    this.modalInspectorBody.textContent = formatted;
    this.modalCellInspector.classList.add('active');
  }

  closeInspectorModal() {
    this.modalCellInspector.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    this.toastShelf.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SQLiteLensStudio();
});
