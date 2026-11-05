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
    this.inWorkbench = false;

    // Current Grid Result Cache & Active Inspector Context
    this.currentGridData = null;
    this.inspectorContext = null;

    // Multi-Tab SQL Studio State
    this.sqlTabs = [
      { id: 1, title: 'Query 1', sql: 'SELECT * FROM sqlite_master WHERE type = \'table\';' }
    ];
    this.activeSqlTabId = 1;
    this.nextSqlTabId = 2;
    this.queryHistory = [];
    this.lastQueryResults = null;
    this.activeResultSetIndex = 0;

    this.loadPersistedSqlState();
    this.initDOMElements();
    this.bindEvents();
    this.initTheme();
    this.renderSqlTabs();
    this.updateLineNumbers();
  }

  loadPersistedSqlState() {
    try {
      const savedTabs = localStorage.getItem('sqlitelens_sql_tabs');
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length) {
          this.sqlTabs = parsed;
          this.activeSqlTabId = parsed[0].id;
          this.nextSqlTabId = Math.max(...parsed.map(t => t.id)) + 1;
        }
      }
      const savedHist = localStorage.getItem('sqlitelens_query_history');
      if (savedHist) {
        this.queryHistory = JSON.parse(savedHist) || [];
      }
    } catch (_) { /* ignore storage errors */ }
  }

  savePersistedSqlState() {
    try {
      localStorage.setItem('sqlitelens_sql_tabs', JSON.stringify(this.sqlTabs));
      localStorage.setItem('sqlitelens_query_history', JSON.stringify(this.queryHistory.slice(0, 40)));
    } catch (_) { /* ignore */ }
  }

  initDOMElements() {
    // Screen Views
    this.launcherView = document.getElementById('launcher-view');
    this.workbenchView = document.getElementById('workbench-view');

    // Titlebar Elements
    this.brandHomeBtn = document.getElementById('brand-home-btn');
    this.activeDbPill = document.getElementById('active-db-pill');
    this.activeDbName = document.getElementById('active-db-name');
    this.activeDbSize = document.getElementById('active-db-size');
    this.activeDbModifiedBadge = document.getElementById('active-db-modified-badge');
    this.activeTableMetaText = document.getElementById('active-table-meta-text');

    this.filePickerInput = document.getElementById('file-picker-input');
    this.datasetPickerInput = document.getElementById('dataset-picker-input');
    this.btnImportFile = document.getElementById('btn-import-file');
    this.btnImportDataset = document.getElementById('btn-import-dataset');
    this.btnSaveBinary = document.getElementById('btn-save-binary');
    this.btnExportDump = document.getElementById('btn-export-dump');
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');

    // Drag overlay
    this.dragOverlay = document.getElementById('drag-overlay');

    // Launcher Triggers
    this.launcherDropzone = document.getElementById('launcher-dropzone');
    this.btnLauncherCsv = document.getElementById('btn-launcher-csv');
    this.launchSaas = document.getElementById('launch-saas');
    this.launchEcom = document.getElementById('launch-ecom');
    this.launchAnalytics = document.getElementById('launch-analytics');
    this.launchBlank = document.getElementById('launch-blank');

    // Workbench Navigation
    this.btnNewTableModal = document.getElementById('btn-new-table-modal');
    this.btnReturnLauncher = document.getElementById('btn-return-launcher');
    this.btnSidebarHome = document.getElementById('btn-sidebar-home');
    this.connSaas = document.getElementById('conn-saas');
    this.connEcom = document.getElementById('conn-ecom');
    this.connAnalytics = document.getElementById('conn-analytics');

    this.sidebarFilterInput = document.getElementById('sidebar-filter-input');
    this.sidebarTablesList = document.getElementById('sidebar-tables-list');
    this.sidebarTablesCount = document.getElementById('sidebar-tables-count');
    this.sidebarViewsBlock = document.getElementById('sidebar-views-block');
    this.sidebarViewsList = document.getElementById('sidebar-views-list');
    this.sidebarViewsCount = document.getElementById('sidebar-views-count');
    this.sidebarIndexesBlock = document.getElementById('sidebar-indexes-block');
    this.sidebarIndexesList = document.getElementById('sidebar-indexes-list');
    this.sidebarIndexesCount = document.getElementById('sidebar-indexes-count');

    // Mode Tabs
    this.modeTabs = document.querySelectorAll('.mode-tab-btn');

    // Grid View
    this.gridActiveTableName = document.getElementById('grid-active-table-name');
    this.gridRowCountBadge = document.getElementById('grid-row-count-badge');
    this.btnInsertRow = document.getElementById('btn-insert-row');
    this.btnViewTableDdl = document.getElementById('btn-view-table-ddl');
    this.gridSearchFilter = document.getElementById('grid-search-filter');
    this.gridPageSizeSelect = document.getElementById('grid-page-size-select');
    this.mainTableHead = document.getElementById('main-table-head');
    this.mainTableBody = document.getElementById('main-table-body');
    this.gridPaginationLabel = document.getElementById('grid-pagination-label');
    this.gridPaginationPage = document.getElementById('grid-pagination-page');
    this.btnGridPrev = document.getElementById('btn-grid-prev');
    this.btnGridNext = document.getElementById('btn-grid-next');
    this.btnGridCopyMd = document.getElementById('btn-grid-copy-md');
    this.btnGridExportCsv = document.getElementById('btn-grid-export-csv');
    this.btnGridExportJson = document.getElementById('btn-grid-export-json');
    this.btnGridRefresh = document.getElementById('btn-grid-refresh');

    // SQL Studio View
    this.sqlTabsList = document.getElementById('sql-tabs-list');
    this.btnAddSqlTab = document.getElementById('btn-add-sql-tab');
    this.sqlLineNumbers = document.getElementById('sql-line-numbers');
    this.sqlEditorInput = document.getElementById('sql-editor-input');
    this.btnFormatSql = document.getElementById('btn-format-sql');
    this.btnQueryRun = document.getElementById('btn-query-run');
    this.btnQueryExplain = document.getElementById('btn-query-explain');
    this.btnQueryHistoryToggle = document.getElementById('btn-query-history-toggle');
    this.queryHistoryPanel = document.getElementById('query-history-panel');
    this.queryHistoryList = document.getElementById('query-history-list');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    this.queryQuickTemplates = document.getElementById('query-quick-templates');
    this.queryExecutionStatus = document.getElementById('query-execution-status');
    this.queryResultSetsTabs = document.getElementById('query-result-sets-tabs');
    this.queryOutputHead = document.getElementById('query-output-head');
    this.queryOutputBody = document.getElementById('query-output-body');
    this.btnQueryCopyMd = document.getElementById('btn-query-copy-md');
    this.btnQueryExportJson = document.getElementById('btn-query-export-json');
    this.btnQueryExportCsv = document.getElementById('btn-query-export-csv');

    // Visual ERD View
    this.btnErdAutoLayout = document.getElementById('btn-erd-auto-layout');
    this.btnErdFitView = document.getElementById('btn-erd-fit-view');
    this.btnErdZoomIn = document.getElementById('btn-erd-zoom-in');
    this.btnErdZoomOut = document.getElementById('btn-erd-zoom-out');
    this.btnErdExportSvg = document.getElementById('btn-erd-export-svg');

    // Schema & DDL View
    this.schemaTableTitle = document.getElementById('schema-table-title');
    this.schemaTableSubtitle = document.getElementById('schema-table-subtitle');
    this.schemaColumnsBody = document.getElementById('schema-columns-body');
    this.schemaDdlCode = document.getElementById('schema-ddl-code');
    this.schemaIndexesList = document.getElementById('schema-indexes-list');
    this.btnCopyDdl = document.getElementById('btn-copy-ddl');

    // Insights & Profiler View
    this.kpiStorage = document.getElementById('kpi-storage');
    this.kpiTables = document.getElementById('kpi-tables');
    this.kpiRows = document.getElementById('kpi-rows');
    this.kpiIndices = document.getElementById('kpi-indices');
    this.profilerTableSelect = document.getElementById('profiler-table-select');
    this.profilerColSelect = document.getElementById('profiler-col-select');
    this.profilerResultsBox = document.getElementById('profiler-results-box');
    this.insightsBarChart = document.getElementById('insights-bar-chart');
    this.insightsPragmaKv = document.getElementById('insights-pragma-kv');
    this.btnRunIntegrityCheck = document.getElementById('btn-run-integrity-check');
    this.btnRunVacuum = document.getElementById('btn-run-vacuum');

    // Bottom Status Bar
    this.sbDbInfo = document.getElementById('sb-db-info');
    this.sbEncoding = document.getElementById('sb-encoding');
    this.sbPerfTime = document.getElementById('sb-perf-time');

    // Command Palette
    this.btnOpenPalette = document.getElementById('btn-open-palette');
    this.paletteOverlay = document.getElementById('palette-overlay');
    this.paletteSearchInput = document.getElementById('palette-search-input');
    this.paletteResultsList = document.getElementById('palette-results-list');

    // Cell Inspector & Editor Modal
    this.modalCellInspector = document.getElementById('modal-cell-inspector');
    this.modalInspectorTitle = document.getElementById('modal-inspector-title');
    this.modalInspectorSubtitle = document.getElementById('modal-inspector-subtitle');
    this.modalInspectorEditor = document.getElementById('modal-inspector-editor');
    this.btnCloseInspector = document.getElementById('btn-close-inspector');
    this.btnDoneInspector = document.getElementById('btn-done-inspector');
    this.btnCopyInspector = document.getElementById('btn-copy-inspector');
    this.btnSaveInspector = document.getElementById('btn-save-inspector');
    this.btnInspectorSetNull = document.getElementById('btn-inspector-set-null');
    this.btnInspectorFormatJson = document.getElementById('btn-inspector-format-json');
    this.btnInspectorDeleteRow = document.getElementById('btn-inspector-delete-row');

    // Insert Row Modal
    this.modalInsertRow = document.getElementById('modal-insert-row');
    this.modalInsertTitle = document.getElementById('modal-insert-title');
    this.modalInsertFields = document.getElementById('modal-insert-fields');
    this.btnCloseInsert = document.getElementById('btn-close-insert');
    this.btnCancelInsert = document.getElementById('btn-cancel-insert');
    this.btnConfirmInsert = document.getElementById('btn-confirm-insert');

    // Create Table Modal
    this.modalCreateTable = document.getElementById('modal-create-table');
    this.newTableNameInput = document.getElementById('new-table-name-input');
    this.newTableColsList = document.getElementById('new-table-cols-list');
    this.btnAddColRow = document.getElementById('btn-add-col-row');
    this.btnCloseCreateTable = document.getElementById('btn-close-create-table');
    this.btnCancelCreateTable = document.getElementById('btn-cancel-create-table');
    this.btnConfirmCreateTable = document.getElementById('btn-confirm-create-table');

    // Toasts
    this.toastShelf = document.getElementById('toast-shelf');
  }

  bindEvents() {
    // Return to Start Page
    this.brandHomeBtn.addEventListener('click', () => this.showStartPage());
    this.btnReturnLauncher.addEventListener('click', () => this.showStartPage());
    this.btnSidebarHome.addEventListener('click', () => this.showStartPage());

    // Launcher Triggers
    this.launcherDropzone.addEventListener('click', e => {
      if (e.target.closest('#btn-launcher-csv')) return;
      this.filePickerInput.click();
    });
    this.btnLauncherCsv.addEventListener('click', e => {
      e.stopPropagation();
      this.datasetPickerInput.click();
    });

    this.launchSaas.addEventListener('click', () => this.switchWorkspace('saas-production.db', 'saas-production.db', this.connSaas));
    this.launchEcom.addEventListener('click', () => this.switchWorkspace('ecommerce-store.db', 'ecommerce-store.db', this.connEcom));
    this.launchAnalytics.addEventListener('click', () => this.switchWorkspace('sample-analytics.db', 'sample-analytics.db', this.connAnalytics));
    this.launchBlank.addEventListener('click', () => this.createBlankDatabase());

    // Mode Switcher Tabs
    this.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchMode(tab.dataset.tab));
    });

    // Sidebar Workspace Switchers
    this.connSaas.addEventListener('click', () => this.switchWorkspace('saas-production.db', 'saas-production.db', this.connSaas));
    this.connEcom.addEventListener('click', () => this.switchWorkspace('ecommerce-store.db', 'ecommerce-store.db', this.connEcom));
    this.connAnalytics.addEventListener('click', () => this.switchWorkspace('sample-analytics.db', 'sample-analytics.db', this.connAnalytics));

    // File Import & Dataset Import
    this.btnImportFile.addEventListener('click', () => this.filePickerInput.click());
    this.filePickerInput.addEventListener('change', e => {
      if (e.target.files.length) {
        this.handleIncomingFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    this.btnImportDataset.addEventListener('click', () => this.datasetPickerInput.click());
    this.datasetPickerInput.addEventListener('change', e => {
      if (e.target.files.length) {
        this.handleIncomingDataset(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Save Binary .sqlite Database
    this.btnSaveBinary.addEventListener('click', () => {
      const binary = dbEngine.exportBinaryDatabase();
      if (!binary) return;
      const baseName = (dbEngine.dbName || 'database.sqlite').replace(/\.(db|sqlite|sqlite3)$/i, '');
      this.downloadBinaryFile(binary, `${baseName}.sqlite`, 'application/x-sqlite3');
      dbEngine.isModified = false;
      this.updateModifiedIndicator();
      this.showToast(`Saved binary database ${baseName}.sqlite`, 'success');
    });

    // Full SQL Dump Export
    this.btnExportDump.addEventListener('click', () => {
      const dump = dbEngine.exportFullSqlDump();
      const baseName = (dbEngine.dbName || 'database').replace(/\.(db|sqlite|sqlite3)$/i, '');
      this.downloadFile(dump, `${baseName}_dump.sql`, 'text/sql');
      this.showToast('Exported complete SQL schema & data dump', 'success');
    });

    // Full Window Drag & Drop (supports .db, .sqlite, .csv, .json)
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
        const f = e.dataTransfer.files[0];
        if (/\.(csv|json)$/i.test(f.name)) {
          this.handleIncomingDataset(f);
        } else {
          this.handleIncomingFile(f);
        }
      }
    });

    // Sidebar Table Search
    this.sidebarFilterInput.addEventListener('input', e => {
      const query = e.target.value.toLowerCase();
      this.sidebarTablesList.querySelectorAll('.table-item').forEach(item => {
        const name = item.dataset.table.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
      });
    });

    // Grid Search, Page Size & Pagination
    this.gridSearchFilter.addEventListener('input', e => {
      this.filterText = e.target.value;
      this.currentPage = 1;
      this.renderGridData();
    });

    this.gridPageSizeSelect.addEventListener('change', e => {
      this.pageSize = Number(e.target.value) || 50;
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
      this.refreshEntireWorkspace(this.activeTable);
      this.showToast('Table data synchronized', 'info');
    });

    this.btnViewTableDdl.addEventListener('click', () => {
      this.switchMode('schema');
    });

    this.btnGridCopyMd.addEventListener('click', () => {
      if (!this.currentGridData) return;
      const md = dbEngine.exportQueryToMarkdown(this.currentGridData.columns, this.currentGridData.rows);
      navigator.clipboard.writeText(md);
      this.showToast('Copied Markdown table to clipboard', 'success');
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

    // Insert Row Modal
    this.btnInsertRow.addEventListener('click', () => this.openInsertRowModal());
    this.btnCloseInsert.addEventListener('click', () => this.modalInsertRow.classList.remove('active'));
    this.btnCancelInsert.addEventListener('click', () => this.modalInsertRow.classList.remove('active'));
    this.btnConfirmInsert.addEventListener('click', () => this.submitInsertRow());

    // Create Table Modal
    this.btnNewTableModal.addEventListener('click', () => this.openCreateTableModal());
    this.btnCloseCreateTable.addEventListener('click', () => this.modalCreateTable.classList.remove('active'));
    this.btnCancelCreateTable.addEventListener('click', () => this.modalCreateTable.classList.remove('active'));
    this.btnAddColRow.addEventListener('click', () => this.appendCreateTableColumnRow());
    this.btnConfirmCreateTable.addEventListener('click', () => this.submitCreateTable());

    // SQL Studio Multi-Tab, Line Numbers, Format & Execution
    this.btnAddSqlTab.addEventListener('click', () => this.addSqlTab());

    this.sqlEditorInput.addEventListener('input', () => {
      this.updateLineNumbers();
      const tab = this.sqlTabs.find(t => t.id === this.activeSqlTabId);
      if (tab) {
        tab.sql = this.sqlEditorInput.value;
        this.savePersistedSqlState();
      }
    });

    this.sqlEditorInput.addEventListener('scroll', () => {
      this.sqlLineNumbers.scrollTop = this.sqlEditorInput.scrollTop;
    });

    this.sqlEditorInput.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.executeSql();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.sqlEditorInput.selectionStart;
        const end = this.sqlEditorInput.selectionEnd;
        const val = this.sqlEditorInput.value;
        this.sqlEditorInput.value = val.substring(0, start) + '  ' + val.substring(end);
        this.sqlEditorInput.selectionStart = this.sqlEditorInput.selectionEnd = start + 2;
        this.updateLineNumbers();
      }
    });

    this.btnFormatSql.addEventListener('click', () => this.formatActiveSql());
    this.btnQueryRun.addEventListener('click', () => this.executeSql());
    this.btnQueryExplain.addEventListener('click', () => this.explainSql());

    this.btnQueryHistoryToggle.addEventListener('click', () => {
      const visible = this.queryHistoryPanel.style.display !== 'none';
      this.queryHistoryPanel.style.display = visible ? 'none' : 'flex';
      if (!visible) this.renderQueryHistory();
    });

    this.btnClearHistory.addEventListener('click', () => {
      this.queryHistory = [];
      this.savePersistedSqlState();
      this.renderQueryHistory();
    });

    this.btnQueryCopyMd.addEventListener('click', () => {
      const rs = this.getActiveResultSet();
      if (!rs) return;
      const md = dbEngine.exportQueryToMarkdown(rs.columns, rs.rows);
      navigator.clipboard.writeText(md);
      this.showToast('Copied query result as Markdown table', 'success');
    });

    this.btnQueryExportJson.addEventListener('click', () => {
      const rs = this.getActiveResultSet();
      if (!rs) return;
      const json = dbEngine.exportQueryToJson(rs.columns, rs.rows);
      this.downloadFile(json, 'query_result.json', 'application/json');
      this.showToast('Query result exported to JSON', 'success');
    });

    this.btnQueryExportCsv.addEventListener('click', () => {
      const rs = this.getActiveResultSet();
      if (!rs) return;
      const csv = dbEngine.exportQueryToCsv(rs.columns, rs.rows);
      this.downloadFile(csv, 'query_result.csv', 'text/csv');
      this.showToast('Query result exported to CSV', 'success');
    });

    // ERD Canvas Controls
    this.btnErdAutoLayout.addEventListener('click', () => {
      if (this.erdViewer) {
        this.erdViewer.resetLayout();
        this.showToast('Applied topological schema layout', 'info');
      }
    });
    this.btnErdFitView.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.fitToView();
    });
    this.btnErdZoomIn.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.setZoom(0.15);
    });
    this.btnErdZoomOut.addEventListener('click', () => {
      if (this.erdViewer) this.erdViewer.setZoom(-0.15);
    });
    this.btnErdExportSvg.addEventListener('click', () => {
      if (!this.erdViewer) return;
      const svg = this.erdViewer.exportAsSvgString();
      if (!svg) return;
      const baseName = (dbEngine.dbName || 'schema').replace(/\.(db|sqlite|sqlite3)$/i, '');
      this.downloadFile(svg, `${baseName}_erd.svg`, 'image/svg+xml');
      this.showToast(`Exported ${baseName}_erd.svg diagram`, 'success');
    });

    // Schema DDL Copy
    this.btnCopyDdl.addEventListener('click', () => {
      navigator.clipboard.writeText(this.schemaDdlCode.textContent);
      this.showToast('Copied CREATE TABLE DDL to clipboard', 'success');
    });

    // Insights Column Profiler & Diagnostics
    this.profilerTableSelect.addEventListener('change', () => this.populateProfilerColumns());
    this.profilerColSelect.addEventListener('change', () => this.runColumnProfiler());

    this.btnRunIntegrityCheck.addEventListener('click', () => {
      const report = dbEngine.checkIntegrity();
      this.showToast(`Integrity Check: ${report}`, report === 'ok' ? 'success' : 'error');
    });

    this.btnRunVacuum.addEventListener('click', () => {
      try {
        dbEngine.executeQuery('VACUUM;');
        this.refreshEntireWorkspace(this.activeTable);
        this.showToast('Database compacted with VACUUM', 'success');
      } catch (e) {
        this.showToast(`VACUUM error: ${e.message}`, 'error');
      }
    });

    // Command Palette Omnibar
    this.btnOpenPalette.addEventListener('click', () => this.openPalette());
    this.paletteSearchInput.addEventListener('input', () => this.filterPalette());
    this.paletteSearchInput.addEventListener('keydown', e => this.handlePaletteKeydown(e));
    this.paletteOverlay.addEventListener('click', e => {
      if (e.target === this.paletteOverlay) this.closePalette();
    });

    // Cell Inspector & Editor Modal
    this.btnCloseInspector.addEventListener('click', () => this.closeInspectorModal());
    this.btnDoneInspector.addEventListener('click', () => this.closeInspectorModal());
    this.btnCopyInspector.addEventListener('click', () => {
      navigator.clipboard.writeText(this.modalInspectorEditor.value);
      this.showToast('Copied value to clipboard', 'success');
    });
    this.btnInspectorSetNull.addEventListener('click', () => {
      if (!this.inspectorContext) return;
      this.saveInspectorValue(null);
    });
    this.btnInspectorFormatJson.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(this.modalInspectorEditor.value);
        this.modalInspectorEditor.value = JSON.stringify(parsed, null, 2);
      } catch (_) {
        this.showToast('Content is not valid JSON', 'error');
      }
    });
    this.btnSaveInspector.addEventListener('click', () => {
      if (!this.inspectorContext) return;
      this.saveInspectorValue(this.modalInspectorEditor.value);
    });
    this.btnInspectorDeleteRow.addEventListener('click', () => {
      if (!this.inspectorContext) return;
      this.deleteCurrentInspectedRow();
    });

    // Global Keyboard Shortcuts (Ctrl+K, Esc)
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openPalette();
      }
      if (e.key === 'Escape') {
        this.closePalette();
        this.closeInspectorModal();
        this.modalInsertRow.classList.remove('active');
        this.modalCreateTable.classList.remove('active');
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
      this.showToast(`Switched to ${next} appearance`, 'info');
    });
  }

  showStartPage() {
    this.inWorkbench = false;
    this.launcherView.style.display = 'flex';
    this.workbenchView.classList.remove('active');
    this.activeDbName.textContent = 'Start Page';
    this.activeDbSize.textContent = 'Launcher';
    this.btnSaveBinary.style.display = 'none';
    this.btnExportDump.style.display = 'none';
    this.activeDbModifiedBadge.style.display = 'none';
  }

  enterWorkbench() {
    this.inWorkbench = true;
    this.launcherView.style.display = 'none';
    this.workbenchView.classList.add('active');
    this.btnSaveBinary.style.display = 'inline-flex';
    this.btnExportDump.style.display = 'inline-flex';
  }

  updateModifiedIndicator() {
    this.activeDbModifiedBadge.style.display = dbEngine.isModified ? 'inline-block' : 'none';
  }

  async createBlankDatabase() {
    try {
      await dbEngine.initWasm();
      if (dbEngine.db) {
        try { dbEngine.db.close(); } catch (_) { /* ignore */ }
      }
      dbEngine.db = new dbEngine.SQL.Database();
      dbEngine.dbName = 'scratchpad.sqlite';
      dbEngine.dbSize = 8192;
      dbEngine.isModified = false;
      dbEngine.db.run(`
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          priority TEXT DEFAULT 'high',
          FOREIGN KEY (project_id) REFERENCES projects(id)
        );
        INSERT INTO projects (name, status, metadata) VALUES
          ('SQLiteLens Studio 2.0', 'active', '{"engine":"wasm","zeroTelemetry":true}'),
          ('Local-First Sync Engine', 'planning', '{"protocol":"crdt","encryption":"aes-256"}');
        INSERT INTO tasks (project_id, title, completed, priority) VALUES
          (1, 'Double-click any cell to edit inline', 1, 'high'),
          (1, 'Explore interactive Visual ERD diagram', 1, 'high'),
          (2, 'Export modified binary .sqlite file', 0, 'medium');
      `);
      document.querySelectorAll('.connection-item').forEach(c => c.classList.remove('active'));
      const summary = dbEngine.getDatabaseSummary();
      this.onDatabaseLoaded(summary);
      this.showToast('Mounted In-Memory Scratchpad Database', 'success');
    } catch (e) {
      this.showToast(`Error: ${e.message}`, 'error');
    }
  }

  async switchWorkspace(dbUrl, displayName, activeBtn) {
    try {
      this.showToast(`Mounting ${displayName}...`, 'info');
      document.querySelectorAll('.connection-item').forEach(c => c.classList.remove('active'));
      if (activeBtn) activeBtn.classList.add('active');

      const summary = await dbEngine.loadFromUrl(dbUrl, displayName);
      this.onDatabaseLoaded(summary);
      this.showToast(`Mounted ${displayName}`, 'success');
    } catch (err) {
      this.showToast(`Failed to mount: ${err.message}`, 'error');
    }
  }

  async handleIncomingFile(file) {
    if (!file) return;
    try {
      this.showToast(`Mounting ${file.name}...`, 'info');
      const summary = await dbEngine.loadFromFile(file);
      document.querySelectorAll('.connection-item').forEach(c => c.classList.remove('active'));
      this.onDatabaseLoaded(summary);
      this.showToast(`Mounted ${file.name} (${summary.formattedSize})`, 'success');
    } catch (err) {
      this.showToast(`Failed to mount database: ${err.message}`, 'error');
    }
  }

  /**
   * Parse CSV or JSON file and import into SQLite as a new table
   */
  async handleIncomingDataset(file) {
    if (!file) return;
    try {
      await dbEngine.initWasm();
      if (!dbEngine.db) {
        dbEngine.db = new dbEngine.SQL.Database();
        dbEngine.dbName = file.name.replace(/\.(csv|json)$/i, '.sqlite');
        dbEngine.dbSize = file.size;
      }

      const text = await file.text();
      const baseTableName = file.name.replace(/\.(csv|json)$/i, '');
      let records = [];

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        records = this.parseCsvToObjects(text);
      }

      const result = dbEngine.importDatasetToTable(baseTableName, records);
      const summary = dbEngine.getDatabaseSummary();
      this.onDatabaseLoaded(summary, result.tableName);
      this.showToast(`Imported ${result.rowCount} rows into table "${result.tableName}"`, 'success');
    } catch (err) {
      this.showToast(`Dataset import failed: ${err.message}`, 'error');
    }
  }

  parseCsvToObjects(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row.');

    const splitCsvLine = line => {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out;
    };

    const headers = splitCsvLine(lines[0]).map((h, idx) => h.trim() || `col_${idx + 1}`);
    return lines.slice(1).map(line => {
      const vals = splitCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] !== undefined ? vals[i].trim() : null;
      });
      return obj;
    });
  }

  refreshEntireWorkspace(preferredTable = null) {
    const summary = dbEngine.getDatabaseSummary();
    if (!summary) return;
    this.onDatabaseLoaded(summary, preferredTable);
  }

  onDatabaseLoaded(summary, preferredTable = null) {
    this.enterWorkbench();

    this.activeDbName.textContent = summary.name;
    this.activeDbSize.textContent = summary.formattedSize;
    this.updateModifiedIndicator();
    this.sbDbInfo.textContent = `Database: ${summary.name} (${summary.formattedSize})`;
    this.sbEncoding.textContent = `Encoding: ${summary.pragmas.encoding || 'UTF-8'}`;

    this.renderSidebar(summary.tables, summary.views, summary.indexes);

    if (!this.erdViewer) {
      this.erdViewer = new ErdViewer('erd-canvas-viewport', 'erd-svg-layer', 'erd-nodes-container', tableName => {
        this.switchMode('grid');
        this.selectTable(tableName);
      });
    }
    this.erdViewer.render(summary.tables);

    this.renderInsights(summary);
    this.renderQuerySnippets(summary.tables);
    this.buildPaletteActions(summary.tables);

    const targetTable = preferredTable && summary.tables.some(t => t.name === preferredTable)
      ? preferredTable
      : summary.tables.length > 0 ? summary.tables[0].name : null;

    if (targetTable) {
      this.selectTable(targetTable);
    } else {
      this.activeTable = null;
      this.mainTableHead.innerHTML = '';
      this.mainTableBody.innerHTML = '<tr><td style="padding:36px;text-align:center;color:var(--text-muted);">No tables in database. Click "+ New Table" to create one.</td></tr>';
    }
  }

  renderSidebar(tables, views, indexes) {
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
          <span>${this.escapeHtml(t.name)}</span>
        </div>
        <span class="table-badge-rows">${t.rowCount.toLocaleString()}</span>
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
        li.dataset.table = v.name;
        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 7px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>${this.escapeHtml(v.name)}</span>
          </div>
          <span class="table-badge-rows">view</span>
        `;
        li.addEventListener('click', () => this.selectTable(v.name));
        this.sidebarViewsList.appendChild(li);
      });
    } else {
      this.sidebarViewsBlock.style.display = 'none';
    }

    if (indexes && indexes.length) {
      this.sidebarIndexesBlock.style.display = 'block';
      this.sidebarIndexesCount.textContent = indexes.length;
      this.sidebarIndexesList.innerHTML = '';
      indexes.forEach(idx => {
        const li = document.createElement('li');
        li.className = 'table-item';
        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span style="color: var(--accent-amber);">⚡</span>
            <span>${this.escapeHtml(idx.name)}</span>
          </div>
          <span class="table-badge-rows">${this.escapeHtml(idx.tableName)}</span>
        `;
        li.addEventListener('click', () => {
          this.selectTable(idx.tableName);
          this.switchMode('schema');
        });
        this.sidebarIndexesList.appendChild(li);
      });
    } else {
      this.sidebarIndexesBlock.style.display = 'none';
    }
  }

  selectTable(tableName, initialFilter = '') {
    this.activeTable = tableName;
    this.currentPage = 1;
    this.sortCol = null;
    this.sortDir = 'ASC';
    this.filterText = initialFilter;
    this.gridSearchFilter.value = initialFilter;

    this.sidebarTablesList.querySelectorAll('.table-item').forEach(item => {
      item.classList.toggle('active', item.dataset.table === tableName);
    });

    this.gridActiveTableName.textContent = tableName;
    this.renderGridData();
    this.renderSchemaTab(tableName);
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

    this.currentGridData = res;
    this.currentPage = res.page;
    this.gridRowCountBadge.textContent = `${res.totalCount.toLocaleString()} rows (${res.executionTimeMs}ms)`;
    this.activeTableMetaText.textContent = `${this.activeTable} • ${res.totalCount.toLocaleString()} rows • ${res.executionTimeMs}ms`;
    this.sbPerfTime.textContent = `Latency: ${res.executionTimeMs}ms`;

    const pkColObj = res.columnMeta.find(c => c.isPk);
    const pkColName = pkColObj ? pkColObj.name : null;
    const pkColIndex = pkColName ? res.columns.indexOf(pkColName) : -1;

    let thead = '<tr><th class="row-num-cell">#</th>';
    res.columnMeta.forEach(col => {
      let badge = '';
      if (col.isPk) badge = '<span style="color: var(--accent-amber); margin-right: 4px;" title="Primary Key">🔑</span>';
      else if (col.isFk) badge = `<span style="color: var(--accent-cyan); margin-right: 4px;" title="Foreign Key → ${col.fkTargetTable}.${col.fkTargetCol}">🔗</span>`;

      let sortArrow = '';
      if (this.sortCol === col.name) {
        sortArrow = this.sortDir === 'ASC' ? ' ↑' : ' ↓';
      }

      thead += `
        <th data-column="${this.escapeHtml(col.name)}">
          <div class="th-inner">
            <span>${badge}${this.escapeHtml(col.name)}${sortArrow}</span>
            <span class="type-pill">${this.escapeHtml(col.type)}</span>
          </div>
        </th>
      `;
    });
    thead += '</tr>';
    this.mainTableHead.innerHTML = thead;

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

    if (!res.rows.length) {
      this.mainTableBody.innerHTML = `
        <tr>
          <td colspan="${res.columnMeta.length + 1}" style="text-align: center; padding: 42px; color: var(--text-muted);">
            No records found matching the current filter.
          </td>
        </tr>
      `;
    } else {
      let tbody = '';
      const startIdx = (res.page - 1) * res.pageSize;

      res.rows.forEach((row, rIdx) => {
        tbody += `<tr><td class="row-num-cell">${startIdx + rIdx + 1}</td>`;
        row.forEach((val, cIdx) => {
          const colMeta = res.columnMeta[cIdx] || {};
          const formatted = this.formatCellDisplay(val, colMeta);
          tbody += `<td data-row="${rIdx}" data-col="${cIdx}" style="cursor: pointer;">${formatted}</td>`;
        });
        tbody += '</tr>';
      });

      this.mainTableBody.innerHTML = tbody;

      // Foreign key jump handler
      this.mainTableBody.querySelectorAll('.fk-jump-chip').forEach(chip => {
        chip.addEventListener('click', e => {
          e.stopPropagation();
          const targetTable = chip.dataset.targetTable;
          const fkVal = chip.dataset.fkVal;
          if (targetTable) {
            this.selectTable(targetTable, fkVal);
            this.showToast(`Jumped to ${targetTable} (${fkVal})`, 'info');
          }
        });
      });

      // Single-click cell -> Inspector / Editor Modal; Double-click -> Inline Edit
      let clickTimer = null;
      this.mainTableBody.querySelectorAll('td[data-row]').forEach(td => {
        td.addEventListener('click', () => {
          if (td.querySelector('input')) return;
          clearTimeout(clickTimer);
          clickTimer = setTimeout(() => {
            const r = parseInt(td.dataset.row, 10);
            const c = parseInt(td.dataset.col, 10);
            this.openCellInspector(r, c, pkColName, pkColIndex);
          }, 180);
        });

        td.addEventListener('dblclick', e => {
          e.stopPropagation();
          clearTimeout(clickTimer);
          const r = parseInt(td.dataset.row, 10);
          const c = parseInt(td.dataset.col, 10);
          this.startInlineCellEdit(td, r, c, pkColName, pkColIndex);
        });
      });
    }

    const startNum = res.totalCount === 0 ? 0 : (res.page - 1) * res.pageSize + 1;
    const endNum = Math.min(res.page * res.pageSize, res.totalCount);
    this.gridPaginationLabel.textContent = `Showing rows ${startNum.toLocaleString()}–${endNum.toLocaleString()} of ${res.totalCount.toLocaleString()}`;
    this.gridPaginationPage.textContent = `${res.page} / ${res.totalPages}`;
    this.btnGridPrev.disabled = res.page <= 1;
    this.btnGridNext.disabled = res.page >= res.totalPages;
  }

  formatCellDisplay(val, colMeta) {
    if (val === null || val === undefined) {
      return '<span class="badge-null">NULL</span>';
    }

    if (colMeta && colMeta.isFk && colMeta.fkTargetTable) {
      const safeVal = this.escapeHtml(String(val));
      return `<span class="fk-jump-chip" data-target-table="${this.escapeHtml(colMeta.fkTargetTable)}" data-fk-val="${safeVal}" title="Jump to ${this.escapeHtml(colMeta.fkTargetTable)}">${safeVal} ↗</span>`;
    }

    const str = String(val);
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      return `<span class="cell-json-pill">JSON</span> ${this.escapeHtml(str)}`;
    }

    if (colMeta && /BOOL/i.test(colMeta.type)) {
      const isTrue = val === 1 || val === '1' || String(val).toLowerCase() === 'true';
      return `<span class="${isTrue ? 'cell-bool-true' : 'cell-bool-false'}">${isTrue ? 'true' : 'false'}</span>`;
    }

    if (typeof val === 'number') {
      return `<span class="cell-num">${val}</span>`;
    }

    return this.escapeHtml(str);
  }

  startInlineCellEdit(td, rowIndex, colIndex, pkColName, pkColIndex) {
    if (!this.currentGridData) return;
    const rawVal = this.currentGridData.rows[rowIndex][colIndex];
    const colName = this.currentGridData.columns[colIndex];
    const rowId = this.currentGridData.rowIds[rowIndex];
    const pkVal = pkColIndex >= 0 ? this.currentGridData.rows[rowIndex][pkColIndex] : null;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-cell-input';
    input.value = rawVal === null || rawVal === undefined ? '' : String(rawVal);

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const nextVal = input.value;
      if (nextVal === String(rawVal ?? '')) {
        this.renderGridData();
        return;
      }
      try {
        dbEngine.updateCell(this.activeTable, {
          rowId,
          pkCol: pkColName,
          pkVal,
          column: colName,
          newValue: nextVal
        });
        this.updateModifiedIndicator();
        this.renderGridData();
        this.showToast(`Updated ${this.activeTable}.${colName}`, 'success');
      } catch (err) {
        this.renderGridData();
        this.showToast(`Update failed: ${err.message}`, 'error');
      }
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        committed = true;
        this.renderGridData();
      }
    });
    input.addEventListener('blur', () => commit());
  }

  openCellInspector(rowIndex, colIndex, pkColName, pkColIndex) {
    if (!this.currentGridData) return;
    const rawVal = this.currentGridData.rows[rowIndex][colIndex];
    const colName = this.currentGridData.columns[colIndex];
    const colMeta = this.currentGridData.columnMeta[colIndex] || {};
    const rowId = this.currentGridData.rowIds[rowIndex];
    const pkVal = pkColIndex >= 0 ? this.currentGridData.rows[rowIndex][pkColIndex] : null;

    this.inspectorContext = {
      tableName: this.activeTable,
      rowIndex,
      colIndex,
      colName,
      rowId,
      pkCol: pkColName,
      pkVal
    };

    this.modalInspectorTitle.textContent = `${this.activeTable} › ${colName}`;
    this.modalInspectorSubtitle.textContent = `Type: ${colMeta.type || 'ANY'} • Row ID: ${rowId ?? pkVal ?? 'N/A'}`;

    let formatted = rawVal === null || rawVal === undefined ? '' : String(rawVal);
    if (formatted.startsWith('{') || formatted.startsWith('[')) {
      try {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } catch (_) { /* keep raw */ }
    }

    this.modalInspectorEditor.value = formatted;
    this.modalInspectorEditor.placeholder = rawVal === null ? 'NULL' : 'Enter value...';
    this.modalCellInspector.classList.add('active');
    this.modalInspectorEditor.focus();
  }

  saveInspectorValue(newValue) {
    if (!this.inspectorContext) return;
    try {
      dbEngine.updateCell(this.inspectorContext.tableName, {
        rowId: this.inspectorContext.rowId,
        pkCol: this.inspectorContext.pkCol,
        pkVal: this.inspectorContext.pkVal,
        column: this.inspectorContext.colName,
        newValue
      });
      this.closeInspectorModal();
      this.updateModifiedIndicator();
      this.renderGridData();
      this.showToast(`Saved ${this.inspectorContext.colName}`, 'success');
    } catch (err) {
      this.showToast(`Failed to save: ${err.message}`, 'error');
    }
  }

  deleteCurrentInspectedRow() {
    if (!this.inspectorContext) return;
    try {
      dbEngine.deleteRow(this.inspectorContext.tableName, {
        rowId: this.inspectorContext.rowId,
        pkCol: this.inspectorContext.pkCol,
        pkVal: this.inspectorContext.pkVal
      });
      this.closeInspectorModal();
      this.refreshEntireWorkspace(this.activeTable);
      this.showToast('Row deleted from table', 'success');
    } catch (err) {
      this.showToast(`Delete failed: ${err.message}`, 'error');
    }
  }

  closeInspectorModal() {
    this.modalCellInspector.classList.remove('active');
    this.inspectorContext = null;
  }

  /**
   * Insert Row Modal
   */
  openInsertRowModal() {
    if (!this.activeTable) return;
    const cols = dbEngine.getTableColumns(this.activeTable);
    this.modalInsertTitle.textContent = `Insert Record into "${this.activeTable}"`;
    this.modalInsertFields.innerHTML = '';

    cols.forEach(c => {
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'flex';
      rowDiv.style.flexDirection = 'column';
      rowDiv.style.gap = '4px';

      const placeholder = c.isPk && /INT/i.test(c.type)
        ? 'Auto-increment (leave blank)'
        : c.defaultValue !== null ? `Default: ${c.defaultValue}` : `Enter ${c.type}...`;

      rowDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;">
          <span style="font-weight:700;color:var(--text-primary);">${c.isPk ? '🔑 ' : ''}${this.escapeHtml(c.name)}</span>
          <span style="font-family:var(--font-mono);color:var(--text-muted);">${this.escapeHtml(c.type)}${c.notNull ? ' • NOT NULL' : ''}</span>
        </div>
        <input type="text" class="input-search insert-field-input" data-col="${this.escapeHtml(c.name)}" placeholder="${this.escapeHtml(placeholder)}" style="width:100%;">
      `;
      this.modalInsertFields.appendChild(rowDiv);
    });

    this.modalInsertRow.classList.add('active');
  }

  submitInsertRow() {
    if (!this.activeTable) return;
    const inputs = this.modalInsertFields.querySelectorAll('.insert-field-input');
    const rowObj = {};

    inputs.forEach(inp => {
      const val = inp.value.trim();
      if (val !== '') {
        rowObj[inp.dataset.col] = val;
      }
    });

    try {
      dbEngine.insertRow(this.activeTable, rowObj);
      this.modalInsertRow.classList.remove('active');
      this.refreshEntireWorkspace(this.activeTable);
      this.showToast(`Inserted new row into ${this.activeTable}`, 'success');
    } catch (err) {
      this.showToast(`Insert error: ${err.message}`, 'error');
    }
  }

  /**
   * Create Table Wizard Modal
   */
  openCreateTableModal() {
    this.newTableNameInput.value = '';
    this.newTableColsList.innerHTML = '';
    this.appendCreateTableColumnRow('id', 'INTEGER', true, true);
    this.appendCreateTableColumnRow('name', 'TEXT', false, true);
    this.appendCreateTableColumnRow('created_at', 'DATETIME', false, false);
    this.modalCreateTable.classList.add('active');
    this.newTableNameInput.focus();
  }

  appendCreateTableColumnRow(name = '', type = 'TEXT', isPk = false, notNull = false) {
    const row = document.createElement('div');
    row.className = 'new-col-def-row';
    row.style.cssText = 'display:grid;grid-template-columns:1.5fr 1fr auto auto auto;gap:8px;align-items:center;';
    row.innerHTML = `
      <input type="text" class="input-search col-name-inp" placeholder="column_name" value="${this.escapeHtml(name)}">
      <select class="input-select col-type-sel">
        <option value="INTEGER" ${type === 'INTEGER' ? 'selected' : ''}>INTEGER</option>
        <option value="TEXT" ${type === 'TEXT' ? 'selected' : ''}>TEXT</option>
        <option value="REAL" ${type === 'REAL' ? 'selected' : ''}>REAL</option>
        <option value="NUMERIC" ${type === 'NUMERIC' ? 'selected' : ''}>NUMERIC</option>
        <option value="DATETIME" ${type === 'DATETIME' ? 'selected' : ''}>DATETIME</option>
        <option value="BLOB" ${type === 'BLOB' ? 'selected' : ''}>BLOB</option>
      </select>
      <label style="font-size:0.74rem;display:flex;align-items:center;gap:4px;cursor:pointer;">
        <input type="checkbox" class="col-pk-chk" ${isPk ? 'checked' : ''}> PK
      </label>
      <label style="font-size:0.74rem;display:flex;align-items:center;gap:4px;cursor:pointer;">
        <input type="checkbox" class="col-nn-chk" ${notNull ? 'checked' : ''}> NOT NULL
      </label>
      <button type="button" class="btn btn-ghost btn-sm btn-del-col">✕</button>
    `;
    row.querySelector('.btn-del-col').addEventListener('click', () => row.remove());
    this.newTableColsList.appendChild(row);
  }

  submitCreateTable() {
    const tableName = this.newTableNameInput.value.trim();
    if (!tableName) {
      this.showToast('Please enter a table name', 'error');
      return;
    }

    const colRows = this.newTableColsList.querySelectorAll('.new-col-def-row');
    const defs = [];
    colRows.forEach(r => {
      const cName = r.querySelector('.col-name-inp').value.trim();
      const cType = r.querySelector('.col-type-sel').value;
      const isPk = r.querySelector('.col-pk-chk').checked;
      const isNn = r.querySelector('.col-nn-chk').checked;
      if (cName) {
        let def = `"${dbEngine.escapeId(cName)}" ${cType}`;
        if (isPk) def += ' PRIMARY KEY';
        if (isNn && !isPk) def += ' NOT NULL';
        defs.push(def);
      }
    });

    if (!defs.length) {
      this.showToast('Please define at least one column', 'error');
      return;
    }

    const sql = `CREATE TABLE "${dbEngine.escapeId(tableName)}" (\n  ${defs.join(',\n  ')}\n);`;
    const res = dbEngine.executeQuery(sql);
    if (res.error) {
      this.showToast(`SQL Error: ${res.error}`, 'error');
      return;
    }

    this.modalCreateTable.classList.remove('active');
    this.refreshEntireWorkspace(tableName);
    this.showToast(`Created table "${tableName}"`, 'success');
  }

  /**
   * Schema & DDL Inspector Tab
   */
  renderSchemaTab(tableName) {
    if (!tableName) return;
    const summary = dbEngine.getDatabaseSummary();
    if (!summary) return;

    const tbl = summary.tables.find(t => t.name === tableName) || summary.views.find(v => v.name === tableName);
    if (!tbl) return;

    this.schemaTableTitle.textContent = `Table Schema: ${tbl.name}`;
    this.schemaTableSubtitle.textContent = `${tbl.columns.length} columns • ${(tbl.rowCount || 0).toLocaleString()} rows`;

    let colRows = '';
    tbl.columns.forEach((c, idx) => {
      let constraint = '—';
      if (c.isPk) constraint = '<span style="color:var(--accent-amber);font-weight:700;">🔑 PRIMARY KEY</span>';
      else if (c.isFk) constraint = `<span style="color:var(--accent-cyan);font-weight:600;">🔗 FK → ${this.escapeHtml(c.fkTargetTable)}.${this.escapeHtml(c.fkTargetCol)}</span>`;

      colRows += `
        <tr>
          <td class="row-num-cell">${idx + 1}</td>
          <td style="font-weight:700;">${this.escapeHtml(c.name)}</td>
          <td><span class="type-pill">${this.escapeHtml(c.type)}</span></td>
          <td>${c.notNull ? '<span class="cell-bool-false">NOT NULL</span>' : '<span class="badge-null">NULLABLE</span>'}</td>
          <td>${c.defaultValue !== null ? this.escapeHtml(String(c.defaultValue)) : '<span class="badge-null">None</span>'}</td>
          <td>${constraint}</td>
        </tr>
      `;
    });
    this.schemaColumnsBody.innerHTML = colRows;
    this.schemaDdlCode.textContent = tbl.sql ? `${tbl.sql};` : '-- No DDL available';

    const tblIndexes = summary.indexes.filter(i => i.tableName === tableName);
    if (!tblIndexes.length) {
      this.schemaIndexesList.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;">No custom secondary indexes defined on this table.</div>';
    } else {
      this.schemaIndexesList.innerHTML = tblIndexes.map(idx => `
        <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:6px;padding:10px;">
          <div style="font-weight:700;font-size:0.8rem;color:var(--accent-amber);">⚡ ${this.escapeHtml(idx.name)}</div>
          <div style="font-family:var(--font-mono);font-size:0.73rem;color:var(--text-secondary);margin-top:4px;">${this.escapeHtml(idx.sql || 'Auto-index')}</div>
        </div>
      `).join('');
    }
  }

  /**
   * Multi-Tab SQL Studio
   */
  renderSqlTabs() {
    if (!this.sqlTabsList) return;
    this.sqlTabsList.innerHTML = '';

    this.sqlTabs.forEach(tab => {
      const pill = document.createElement('div');
      pill.className = `sql-tab-pill ${tab.id === this.activeSqlTabId ? 'active' : ''}`;
      pill.innerHTML = `
        <span>${this.escapeHtml(tab.title)}</span>
        ${this.sqlTabs.length > 1 ? '<span class="sql-tab-close" title="Close tab">✕</span>' : ''}
      `;

      pill.addEventListener('click', e => {
        if (e.target.classList.contains('sql-tab-close')) {
          e.stopPropagation();
          this.closeSqlTab(tab.id);
          return;
        }
        this.switchSqlTab(tab.id);
      });

      this.sqlTabsList.appendChild(pill);
    });

    const activeTab = this.sqlTabs.find(t => t.id === this.activeSqlTabId) || this.sqlTabs[0];
    if (activeTab && this.sqlEditorInput) {
      this.sqlEditorInput.value = activeTab.sql;
      this.updateLineNumbers();
    }
  }

  addSqlTab(initialSql = '') {
    const id = this.nextSqlTabId++;
    const defaultSql = initialSql || (this.activeTable ? `SELECT * FROM "${this.activeTable}" LIMIT 50;` : 'SELECT sqlite_version();');
    this.sqlTabs.push({ id, title: `Query ${id}`, sql: defaultSql });
    this.activeSqlTabId = id;
    this.savePersistedSqlState();
    this.renderSqlTabs();
    this.sqlEditorInput.focus();
  }

  switchSqlTab(tabId) {
    this.activeSqlTabId = tabId;
    this.renderSqlTabs();
  }

  closeSqlTab(tabId) {
    if (this.sqlTabs.length <= 1) return;
    this.sqlTabs = this.sqlTabs.filter(t => t.id !== tabId);
    if (this.activeSqlTabId === tabId) {
      this.activeSqlTabId = this.sqlTabs[this.sqlTabs.length - 1].id;
    }
    this.savePersistedSqlState();
    this.renderSqlTabs();
  }

  updateLineNumbers() {
    if (!this.sqlEditorInput || !this.sqlLineNumbers) return;
    const linesCount = (this.sqlEditorInput.value.match(/\n/g) || []).length + 1;
    const nums = [];
    for (let i = 1; i <= linesCount; i++) nums.push(i);
    this.sqlLineNumbers.textContent = nums.join('\n');
  }

  formatActiveSql() {
    const raw = this.sqlEditorInput.value.trim();
    if (!raw) return;
    const keywords = ['SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'VALUES', 'SET'];
    let formatted = raw.replace(/\s+/g, ' ');
    keywords.forEach(kw => {
      const reg = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(reg, `\n${kw}`);
    });
    formatted = formatted.replace(/^\n+/, '').replace(/;\s*/g, ';\n\n').trim();
    this.sqlEditorInput.value = formatted;
    this.updateLineNumbers();
    const tab = this.sqlTabs.find(t => t.id === this.activeSqlTabId);
    if (tab) {
      tab.sql = formatted;
      this.savePersistedSqlState();
    }
    this.showToast('Formatted SQL query', 'info');
  }

  executeSql() {
    const sql = this.sqlEditorInput.value.trim();
    if (!sql) return;

    this.queryExecutionStatus.innerHTML = '<span style="color: var(--accent-cyan);">Executing SQL against WebAssembly engine...</span>';

    try {
      const res = dbEngine.executeQuery(sql);

      this.queryHistory.unshift({
        sql,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        durationMs: res.executionTimeMs,
        status: res.error ? 'error' : 'ok',
        rows: res.error ? 0 : res.rowCount
      });
      this.savePersistedSqlState();
      if (this.queryHistoryPanel.style.display !== 'none') {
        this.renderQueryHistory();
      }

      if (res.error) {
        this.queryExecutionStatus.innerHTML = `
          <span style="color: var(--accent-rose); font-family: var(--font-mono);">
            ✕ SQL Error: ${this.escapeHtml(res.error)} (${res.executionTimeMs}ms)
          </span>
        `;
        this.queryResultSetsTabs.innerHTML = '';
        this.queryOutputHead.innerHTML = '';
        this.queryOutputBody.innerHTML = '';
        this.toggleQueryExportButtons(false);
        return;
      }

      if (res.isMutating) {
        this.refreshEntireWorkspace(this.activeTable);
      }

      this.lastQueryResults = res;
      this.activeResultSetIndex = 0;
      this.sbPerfTime.textContent = `Latency: ${res.executionTimeMs}ms`;

      this.renderResultSetTabs();
      this.renderActiveQueryResultSet();
    } catch (err) {
      this.queryExecutionStatus.innerHTML = `<span style="color: var(--accent-rose);">Execution error: ${this.escapeHtml(err.message)}</span>`;
    }
  }

  getActiveResultSet() {
    if (!this.lastQueryResults || !this.lastQueryResults.resultSets.length) return null;
    return this.lastQueryResults.resultSets[this.activeResultSetIndex] || this.lastQueryResults.resultSets[0];
  }

  renderResultSetTabs() {
    this.queryResultSetsTabs.innerHTML = '';
    if (!this.lastQueryResults || this.lastQueryResults.resultSets.length <= 1) return;

    this.lastQueryResults.resultSets.forEach((rs, idx) => {
      const btn = document.createElement('button');
      btn.className = `btn ${idx === this.activeResultSetIndex ? 'btn-primary' : 'btn-secondary'} btn-sm`;
      btn.textContent = `Result #${idx + 1} (${rs.rowCount})`;
      btn.addEventListener('click', () => {
        this.activeResultSetIndex = idx;
        this.renderResultSetTabs();
        this.renderActiveQueryResultSet();
      });
      this.queryResultSetsTabs.appendChild(btn);
    });
  }

  renderActiveQueryResultSet() {
    const res = this.lastQueryResults;
    if (!res) return;

    const rs = this.getActiveResultSet();
    if (!rs) {
      this.queryExecutionStatus.innerHTML = `
        <span style="color: var(--accent-emerald); font-family: var(--font-mono);">
          ✓ ${this.escapeHtml(res.message || 'Statement executed.')} (${res.executionTimeMs}ms)
        </span>
      `;
      this.toggleQueryExportButtons(false);
      this.queryOutputHead.innerHTML = '';
      this.queryOutputBody.innerHTML = `
        <tr>
          <td style="padding: 28px; text-align: center; color: var(--text-muted);">
            ${this.escapeHtml(res.message || 'Query completed successfully. 0 rows returned.')}
          </td>
        </tr>
      `;
      return;
    }

    this.queryExecutionStatus.innerHTML = `
      <span style="color: var(--accent-emerald); font-family: var(--font-mono);">
        ✓ ${rs.rowCount.toLocaleString()} rows fetched in ${res.executionTimeMs}ms
      </span>
    `;
    this.toggleQueryExportButtons(rs.rowCount > 0);

    let thead = '<tr><th class="row-num-cell">#</th>';
    rs.columns.forEach(col => {
      thead += `<th>${this.escapeHtml(col)}</th>`;
    });
    thead += '</tr>';
    this.queryOutputHead.innerHTML = thead;

    let tbody = '';
    rs.rows.forEach((row, i) => {
      tbody += `<tr><td class="row-num-cell">${i + 1}</td>`;
      row.forEach(cell => {
        const formatted = cell === null ? '<span class="badge-null">NULL</span>' : this.escapeHtml(String(cell));
        tbody += `<td>${formatted}</td>`;
      });
      tbody += '</tr>';
    });
    this.queryOutputBody.innerHTML = tbody;
  }

  toggleQueryExportButtons(show) {
    const disp = show ? 'inline-flex' : 'none';
    this.btnQueryCopyMd.style.display = disp;
    this.btnQueryExportJson.style.display = disp;
    this.btnQueryExportCsv.style.display = disp;
  }

  renderQueryHistory() {
    if (!this.queryHistory.length) {
      this.queryHistoryList.innerHTML = '<li style="padding:14px;text-align:center;color:var(--text-muted);font-size:0.75rem;">No queries recorded yet.</li>';
      return;
    }

    this.queryHistoryList.innerHTML = '';
    this.queryHistory.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div class="history-item-sql">${this.escapeHtml(item.sql)}</div>
        <div class="history-item-meta">
          <span style="color:${item.status === 'ok' ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
            ${item.status === 'ok' ? `✓ ${item.rows} rows` : '✕ Error'} • ${item.durationMs}ms
          </span>
          <span>${item.time}</span>
        </div>
      `;
      li.addEventListener('click', () => {
        this.sqlEditorInput.value = item.sql;
        this.updateLineNumbers();
      });
      this.queryHistoryList.appendChild(li);
    });
  }

  explainSql() {
    const sql = this.sqlEditorInput.value.trim();
    if (!sql) return;
    const clean = sql.replace(/^\s*EXPLAIN\s+QUERY\s+PLAN\s+/i, '');
    this.sqlEditorInput.value = `EXPLAIN QUERY PLAN ${clean}`;
    this.updateLineNumbers();
    this.executeSql();
    this.showToast('Generated SQLite bytecode query plan', 'info');
  }

  renderQuerySnippets(tables) {
    this.queryQuickTemplates.innerHTML = '<span style="font-size: 0.66rem; color: var(--text-muted); font-weight: 700;">SNIPPETS:</span>';
    if (!tables.length) return;

    const first = tables[0].name;
    const snippets = [
      { label: `Scan ${first}`, sql: `SELECT * FROM "${first}" LIMIT 50;` },
      { label: 'Table Sizes', sql: `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;` },
      { label: 'All Columns', sql: `SELECT m.name AS table_name, p.name AS column_name, p.type, p.[notnull] AS not_null, p.pk FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table' ORDER BY m.name, p.cid;` },
      { label: 'Foreign Keys', sql: `SELECT m.name AS from_table, f.[from] AS from_col, f.[table] AS to_table, f.[to] AS to_col FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f WHERE m.type = 'table';` }
    ];

    snippets.forEach(s => {
      const pill = document.createElement('span');
      pill.className = 'template-badge';
      pill.textContent = s.label;
      pill.addEventListener('click', () => {
        this.sqlEditorInput.value = s.sql;
        this.updateLineNumbers();
        this.executeSql();
      });
      this.queryQuickTemplates.appendChild(pill);
    });
  }

  /**
   * Profiler & Insights View
   */
  renderInsights(summary) {
    this.kpiStorage.textContent = summary.formattedSize;
    this.kpiTables.textContent = `${summary.tables.length} / ${summary.views.length}v`;
    this.kpiRows.textContent = summary.totalRows.toLocaleString();
    this.kpiIndices.textContent = `${summary.indexes.length} idx • ${summary.totalFkCount} fk`;

    // Populate Column Profiler Selects
    this.profilerTableSelect.innerHTML = '';
    summary.tables.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.name;
      this.profilerTableSelect.appendChild(opt);
    });
    this.populateProfilerColumns();

    // Volume Distribution Bar Chart
    let bars = '';
    const maxRows = Math.max(1, ...summary.tables.map(t => t.rowCount));
    const totalRows = Math.max(1, summary.totalRows);

    summary.tables.forEach(t => {
      const pct = Math.min(100, Math.max(3, (t.rowCount / maxRows) * 100));
      const share = ((t.rowCount / totalRows) * 100).toFixed(1);
      bars += `
        <div class="bar-row">
          <div class="bar-meta">
            <span style="font-weight: 600;">${this.escapeHtml(t.name)}</span>
            <span style="font-family: var(--font-mono); color: var(--text-muted);">${t.rowCount.toLocaleString()} rows (${share}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });
    this.insightsBarChart.innerHTML = bars || '<div style="color:var(--text-muted);">No tables available.</div>';

    let pragmaHtml = '';
    for (const [k, v] of Object.entries(summary.pragmas)) {
      pragmaHtml += `
        <tr>
          <td>${this.escapeHtml(k)}</td>
          <td>${this.escapeHtml(String(v))}</td>
        </tr>
      `;
    }
    this.insightsPragmaKv.innerHTML = pragmaHtml;
  }

  populateProfilerColumns() {
    const tblName = this.profilerTableSelect.value;
    this.profilerColSelect.innerHTML = '';
    if (!tblName) return;

    const cols = dbEngine.getTableColumns(tblName);
    cols.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.name} (${c.type})`;
      this.profilerColSelect.appendChild(opt);
    });
    this.runColumnProfiler();
  }

  runColumnProfiler() {
    const tbl = this.profilerTableSelect.value;
    const col = this.profilerColSelect.value;
    if (!tbl || !col) {
      this.profilerResultsBox.innerHTML = '';
      return;
    }

    const prof = dbEngine.getColumnProfile(tbl, col);
    if (!prof) {
      this.profilerResultsBox.innerHTML = '<div style="color:var(--text-muted);">Unable to profile column.</div>';
      return;
    }

    const fillRate = prof.total > 0 ? (((prof.nonNull / prof.total) * 100).toFixed(1) + '%') : '100%';
    const uniqueness = prof.nonNull > 0 ? (((prof.distinct / prof.nonNull) * 100).toFixed(1) + '%') : '0%';

    this.profilerResultsBox.innerHTML = `
      <div class="prof-metric-card">
        <div class="prof-metric-label">Distinct Values</div>
        <div class="prof-metric-val" style="color:var(--accent-cyan);">${prof.distinct.toLocaleString()} (${uniqueness})</div>
      </div>
      <div class="prof-metric-card">
        <div class="prof-metric-label">Completeness (Non-Null)</div>
        <div class="prof-metric-val" style="color:var(--accent-emerald);">${fillRate}</div>
      </div>
      <div class="prof-metric-card">
        <div class="prof-metric-label">Null Count</div>
        <div class="prof-metric-val">${prof.nulls.toLocaleString()}</div>
      </div>
      <div class="prof-metric-card">
        <div class="prof-metric-label">Min Value</div>
        <div class="prof-metric-val" title="${this.escapeHtml(String(prof.min ?? '—'))}">${this.escapeHtml(String(prof.min ?? '—'))}</div>
      </div>
      <div class="prof-metric-card">
        <div class="prof-metric-label">Max Value</div>
        <div class="prof-metric-val" title="${this.escapeHtml(String(prof.max ?? '—'))}">${this.escapeHtml(String(prof.max ?? '—'))}</div>
      </div>
    `;
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
    if (tab === 'schema' && this.activeTable) {
      this.renderSchemaTab(this.activeTable);
    }
  }

  buildPaletteActions(tables) {
    this.paletteActions = [
      { type: 'command', title: 'Save Binary .sqlite Database File', subtitle: 'Export binary SQLite', action: () => this.btnSaveBinary.click() },
      { type: 'command', title: 'Import CSV or JSON Dataset as Table', subtitle: 'Create table from file', action: () => this.datasetPickerInput.click() },
      { type: 'command', title: 'Create New Table (+ Wizard)', subtitle: 'Schema Builder', action: () => this.openCreateTableModal() },
      { type: 'command', title: 'Insert Row into Active Table', subtitle: 'CRUD Operation', action: () => this.openInsertRowModal() },
      { type: 'command', title: 'Open SQL Studio Console', subtitle: 'Multi-tab query runner', action: () => this.switchMode('query') },
      { type: 'command', title: 'Open Interactive Visual ERD', subtitle: 'Schema relationship graph', action: () => this.switchMode('erd') },
      { type: 'command', title: 'Open Schema & DDL Inspector', subtitle: 'CREATE TABLE & Indexes', action: () => this.switchMode('schema') },
      { type: 'command', title: 'Open Column Profiler & Diagnostics', subtitle: 'Data quality & Pragmas', action: () => this.switchMode('insights') },
      { type: 'command', title: 'Export Full Database SQL Dump (.sql)', subtitle: 'DDL + INSERT statements', action: () => this.btnExportDump.click() },
      { type: 'command', title: 'Toggle Dark / Light Appearance', subtitle: 'Theme Switcher', action: () => this.btnThemeToggle.click() },
      { type: 'command', title: 'Return to Studio Launcher', subtitle: 'Start Page', action: () => this.showStartPage() }
    ];

    tables.forEach(t => {
      this.paletteActions.push({
        type: 'table',
        title: `Table: ${t.name}`,
        subtitle: `${t.rowCount.toLocaleString()} rows • ${t.columns.length} cols`,
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
    const filtered = this.paletteActions.filter(
      a => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );
    this.paletteResultsList.innerHTML = '';

    if (!filtered.length) {
      this.paletteResultsList.innerHTML = `
        <li style="padding: 18px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">
          No matching tables or studio commands found.
        </li>
      `;
      return;
    }

    filtered.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = `palette-item ${idx === this.paletteIndex ? 'selected' : ''}`;
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${item.type === 'table' ? '📊' : '⚡'}</span>
          <span style="font-weight: 500;">${this.escapeHtml(item.title)}</span>
        </div>
        <span style="font-size: 0.72rem; opacity: 0.75; font-family: var(--font-mono);">${this.escapeHtml(item.subtitle || 'Action')}</span>
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
    if (!items.length) return;
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

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';

    let icon = '⚡';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    this.toastShelf.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.22s ease';
      setTimeout(() => toast.remove(), 220);
    }, 2900);
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

  downloadBinaryFile(uint8Array, fileName, mimeType) {
    const blob = new Blob([uint8Array], { type: mimeType });
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
