/**
 * SQLiteLens — Interactive Visual ERD (Entity Relationship Diagram)
 * Generates draggable table cards and computes dynamic SVG Bézier curves
 * linking foreign key columns to referenced primary key columns.
 */

export class ErdViewer {
  constructor(canvasContainerId, svgLayerId, nodesLayerId) {
    this.container = document.getElementById(canvasContainerId);
    this.svg = document.getElementById(svgLayerId);
    this.nodesLayer = document.getElementById(nodesLayerId);
    
    this.tables = [];
    this.nodes = new Map(); // tableName -> { element, x, y, width, height }
    this.relationships = []; // [{ fromTable, fromCol, toTable, toCol }]
    this.zoom = 1;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.updateAllConnections());

    // Drag and drop node logic
    this.nodesLayer.addEventListener('mousedown', e => {
      const header = e.target.closest('.erd-node-header');
      if (!header) return;
      const nodeEl = header.closest('.erd-node');
      if (!nodeEl) return;

      const tableName = nodeEl.dataset.table;
      const nodeData = this.nodes.get(tableName);
      if (!nodeData) return;

      this.draggedNode = nodeData;
      const rect = nodeEl.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      nodeEl.style.zIndex = 50;
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!this.draggedNode) return;
      const containerRect = this.container.getBoundingClientRect();
      const x = (e.clientX - containerRect.left + this.container.scrollLeft - this.dragOffset.x) / this.zoom;
      const y = (e.clientY - containerRect.top + this.container.scrollTop - this.dragOffset.y) / this.zoom;

      this.draggedNode.x = Math.max(20, x);
      this.draggedNode.y = Math.max(20, y);
      this.draggedNode.element.style.left = `${this.draggedNode.x}px`;
      this.draggedNode.element.style.top = `${this.draggedNode.y}px`;

      this.updateAllConnections();
    });

    window.addEventListener('mouseup', () => {
      if (this.draggedNode) {
        this.draggedNode.element.style.zIndex = 5;
        this.draggedNode = null;
      }
    });
  }

  render(tables) {
    this.tables = tables;
    this.nodes.clear();
    this.nodesLayer.innerHTML = '';
    this.svg.innerHTML = '';
    this.relationships = [];

    if (!tables.length) {
      this.nodesLayer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          No tables found in this database.
        </div>
      `;
      return;
    }

    // Determine layout: Grid layout
    const colsCount = Math.min(3, Math.ceil(Math.sqrt(tables.length)));
    const colWidth = 320;
    const rowHeight = 280;

    tables.forEach((table, index) => {
      const gridX = (index % colsCount) * colWidth + 60;
      const gridY = Math.floor(index / colsCount) * rowHeight + 60;

      const nodeEl = document.createElement('div');
      nodeEl.className = 'erd-node';
      nodeEl.dataset.table = table.name;
      nodeEl.style.left = `${gridX}px`;
      nodeEl.style.top = `${gridY}px`;

      // Header
      let columnsHtml = '';
      table.columns.forEach(col => {
        let badges = '';
        if (col.isPk) badges += '<span class="col-pk-tag" title="Primary Key">🔑</span>';
        if (col.isFk) {
          badges += `<span style="color: var(--accent-cyan); font-size: 0.75rem;" title="Foreign Key -> ${col.fkTargetTable}.${col.fkTargetCol}">🔗</span>`;
          this.relationships.push({
            fromTable: table.name,
            fromCol: col.name,
            toTable: col.fkTargetTable,
            toCol: col.fkTargetCol
          });
        }

        columnsHtml += `
          <div class="erd-col-row" data-col="${col.name}">
            <div class="erd-col-name">
              ${badges}
              <span>${col.name}</span>
            </div>
            <span class="erd-col-type">${col.type}</span>
          </div>
        `;
      });

      nodeEl.innerHTML = `
        <div class="erd-node-header">
          <span>${table.name}</span>
          <span style="font-size: 0.75rem; color: var(--text-faint); font-family: var(--font-mono);">${table.rowCount} rows</span>
        </div>
        <div class="erd-node-columns">
          ${columnsHtml}
        </div>
      `;

      this.nodesLayer.appendChild(nodeEl);
      this.nodes.set(table.name, {
        element: nodeEl,
        x: gridX,
        y: gridY,
        width: 250,
        height: nodeEl.offsetHeight || 200
      });
    });

    // Initial render of SVG paths
    requestAnimationFrame(() => {
      this.updateAllConnections();
    });
  }

  updateAllConnections() {
    this.svg.innerHTML = '';
    
    // SVG defs for arrow marker and gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="relGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.9" />
      </linearGradient>
      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
      </marker>
    `;
    this.svg.appendChild(defs);

    this.relationships.forEach(rel => {
      const fromNode = this.nodes.get(rel.fromTable);
      const toNode = this.nodes.get(rel.toTable);
      if (!fromNode || !toNode) return;

      const fromRect = fromNode.element.getBoundingClientRect();
      const toRect = toNode.element.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();

      // Find specific column DOM elements to pin lines exactly to the column row
      const fromColEl = fromNode.element.querySelector(`[data-col="${rel.fromCol}"]`);
      const toColEl = toNode.element.querySelector(`[data-col="${rel.toCol}"]`);

      let startY = fromNode.y + 40;
      let endY = toNode.y + 40;

      if (fromColEl) {
        const colRect = fromColEl.getBoundingClientRect();
        startY = (colRect.top - containerRect.top + this.container.scrollTop + colRect.height / 2) / this.zoom;
      }

      if (toColEl) {
        const colRect = toColEl.getBoundingClientRect();
        endY = (colRect.top - containerRect.top + this.container.scrollTop + colRect.height / 2) / this.zoom;
      }

      // Determine left or right anchor
      let startX, endX;
      if (fromNode.x < toNode.x) {
        startX = fromNode.x + fromNode.element.offsetWidth;
        endX = toNode.x;
      } else {
        startX = fromNode.x;
        endX = toNode.x + toNode.element.offsetWidth;
      }

      // Smooth Cubic Bézier Curve
      const dx = Math.abs(endX - startX) * 0.55;
      const control1X = startX + (fromNode.x < toNode.x ? dx : -dx);
      const control1Y = startY;
      const control2X = endX + (fromNode.x < toNode.x ? -dx : dx);
      const control2Y = endY;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`);
      path.setAttribute('stroke', 'url(#relGrad)');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('marker-end', 'url(#arrow)');

      // Glow effect path underneath
      const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glowPath.setAttribute('d', `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`);
      glowPath.setAttribute('stroke', 'rgba(99, 102, 241, 0.25)');
      glowPath.setAttribute('stroke-width', '6');
      glowPath.setAttribute('fill', 'none');

      this.svg.appendChild(glowPath);
      this.svg.appendChild(path);
    });
  }

  resetLayout() {
    this.render(this.tables);
  }

  setZoom(delta) {
    this.zoom = Math.max(0.5, Math.min(2.0, this.zoom + delta));
    this.nodesLayer.style.transform = `scale(${this.zoom})`;
    this.nodesLayer.style.transformOrigin = '0 0';
    this.svg.style.transform = `scale(${this.zoom})`;
    this.svg.style.transformOrigin = '0 0';
    this.updateAllConnections();
  }
}
