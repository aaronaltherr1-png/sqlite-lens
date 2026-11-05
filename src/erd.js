/**
 * SQLiteLens Studio — Precision Interactive Visual ERD Engine
 * Infinite Canvas with Topological Auto-Layout, Pan/Zoom, Relation Highlighting & SVG Export
 */

export class ErdViewer {
  constructor(canvasContainerId, svgLayerId, nodesLayerId, onTableSelect = null) {
    this.container = document.getElementById(canvasContainerId);
    this.svg = document.getElementById(svgLayerId);
    this.nodesLayer = document.getElementById(nodesLayerId);
    this.onTableSelect = onTableSelect;

    this.tables = [];
    this.nodes = new Map();
    this.relationships = [];

    this.zoom = 1;
    this.panX = 40;
    this.panY = 40;

    this.draggedNode = null;
    this.dragStartMouse = { x: 0, y: 0 };
    this.dragStartNode = { x: 0, y: 0 };

    this.isPanning = false;
    this.panStartMouse = { x: 0, y: 0 };
    this.panStartOffset = { x: 0, y: 0 };

    this.hoveredTable = null;
    this.NODE_WIDTH = 268;
    this.HEADER_HEIGHT = 38;
    this.ROW_HEIGHT = 27;

    this.initEventListeners();
  }

  initEventListeners() {
    if (!this.container) return;

    // Node dragging & Canvas panning
    this.container.addEventListener('mousedown', e => {
      if (e.button !== 0) return;

      const header = e.target.closest('.erd-node-header');
      const nodeEl = e.target.closest('.erd-node');

      if (header && nodeEl) {
        const tableName = nodeEl.dataset.table;
        const nodeData = this.nodes.get(tableName);
        if (!nodeData) return;

        this.draggedNode = nodeData;
        this.dragStartMouse = { x: e.clientX, y: e.clientY };
        this.dragStartNode = { x: nodeData.x, y: nodeData.y };

        nodeEl.classList.add('dragging');
        nodeEl.style.zIndex = 60;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Otherwise pan the canvas if clicking empty background
      if (!nodeEl) {
        this.isPanning = true;
        this.panStartMouse = { x: e.clientX, y: e.clientY };
        this.panStartOffset = { x: this.panX, y: this.panY };
        this.container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', e => {
      if (this.draggedNode) {
        const dx = (e.clientX - this.dragStartMouse.x) / this.zoom;
        const dy = (e.clientY - this.dragStartMouse.y) / this.zoom;

        this.draggedNode.x = Math.round(this.dragStartNode.x + dx);
        this.draggedNode.y = Math.round(this.dragStartNode.y + dy);

        this.draggedNode.element.style.left = `${this.draggedNode.x}px`;
        this.draggedNode.element.style.top = `${this.draggedNode.y}px`;

        this.updateAllConnections();
        return;
      }

      if (this.isPanning) {
        const dx = e.clientX - this.panStartMouse.x;
        const dy = e.clientY - this.panStartMouse.y;
        this.panX = this.panStartOffset.x + dx;
        this.panY = this.panStartOffset.y + dy;
        this.applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.draggedNode) {
        this.draggedNode.element.classList.remove('dragging');
        this.draggedNode.element.style.zIndex = 10;
        this.draggedNode = null;
      }
      if (this.isPanning) {
        this.isPanning = false;
        if (this.container) this.container.style.cursor = 'grab';
      }
    });

    // Smooth wheel zoom / pan
    this.container.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        this.setZoom(delta);
      } else {
        this.panX -= e.deltaX * 0.8;
        this.panY -= e.deltaY * 0.8;
        this.applyTransform();
      }
    }, { passive: false });
  }

  applyTransform() {
    const transformStr = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.nodesLayer.style.transform = transformStr;
    this.nodesLayer.style.transformOrigin = '0 0';
    this.svg.style.transform = transformStr;
    this.svg.style.transformOrigin = '0 0';

    const zoomBadge = document.getElementById('erd-zoom-badge');
    if (zoomBadge) {
      zoomBadge.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  /**
   * Compute smart topological layout so referenced parent tables appear on the left
   * and dependent child tables flow to the right
   */
  computeTopologicalLayout(tables) {
    const incomingFkCount = new Map();
    const outgoingFkCount = new Map();

    tables.forEach(t => {
      incomingFkCount.set(t.name, 0);
      outgoingFkCount.set(t.name, 0);
    });

    tables.forEach(t => {
      t.columns.forEach(c => {
        if (c.isFk && c.fkTargetTable && incomingFkCount.has(c.fkTargetTable)) {
          outgoingFkCount.set(t.name, (outgoingFkCount.get(t.name) || 0) + 1);
          incomingFkCount.set(c.fkTargetTable, (incomingFkCount.get(c.fkTargetTable) || 0) + 1);
        }
      });
    });

    // Sort: pure parent tables first, then mixed, then leaf child tables
    const sorted = [...tables].sort((a, b) => {
      const scoreA = (incomingFkCount.get(a.name) || 0) * 2 - (outgoingFkCount.get(a.name) || 0);
      const scoreB = (incomingFkCount.get(b.name) || 0) * 2 - (outgoingFkCount.get(b.name) || 0);
      return scoreB - scoreA;
    });

    const colsCount = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(sorted.length))));
    const colSpacing = 360;
    const colHeights = new Array(colsCount).fill(30);

    const positions = new Map();
    sorted.forEach((table, idx) => {
      const colIdx = idx % colsCount;
      const x = colIdx * colSpacing + 30;
      const y = colHeights[colIdx];
      const estimatedHeight = this.HEADER_HEIGHT + table.columns.length * this.ROW_HEIGHT + 34;
      colHeights[colIdx] += estimatedHeight + 36;
      positions.set(table.name, { x, y });
    });

    return positions;
  }

  render(tables) {
    this.tables = tables || [];
    this.nodes.clear();
    this.nodesLayer.innerHTML = '';
    this.svg.innerHTML = '';
    this.relationships = [];

    if (!this.tables.length) {
      this.nodesLayer.innerHTML = `
        <div style="padding: 48px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          No tables available in this database to render an Entity Relationship Diagram.
        </div>
      `;
      return;
    }

    const layoutPositions = this.computeTopologicalLayout(this.tables);

    this.tables.forEach(table => {
      const pos = layoutPositions.get(table.name) || { x: 40, y: 40 };

      const nodeEl = document.createElement('div');
      nodeEl.className = 'erd-node';
      nodeEl.dataset.table = table.name;
      nodeEl.style.left = `${pos.x}px`;
      nodeEl.style.top = `${pos.y}px`;
      nodeEl.style.width = `${this.NODE_WIDTH}px`;

      let columnsHtml = '';
      table.columns.forEach((col, colIdx) => {
        let badges = '';
        if (col.isPk) {
          badges += '<span class="erd-key-badge pk" title="Primary Key">PK</span>';
        }
        if (col.isFk) {
          badges += `<span class="erd-key-badge fk" title="Foreign Key → ${col.fkTargetTable}.${col.fkTargetCol}">FK</span>`;
          this.relationships.push({
            fromTable: table.name,
            fromCol: col.name,
            fromColIdx: colIdx,
            toTable: col.fkTargetTable,
            toCol: col.fkTargetCol
          });
        }

        const nnBadge = col.notNull && !col.isPk ? '<span class="erd-nn-dot" title="NOT NULL">•</span>' : '';

        columnsHtml += `
          <div class="erd-col-row ${col.isPk ? 'is-pk' : ''} ${col.isFk ? 'is-fk' : ''}" data-col="${col.name}" data-idx="${colIdx}">
            <div class="erd-col-name">
              ${badges}
              <span class="erd-col-text">${col.name}</span>
              ${nnBadge}
            </div>
            <span class="erd-col-type">${col.type}</span>
          </div>
        `;
      });

      nodeEl.innerHTML = `
        <div class="erd-node-header" title="Drag to move • Double-click to open in Data Grid">
          <div style="display: flex; align-items: center; gap: 7px; overflow: hidden;">
            <span class="erd-table-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </span>
            <span class="erd-table-title">${table.name}</span>
          </div>
          <span class="erd-row-pill">${table.rowCount.toLocaleString()}</span>
        </div>
        <div class="erd-node-columns">
          ${columnsHtml}
        </div>
      `;

      // Hover interactions for highlighting connected relations
      nodeEl.addEventListener('mouseenter', () => {
        this.hoveredTable = table.name;
        this.highlightConnections(table.name);
      });
      nodeEl.addEventListener('mouseleave', () => {
        this.hoveredTable = null;
        this.highlightConnections(null);
      });

      // Double-click to jump to table in Data Grid
      nodeEl.addEventListener('dblclick', () => {
        if (typeof this.onTableSelect === 'function') {
          this.onTableSelect(table.name);
        }
      });

      this.nodesLayer.appendChild(nodeEl);
      this.nodes.set(table.name, {
        element: nodeEl,
        table,
        x: pos.x,
        y: pos.y,
        width: this.NODE_WIDTH,
        height: this.HEADER_HEIGHT + table.columns.length * this.ROW_HEIGHT + 12
      });
    });

    const relBadge = document.getElementById('erd-relations-badge');
    if (relBadge) {
      relBadge.textContent = `${this.tables.length} tables • ${this.relationships.length} relations`;
    }

    this.applyTransform();
    this.updateAllConnections();
  }

  /**
   * Calculate exact SVG Bézier coordinates using local mathematical offsets
   */
  updateAllConnections() {
    if (!this.svg) return;
    this.svg.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="erdCableGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0.95" />
      </linearGradient>
      <linearGradient id="erdCableActive" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#22d3ee" stop-opacity="1" />
        <stop offset="100%" stop-color="#a855f7" stop-opacity="1" />
      </linearGradient>
      <marker id="erdArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#818cf8" />
      </marker>
      <marker id="erdArrowActive" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#22d3ee" />
      </marker>
    `;
    this.svg.appendChild(defs);

    this.relationships.forEach(rel => {
      const fromNode = this.nodes.get(rel.fromTable);
      const toNode = this.nodes.get(rel.toTable);
      if (!fromNode || !toNode) return;

      const toColIdx = Math.max(0, toNode.table.columns.findIndex(c => c.name === rel.toCol));

      const startY = fromNode.y + this.HEADER_HEIGHT + 4 + rel.fromColIdx * this.ROW_HEIGHT + this.ROW_HEIGHT / 2;
      const endY = toNode.y + this.HEADER_HEIGHT + 4 + toColIdx * this.ROW_HEIGHT + this.ROW_HEIGHT / 2;

      let startX, endX;
      const fromCenter = fromNode.x + this.NODE_WIDTH / 2;
      const toCenter = toNode.x + this.NODE_WIDTH / 2;

      if (fromCenter <= toCenter) {
        startX = fromNode.x + this.NODE_WIDTH;
        endX = toNode.x;
      } else {
        startX = fromNode.x;
        endX = toNode.x + this.NODE_WIDTH;
      }

      const dist = Math.max(60, Math.abs(endX - startX) * 0.55);
      const c1X = startX + (fromCenter <= toCenter ? dist : -dist);
      const c2X = endX + (fromCenter <= toCenter ? -dist : dist);

      const d = `M ${startX} ${startY} C ${c1X} ${startY}, ${c2X} ${endY}, ${endX} ${endY}`;
      const isHighlighted = this.hoveredTable && (rel.fromTable === this.hoveredTable || rel.toTable === this.hoveredTable);

      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glow.setAttribute('d', d);
      glow.setAttribute('stroke', isHighlighted ? 'rgba(34, 211, 238, 0.35)' : 'rgba(99, 102, 241, 0.14)');
      glow.setAttribute('stroke-width', isHighlighted ? '7' : '5');
      glow.setAttribute('fill', 'none');
      glow.dataset.from = rel.fromTable;
      glow.dataset.to = rel.toTable;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', isHighlighted ? 'url(#erdCableActive)' : 'url(#erdCableGrad)');
      path.setAttribute('stroke-width', isHighlighted ? '2.6' : '1.8');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('marker-end', isHighlighted ? 'url(#erdArrowActive)' : 'url(#erdArrow)');
      path.dataset.from = rel.fromTable;
      path.dataset.to = rel.toTable;

      const dotStart = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotStart.setAttribute('cx', startX);
      dotStart.setAttribute('cy', startY);
      dotStart.setAttribute('r', isHighlighted ? '4' : '3');
      dotStart.setAttribute('fill', '#38bdf8');

      this.svg.appendChild(glow);
      this.svg.appendChild(path);
      this.svg.appendChild(dotStart);
    });
  }

  highlightConnections(tableName) {
    this.nodes.forEach((nodeData, name) => {
      if (!tableName) {
        nodeData.element.classList.remove('erd-dimmed', 'erd-highlighted');
        return;
      }
      const isConnected = name === tableName || this.relationships.some(
        r => (r.fromTable === tableName && r.toTable === name) || (r.toTable === tableName && r.fromTable === name)
      );
      nodeData.element.classList.toggle('erd-highlighted', name === tableName);
      nodeData.element.classList.toggle('erd-dimmed', !isConnected);
    });
    this.updateAllConnections();
  }

  resetLayout() {
    this.zoom = 1;
    this.panX = 40;
    this.panY = 40;
    this.render(this.tables);
  }

  fitToView() {
    if (!this.nodes.size || !this.container) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const contentW = maxX - minX + 100;
    const contentH = maxY - minY + 100;
    const rect = this.container.getBoundingClientRect();

    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    this.zoom = Math.max(0.45, Math.min(1.2, Math.min(scaleX, scaleY)));

    this.panX = Math.round((rect.width - contentW * this.zoom) / 2 - minX * this.zoom + 50 * this.zoom);
    this.panY = Math.round((rect.height - contentH * this.zoom) / 2 - minY * this.zoom + 50 * this.zoom);

    this.applyTransform();
  }

  setZoom(delta) {
    this.zoom = Math.max(0.4, Math.min(2.0, Number((this.zoom + delta).toFixed(2))));
    this.applyTransform();
  }

  /**
   * Generate standalone SVG string of the entire ERD schema diagram
   */
  exportAsSvgString() {
    if (!this.nodes.size) return '';
    let maxX = 800, maxY = 600;
    this.nodes.forEach(n => {
      maxX = Math.max(maxX, n.x + n.width + 80);
      maxY = Math.max(maxY, n.y + n.height + 80);
    });

    let svgOut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxX} ${maxY}" width="${maxX}" height="${maxY}" fill="none">\n`;
    svgOut += `  <rect width="${maxX}" height="${maxY}" fill="#090d16"/>\n`;
    svgOut += this.svg.innerHTML;

    this.nodes.forEach(n => {
      svgOut += `  <g transform="translate(${n.x}, ${n.y})">\n`;
      svgOut += `    <rect width="${n.width}" height="${n.height}" rx="10" fill="#111827" stroke="#334155" stroke-width="1.5"/>\n`;
      svgOut += `    <rect width="${n.width}" height="${this.HEADER_HEIGHT}" rx="10" fill="#1e293b"/>\n`;
      svgOut += `    <text x="14" y="24" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#f8fafc">${n.table.name}</text>\n`;
      svgOut += `    <text x="${n.width - 14}" y="24" text-anchor="end" font-family="monospace" font-size="11" fill="#94a3b8">${n.table.rowCount}</text>\n`;

      n.table.columns.forEach((col, i) => {
        const cy = this.HEADER_HEIGHT + 20 + i * this.ROW_HEIGHT;
        const prefix = col.isPk ? '🔑 ' : col.isFk ? '🔗 ' : '';
        svgOut += `    <text x="14" y="${cy}" font-family="monospace" font-size="11.5" fill="${col.isPk ? '#fbbf24' : col.isFk ? '#38bdf8' : '#e2e8f0'}">${prefix}${col.name}</text>\n`;
        svgOut += `    <text x="${n.width - 14}" y="${cy}" text-anchor="end" font-family="monospace" font-size="10.5" fill="#64748b">${col.type}</text>\n`;
      });

      svgOut += `  </g>\n`;
    });

    svgOut += `</svg>`;
    return svgOut;
  }
}
