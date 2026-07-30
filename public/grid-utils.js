(function initializeGridUtils(global) {
  "use strict";

  function samePatternColor(left, right) {
    if (!left || !right) return false;
    return Boolean(left.empty) === Boolean(right.empty) && (left.empty || left.code === right.code);
  }

  function buildCounts(pattern) {
    const counts = new Map();
    pattern.forEach((item) => {
      if (item.empty) return;
      const current = counts.get(item.code) || { ...item, count: 0 };
      current.count += 1;
      counts.set(item.code, current);
    });
    return counts;
  }

  function applyCountChanges(counts, changes) {
    const nextCounts = counts instanceof Map ? counts : new Map();
    for (const change of changes) {
      const before = change?.before;
      const after = change?.after;
      if (samePatternColor(before, after)) continue;
      if (before && !before.empty) {
        const current = nextCounts.get(before.code);
        if (current?.count > 1) current.count -= 1;
        else nextCounts.delete(before.code);
      }
      if (after && !after.empty) {
        const current = nextCounts.get(after.code);
        if (current) current.count += 1;
        else nextCounts.set(after.code, { ...after, count: 1 });
      }
    }
    return nextCounts;
  }

  function totalBeadCount(pattern) {
    return pattern.reduce((sum, item) => sum + (item.empty ? 0 : 1), 0);
  }

  function calculateUsedBounds(pattern, size) {
    let minX = size;
    let minY = size;
    let maxX = -1;
    let maxY = -1;
    for (let index = 0; index < pattern.length; index += 1) {
      const item = pattern[index];
      if (item.empty) continue;
      const x = index % size;
      const y = Math.floor(index / size);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (maxX < minX || maxY < minY) {
      return { minX: 0, minY: 0, maxX: -1, maxY: -1, width: 0, height: 0 };
    }
    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  function boundsForCells(cells) {
    if (!cells?.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of cells) {
      if (!cell || !Number.isFinite(cell.x) || !Number.isFinite(cell.y)) continue;
      minX = Math.min(minX, cell.x);
      minY = Math.min(minY, cell.y);
      maxX = Math.max(maxX, cell.x);
      maxY = Math.max(maxY, cell.y);
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }

  function mergeCellBounds(left, right) {
    if (!left) return right;
    if (!right) return left;
    return {
      minX: Math.min(left.minX, right.minX),
      minY: Math.min(left.minY, right.minY),
      maxX: Math.max(left.maxX, right.maxX),
      maxY: Math.max(left.maxY, right.maxY),
    };
  }

  function getFourNeighbors(x, y, size) {
    const neighbors = [];
    if (x > 0) neighbors.push(y * size + x - 1);
    if (x < size - 1) neighbors.push(y * size + x + 1);
    if (y > 0) neighbors.push((y - 1) * size + x);
    if (y < size - 1) neighbors.push((y + 1) * size + x);
    return neighbors;
  }

  function getEightNeighbors(x, y, size) {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        neighbors.push(ny * size + nx);
      }
    }
    return neighbors;
  }

  function countNeighborColors(colors) {
    const counted = new Map();
    for (const color of colors) {
      const entry = counted.get(color.code) || { color, count: 0 };
      entry.count += 1;
      counted.set(color.code, entry);
    }
    return [...counted.values()];
  }

  function isBorderIndex(index, size) {
    const x = index % size;
    const y = Math.floor(index / size);
    return x === 0 || y === 0 || x === size - 1 || y === size - 1;
  }

  function snapLineEnd(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) > Math.abs(dy) * 2) return { x: end.x, y: start.y };
    if (Math.abs(dy) > Math.abs(dx) * 2) return { x: start.x, y: end.y };
    const step = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: start.x + Math.sign(dx) * step, y: start.y + Math.sign(dy) * step };
  }

  function interpolateCells(start, end) {
    const cells = [];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let step = 0; step <= steps; step += 1) {
      cells.push({
        x: Math.round(start.x + (dx * step) / steps),
        y: Math.round(start.y + (dy * step) / steps),
      });
    }
    return cells;
  }

  function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 0.0001) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  global.XiaomaiGridUtils = Object.freeze({
    applyCountChanges,
    boundsForCells,
    buildCounts,
    calculateUsedBounds,
    countNeighborColors,
    getEightNeighbors,
    getFourNeighbors,
    interpolateCells,
    isBorderIndex,
    mergeCellBounds,
    pointInPolygon,
    samePatternColor,
    snapLineEnd,
    totalBeadCount,
  });
})(window);
