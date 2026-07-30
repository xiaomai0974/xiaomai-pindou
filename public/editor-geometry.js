(function initializeEditorGeometry(global) {
  "use strict";

  function isGridCell(x, y, width, height) {
    return x >= 0 && y >= 0 && x < width && y < height;
  }

  function brushCellsForPoint(point, options = {}) {
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || width);
    const size = Math.max(1, Number(options.brushSize) || 1);
    const radius = Math.floor(size / 2);
    const cells = [];
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = point.x + dx;
        const y = point.y + dy;
        if (!isGridCell(x, y, width, height)) continue;
        if (options.brushShape === "circle" && Math.sqrt(dx * dx + dy * dy) > radius + 0.25) continue;
        cells.push({ x, y });
      }
    }
    if (!cells.length) cells.push(point);
    return cells;
  }

  function symmetryPointsFor(point, options = {}) {
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || width);
    const points = new Map();
    const add = (x, y) => {
      if (!isGridCell(x, y, width, height)) return;
      points.set(`${x}:${y}`, { x, y });
    };
    const mirrorX = width - 1 - point.x;
    const mirrorY = height - 1 - point.y;
    add(point.x, point.y);
    if (options.symmetryMode === "horizontal" || options.symmetryMode === "both") add(mirrorX, point.y);
    if (options.symmetryMode === "vertical" || options.symmetryMode === "both") add(point.x, mirrorY);
    if (options.symmetryMode === "both") add(mirrorX, mirrorY);
    return [...points.values()];
  }

  function mirroredIndex(index, direction, options = {}) {
    const stride = Math.max(1, Number(options.stride) || Number(options.width) || 1);
    const width = Math.max(1, Number(options.width) || stride);
    const height = Math.max(1, Number(options.height) || width);
    const x = index % stride;
    const y = Math.floor(index / stride);
    const targetX = direction === "horizontal" ? width - 1 - x : x;
    const targetY = direction === "vertical" ? height - 1 - y : y;
    return targetY * stride + targetX;
  }

  function buildSelectionFromDrag(start, end, tool, stride) {
    if (!start || !end) return new Set();
    const selected = new Set();
    let minX = Math.min(start.x, end.x);
    let maxX = Math.max(start.x, end.x);
    let minY = Math.min(start.y, end.y);
    let maxY = Math.max(start.y, end.y);

    if (tool === "hline") {
      minY = start.y;
      maxY = start.y;
    }

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        selected.add(y * stride + x);
      }
    }

    return selected;
  }

  global.XiaomaiEditorGeometry = Object.freeze({
    brushCellsForPoint,
    buildSelectionFromDrag,
    mirroredIndex,
    symmetryPointsFor,
  });
})(window);
