/**
 * SQLiteLens Studio — Interactive Visual ERD
 * Professional relationship diagram with draggable cards and SVG curves.
 */

export class ErdViewer {
  constructor(canvasContainerId, svgLayerId, nodesLayerId) {
    this.container = document.getElementById(canvasContainerId);
    this.svg = document.getElementById(svgLayerId);
    this.nodesLayer = document.getElementById(nodesLayerId);
    
    this.tables = [];
    this.nodes = new Map();
    this.relationships = [];
    this.zoom = 1;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.updateAllConnections());

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
        <div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No tables found in this database.
        </div>
      `;
      return;
    }

    const colsCount = Math.min(3, Math.ceil(Math.sqrt(tables.length)));
    const colWidth = 310;
    const rowHeight = 260;

    tables.forEach((table, index) => {
      const gridX = (index % colsCount) * colWidth + 50;
      const gridY = Math.floor(index / colsCount) * rowHeight + 50;

      const nodeEl = document.createElement('div');
      nodeEl.className = 'erd-node';
      nodeEl.dataset.table = table.name;
      nodeEl.style.left = `${gridX}px`;
      nodeEl.style.top = `${gridY}px`;

      let columnsHtml = '';
      table.columns.forEach(col => {
        let badges = '';
        if (col.isPk) badges += '<span title="Primary Key" style="color: var(--accent-amber); margin-right: 4px;">🔑</span>';
        if (col.isFk) {
          badges += `<span title="Foreign Key -> ${col.fkTargetTable}.${col.fkTargetCol}" style="color: var(--accent-cyan); margin-right: 4px;">🔗</span>`;
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
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>${table.name}</span>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${table.rowCount} rows</span>
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
        width: 260,
        height: nodeEl.offsetHeight || 200
      });
    });

    requestAnimationFrame(() => {
      this.updateAllConnections();
    });
  }

  updateAllConnections() {
    this.svg.innerHTML = '';
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="erdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.9" />
      </linearGradient>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
      </marker>
    `;
    this.svg.appendChild(defs);

    this.relationships.forEach(rel => {
      const fromNode = this.nodes.get(rel.fromTable);
      const toNode = this.nodes.get(rel.toTable);
      if (!fromNode || !toNode) return;

      const containerRect = this.container.getBoundingClientRect();
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

      let startX, endX;
      if (fromNode.x < toNode.x) {
        startX = fromNode.x + fromNode.element.offsetWidth;
        endX = toNode.x;
      } else {
        startX = fromNode.x;
        endX = toNode.x + toNode.element.offsetWidth;
      }

      const dx = Math.abs(endX - startX) * 0.5;
      const control1X = startX + (fromNode.x < toNode.x ? dx : -dx);
      const control1Y = startY;
      const control2X = endX + (fromNode.x < toNode.x ? -dx : dx);
      const control2Y = endY;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`);
      path.setAttribute('stroke', 'url(#erdGrad)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('marker-end', 'url(#arrowHead)');

      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glow.setAttribute('d', `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`);
      glow.setAttribute('stroke', 'rgba(99, 102, 241, 0.2)');
      glow.setAttribute('stroke-width', '5');
      glow.setAttribute('fill', 'none');

      this.svg.appendChild(glow);
      this.svg.appendChild(path);
    });
  }

  resetLayout() {
    this.render(this.tables);
  }

  setZoom(delta) {
    this.zoom = Math.max(0.6, Math.min(1.8, this.zoom + delta));
    this.nodesLayer.style.transform = `scale(${this.zoom})`;
    this.nodesLayer.style.transformOrigin = '0 0';
    this.svg.style.transform = `scale(${this.zoom})`;
    this.svg.style.transformOrigin = '0 0';
    this.updateAllConnections();
  }
}
