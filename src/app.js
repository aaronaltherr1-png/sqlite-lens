import { dbEngine } from './db.js';
import { ErdViewer } from './erd.js';

class App {
  constructor() {
    this.activeTable = null;
    this.currentPage = 1;
    this.pageSize = 50;
    this.filterText = '';
    this.sortCol = null;
    this.sortDir = 'ASC';
    this.erdViewer = null;

    this.initDOMElements();
    this.bindEvents();
    this.initTheme();
  }

  initDOMElements() {
    // Views
    this.landingView = document.getElementById('landing-view');
    this.workspaceView = document.getElementById('workspace-view');

    // Header elements
    this.headerDbPill = document.getElementById('header-db-pill');
    this.headerDbName = document.getElementById('header-db-name');
    this.headerDbSize = document.getElementById('header-db-size');
    this.headerTabs = document.getElementById('header-tabs');
    this.btnOpenNew = document.getElementById('btn-open-new');
    this.btnExportMenu = document.getElementById('btn-export-menu');
    this.fileInputHeader = document.getElementById('file-input-header');
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');

    // Dropzone elements
    this.dropzone = document.getElementById('dropzone');
    this.fileInputDrop = document.getElementById('file-input-drop');
    this.btnSampleEcommerce = document.getElementById('btn-sample-ecommerce');
    this.btnSampleAnalytics = document.getElementById('btn-sample-analytics');

    // Sidebar elements
    this.sidebarTableSearch = document.getElementById('sidebar-table-search');
    this.sidebarTablesList = document.getElementById('sidebar-tables-list');
    this.sidebarTableCount = document.getElementById('sidebar-table-count');
    this.sidebarViewsSection = document.getElementById('sidebar-views-section');
    this.sidebarViewsList = document.getElementById('sidebar-views-list');
    this.sidebarViewCount = document.getElementById('sidebar-view-count');

    // Table view elements
    this.activeTableTitle = document.getElementById('active-table-title');
    this.activeTableCount = document.getElementById('active-table-count');
    this.tableFilterInput = document.getElementById('table-filter-input');
    this.dataTableHead = document.getElementById('data-table-head');
    this.dataTableBody = document.getElementById('data-table-body');
    this.paginationInfo = document.getElementById('pagination-info');
    this.paginationPageNum = document.getElementById('pagination-page-num');
    this.btnPagePrev = document.getElementById('btn-page-prev');
    this.btnPageNext = document.getElementById('btn-page-next');
    this.btnExportTableCsv = document.getElementById('btn-export-table-csv');
    this.btnExportTableJson = document.getElementById('btn-export-table-json');
    this.btnRefreshTable = document.getElementById('btn-refresh-table');

    // Query studio elements
    this.sqlQueryInput = document.getElementById('sql-query-input');
    this.btnRunQuery = document.getElementById('btn-run-query');
    this.btnExplainQuery = document.getElementById('btn-explain-query');
    this.queryTemplatesBar = document.getElementById('query-templates-bar');
    this.queryStatusText = document.getElementById('query-status-text');
    this.queryResultsHead = document.getElementById('query-results-head');
    this.queryResultsBody = document.getElementById('query-results-body');
    this.btnExportQueryCsv = document.getElementById('btn-export-query-csv');
    this.lastQueryResults = null;

    // ERD elements
    this.erdCanvas = document.getElementById('erd-canvas');
    this.btnErdReset = document.getElementById('btn-erd-reset');
    this.btnErdZoomIn = document.getElementById('btn-erd-zoom-in');
    this.btnErdZoomOut = document.getElementById('btn-erd-zoom-out');

    // Insights elements
    this.kpiDbSize = document.getElementById('kpi-db-size');
    this.kpiDbTables = document.getElementById('kpi-db-tables');
    this.kpiDbRows = document.getElementById('kpi-db-rows');
    this.kpiDbIndexes = document.getElementById('kpi-db-indexes');
    this.insightsTableBars = document.getElementById('insights-table-bars');
    this.insightsPragmaTable = document.getElementById('insights-pragma-table');
    this.btnCheckIntegrity = document.getElementById('btn-check-integrity');

    // Cell Inspector Modal
    this.modalCell = document.getElementById('modal-cell');
    this.modalCellTitle = document.getElementById('modal-cell-title');
    this.modalCellContent = document.getElementById('modal-cell-content');
    this.btnCloseCellModal = document.getElementById('btn-close-cell-modal');
    this.btnDoneCellModal = document.getElementById('btn-done-cell-modal');
    this.btnCopyCellContent = document.getElementById('btn-copy-cell-content');

    // Toast
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Dropzone & File Pickers
    this.dropzone.addEventListener('click', () => this.fileInputDrop.click());
    this.fileInputDrop.addEventListener('change', e => this.handleFileSelect(e.target.files[0]));

    this.btnOpenNew.addEventListener('click', () => this.fileInputHeader.click());
    this.fileInputHeader.addEventListener('change', e => this.handleFileSelect(e.target.files[0]));

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        this.dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        this.dropzone.classList.remove('drag-active');
      });
    });

    this.dropzone.addEventListener('drop', e => {
      if (e.dataTransfer.files.length) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Sample database triggers
    this.btnSampleEcommerce.addEventListener('click', () => {
      this.loadSampleDatabase('/sample-ecommerce.db', 'ecommerce-store.db');
    });

    this.btnSampleAnalytics.addEventListener('click', () => {
      this.loadSampleDatabase('/sample-analytics.db', 'saas-analytics.db');
    });

    // Navigation Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Sidebar search filter
    this.sidebarTableSearch.addEventListener('input', e => {
      this.filterSidebarTables(e.target.value.toLowerCase());
    });

    // Table view pagination & filtering
    this.tableFilterInput.addEventListener('input', e => {
      this.filterText = e.target.value;
      this.currentPage = 1;
      this.renderActiveTableData();
    });

    this.btnPagePrev.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderActiveTableData();
      }
    });

    this.btnPageNext.addEventListener('click', () => {
      this.currentPage++;
      this.renderActiveTableData();
    });

    this.btnRefreshTable.addEventListener('click', () => {
      this.renderActiveTableData();
      this.showToast('Table reloaded', 'info');
    });

    // Table exports
    this.btnExportTableCsv.addEventListener('click', () => {
      if (!this.activeTable) return;
      const csv = dbEngine.exportTableToCsv(this.activeTable);
      this.downloadFile(csv, `${this.activeTable}.csv`, 'text/csv');
      this.showToast(`Exported ${this.activeTable}.csv`, 'success');
    });

    this.btnExportTableJson.addEventListener('click', () => {
      if (!this.activeTable) return;
      const json = dbEngine.exportTableToJson(this.activeTable);
      this.downloadFile(json, `${this.activeTable}.json`, 'application/json');
      this.showToast(`Exported ${this.activeTable}.json`, 'success');
    });

    // Header Full Export Menu
    this.btnExportMenu.addEventListener('click', () => {
      const dump = dbEngine.exportFullSqlDump();
      this.downloadFile(dump, `${dbEngine.dbName || 'database'}_dump.sql`, 'text/sql');
      this.showToast('Full SQL database dump exported!', 'success');
    });

    // SQL Query Studio
    this.btnRunQuery.addEventListener('click', () => this.runSqlQuery());
    this.btnExplainQuery.addEventListener('click', () => this.runExplainQuery());
    this.btnExportQueryCsv.addEventListener('click', () => {
      if (!this.lastQueryResults) return;
      const csv = dbEngine.exportQueryToCsv(this.lastQueryResults.columns, this.lastQueryResults.rows);
      this.downloadFile(csv, 'query_results.csv', 'text/csv');
      this.showToast('Query results exported to CSV', 'success');
    });

    this.sqlQueryInput.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runSqlQuery();
      }
    });

    // ERD Controls
    this.btnErdReset.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.resetLayout();
    });
    this.btnErdZoomIn.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.setZoom(0.15);
    });
    this.btnErdZoomOut.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.setZoom(-0.15);
    });

    // Insights
    this.btnCheckIntegrity.addEventListener('click', () => {
      const result = dbEngine.checkIntegrity();
      this.openCellModal('PRAGMA Integrity Check', result);
    });

    // Modal
    this.btnCloseCellModal.addEventListener('click', () => this.closeCellModal());
    this.btnDoneCellModal.addEventListener('click', () => this.closeCellModal());
    this.btnCopyCellContent.addEventListener('click', () => {
      navigator.clipboard.writeText(this.modalCellContent.textContent);
      this.showToast('Copied to clipboard!', 'success');
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeCellModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.sidebarTableSearch.focus();
      }
    });
  }

  initTheme() {
    const savedTheme = localStorage.getItem('sqlitelens_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    this.btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sqlitelens_theme', next);
      this.showToast(`Switched to ${next} theme`, 'info');
    });
  }

  async handleFileSelect(file) {
    if (!file) return;
    try {
      this.showToast(`Loading ${file.name}...`, 'info');
      const summary = await dbEngine.loadFromFile(file);
      this.onDatabaseLoaded(summary);
      this.showToast(`Loaded ${file.name} successfully!`, 'success');
    } catch (err) {
      console.error(err);
      this.showToast(`Error opening database: ${err.message}`, 'error');
    }
  }

  async loadSampleDatabase(url, name) {
    try {
      this.showToast(`Loading demo ${name}...`, 'info');
      const summary = await dbEngine.loadFromUrl(url, name);
      this.onDatabaseLoaded(summary);
      this.showToast(`Loaded ${name}!`, 'success');
    } catch (err) {
      console.error(err);
      this.showToast(`Failed to load sample: ${err.message}`, 'error');
    }
  }

  onDatabaseLoaded(summary) {
    // Toggle UI States
    this.landingView.style.display = 'none';
    this.workspaceView.style.display = 'flex';
    this.headerDbPill.style.display = 'flex';
    this.headerTabs.style.display = 'flex';
    this.btnOpenNew.style.display = 'inline-flex';
    this.btnExportMenu.style.display = 'inline-flex';

    this.headerDbName.textContent = summary.name;
    this.headerDbSize.textContent = summary.formattedSize;

    // Populate Sidebar
    this.renderSidebar(summary.tables, summary.views);

    // Initialize ERD Viewer
    if (!this.erdViewer) {
      this.erdViewer = new ErdViewer('erd-canvas', 'erd-svg', 'erd-nodes-layer');
    }
    this.erdViewer.render(summary.tables);

    // Populate Insights
    this.renderInsights(summary);

    // Setup SQL templates
    this.renderQueryTemplates(summary.tables);

    // Select first table
    if (summary.tables.length > 0) {
      this.selectTable(summary.tables[0].name);
    }

    this.switchTab('tables');
  }

  renderSidebar(tables, views) {
    this.sidebarTableCount.textContent = tables.length;
    this.sidebarTablesList.innerHTML = '';

    tables.forEach(table => {
      const li = document.createElement('li');
      li.className = 'sidebar-item';
      li.dataset.table = table.name;
      li.innerHTML = `
        <div class="sidebar-item-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span>${table.name}</span>
        </div>
        <span class="sidebar-item-count">${table.rowCount}</span>
      `;

      li.addEventListener('click', () => this.selectTable(table.name));
      this.sidebarTablesList.appendChild(li);
    });

    if (views && views.length) {
      this.sidebarViewsSection.style.display = 'block';
      this.sidebarViewCount.textContent = views.length;
      this.sidebarViewsList.innerHTML = '';

      views.forEach(v => {
        const li = document.createElement('li');
        li.className = 'sidebar-item';
        li.innerHTML = `
          <div class="sidebar-item-name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      this.sidebarViewsSection.style.display = 'none';
    }
  }

  filterSidebarTables(query) {
    const items = this.sidebarTablesList.querySelectorAll('.sidebar-item');
    items.forEach(item => {
      const name = item.dataset.table.toLowerCase();
      item.style.display = name.includes(query) ? 'flex' : 'none';
    });
  }

  selectTable(tableName) {
    this.activeTable = tableName;
    this.currentPage = 1;
    this.sortCol = null;
    this.sortDir = 'ASC';
    this.filterText = '';
    this.tableFilterInput.value = '';

    // Update active class in sidebar
    this.sidebarTablesList.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.table === tableName);
    });

    this.activeTableTitle.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
      <span>${tableName}</span>
    `;

    // Also populate SQL query studio default query
    this.sqlQueryInput.value = `SELECT * FROM "${tableName}" LIMIT 50;`;

    this.renderActiveTableData();
  }

  renderActiveTableData() {
    if (!this.activeTable) return;

    const res = dbEngine.getTableData(this.activeTable, {
      page: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterText,
      sortCol: this.sortCol,
      sortDir: this.sortDir
    });

    this.activeTableCount.textContent = `${res.totalCount} rows (${res.executionTimeMs}ms)`;

    // Render Table Header
    let theadHtml = '<tr><th class="row-index-cell">#</th>';
    res.columnMeta.forEach(col => {
      let icon = '';
      if (col.isPk) icon = '<span class="col-pk-tag" title="Primary Key">🔑</span>';
      else if (col.isFk) icon = `<span style="color: var(--accent-cyan);" title="Foreign Key -> ${col.fkTargetTable}">🔗</span>`;

      let sortIndicator = '';
      if (this.sortCol === col.name) {
        sortIndicator = this.sortDir === 'ASC' ? ' ↑' : ' ↓';
      }

      theadHtml += `
        <th data-column="${col.name}">
          <div class="th-content">
            <span style="font-weight: 600;">${icon} ${col.name}${sortIndicator}</span>
            <span class="col-type-tag">${col.type}</span>
          </div>
        </th>
      `;
    });
    theadHtml += '</tr>';
    this.dataTableHead.innerHTML = theadHtml;

    // Attach sort listener to headers
    this.dataTableHead.querySelectorAll('th[data-column]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.column;
        if (this.sortCol === col) {
          this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
        } else {
          this.sortCol = col;
          this.sortDir = 'ASC';
        }
        this.renderActiveTableData();
      });
    });

    // Render Table Rows
    if (!res.rows.length) {
      this.dataTableBody.innerHTML = `
        <tr>
          <td colspan="${res.columnMeta.length + 1}" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No records match the current filter.
          </td>
        </tr>
      `;
    } else {
      let tbodyHtml = '';
      const startIdx = (res.page - 1) * res.pageSize;

      res.rows.forEach((row, rIdx) => {
        tbodyHtml += `<tr><td class="row-index-cell">${startIdx + rIdx + 1}</td>`;
        row.forEach((val, cIdx) => {
          let formatted = '';
          if (val === null || val === undefined) {
            formatted = '<span class="null-badge">NULL</span>';
          } else {
            const strVal = String(val);
            formatted = this.escapeHtml(strVal);
          }

          tbodyHtml += `<td data-row="${rIdx}" data-col="${cIdx}" class="table-cell-interactive">${formatted}</td>`;
        });
        tbodyHtml += '</tr>';
      });

      this.dataTableBody.innerHTML = tbodyHtml;

      // Click to inspect cell
      this.dataTableBody.querySelectorAll('.table-cell-interactive').forEach(td => {
        td.addEventListener('click', () => {
          const r = parseInt(td.dataset.row);
          const c = parseInt(td.dataset.col);
          const rawVal = res.rows[r][c];
          const colName = res.columns[c];
          this.openCellModal(`${this.activeTable} • ${colName}`, rawVal);
        });
      });
    }

    // Pagination info
    const startNum = res.totalCount === 0 ? 0 : (res.page - 1) * res.pageSize + 1;
    const endNum = Math.min(res.page * res.pageSize, res.totalCount);
    this.paginationInfo.textContent = `Showing ${startNum} to ${endNum} of ${res.totalCount} rows`;
    this.paginationPageNum.textContent = `${res.page} / ${res.totalPages}`;
    this.btnPagePrev.disabled = res.page <= 1;
    this.btnPageNext.disabled = res.page >= res.totalPages;
  }

  runSqlQuery() {
    const sql = this.sqlQueryInput.value.trim();
    if (!sql) return;

    this.queryStatusText.innerHTML = '<span style="color: var(--accent-cyan);">Executing query...</span>';

    try {
      const res = dbEngine.executeQuery(sql);

      if (res.error) {
        this.queryStatusText.innerHTML = `
          <span style="color: var(--accent-rose); font-family: var(--font-mono);">
            ✕ Error: ${this.escapeHtml(res.error)} (${res.executionTimeMs}ms)
          </span>
        `;
        this.queryResultsHead.innerHTML = '';
        this.queryResultsBody.innerHTML = '';
        this.btnExportQueryCsv.style.display = 'none';
        return;
      }

      this.lastQueryResults = res;
      this.queryStatusText.innerHTML = `
        <span style="color: var(--accent-emerald); font-family: var(--font-mono);">
          ✓ ${res.rowCount} rows returned in ${res.executionTimeMs}ms
        </span>
      `;
      this.btnExportQueryCsv.style.display = res.rowCount > 0 ? 'inline-flex' : 'none';

      // Render SQL Results Grid
      if (!res.columns.length) {
        this.queryResultsHead.innerHTML = '';
        this.queryResultsBody.innerHTML = `
          <tr>
            <td style="padding: 30px; text-align: center; color: var(--text-muted);">
              ${res.message || 'Query executed. No rows returned.'}
            </td>
          </tr>
        `;
        return;
      }

      let thead = '<tr><th class="row-index-cell">#</th>';
      res.columns.forEach(col => {
        thead += `<th>${this.escapeHtml(col)}</th>`;
      });
      thead += '</tr>';
      this.queryResultsHead.innerHTML = thead;

      let tbody = '';
      res.rows.forEach((row, i) => {
        tbody += `<tr><td class="row-index-cell">${i + 1}</td>`;
        row.forEach(cell => {
          let formatted = cell === null ? '<span class="null-badge">NULL</span>' : this.escapeHtml(String(cell));
          tbody += `<td>${formatted}</td>`;
        });
        tbody += '</tr>';
      });
      this.queryResultsBody.innerHTML = tbody;

    } catch (err) {
      this.queryStatusText.innerHTML = `<span style="color: var(--accent-rose);">Execution failed: ${err.message}</span>`;
    }
  }

  runExplainQuery() {
    const sql = this.sqlQueryInput.value.trim();
    if (!sql) return;
    const res = dbEngine.explainQuery(sql);

    this.sqlQueryInput.value = `EXPLAIN QUERY PLAN ${sql}`;
    this.runSqlQuery();
    this.showToast('Generated execution plan', 'info');
  }

  renderQueryTemplates(tables) {
    this.queryTemplatesBar.innerHTML = '<span style="font-size: 0.725rem; color: var(--text-faint); font-weight: 700;">QUICK QUERIES:</span>';
    if (!tables.length) return;

    const firstTable = tables[0].name;
    const templates = [
      { label: `Select ${firstTable}`, sql: `SELECT * FROM "${firstTable}" LIMIT 50;` },
      { label: `Count All Tables`, sql: `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view');` },
      { label: `Table Columns Summary`, sql: `SELECT m.name as tbl, p.name as col, p.type FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table';` }
    ];

    templates.forEach(t => {
      const pill = document.createElement('span');
      pill.className = 'template-pill';
      pill.textContent = t.label;
      pill.addEventListener('click', () => {
        this.sqlQueryInput.value = t.sql;
        this.runSqlQuery();
      });
      this.queryTemplatesBar.appendChild(pill);
    });
  }

  renderInsights(summary) {
    this.kpiDbSize.textContent = summary.formattedSize;
    this.kpiDbTables.textContent = summary.tables.length;
    this.kpiDbRows.textContent = summary.totalRows.toLocaleString();
    this.kpiDbIndexes.textContent = summary.indexes.length;

    // Table rows bar chart
    let barsHtml = '';
    const maxRows = Math.max(1, ...summary.tables.map(t => t.rowCount));

    summary.tables.forEach(t => {
      const percent = Math.min(100, Math.max(5, (t.rowCount / maxRows) * 100));
      barsHtml += `
        <div class="table-bar-item">
          <div class="table-bar-info">
            <span style="font-weight: 600;">${t.name}</span>
            <span style="font-family: var(--font-mono); color: var(--text-muted);">${t.rowCount} rows</span>
          </div>
          <div class="table-bar-track">
            <div class="table-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    });
    this.insightsTableBars.innerHTML = barsHtml;

    // Pragmas table
    let pragmaHtml = '';
    for (const [key, val] of Object.entries(summary.pragmas)) {
      pragmaHtml += `
        <tr>
          <td>PRAGMA ${key}</td>
          <td>${val}</td>
        </tr>
      `;
    }
    this.insightsPragmaTable.innerHTML = pragmaHtml;
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel-${tab}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    if (tab === 'erd' && this.erdViewer) {
      requestAnimationFrame(() => this.erdViewer.updateAllConnections());
    }
  }

  openCellModal(title, value) {
    this.modalCellTitle.textContent = title;
    let formatted = String(value);

    // Try format if JSON
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        const parsed = JSON.parse(value);
        formatted = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Keep raw string
      }
    }

    this.modalCellContent.textContent = formatted;
    this.modalCell.classList.add('active');
  }

  closeCellModal() {
    this.modalCell.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
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

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
