(function initializeEditorClipboard(global) {
  "use strict";

  const EMPTY_CODE = "__EMPTY__";

  function createSelectionClipboard(pattern, selection, options = {}) {
    const stride = Math.max(1, Number(options.stride) || 1);
    if (!Array.isArray(pattern) || !selection?.size) return null;

    const points = [...selection]
      .filter((index) => Number.isInteger(index) && index >= 0 && index < pattern.length)
      .map((index) => ({
        index,
        x: index % stride,
        y: Math.floor(index / stride),
      }));
    if (!points.length) return null;

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));

    return {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      sourceX: minX,
      sourceY: minY,
      pasteCount: 0,
      cells: points.map((point) => {
        const color = pattern[point.index];
        return {
          dx: point.x - minX,
          dy: point.y - minY,
          code: color?.empty ? EMPTY_CODE : color?.code || EMPTY_CODE,
        };
      }),
    };
  }

  function planSelectionPaste(clipboard, options = {}) {
    if (!clipboard?.cells?.length) return null;
    const stride = Math.max(1, Number(options.stride) || 1);
    const width = Math.max(1, Number(options.width) || stride);
    const height = Math.max(1, Number(options.height) || width);
    const hoverX = options.hoverCell?.x;
    const hoverY = options.hoverCell?.y;
    const anchorX = Math.round(Number.isFinite(hoverX) ? hoverX : clipboard.sourceX);
    const anchorY = Math.round(Number.isFinite(hoverY) ? hoverY : clipboard.sourceY);
    const canPaste = typeof options.canPaste === "function" ? options.canPaste : () => true;

    const positionedCells = clipboard.cells.map((cell) => {
      const x = anchorX + cell.dx;
      const y = anchorY + cell.dy;
      return { ...cell, x, y, index: y * stride + x };
    });
    const visibleCells = positionedCells.filter((cell) => cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height);
    const changes = visibleCells.filter((cell) => canPaste(cell.index));

    return {
      anchorX,
      anchorY,
      changes,
      clippedCount: positionedCells.length - visibleCells.length,
      blockedCount: visibleCells.length - changes.length,
    };
  }

  function mirrorSelectionClipboard(clipboard, direction) {
    if (!clipboard?.cells?.length || !["horizontal", "vertical"].includes(direction)) return null;
    return {
      ...clipboard,
      pasteCount: 0,
      cells: clipboard.cells.map((cell) => ({
        ...cell,
        dx: direction === "horizontal" ? clipboard.width - 1 - cell.dx : cell.dx,
        dy: direction === "vertical" ? clipboard.height - 1 - cell.dy : cell.dy,
      })),
    };
  }

  function planSelectionMirror(pattern, selection, options = {}) {
    const stride = Math.max(1, Number(options.stride) || 1);
    const clipboard = createSelectionClipboard(pattern, selection, { stride });
    const mirrored = mirrorSelectionClipboard(clipboard, options.direction);
    if (!clipboard || !mirrored) return null;

    const changesByIndex = new Map();
    for (const cell of clipboard.cells) {
      const index = (clipboard.sourceY + cell.dy) * stride + clipboard.sourceX + cell.dx;
      changesByIndex.set(index, { index, code: EMPTY_CODE });
    }

    const targetIndexes = [];
    for (const cell of mirrored.cells) {
      const x = clipboard.sourceX + cell.dx;
      const y = clipboard.sourceY + cell.dy;
      const index = y * stride + x;
      changesByIndex.set(index, { index, code: cell.code });
      targetIndexes.push(index);
    }

    return {
      changes: [...changesByIndex.values()],
      selection: targetIndexes,
    };
  }

  function planSelectionMove(pattern, selection, options = {}) {
    const stride = Math.max(1, Number(options.stride) || 1);
    const width = Math.max(1, Number(options.width) || stride);
    const height = Math.max(1, Number(options.height) || width);
    const dx = Math.sign(Number(options.dx) || 0);
    const dy = Math.sign(Number(options.dy) || 0);
    if (Math.abs(dx) + Math.abs(dy) !== 1) return null;

    const clipboard = createSelectionClipboard(pattern, selection, { stride });
    if (!clipboard) return null;
    const targetCells = clipboard.cells.map((cell) => ({
      ...cell,
      x: clipboard.sourceX + cell.dx + dx,
      y: clipboard.sourceY + cell.dy + dy,
    }));
    if (targetCells.some((cell) => cell.x < 0 || cell.x >= width || cell.y < 0 || cell.y >= height)) {
      return { blocked: "boundary", changes: [], selection: [...selection] };
    }

    const changesByIndex = new Map();
    for (const cell of clipboard.cells) {
      const index = (clipboard.sourceY + cell.dy) * stride + clipboard.sourceX + cell.dx;
      changesByIndex.set(index, { index, code: EMPTY_CODE });
    }

    const targetIndexes = [];
    for (const cell of targetCells) {
      const index = cell.y * stride + cell.x;
      changesByIndex.set(index, { index, code: cell.code });
      targetIndexes.push(index);
    }

    return {
      blocked: null,
      changes: [...changesByIndex.values()],
      selection: targetIndexes,
    };
  }

  function planSelectionRotate(pattern, selection, options = {}) {
    const stride = Math.max(1, Number(options.stride) || 1);
    const width = Math.max(1, Number(options.width) || stride);
    const height = Math.max(1, Number(options.height) || width);
    const direction = options.direction;
    if (!["clockwise", "counterclockwise"].includes(direction)) return null;

    const clipboard = createSelectionClipboard(pattern, selection, { stride });
    if (!clipboard) return null;
    const rotatedCells = clipboard.cells.map((cell) => ({
      ...cell,
      dx: direction === "clockwise" ? clipboard.height - 1 - cell.dy : cell.dy,
      dy: direction === "clockwise" ? cell.dx : clipboard.width - 1 - cell.dx,
    }));
    const rotatedWidth = clipboard.height;
    const rotatedHeight = clipboard.width;
    if (clipboard.sourceX + rotatedWidth > width || clipboard.sourceY + rotatedHeight > height) {
      return { blocked: "boundary", changes: [], selection: [...selection] };
    }

    const changesByIndex = new Map();
    for (const cell of clipboard.cells) {
      const index = (clipboard.sourceY + cell.dy) * stride + clipboard.sourceX + cell.dx;
      changesByIndex.set(index, { index, code: EMPTY_CODE });
    }

    const targetIndexes = [];
    for (const cell of rotatedCells) {
      const x = clipboard.sourceX + cell.dx;
      const y = clipboard.sourceY + cell.dy;
      const index = y * stride + x;
      changesByIndex.set(index, { index, code: cell.code });
      targetIndexes.push(index);
    }

    return {
      blocked: null,
      changes: [...changesByIndex.values()],
      selection: targetIndexes,
    };
  }

  global.XiaomaiEditorClipboard = Object.freeze({
    EMPTY_CODE,
    createSelectionClipboard,
    planSelectionMirror,
    planSelectionMove,
    planSelectionPaste,
    planSelectionRotate,
  });
})(window);
