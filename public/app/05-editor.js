/* 小麦拼豆 — 05-editor.js
 * 格子编辑、选区、渲染与历史
 */
function displayPattern() {
  if (state.isPreviewDirty && state.previewPattern.length) return state.previewPattern;
  return state.pattern;
}

function displayCounts() {
  if (state.isPreviewDirty && state.previewPattern.length) return state.previewCounts;
  return state.counts;
}

function displayQualityMetrics() {
  return state.isPreviewDirty && state.previewPattern.length ? state.previewQualityMetrics : state.qualityMetrics;
}

function totalBeadCount(pattern = state.pattern) {
  return countPatternBeads(pattern);
}

function calculateUsedBounds(pattern = state.pattern, size = state.gridSize) {
  return calculateGridUsedBounds(pattern, size);
}

function renderPattern(options = {}) {
  if (state.renderFrameId !== null) {
    window.cancelAnimationFrame(state.renderFrameId);
    state.renderFrameId = null;
    pendingPatternRenderBounds = null;
    pendingFullPatternRender = false;
  }
  const dirtyBounds = options.dirtyBounds || null;
  return measurePerformance(dirtyBounds ? "render.canvas.partial" : "render.canvas", () => renderPatternNow(dirtyBounds));
}

function currentExportSnapshot() {
  const source = state.isPreviewDirty && state.previewPattern.length ? state.previewPattern : state.pattern;
  const pattern = [...source];
  const counts = buildCounts(pattern);
  return {
    pattern,
    counts,
    rows: [...counts.values()].sort((a, b) => b.count - a.count),
  };
}

function renderPatternNow(requestedDirtyBounds = null) {
  const canvasResized = configureCanvasForView();
  const pattern = displayPattern();
  const canvasWidth = elements.patternCanvas.width;
  const canvasHeight = elements.patternCanvas.height;
  const dirtyBounds = !canvasResized && state.editorView === "grid" && pattern.length ? normalizeCellBounds(requestedDirtyBounds) : null;

  if (dirtyBounds) {
    const dirtyRect = canvasRectForCellBounds(dirtyBounds);
    ctx.save();
    ctx.beginPath();
    ctx.rect(dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);
    ctx.clip();
  }

  try {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (state.editorView === "sheet") {
      drawSheetBase();
    } else {
      drawEditorBase();
    }

    if (!pattern.length) {
      drawPlotBackground();
      drawGridLines();
      drawEmptyMessage();
      return;
    }

    drawPlotBackground();
    drawPatternCells(dirtyBounds);
    if (state.showGrid && state.viewMode !== "clean") {
      drawGridLines(dirtyBounds);
    }
    drawPatternCellCodes(dirtyBounds);
    if (shouldDrawTraceReference("aboveGrid")) {
      drawReferenceLayer();
    }
    drawSelectionOverlay(dirtyBounds);
    drawBrushPreview();
    drawSelectedCell();
    if (state.editorView === "sheet") {
      drawLegendOnCanvas();
    }
  } finally {
    if (dirtyBounds) ctx.restore();
  }
}

function requestPatternRender(dirtyCells = null) {
  if (dirtyCells === null) {
    pendingFullPatternRender = true;
    pendingPatternRenderBounds = null;
  } else if (!pendingFullPatternRender) {
    pendingPatternRenderBounds = mergeCellBounds(pendingPatternRenderBounds, boundsForCells(dirtyCells));
  }
  if (state.renderFrameId !== null) return;
  state.renderFrameId = window.requestAnimationFrame(() => {
    state.renderFrameId = null;
    const fullRender = pendingFullPatternRender;
    const dirtyBounds = pendingPatternRenderBounds;
    pendingFullPatternRender = false;
    pendingPatternRenderBounds = null;
    if (fullRender || !dirtyBounds) renderPattern();
    else renderPattern({ dirtyBounds });
  });
}

function configureCanvasForView() {
  const view = state.editorView === "sheet" ? sheet : gridEditor;
  let resized = false;
  if (elements.patternCanvas.width !== view.width) {
    elements.patternCanvas.width = view.width;
    resized = true;
  }
  if (elements.patternCanvas.height !== view.height) {
    elements.patternCanvas.height = view.height;
    resized = true;
  }
  elements.patternCanvas.style.aspectRatio = `${view.width} / ${view.height}`;
  setZoom(state.zoom, false);
  return resized;
}

function normalizeCellBounds(bounds) {
  if (!bounds) return null;
  const minX = clampRange(Math.floor(bounds.minX) - 1, 0, activeGridWidth() - 1);
  const minY = clampRange(Math.floor(bounds.minY) - 1, 0, activeGridHeight() - 1);
  const maxX = clampRange(Math.ceil(bounds.maxX) + 1, 0, activeGridWidth() - 1);
  const maxY = clampRange(Math.ceil(bounds.maxY) + 1, 0, activeGridHeight() - 1);
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

function canvasRectForCellBounds(bounds) {
  const plot = activePlotMetrics();
  const left = plot.gridX + bounds.minX * plot.cell;
  const top = plot.gridY + bounds.minY * plot.cell;
  const right = plot.gridX + (bounds.maxX + 1) * plot.cell;
  const bottom = plot.gridY + (bounds.maxY + 1) * plot.cell;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function drawWatermarkBackground(view) {
  const config =
    view === "sheet"
      ? { tileWidth: 170, tileHeight: 92, x: 18, y: 28, font: "700 22px Microsoft YaHei, sans-serif", alpha: 0.18 }
      : { tileWidth: 230, tileHeight: 132, x: 28, y: 44, font: "700 32px Microsoft YaHei, sans-serif", alpha: 0.16 };
  let tile = watermarkTileCache.get(view);
  if (!tile) {
    tile = document.createElement("canvas");
    tile.width = config.tileWidth;
    tile.height = config.tileHeight;
    const tileContext = tile.getContext("2d");
    tileContext.globalAlpha = config.alpha;
    tileContext.fillStyle = "#d8d8d8";
    tileContext.font = config.font;
    tileContext.fillText("拼豆", config.x, config.y);
    watermarkTileCache.set(view, tile);
  }

  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, elements.patternCanvas.width, elements.patternCanvas.height);
  ctx.restore();
}

function drawSheetBase() {
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  drawWatermarkBackground("sheet");

  ctx.fillStyle = "#111";
  ctx.font = "900 38px Microsoft YaHei, sans-serif";
  ctx.fillText("小麦拼豆", 58, sheet.titleY);
  ctx.font = "500 32px Arial, Microsoft YaHei, sans-serif";
  ctx.textAlign = "right";
  const pattern = displayPattern();
  const total = pattern.length ? totalBeadCount(pattern) : 0;
  const name = state.fileName || "Mard-120";
  ctx.fillText(`${name}   ${total}颗豆子`, sheet.width - 58, sheet.titleY);
  ctx.textAlign = "left";
}

function drawEditorBase() {
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, gridEditor.width, gridEditor.height);
  drawWatermarkBackground("grid");

  ctx.fillStyle = "#111";
  ctx.font = "900 42px Microsoft YaHei, sans-serif";
  ctx.fillText("格子编辑区", 120, 70);
  ctx.font = "500 34px Arial, Microsoft YaHei, sans-serif";
  ctx.textAlign = "right";
  const pattern = displayPattern();
  const total = pattern.length ? totalBeadCount(pattern) : 0;
  const colorCount = pattern === state.pattern ? state.counts.size : buildCounts(pattern).size;
  ctx.fillText(`${state.isPreviewDirty ? "预览 / " : ""}${gridDimensionsLabel()} / ${total}颗 / ${colorCount}色`, gridEditor.width - 120, 70);
  ctx.textAlign = "left";
}

function currentPlotMetrics() {
  return state.editorView === "sheet" ? sheet : gridEditor;
}

function activePlotMetrics() {
  const plot = currentPlotMetrics();
  const widthCells = activeGridWidth();
  const heightCells = activeGridHeight();
  const signature = `${state.editorView}:${widthCells}x${heightCells}`;
  if (plotMetricsCache.signature === signature && plotMetricsCache.value) {
    return plotMetricsCache.value;
  }
  const cell = Math.min(plot.plotSize / widthCells, plot.plotSize / heightCells);
  const width = cell * widthCells;
  const height = cell * heightCells;
  const metrics = {
    ...plot,
    gridX: plot.plotX + (plot.plotSize - width) / 2,
    gridY: plot.plotY + (plot.plotSize - height) / 2,
    gridWidth: width,
    gridHeight: height,
    widthCells,
    heightCells,
    cell,
  };
  plotMetricsCache.signature = signature;
  plotMetricsCache.value = metrics;
  return metrics;
}

function drawPlotBackground() {
  const plot = activePlotMetrics();
  ctx.fillStyle = "#fdfdfd";
  ctx.fillRect(plot.gridX, plot.gridY, plot.gridWidth, plot.gridHeight);
  if (state.showCoordinates && state.viewMode !== "clean") {
    drawCoordinateLabels();
  }
}

function drawEmptyMessage() {
  const plot = activePlotMetrics();
  ctx.fillStyle = "#6d6d6d";
  ctx.font = "700 28px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("先设画布尺寸，再上传图片", plot.gridX + plot.gridWidth / 2, plot.gridY + plot.gridHeight / 2);
  ctx.textAlign = "left";
}

function drawPatternCells(dirtyBounds = null) {
  const plot = activePlotMetrics();
  canvasRenderer.drawPatternCells(ctx, {
    pattern: displayPattern(),
    stride: state.gridSize,
    plot,
    bounds: dirtyBounds || undefined,
    viewMode: state.viewMode,
    detail: canvasRenderDetail(plot.cell),
  });
}

function drawPatternCellCodes(dirtyBounds = null) {
  const plot = activePlotMetrics();
  const cell = plot.cell;
  if (state.viewMode !== "pixel" || !state.showCellCodes || !cellCodesFitCurrentZoom(cell)) return;
  canvasRenderer.drawPatternCellCodes(ctx, {
    pattern: displayPattern(),
    stride: state.gridSize,
    plot,
    bounds: dirtyBounds || undefined,
    editorView: state.editorView,
    contrastColor,
  });
}

function cellCodesFitCurrentZoom(internalCellSize) {
  return canvasRenderDetail(internalCellSize) === "full";
}

function cssCellSizeAtCurrentZoom(internalCellSize) {
  const rect = elements.patternCanvas.getBoundingClientRect();
  const fallbackWidth = baseCanvasCssSize().width * state.zoom;
  const cssCanvasWidth = rect.width || fallbackWidth;
  if (!cssCanvasWidth || !elements.patternCanvas.width) return internalCellSize;
  return internalCellSize * (cssCanvasWidth / elements.patternCanvas.width);
}

function canvasRenderDetail(internalCellSize) {
  const cssCellSize = cssCellSizeAtCurrentZoom(internalCellSize);
  if (cssCellSize < 3.5) return "coarse";
  if (cssCellSize < 8) return "grid";
  return "full";
}

function drawReferenceLayer() {
  const geometry = traceReferenceGeometry();
  if (!geometry) return;
  canvasRenderer.drawReferenceLayer(ctx, {
    image: state.referenceImage,
    geometry,
    opacity: state.traceReference.opacity,
    adjustMode: state.traceReference.adjustMode,
    locked: state.traceReference.locked,
    lockedLabel: "参考图已锁定",
    movableLabel: "拖动参考图，滚轮缩放",
  });
}

function shouldDrawTraceReference(layer) {
  if (!REFERENCE_FEATURE_ENABLED) return false;
  const trace = state.traceReference;
  return Boolean(
    state.editorView === "grid" &&
      state.referenceImage &&
      trace.enabled &&
      trace.visible &&
      trace.opacity > 0 &&
      layer === "aboveGrid",
  );
}

function traceBaseSizeCells() {
  if (!state.referenceImage) return { width: activeGridWidth(), height: activeGridHeight() };
  const imageRatio = state.referenceImage.width / Math.max(1, state.referenceImage.height);
  const canvasRatio = activeGridWidth() / activeGridHeight();
  if (imageRatio >= canvasRatio) return { width: activeGridWidth(), height: activeGridWidth() / imageRatio };
  return { width: activeGridHeight() * imageRatio, height: activeGridHeight() };
}

function traceReferenceSizeCells() {
  const base = traceBaseSizeCells();
  const scale = clampRange(Number(state.traceReference.scale) || 1, 0.08, 8);
  return { width: base.width * scale, height: base.height * scale };
}

function ensureTraceReferencePosition() {
  if (!state.referenceImage) return;
  const trace = state.traceReference;
  const size = traceReferenceSizeCells();
  if (!Number.isFinite(trace.x)) trace.x = (activeGridWidth() - size.width) / 2;
  if (!Number.isFinite(trace.y)) trace.y = (activeGridHeight() - size.height) / 2;
}

function traceReferenceGeometry() {
  if (!state.referenceImage || !state.traceReference.enabled || !state.traceReference.visible) return null;
  ensureTraceReferencePosition();
  const plot = activePlotMetrics();
  const cell = plot.cell;
  const size = traceReferenceSizeCells();
  return {
    left: plot.gridX + state.traceReference.x * cell,
    top: plot.gridY + state.traceReference.y * cell,
    width: size.width * cell,
    height: size.height * cell,
    xCells: state.traceReference.x,
    yCells: state.traceReference.y,
    widthCells: size.width,
    heightCells: size.height,
  };
}

function fitTraceReferenceToCanvas() {
  if (!REFERENCE_FEATURE_ENABLED) return;
  if (!state.referenceImage) {
    elements.cellInfo.textContent = "请先上传参考图。";
    return;
  }
  state.traceReference.scale = 1;
  state.traceReference.enabled = true;
  state.traceReference.visible = true;
  centerTraceReference(false);
  syncTraceReferenceControls();
  elements.cellInfo.textContent = "画布参考图已适配当前格子区域。";
}

function centerTraceReference(sync = true) {
  if (!state.referenceImage) {
    elements.cellInfo.textContent = "请先上传参考图。";
    return;
  }
  const size = traceReferenceSizeCells();
  state.traceReference.x = (activeGridWidth() - size.width) / 2;
  state.traceReference.y = (activeGridHeight() - size.height) / 2;
  if (state.traceReference.snapToGrid) {
    state.traceReference.x = Math.round(state.traceReference.x);
    state.traceReference.y = Math.round(state.traceReference.y);
  }
  if (sync) {
    syncTraceReferenceControls();
    elements.cellInfo.textContent = "画布参考图已居中。";
  }
}

function setTraceReferenceScale(value, anchorCell = null) {
  if (!state.referenceImage) return;
  const trace = state.traceReference;
  const oldScale = trace.scale;
  ensureTraceReferencePosition();
  const oldSize = traceReferenceSizeCellsForScale(oldScale);
  const anchor = anchorCell || {
    x: (trace.x || 0) + oldSize.width / 2,
    y: (trace.y || 0) + oldSize.height / 2,
  };
  trace.scale = clampRange(value, 0.08, 8);
  const nextSize = traceReferenceSizeCells();
  const rx = (anchor.x - trace.x) / Math.max(0.001, oldSize.width);
  const ry = (anchor.y - trace.y) / Math.max(0.001, oldSize.height);
  trace.x = anchor.x - rx * nextSize.width;
  trace.y = anchor.y - ry * nextSize.height;
  if (trace.snapToGrid) {
    trace.x = Math.round(trace.x);
    trace.y = Math.round(trace.y);
  }
  syncTraceReferenceControls();
  requestPatternRender();
  markProjectDirty();
}

function traceReferenceSizeCellsForScale(scale) {
  const base = traceBaseSizeCells();
  return { width: base.width * scale, height: base.height * scale };
}

function drawGridLines(dirtyBounds = null) {
  const plot = activePlotMetrics();
  const detail = canvasRenderDetail(plot.cell);
  const guide = state.patternMode === "pixelPattern" ? state.guideEvery : 10;
  canvasRenderer.drawGridLines(ctx, {
    plot,
    bounds: dirtyBounds || undefined,
    detail,
    guide,
    pathCache: gridLinePathCache,
    pathCacheKey: state.editorView,
    Path2DClass: window.Path2D,
    partial: Boolean(dirtyBounds),
  });
}

function drawCoordinateLabels() {
  if (!state.showCoordinates) return;
  const plot = activePlotMetrics();
  canvasRenderer.drawCoordinateLabels(ctx, {
    plot,
    detail: canvasRenderDetail(plot.cell),
    editorView: state.editorView,
  });
}

function drawSelectedCell() {
  canvasRenderer.drawSelectedCell(ctx, {
    selectedCell: state.selectedCell,
    plot: activePlotMetrics(),
  });
}

function drawSelectionOverlay(dirtyBounds = null) {
  canvasRenderer.drawSelectionOverlay(ctx, {
    selection: state.selection,
    protectedCells: document.body.dataset.workbenchMode === "edit" && state.editorView === "grid"
      ? state.protectedCells
      : new Set(),
    penPoints: state.penPoints,
    stride: state.gridSize,
    plot: activePlotMetrics(),
    bounds: dirtyBounds,
    isActiveCell: isActiveGridCell,
  });
}

function drawBrushPreview() {
  if (!state.brushHoverCell || !state.pattern.length || state.editorView !== "grid") return;
  if (!["brush", "eraser", "line", "protect"].includes(state.activeTool)) return;
  const plot = activePlotMetrics();
  const cellSize = plot.cell;
  ctx.save();
  ctx.fillStyle = state.activeTool === "eraser"
    ? "rgba(255,255,255,0.35)"
    : state.activeTool === "protect"
      ? "rgba(8,145,178,0.20)"
      : "rgba(232, 59, 100, 0.20)";
  ctx.strokeStyle = state.activeTool === "eraser" ? "#111111" : state.activeTool === "protect" ? "#0891b2" : "#e83b64";
  ctx.lineWidth = Math.max(1, cellSize * 0.08);

  for (const brushCell of brushPreviewCellsForCell(state.brushHoverCell)) {
    const x = plot.gridX + brushCell.x * cellSize;
    const y = plot.gridY + brushCell.y * cellSize;
    ctx.fillRect(x + 1, y + 1, Math.max(1, cellSize - 2), Math.max(1, cellSize - 2));
    ctx.strokeRect(x + 1, y + 1, Math.max(1, cellSize - 2), Math.max(1, cellSize - 2));
  }
  ctx.restore();
}

function brushPreviewCellsForCell(hoverCell) {
  if (!hoverCell) return [];
  const previewPoints = state.activeTool === "line" && state.lineStartCell ? interpolateCells(state.lineStartCell, hoverCell) : [hoverCell];
  const seen = new Set();
  const cells = [];
  for (const point of previewPoints) {
    for (const brushCell of brushCellsForPoint(point, activeEditorGeometryOptions())) {
      const key = `${brushCell.x},${brushCell.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(brushCell);
    }
  }
  return cells;
}

function drawLegendOnCanvas() {
  const sorted = sortedCounts();
  const top = sorted.slice(0, 9);
  const startX = 38;
  const y = sheet.legendY;
  const gap = 112;

  ctx.fillStyle = "#111";
  ctx.font = "900 22px Microsoft YaHei, sans-serif";
  ctx.fillText("色卡", startX, y - 24);

  top.forEach((item, index) => {
    const x = startX + index * gap;
    ctx.fillStyle = item.hex;
    ctx.fillRect(x, y, 48, 48);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, 48, 48);
    ctx.fillStyle = contrastColor(item.rgb);
    ctx.font = "900 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.code, x + 24, y + 24);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#111";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText(`x${item.count}`, x, y + 76);
  });
}

function sortedCounts() {
  return [...displayCounts().values()].sort((a, b) => b.count - a.count);
}

function paletteRowRank(item) {
  if (item.isActive) return 0;
  if (item.isLocked) return 1;
  if (item.isUsed) return 2;
  if (item.isAllowed) return 3;
  if (item.isSearchResult) return 4;
  return 5;
}

function currentPaletteRows() {
  const counts = displayCounts();
  const source = visiblePaletteSourceColors();
  const allowedCodes = new Set(effectiveAllowedPalette().map((item) => item.code));
  const searchCodes = new Set(searchMatchedPaletteColors().map((item) => item.code));
  return source.map((color) => {
    const counted = counts.get(color.code);
    return {
      ...color,
      count: counted?.count || 0,
      isUsed: Boolean(counted?.count),
      isAllowed: allowedCodes.has(color.code) || state.allowedColorCodes.has(color.code),
      isLocked: state.lockedColorCodes.has(color.code),
      isActive: state.selectedColor?.code === color.code,
      isSearchResult: searchCodes.has(color.code),
    };
  }).sort((a, b) => {
    return (
      paletteRowRank(a) - paletteRowRank(b) ||
      b.count - a.count ||
      (paletteIndexByCode.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
        (paletteIndexByCode.get(b.code) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function renderStats() {
  const startedAt = performanceNow();
  const sorted = currentPaletteRows();
  const total = sorted.reduce((sum, item) => sum + item.count, 0);
  const listRows = sorted.filter((item) => item.count > 0 || item.isLocked || item.isActive || (state.paletteSearch && item.isSearchResult));
  const pattern = displayPattern();
  const usedBounds = pattern.length ? calculateUsedBounds(pattern, state.gridSize) : null;
  const signature = [
    state.isPreviewDirty ? "preview" : "pattern",
    state.patternMode,
    state.colorMode,
    state.paletteSearch,
    state.recentColorCodes.join(","),
    `${activeGridWidth()}x${activeGridHeight()}`,
    pattern.length,
    state.projectPalette.length,
    usedBounds ? `${usedBounds.width}x${usedBounds.height}` : "empty",
    sorted
      .map((item) => `${item.code}:${item.count}:${Number(item.isActive)}:${Number(item.isLocked)}:${Number(item.isAllowed)}:${Number(item.isSearchResult)}`)
      .join(","),
  ].join("|");

  if (renderCache.statsSignature === signature) {
    recordPerformance("render.stats", performanceNow() - startedAt, true);
    return;
  }

  try {
    renderStatsNow(sorted, total, listRows, pattern, usedBounds);
    renderToolColorPalette();
    renderCache.statsSignature = signature;
  } finally {
    recordPerformance("render.stats", performanceNow() - startedAt);
  }
}

function patchPaletteRowsInPlace(listRows, total) {
  const existingRows = [...elements.paletteList.children].filter((child) => child.classList.contains("palette-row"));
  if (
    existingRows.length !== listRows.length ||
    existingRows.some((row, index) => row.dataset.code !== listRows[index].code)
  ) {
    return false;
  }

  for (let index = 0; index < listRows.length; index += 1) {
    const item = listRows[index];
    const row = existingRows[index];
    const rank = row.querySelector(".palette-rank");
    const swatch = row.querySelector(".swatch");
    const code = row.querySelector(".palette-code");
    const name = row.querySelector(".palette-name");
    const count = row.querySelector(".palette-count");
    const ratio = row.querySelector(".palette-ratio");
    const replace = row.querySelector(".palette-replace-button");
    if (!rank || !swatch || !code || !name || !count || !ratio || !replace) return false;

    row.classList.toggle("is-selected", item.isActive);
    row.classList.toggle("is-locked", item.isLocked);
    row.classList.toggle("is-allowed", item.isAllowed);
    rank.textContent = String(index + 1);
    swatch.style.background = item.hex;
    swatch.textContent = item.code;
    code.dataset.editCode = item.code;
    code.title = `双击替换整张图纸中的 ${item.code}`;
    code.textContent = `${item.code}${item.isLocked ? " · 锁" : ""}`;
    name.textContent = item.name;
    count.textContent = item.count.toLocaleString("zh-CN");
    ratio.textContent = `${total ? ((item.count / total) * 100).toFixed(2) : "0.00"}%`;
    replace.dataset.replaceCode = item.code;
    replace.title = `替换 ${item.code}`;
  }
  return true;
}

function renderStatsNow(sorted, total, listRows, pattern, usedBounds) {
  const usedColorCount = listRows.filter((item) => item.count > 0).length;
  elements.totalBeads.textContent = `${state.isPreviewDirty ? "预览 " : ""}共 ${usedColorCount} 色 / ${total.toLocaleString("zh-CN")} 颗`;
  state.usedBounds = usedBounds;

  if (!pattern.length && !state.projectPalette.length) {
    elements.paletteList.innerHTML = '<div class="empty-list">生成后会显示每种颜色需要多少颗</div>';
    elements.legendStrip.hidden = true;
    elements.legendStrip.replaceChildren();
    renderPaletteChoices(sorted);
    return;
  }

  if (!patchPaletteRowsInPlace(listRows, total)) {
    elements.paletteList.innerHTML = `
      <div class="palette-table-head" aria-hidden="true">
        <span>序号</span>
        <span>色号</span>
        <span>颗数</span>
        <span>占比</span>
        <span></span>
      </div>
    ` + listRows
      .map(
        (item, index) => `
          <div class="palette-row${item.isActive ? " is-selected" : ""}${item.isLocked ? " is-locked" : ""}${item.isAllowed ? " is-allowed" : ""}" data-code="${item.code}" role="button" tabindex="0" draggable="true" title="单击设为画笔色，Ctrl+单击加入固定色板并激活，双击色号可全局替换">
            <span class="palette-rank">${index + 1}</span>
            <span class="palette-identity">
              <span class="swatch" style="background:${item.hex}">${item.code}</span>
              <span>
                <span class="palette-code" data-edit-code="${item.code}" title="双击替换整张图纸中的 ${item.code}">${item.code}${item.isLocked ? " · 锁" : ""}</span>
                <span class="palette-name">${item.name}</span>
              </span>
            </span>
            <span class="palette-count">${item.count.toLocaleString("zh-CN")}</span>
            <span class="palette-ratio">${total ? ((item.count / total) * 100).toFixed(2) : "0.00"}%</span>
            <button class="palette-replace-button" data-replace-code="${item.code}" type="button" title="替换 ${item.code}">换</button>
          </div>
        `,
      )
      .join("");
  }

  const boundsLabel = state.usedBounds ? `<span class="bounds-chip">所需最小行列 ${state.usedBounds.width} x ${state.usedBounds.height}</span>` : "";
  elements.legendStrip.hidden = false;
  elements.legendStrip.innerHTML =
    boundsLabel +
    sorted
    .slice(0, state.patternMode === "pixelPattern" || state.colorMode === "fixedPalette" || state.paletteSearch ? sorted.length : 12)
    .map(
      (item) => `
        <button class="legend-chip${item.isActive ? " is-selected" : ""}${item.isLocked ? " is-locked" : ""}" data-code="${item.code}" type="button" draggable="true" title="单击设为画笔色，Ctrl+单击加入固定色板并激活">
          <span class="legend-swatch" style="background:${item.hex}">${item.code}</span>
          <span>x${item.count}</span>
        </button>
      `,
    )
    .join("");

}

function ensureUsableAllowedPalette() {
  if (effectiveAllowedPalette().length) return;
  const fallback = fallbackPaletteColor();
  state.allowedColorCodes.add(fallback.code);
}

function applyConstraintChange() {
  renderConstraintPalette();
  updateSelectedColorUi();
  const hasPendingBase = state.isPreviewDirty && state.previewPattern.length;
  const base = hasPendingBase ? state.previewPattern : state.pattern;
  if (base.length) {
    setPendingPreview(validateColorConstraints(base), {
      backgroundMask: hasPendingBase ? state.previewBackgroundMask : state.backgroundMask,
      preservesManualEdits: hasPendingBase ? state.previewPreservesManualEdits : true,
      size: state.gridSize,
      signature: currentConversionPreviewSignature(),
    });
    renderPendingPreview();
    showQualityHint("颜色约束预览已更新，请确认应用。");
  } else if (state.image) {
    requestPreviewUpdate("颜色约束预览已更新，请确认应用。");
  }
}

function renderConstraintPalette() {
  const startedAt = performanceNow();
  if (elements.unlockAllColorsButton) {
    elements.unlockAllColorsButton.disabled = state.lockedColorCodes.size === 0;
    elements.unlockAllColorsButton.title = state.lockedColorCodes.size
      ? `取消当前 ${state.lockedColorCodes.size} 个锁定颜色`
      : "当前没有锁定颜色";
  }
  const modeLabel = state.lockedColorCodes.size
    ? `MARD 221 · 已锁 ${state.lockedColorCodes.size}`
    : "MARD 221";
  if (elements.colorModeLabel.textContent !== modeLabel) {
    elements.colorModeLabel.textContent = modeLabel;
  }

  const query = state.paletteSearch;
  const filteredPalette = palette.filter((item) => {
    const locked = state.lockedColorCodes.has(item.code);
    const used = state.counts.has(item.code) || state.previewCounts.has(item.code);
    const active = state.selectedColor?.code === item.code;
    if (state.showSelectedColorsOnly && !used && !locked && !active) return false;
    if (!query) return true;
    return paletteSearchTextByCode.get(item.code).includes(query);
  });

  const signature = [
    state.colorMode,
    query,
    Number(state.showSelectedColorsOnly),
    state.selectedColor?.code || "",
    filteredPalette
      .map(
        (item) => {
          const fixedPaletteState = state.colorMode === "fixedPalette"
            ? `:${Number(state.allowedColorCodes.has(item.code))}:${Number(state.disabledColorCodes.has(item.code))}`
            : "";
          return `${item.code}:${Number(state.lockedColorCodes.has(item.code))}${fixedPaletteState}`;
        },
      )
      .join(","),
  ].join("|");

  if (renderCache.constraintSignature === signature) {
    recordPerformance("render.palette", performanceNow() - startedAt, true);
    return;
  }

  try {
    if (!patchConstraintPaletteInPlace(filteredPalette)) {
      renderConstraintPaletteNow(filteredPalette);
    }
    renderCache.constraintSignature = signature;
  } finally {
    recordPerformance("render.palette", performanceNow() - startedAt);
  }
}

function patchConstraintPaletteInPlace(filteredPalette) {
  const buttons = [...elements.constraintPalette.querySelectorAll("[data-constraint-code]")];
  if (
    buttons.length !== filteredPalette.length ||
    buttons.some((button, index) => button.dataset.constraintCode !== filteredPalette[index].code)
  ) {
    return false;
  }

  filteredPalette.forEach((item, index) => {
    const button = buttons[index];
    const locked = state.lockedColorCodes.has(item.code);
    const allowed = state.colorMode !== "fixedPalette" || state.allowedColorCodes.has(item.code) || locked;
    const disabled = state.colorMode === "fixedPalette" && state.disabledColorCodes.has(item.code);
    const active = state.selectedColor?.code === item.code;
    const title = `${item.code} ${item.name} ${item.hex}${locked ? " / 已锁定" : ""}${active ? " / 当前画笔色" : ""}`;
    button.classList.toggle("is-off", !allowed);
    button.classList.toggle("is-locked", locked);
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-disabled", disabled);
    button.title = `${title}。单击设为画笔色；右键或双击锁定/解锁。`;
  });
  return true;
}

function renderConstraintPaletteNow(filteredPalette) {
  elements.constraintPalette.innerHTML = filteredPalette
    .map((item) => {
      const locked = state.lockedColorCodes.has(item.code);
      const allowed = state.colorMode !== "fixedPalette" || state.allowedColorCodes.has(item.code) || locked;
      const disabled = state.colorMode === "fixedPalette" && state.disabledColorCodes.has(item.code);
      const active = state.selectedColor?.code === item.code;
      const title = `${item.code} ${item.name} ${item.hex}${locked ? " / 已锁定" : ""}${active ? " / 当前画笔色" : ""}`;
      return `
        <button
          class="constraint-chip${allowed ? "" : " is-off"}${locked ? " is-locked" : ""}${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}"
          data-constraint-code="${item.code}"
          style="background:${item.hex}"
          title="${title}。单击设为画笔色；右键或双击锁定/解锁。"
          type="button"
        >${item.code}</button>
      `;
    })
    .join("") || '<div class="empty-list">没有匹配的色号</div>';

}

function renderPaletteChoices(rows = currentPaletteRows()) {
  const choices = rows.length ? rows : activePalette().map((item) => ({ ...item, count: 0 }));
  const visibleChoices = choices.filter((item) => item.count > 0 || item.isLocked || item.isActive || (state.paletteSearch && item.isSearchResult));
  elements.paletteList.innerHTML = `
    <div class="palette-table-head" aria-hidden="true">
      <span>序号</span>
      <span>色号</span>
      <span>颗数</span>
      <span>占比</span>
      <span></span>
    </div>
  ` + visibleChoices
    .map(
      (item, index) => `
        <div class="palette-row${item.isActive ? " is-selected" : ""}${item.isLocked ? " is-locked" : ""}${item.isAllowed ? " is-allowed" : ""}" data-code="${item.code}" role="button" tabindex="0" draggable="true">
          <span class="palette-rank">${index + 1}</span>
          <span class="palette-identity">
            <span class="swatch" style="background:${item.hex}">${item.code}</span>
            <span>
              <span class="palette-code" data-edit-code="${item.code}" title="双击替换整张图纸中的 ${item.code}">${item.code}${item.isLocked ? " · 锁" : ""}</span>
              <span class="palette-name">${item.name}</span>
            </span>
          </span>
          <span class="palette-count">${Number(item.count || 0).toLocaleString("zh-CN")}</span>
          <span class="palette-ratio">0.00%</span>
          <button class="palette-replace-button" data-replace-code="${item.code}" type="button" title="替换 ${item.code}">换</button>
        </div>
      `,
    )
    .join("");
}

function toolPaletteRows() {
  const query = state.toolPaletteSearch.trim().toLowerCase();
  const counts = displayCounts();
  const recentRank = new Map(state.recentColorCodes.map((code, index) => [code, index]));
  const enrich = (color) => {
    const sourceColor = paletteColorByCode(color.code) || color;
    const counted = counts.get(sourceColor.code);
    return {
      ...sourceColor,
      count: counted?.count || 0,
      isUsed: Boolean(counted?.count),
      isLocked: state.lockedColorCodes.has(sourceColor.code),
      isActive: state.selectedColor?.code === sourceColor.code,
      recentRank: recentRank.get(sourceColor.code) ?? Number.MAX_SAFE_INTEGER,
    };
  };

  const defaultSource = new Map(
    currentPaletteRows()
      .filter((item) => item.count > 0 || item.isLocked || item.isActive)
      .map((item) => [item.code, item]),
  );
  for (const code of state.recentColorCodes) {
    const color = paletteColorByCode(code);
    if (color && !defaultSource.has(code)) defaultSource.set(code, color);
  }
  const source = query || state.toolPaletteShowAll
    ? palette.filter((item) => !query || paletteSearchTextByCode.get(item.code).includes(query))
    : [...defaultSource.values()];

  const rows = source.map(enrich).sort((a, b) => {
    const rank = (item) => {
      if (item.isActive) return 0;
      if (item.isLocked) return 1;
      if (item.recentRank !== Number.MAX_SAFE_INTEGER) return 2;
      if (item.isUsed) return 3;
      return 4;
    };
    return (
      rank(a) - rank(b) ||
      a.recentRank - b.recentRank ||
      b.count - a.count ||
      (paletteIndexByCode.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
        (paletteIndexByCode.get(b.code) ?? Number.MAX_SAFE_INTEGER)
    );
  });

  return rows.slice(0, query ? 80 : state.toolPaletteShowAll ? 96 : 40);
}

function renderToolColorPalette() {
  if (!elements.toolColorPalette) return;
  const rows = toolPaletteRows();
  const signature = [
    state.toolPaletteSearch,
    Number(state.toolPaletteShowAll),
    state.selectedColor?.code || "",
    state.recentColorCodes.join(","),
    rows.map((item) => `${item.code}:${item.count}:${Number(item.isActive)}:${Number(item.isLocked)}`).join(","),
  ].join("|");

  if (renderCache.toolPaletteSignature === signature) return;

  elements.toolPaletteAllButton?.classList.toggle("is-active", state.toolPaletteShowAll);
  elements.toolPaletteAllButton?.setAttribute("aria-pressed", String(state.toolPaletteShowAll));
  elements.toolColorPalette.innerHTML = rows.length
    ? rows.map((item) => `
      <button
        class="tool-color-chip${item.isActive ? " is-active" : ""}${item.isLocked ? " is-locked" : ""}"
        data-code="${item.code}"
        type="button"
        draggable="true"
        title="${item.code} ${item.name}，单击换色，双击选中同色"
      >
        <span class="tool-color-swatch" style="background:${item.hex}">${item.code}</span>
        <span class="tool-color-meta">
          <b data-edit-code="${item.code}">${item.code}</b>
          <small>${item.count ? `x${item.count.toLocaleString("zh-CN")}` : item.name}</small>
        </span>
        <span class="tool-color-replace" data-replace-code="${item.code}" title="替换 ${item.code}">替换</span>
      </button>
    `).join("")
    : '<div class="empty-list">没有找到颜色</div>';
  renderCache.toolPaletteSignature = signature;
}

function setupPaletteEventDelegation() {
  for (const root of [elements.paletteList, elements.legendStrip, elements.toolColorPalette].filter(Boolean)) {
    root.addEventListener("dragstart", handlePaletteDragStart);
    root.addEventListener("click", handlePaletteClick);
    root.addEventListener("dblclick", handlePaletteDoubleClick);
  }
  setupMobilePaletteDoubleTap();
  elements.constraintPalette.addEventListener("click", handleConstraintPaletteClick);
  elements.constraintPalette.addEventListener("dblclick", handleConstraintPaletteDoubleClick);
  elements.constraintPalette.addEventListener("contextmenu", handleConstraintPaletteContextMenu);
}

function paletteButtonFromEvent(event) {
  const button = event.target.closest("[data-code]");
  return button && event.currentTarget.contains(button) ? button : null;
}

function handlePaletteDragStart(event) {
  const button = paletteButtonFromEvent(event);
  if (!button || !event.dataTransfer) return;
  event.dataTransfer.setData("text/plain", button.dataset.code);
  event.dataTransfer.effectAllowed = "copy";
}

function handlePaletteClick(event) {
  const replaceButton = event.target.closest("[data-replace-code]");
  if (replaceButton && event.currentTarget.contains(replaceButton)) {
    event.stopPropagation();
    promptReplaceColor(replaceButton.dataset.replaceCode);
    return;
  }
  const button = paletteButtonFromEvent(event);
  if (!button) return;
  const color = paletteColorByCode(button.dataset.code);
  if (!color) return;
  if (event.ctrlKey || event.metaKey) {
    activatePaintColor(color, { addToAllowed: true });
    elements.cellInfo.textContent = `${color.code} 已加入固定色板，并设为当前画笔色。`;
    return;
  }
  activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette", announce: false });
  if (state.activeTool === "sameColor") selectAllMatchingColor(color);
}

function handlePaletteDoubleClick(event) {
  if (event.target.closest("[data-replace-code]")) return;
  const button = paletteButtonFromEvent(event);
  if (!button) return;
  if (isMobileLayout() && event.currentTarget === elements.toolColorPalette) {
    event.preventDefault();
    openMobileColorMenu(button.dataset.code);
    return;
  }
  if (event.currentTarget === elements.toolColorPalette) {
    event.preventDefault();
    promptReplaceColor(button.dataset.code);
    return;
  }
  if (event.target.closest("[data-edit-code]")) {
    promptReplaceColor(button.dataset.code);
    return;
  }
  const color = paletteColorByCode(button.dataset.code);
  if (!color) return;
  activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette", announce: false });
  selectAllMatchingColor(color);
}

function constraintButtonFromEvent(event) {
  const button = event.target.closest("[data-constraint-code]");
  return button && elements.constraintPalette.contains(button) ? button : null;
}

function handleConstraintPaletteClick(event) {
  const button = constraintButtonFromEvent(event);
  if (!button) return;
  const code = button.dataset.constraintCode;
  const color = paletteColorByCode(code);
  if (!color) return;

  if (state.colorMode !== "fixedPalette") {
    activatePaintColor(color, { addToAllowed: false });
    return;
  }
  if (event.ctrlKey || event.metaKey) {
    activatePaintColor(color, { addToAllowed: true });
    elements.cellInfo.textContent = `${code} 已加入固定色板，并设为当前画笔色。`;
    return;
  }
  if (state.lockedColorCodes.has(code)) {
    state.allowedColorCodes.add(code);
    state.disabledColorCodes.delete(code);
    activatePaintColor(color, { addToAllowed: true, announce: false });
    elements.cellInfo.textContent = `${code} 已锁定，右键或双击可解锁。`;
    return;
  }
  if (state.allowedColorCodes.has(code) && !event.shiftKey) {
    activatePaintColor(color, { addToAllowed: true, announce: false });
    elements.cellInfo.textContent = `${code} 已设为当前画笔色。Shift+单击可从固定色板取消。`;
    return;
  }
  if (state.allowedColorCodes.has(code)) {
    state.allowedColorCodes.delete(code);
  } else {
    state.allowedColorCodes.add(code);
    state.disabledColorCodes.delete(code);
    state.selectedColor = color;
    rememberPaletteColor(color);
    updateSelectedColorUi();
  }
  ensureUsableAllowedPalette();
  applyConstraintChange();
}

function toggleConstraintPaletteLock(button, activateColor) {
  const code = button.dataset.constraintCode;
  const result = toggleLockedColorCode(code);
  if (!result) return;
  const { color, locked } = result;
  if (activateColor) activatePaintColor(color, { addToAllowed: true, announce: false });
  elements.cellInfo.textContent = locked
    ? `${code} 已锁定${activateColor ? "。" : "，不会被自动优化修改。"}`
    : `${code} 已解锁。`;
  if (state.colorMode === "fixedPalette") applyConstraintChange();
  else {
    renderConstraintPalette();
    renderStats();
    markProjectDirty();
  }
}

function unlockAllConstraintColors() {
  const unlockedCount = state.lockedColorCodes.size;
  if (!unlockedCount) return;
  state.lockedColorCodes.clear();
  renderCache.constraintSignature = null;
  renderCache.statsSignature = null;
  renderCache.toolPaletteSignature = null;
  renderConstraintPalette();
  renderStats();
  elements.cellInfo.textContent = `已取消全部 ${unlockedCount} 个锁定颜色，当前图纸颜色保持不变。`;
  markProjectDirty();
}

function handleConstraintPaletteDoubleClick(event) {
  const button = constraintButtonFromEvent(event);
  if (!button) return;
  event.preventDefault();
  toggleConstraintPaletteLock(button, true);
}

function handleConstraintPaletteContextMenu(event) {
  const button = constraintButtonFromEvent(event);
  if (!button) return;
  event.preventDefault();
  toggleConstraintPaletteLock(button, false);
}

function updateSelectedColorUi() {
  if (!effectiveAllowedPalette().some((item) => item.code === state.selectedColor.code)) {
    state.selectedColor = nearestPaletteColor(state.selectedColor, effectiveAllowedPalette());
  }
  const selectedColorLabel =
    state.selectedColor.name && state.selectedColor.name !== state.selectedColor.code
      ? `${state.selectedColor.code} ${state.selectedColor.name}`
      : state.selectedColor.code;
  elements.currentColorSwatch.style.background = state.selectedColor.hex;
  elements.currentColorName.textContent = selectedColorLabel;
  const panelSwatch = document.querySelector("#toolPanelColorSwatch");
  const panelName = document.querySelector("#toolPanelColorName");
  if (panelSwatch) panelSwatch.style.background = state.selectedColor.hex;
  if (panelName) panelName.textContent = selectedColorLabel;
  renderToolColorPalette();
}

function handleCanvasMove(event) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前显示的是转图预览；请先确认应用再进入编辑。";
    return;
  }
  if (state.gridLocked) {
    elements.cellInfo.textContent = "格子已锁定：可以缩放查看，不会误改颜色。";
    return;
  }
  const cell = getCellFromPointer(event);
  if (!cell || !state.pattern.length) {
    if (state.brushHoverCell) {
      const previousPreviewCells = brushPreviewCellsForCell(state.brushHoverCell);
      state.brushHoverCell = null;
      requestPatternRender(previousPreviewCells);
    }
    elements.cellInfo.textContent = state.editing ? "点选右侧颜色，再点图纸格子改色" : "编辑已关闭";
    return;
  }
  if (!state.brushHoverCell || state.brushHoverCell.x !== cell.x || state.brushHoverCell.y !== cell.y) {
    const previousPreviewCells = brushPreviewCellsForCell(state.brushHoverCell);
    state.brushHoverCell = cell;
    if (["brush", "eraser", "line", "protect"].includes(state.activeTool)) {
      requestPatternRender([...previousPreviewCells, ...brushPreviewCellsForCell(cell)]);
    }
  }
  const item = state.pattern[cell.y * state.gridSize + cell.x];
  elements.cellInfo.textContent = `${cell.x + 1}, ${cell.y + 1} / 当前 ${item.code}，点击改成 ${state.selectedColor.code}`;
}

function handleCanvasClick(event) {
  if (isMobileLayout() && getMobileCanvasGestureController().shouldSuppressClick()) return;
  if (state.colorDebugEnabled && event.altKey) {
    const debugCell = getCellFromPointer(event);
    if (debugCell) showColorDebugForCell(debugCell);
    return;
  }
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；请先确认应用再进入编辑。";
    return;
  }
  if (!state.editing || state.gridLocked || !state.pattern.length) return;
  if (["rect", "hline", "brush", "line", "protect"].includes(state.activeTool)) return;
  if (state.activeTool === "eraser" && !state.selection.size) return;
  const cell = getCellFromPointer(event);
  if (state.activeTool === "eyedropper" && pickColorFromTraceReference(event)) return;
  if (!cell) return;

  if (state.activeTool === "pen") {
    state.penPoints.push(cell);
    updateSelectionLabel();
    renderPattern();
    return;
  }

  if (state.activeTool === "sameColor") {
    selectAllMatchingColor(state.pattern[cell.y * state.gridSize + cell.x]);
    return;
  }

  if (state.activeTool === "eyedropper") {
    pickColorFromGrid(cell);
    return;
  }

  if (state.activeTool === "bucket") {
    floodFillFromCell(cell, state.selectedColor);
    return;
  }

  const index = cell.y * state.gridSize + cell.x;
  if (state.activeTool === "eraser") {
    eraseCurrentSelection();
  } else if (state.selection.size) {
    fillSelectionWithCurrentColor();
  } else {
    applyColorToIndices([index], state.selectedColor);
    state.selectedCell = cell;
    elements.cellInfo.textContent = `已修改 ${cell.x + 1}, ${cell.y + 1} 为 ${state.selectedColor.code}`;
  }
}

function showColorDebugForCell(cell) {
  const index = cell.y * state.gridSize + cell.x;
  const sample = state.rawSampleData[index];
  const rawColor = state.rawMappedGrid[index];
  const currentColor = (state.isPreviewDirty && state.previewPattern.length ? state.previewPattern : state.pattern)[index];
  const trace = state.colorTrace[index] || {};
  const candidates = state.rawDebugCandidates[index] || (sample ? nearestPaletteCandidates(sample, palette, 5) : []);
  if (candidates.length) state.rawDebugCandidates[index] = candidates;
  const crop = state.lastSampleCrop || { x: 0, y: 0, size: state.lastSampleSourceSize?.width || 0 };
  const sampleArea = {
    x: Math.round(crop.x + (cell.x / state.gridSize) * crop.size),
    y: Math.round(crop.y + (cell.y / state.gridSize) * crop.size),
    w: Math.max(1, Math.round(crop.size / state.gridSize)),
    h: Math.max(1, Math.round(crop.size / state.gridSize)),
  };
  const sampleLab = sample ? rgbToLab(sample) : null;
  const candidateText = candidates
    .map((item) => `${item.code} ΔE${item.deltaE.toFixed(1)}`)
    .join(" / ");
  const changed = trace.changedBy ? `，后处理：${trace.changedBy}` : "，未被后处理改动";
  elements.cellInfo.textContent =
    `诊断 ${cell.x + 1},${cell.y + 1} ｜原图区域 x${sampleArea.x} y${sampleArea.y} ${sampleArea.w}x${sampleArea.h} ｜` +
    `采样 RGB ${sample ? `${Math.round(sample.r)},${Math.round(sample.g)},${Math.round(sample.b)}` : "无"} ｜` +
    `LAB ${sampleLab ? `${sampleLab.l.toFixed(1)},${sampleLab.a.toFixed(1)},${sampleLab.b.toFixed(1)}` : "无"} ｜` +
    `直配 ${rawColor?.code || "空"} → 当前 ${currentColor?.code || "空"}${changed} ｜候选 ${candidateText}`;
  console.table(
    candidates.map((item) => ({
      code: item.code,
      name: item.name,
      hex: item.hex,
      deltaE: Number(item.deltaE.toFixed(2)),
      rgb: `${item.rgb.r},${item.rgb.g},${item.rgb.b}`,
    })),
  );
}

function cancelCanvasEditForPinch() {
  const snapshot = state.strokeHistorySnapshot;
  if (snapshot && (state.isBrushPainting || state.isErasing)) {
    const codes = historySnapshotCodes(snapshot);
    const byCode = new Map(palette.map((item) => [item.code, item]));
    state.pattern = codes.map((code) =>
      code === "__EMPTY__" ? EMPTY_CELL : byCode.get(code) || fallbackPaletteColor(),
    );
    state.manualEditedCells = new Set(snapshot.manualEditedCells || []);
    state.protectedCells = new Set(snapshot.protectedCells || []);
    state.counts = buildCounts(state.pattern);
    updateProtectionUi();
  }
  state.strokeHistorySnapshot = null;
  state.strokeChanged = false;
  state.isBrushPainting = false;
  state.isErasing = false;
  state.lastBrushIndex = null;
  state.lastBrushCell = null;
  state.lastEraseIndex = null;
  state.lastEraseCell = null;
  state.strokeVisited = new Set();
  state.dragStartCell = null;
  state.dragPreview = null;
  if (state.traceReference.dragging) {
    state.traceReference.dragging = false;
    state.traceReference.pointerId = null;
  }
  requestPatternRender();
}

const mobileDoubleActionTimes = new Map();

function runMobileDoubleAction(key, action) {
  const now = Date.now();
  const previous = mobileDoubleActionTimes.get(key) || 0;
  if (now - previous < 220) return;
  mobileDoubleActionTimes.set(key, now);
  action();
}

function setupMobileDoubleTap(element, action) {
  let lastTapAt = 0;
  element.addEventListener("pointerup", (event) => {
    if (!isMobileLayout() || event.pointerType === "mouse") return;
    const now = Date.now();
    if (now - lastTapAt <= 340) {
      lastTapAt = 0;
      event.preventDefault();
      action(event);
      return;
    }
    lastTapAt = now;
  });
}

function setupMobilePaletteDoubleTap() {
  if (!elements.toolColorPalette) return;
  let lastCode = "";
  let lastTapAt = 0;
  elements.toolColorPalette.addEventListener("pointerup", (event) => {
    if (!isMobileLayout() || event.pointerType === "mouse") return;
    const button = event.target.closest("[data-code]");
    if (!button || !elements.toolColorPalette.contains(button)) return;
    const code = button.dataset.code;
    const now = Date.now();
    if (code === lastCode && now - lastTapAt <= 340) {
      lastCode = "";
      lastTapAt = 0;
      event.preventDefault();
      openMobileColorMenu(code);
      return;
    }
    lastCode = code;
    lastTapAt = now;
  });
}

function selectedRegionColorCode() {
  const firstSelectedIndex = state.selection.values().next().value;
  const selectedCellColor = Number.isInteger(firstSelectedIndex) ? state.pattern[firstSelectedIndex] : null;
  return selectedCellColor && !selectedCellColor.empty ? selectedCellColor.code : state.selectedColor?.code;
}

function handleCanvasToolDoubleClick(tool) {
  if (!isMobileLayout()) {
    if (tool === "eraser") eraseCurrentSelection();
    return;
  }
  runMobileDoubleAction(`tool:${tool}`, () => {
    if (tool === "brush") openMobileToolMenu("brush");
    else if (tool === "protect") openMobileToolMenu("local");
    else if (tool === "rect") openMobileToolMenu("selection");
    else if (tool === "sameColor") openMobileColorMenu(selectedRegionColorCode());
    else if (tool === "eraser") eraseCurrentSelection();
  });
}

function resetMobileToolMenu() {
  if (!elements.editToolPanel) return;
  delete elements.editToolPanel.dataset.mobileMenu;
  if (elements.mobileColorActions) elements.mobileColorActions.hidden = true;
}

function openMobileToolMenu(mode, colorCode = "") {
  if (!isMobileLayout() || !elements.editToolPanel) return;
  elements.editToolPanel.dataset.mobileMenu = mode;
  elements.editToolPanel.classList.add("is-properties-open");
  document.querySelector("#toolPropertiesButton")?.setAttribute("aria-expanded", "true");
  if (elements.mobileColorActions) elements.mobileColorActions.hidden = mode !== "color";
  const advancedActions = elements.editToolPanel.querySelector(".tool-advanced-actions");
  if (advancedActions && mode === "selection") advancedActions.open = true;
  const localActions = elements.editToolPanel.querySelector(".local-edit-actions");
  if (localActions && ["local", "selection"].includes(mode)) localActions.setAttribute("open", "");
  if (elements.toolPropertiesTitle) {
    elements.toolPropertiesTitle.textContent = mode === "color"
      ? "颜色操作"
      : mode === "selection"
        ? "选区操作"
        : mode === "local"
          ? "局部优化与保护"
          : mode === "paintColor"
            ? "选择画笔颜色"
            : "画笔设置";
  }
  if (elements.toolColorSearchInput) {
    elements.toolColorSearchInput.placeholder = ["brush", "paintColor"].includes(mode) ? "输入色号，如 F3、B12；回车使用" : "搜索色号 / 颜色名";
  }
  if (mode === "color") syncMobileColorAction(colorCode);
}

function openMobilePaintColorMenu() {
  if (isMobileLayout()) {
    openMobileToolMenu("paintColor");
  } else {
    elements.editToolPanel.dataset.mobileMenu = "paintColor";
    elements.editToolPanel.classList.add("is-properties-open");
    document.querySelector("#toolPropertiesButton")?.setAttribute("aria-expanded", "true");
    if (elements.toolPropertiesTitle) elements.toolPropertiesTitle.textContent = "选择画笔颜色";
    if (elements.toolColorSearchInput) elements.toolColorSearchInput.placeholder = "输入色号，如 F3、B12；回车使用";
  }
  state.toolPaletteSearch = "";
  if (elements.toolColorSearchInput) elements.toolColorSearchInput.value = "";
  renderToolColorPalette();
  window.setTimeout(() => elements.toolColorSearchInput?.focus(), 0);
}

function openConfirmedSelectionActions() {
  const advancedActions = elements.editToolPanel?.querySelector(".tool-advanced-actions");
  if (advancedActions) advancedActions.open = true;

  if (isMobileLayout()) {
    openMobileToolMenu("selection");
    return;
  }

  elements.editToolPanel?.classList.add("is-properties-open");
  document.querySelector("#toolPropertiesButton")?.setAttribute("aria-expanded", "true");
  if (elements.toolPropertiesTitle) elements.toolPropertiesTitle.textContent = "选区操作";
}

function confirmMobileSelection() {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；请先确认应用，再编辑选区。";
    return false;
  }
  if (!state.editing || state.gridLocked || !state.pattern.length) {
    elements.cellInfo.textContent = state.gridLocked ? "格子已锁定，请先解锁再确认选区。" : "当前没有可编辑的图纸。";
    return false;
  }

  if (state.dragStartCell && state.dragPreview) {
    state.selection = buildSelectionFromDrag(state.dragStartCell, state.dragPreview, state.activeTool, state.gridSize);
    state.dragStartCell = null;
    state.dragPreview = null;
  }

  if (state.penPoints.length && !finishPenSelection()) return false;
  if (!state.selection.size) {
    elements.cellInfo.textContent = "请先用钢笔或框选工具选择区域。";
    return false;
  }

  const selectedCount = state.selection.size;
  if (["pen", "rect", "hline"].includes(state.activeTool)) setActiveTool("brush");
  updateSelectionLabel();
  elements.mobileConfirmSelectionButton?.classList.add("is-confirmed");
  elements.mobileConfirmSelectionButton?.setAttribute("aria-pressed", "true");
  renderPattern();
  openConfirmedSelectionActions();
  elements.cellInfo.textContent = `已确定选取 ${selectedCount} 格，可以继续填色、复制、移动或局部优化。`;
  return true;
}

function openMobileColorMenu(code) {
  const color = paletteColorByCode(code) || state.selectedColor;
  if (!color) return;
  runMobileDoubleAction(`color:${color.code}`, () => openMobileToolMenu("color", color.code));
}

function syncMobileColorAction(code = "") {
  const color = paletteColorByCode(code) || state.selectedColor;
  if (!color || !elements.mobileColorActions) return;
  elements.mobileColorActions.dataset.sourceCode = color.code;
  if (elements.mobileColorActionSwatch) elements.mobileColorActionSwatch.style.background = color.hex;
  if (elements.mobileColorActionCode) {
    elements.mobileColorActionCode.textContent = color.name && color.name !== color.code ? `${color.code} ${color.name}` : color.code;
  }
  if (elements.mobileColorActionCount) {
    const count = displayCounts().get(color.code)?.count || 0;
    elements.mobileColorActionCount.textContent = `当前图纸 ${count.toLocaleString("zh-CN")} 颗`;
  }
  if (elements.mobileReplaceColorInput) elements.mobileReplaceColorInput.value = "";
  if (elements.mobileColorLockButton) {
    const locked = state.lockedColorCodes.has(color.code);
    elements.mobileColorLockButton.textContent = locked ? "取消锁定" : "锁定颜色";
    elements.mobileColorLockButton.classList.toggle("is-active", locked);
  }
}

function toggleLockedColorCode(code) {
  const color = paletteColorByCode(code);
  if (!color) return null;
  state.disabledColorCodes.delete(code);
  state.allowedColorCodes.add(code);
  const locked = !state.lockedColorCodes.has(code);
  if (locked) state.lockedColorCodes.add(code);
  else state.lockedColorCodes.delete(code);
  return { color, locked };
}

function applyMobileColorReplacement() {
  const oldCode = elements.mobileColorActions?.dataset.sourceCode;
  const nextCode = elements.mobileReplaceColorInput?.value.trim().toUpperCase();
  if (!oldCode || !nextCode) {
    elements.mobileReplaceColorInput?.focus();
    return;
  }
  if (replaceColorInGrid(oldCode, nextCode)) syncMobileColorAction(nextCode);
}

function toggleMobileColorLock() {
  const code = elements.mobileColorActions?.dataset.sourceCode;
  const result = toggleLockedColorCode(code);
  if (!result) return;
  renderConstraintPalette();
  renderStats();
  renderToolColorPalette();
  syncMobileColorAction(code);
  elements.cellInfo.textContent = result.locked
    ? `${code} 已锁定，不会被自动减色或合并。`
    : `${code} 已取消锁定。`;
  markProjectDirty();
}

function getMobileCanvasGestureController() {
  if (mobileCanvasGestureController) return mobileCanvasGestureController;
  const createController = window.XiaomaiMobileGestures?.createCanvasGestureController;
  if (!createController) throw new Error("手机触控模块加载失败，请刷新页面后重试。");
  mobileCanvasGestureController = createController({
    isEnabled: (event) => isMobileLayout() && event.pointerType === "touch",
    getZoom: () => state.zoom,
    onDrawStart: handleCanvasPointerDownCore,
    onDrawMove: handleCanvasPointerMoveCore,
    onDrawEnd: handleCanvasPointerUpCore,
    onPinchStart: cancelCanvasEditForPinch,
    onPinchMove: ({ zoom, centerX, centerY }) => {
      const wrapRect = elements.canvasWrap.getBoundingClientRect();
      setZoom(zoom, {
        anchorX: clampRange(centerX - wrapRect.left, 0, elements.canvasWrap.clientWidth),
        anchorY: clampRange(centerY - wrapRect.top, 0, elements.canvasWrap.clientHeight),
      });
    },
  });
  return mobileCanvasGestureController;
}

function handleCanvasPointerDown(event) {
  if (isMobileLayout() && state.mobileCanvasPanMode && event.pointerType === "touch") {
    if (beginCanvasPan(event)) event.stopPropagation();
    return;
  }
  if (getMobileCanvasGestureController().handlePointerDown(event)) return;
  handleCanvasPointerDownCore(event);
}

function handleCanvasPointerDownCore(event) {
  elements.patternCanvas.focus?.({ preventScroll: true });
  if (beginCanvasPan(event)) return;
  if (tryStartTraceReferenceDrag(event)) return;
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；请先确认应用再进入编辑。";
    return;
  }
  if (!state.editing || state.gridLocked || !state.pattern.length) return;
  const cell = getCellFromPointer(event);
  if (!cell) return;
  if (state.activeTool === "line") {
    if (!state.lineStartCell) {
      state.lineStartCell = cell;
      state.selectedCell = cell;
      elements.cellInfo.textContent = `直线起点 ${cell.x + 1}, ${cell.y + 1}，再点终点。`;
      renderPattern();
    } else {
      const end = event.shiftKey ? snapLineEnd(state.lineStartCell, cell) : cell;
      drawLineBetweenCells(state.lineStartCell, end, state.selectedColor);
      state.lineStartCell = null;
    }
    return;
  }
  if (state.activeTool === "brush") {
    state.strokeHistorySnapshot = snapshotPattern();
    state.strokeChanged = false;
    state.isBrushPainting = true;
    state.lastBrushIndex = null;
    state.lastBrushCell = null;
    state.strokeVisited = new Set();
    elements.patternCanvas.setPointerCapture?.(event.pointerId);
    paintBrushCell(cell, event.shiftKey);
    return;
  }
  if (state.activeTool === "protect") {
    state.strokeHistorySnapshot = snapshotPattern();
    state.strokeChanged = false;
    state.isBrushPainting = true;
    state.lastBrushIndex = null;
    state.lastBrushCell = null;
    state.strokeVisited = new Set();
    elements.patternCanvas.setPointerCapture?.(event.pointerId);
    updateProtectionAtCell(cell);
    return;
  }
  if (state.activeTool === "eraser") {
    if (state.selection.size) return;
    state.strokeHistorySnapshot = snapshotPattern();
    state.strokeChanged = false;
    state.isErasing = true;
    state.lastEraseIndex = null;
    state.lastEraseCell = null;
    state.strokeVisited = new Set();
    elements.patternCanvas.setPointerCapture?.(event.pointerId);
    eraseBrushCell(cell);
    return;
  }
  if (!["rect", "hline"].includes(state.activeTool)) return;
  state.dragStartCell = cell;
  state.dragPreview = cell;
  elements.patternCanvas.setPointerCapture?.(event.pointerId);
}

function handleCanvasPointerMove(event) {
  if (isMobileLayout() && state.mobileCanvasPanMode && state.panPointerId === event.pointerId) {
    handleCanvasPanPointerMove(event);
    event.stopPropagation();
    return;
  }
  if (getMobileCanvasGestureController().handlePointerMove(event)) return;
  handleCanvasPointerMoveCore(event);
}

function handleCanvasPointerMoveCore(event) {
  if (state.traceReference.dragging) {
    moveTraceReferenceDrag(event);
    return;
  }
  if (state.isBrushPainting) {
    const cell = getCellFromPointer(event);
    if (cell) {
      if (state.activeTool === "protect") updateProtectionAtCell(cell);
      else paintBrushCell(cell, event.shiftKey);
    }
    return;
  }
  if (state.isErasing) {
    const cell = getCellFromPointer(event);
    if (cell) eraseBrushCell(cell);
    return;
  }
  if (!state.dragStartCell) {
    handleCanvasMove(event);
    return;
  }
  const cell = getCellFromPointer(event);
  if (!cell) return;
  state.dragPreview = cell;
  state.selection = buildSelectionFromDrag(state.dragStartCell, cell, state.activeTool, state.gridSize);
  updateSelectionLabel();
  requestPatternRender();
}

function handleCanvasPointerUp(event) {
  if (isMobileLayout() && state.mobileCanvasPanMode && state.panPointerId === event.pointerId) {
    handleCanvasPanPointerUp(event);
    event.stopPropagation();
    return;
  }
  if (getMobileCanvasGestureController().handlePointerUp(event)) return;
  handleCanvasPointerUpCore(event);
}

function handleCanvasPointerUpCore(event) {
  if (state.traceReference.dragging) {
    finishTraceReferenceDrag(event);
    return;
  }
  if (state.isBrushPainting) {
    finishContinuousStroke(state.activeTool === "protect" ? "protect" : "brush");
    return;
  }
  if (state.isErasing) {
    finishContinuousStroke("eraser");
    return;
  }
  if (!state.dragStartCell) return;
  const cell = getCellFromPointer(event) || state.dragPreview;
  state.selection = buildSelectionFromDrag(state.dragStartCell, cell, state.activeTool, state.gridSize);
  state.dragStartCell = null;
  state.dragPreview = null;
  updateSelectionLabel();
  renderPattern();
}

function finishContinuousStroke(tool) {
  if (tool === "brush" || tool === "protect") {
    state.isBrushPainting = false;
    state.lastBrushIndex = null;
    state.lastBrushCell = null;
  } else {
    state.isErasing = false;
    state.lastEraseIndex = null;
    state.lastEraseCell = null;
  }
  state.strokeVisited = new Set();
  const strokeChanged = commitStrokeHistory();
  if (!strokeChanged) {
    requestPatternRender(brushPreviewCellsForCell(state.brushHoverCell));
    return false;
  }

  if (tool === "protect") {
    state.editGridVersion += 1;
    updateProtectionUi();
    renderPattern();
    markProjectDirty();
    elements.cellInfo.textContent = state.protectionMode === "add"
      ? "保护区域已更新，可随时撤回。"
      : "已取消划过区域的保护。";
    return true;
  }

  const validation = validateColorConstraints(state.pattern, { withReport: true });
  state.pattern = validation.pattern;
  if (validation.violationCount) state.counts = buildCounts(state.pattern);
  state.hasConfirmedGrid = true;
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  scheduleQualityMetricsRefresh();
  renderStats();
  renderPattern();
  markProjectDirty();
  return true;
}

function paintBrushCell(cell, snapLine = false) {
  const constrainedColor = manualPaintColor(state.selectedColor);
  const targetCell = snapLine && state.lastBrushCell ? snapLineEnd(state.lastBrushCell, cell) : cell;
  const cells = state.lastBrushCell ? interpolateCells(state.lastBrushCell, targetCell) : [targetCell];
  const dirtyCells = state.selectedCell ? [state.selectedCell] : [];
  for (const point of cells) {
    for (const symmetricPoint of symmetryPointsFor(point, activeEditorGeometryOptions())) {
      for (const brushCell of brushCellsForPoint(symmetricPoint, activeEditorGeometryOptions())) {
        const index = brushCell.y * state.gridSize + brushCell.x;
        if (state.strokeVisited.has(index) || !canEditCell(index)) continue;
        state.strokeVisited.add(index);
        const current = state.pattern[index];
        if (samePatternColor(current, constrainedColor)) continue;
        state.pattern[index] = constrainedColor;
        applyCountChanges(state.counts, [{ before: current, after: constrainedColor }]);
        state.manualEditedCells.add(index);
        state.strokeChanged = true;
        state.lastBrushIndex = index;
        dirtyCells.push(brushCell);
      }
    }
  }
  state.lastBrushCell = targetCell;
  state.selectedCell = targetCell;
  dirtyCells.push(targetCell);
  requestPatternRender(dirtyCells);
}

function eraseBrushCell(cell) {
  const fill = eraserFillColor();
  const cells = state.lastEraseCell ? interpolateCells(state.lastEraseCell, cell) : [cell];
  const dirtyCells = state.selectedCell ? [state.selectedCell] : [];
  for (const point of cells) {
    for (const symmetricPoint of symmetryPointsFor(point, activeEditorGeometryOptions())) {
      for (const brushCell of brushCellsForPoint(symmetricPoint, activeEditorGeometryOptions())) {
        const index = brushCell.y * state.gridSize + brushCell.x;
        if (state.strokeVisited.has(index) || !canEditCell(index)) continue;
        state.strokeVisited.add(index);
        const current = state.pattern[index];
        if (samePatternColor(current, fill)) continue;
        state.pattern[index] = fill;
        applyCountChanges(state.counts, [{ before: current, after: fill }]);
        state.manualEditedCells.add(index);
        state.strokeChanged = true;
        state.lastEraseIndex = index;
        dirtyCells.push(brushCell);
      }
    }
  }
  state.lastEraseCell = cell;
  state.selectedCell = cell;
  dirtyCells.push(cell);
  requestPatternRender(dirtyCells);
}

function commitStrokeHistory() {
  const snapshot = state.strokeHistorySnapshot;
  const changed = state.strokeChanged;
  state.strokeHistorySnapshot = null;
  state.strokeChanged = false;
  if (changed && snapshot) pushHistory(snapshot);
  else updateHistoryButtons();
  return changed;
}

function eraseCurrentSelection() {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是预览，请先应用或取消预览后再擦除。";
    return;
  }
  if (state.gridLocked || !state.selection.size) return;
  const fill = eraserFillColor();
  const targets = [...state.selection].filter((index) => {
    if (!canEditCell(index)) return false;
    const current = state.pattern[index];
    return current.empty !== fill.empty || current.code !== fill.code;
  });
  if (!targets.length) {
    elements.cellInfo.textContent = "选中的同色格已经擦除。";
    return;
  }
  applyColorToIndices(targets, fill);
  elements.cellInfo.textContent = `已擦除选中的 ${targets.length} 个同色格。`;
  markProjectDirty();
}

function canEditCell(index) {
  const color = state.pattern[index];
  if (!color || color.empty) return true;
  return state.allowEditLockedCells || !isColorLocked(color);
}

function symmetryModeHint() {
  const labels = {
    none: "对称绘制已关闭。",
    horizontal: "左右对称已开启：画笔和擦除会同步到左右镜像位置。",
    vertical: "上下对称已开启：画笔和擦除会同步到上下镜像位置。",
    both: "四向对称已开启：画笔和擦除会同步到四个对称位置。",
  };
  return labels[state.symmetryMode] || labels.none;
}

function mirrorPattern(direction) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是预览，请先应用或取消预览后再镜像。";
    return;
  }
  if (!state.pattern.length || state.gridLocked) return;
  pushHistory();
  const mirrored = Array.from({ length: state.pattern.length }, () => EMPTY_CELL);
  for (let y = 0; y < activeGridHeight(); y += 1) {
    for (let x = 0; x < activeGridWidth(); x += 1) {
      const index = y * state.gridSize + x;
      mirrored[mirroredIndex(index, direction, activeEditorGeometryOptions())] = state.pattern[index];
    }
  }
  state.pattern = mirrored;
  const activeIndexes = (indexes) => indexes.filter((index) => {
    const x = index % state.gridSize;
    const y = Math.floor(index / state.gridSize);
    return isActiveGridCell(x, y);
  });
  state.manualEditedCells = new Set(
    activeIndexes([...state.manualEditedCells]).map((index) => mirroredIndex(index, direction, activeEditorGeometryOptions())),
  );
  state.protectedCells = new Set(
    activeIndexes([...state.protectedCells]).map((index) => mirroredIndex(index, direction, activeEditorGeometryOptions())),
  );
  state.selection = new Set(
    activeIndexes([...state.selection]).map((index) => mirroredIndex(index, direction, activeEditorGeometryOptions())),
  );
  if (state.backgroundMask?.length === mirrored.length) {
    const mask = new Uint8Array(mirrored.length);
    for (let y = 0; y < activeGridHeight(); y += 1) {
      for (let x = 0; x < activeGridWidth(); x += 1) {
        const index = y * state.gridSize + x;
        mask[mirroredIndex(index, direction, activeEditorGeometryOptions())] = state.backgroundMask[index];
      }
    }
    state.backgroundMask = mask;
  }
  if (state.selectedCell) {
    state.selectedCell = direction === "horizontal"
      ? { x: activeGridWidth() - 1 - state.selectedCell.x, y: state.selectedCell.y }
      : { x: state.selectedCell.x, y: activeGridHeight() - 1 - state.selectedCell.y };
  }
  state.counts = buildCounts(state.pattern);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  updateProtectionUi();
  updateSelectionLabel();
  renderPattern();
  renderStats();
  elements.cellInfo.textContent = direction === "horizontal" ? "整张图纸已左右镜像。" : "整张图纸已上下镜像。";
  markProjectDirty();
}

function mirrorSelectionOrPattern(direction) {
  if (state.selection.size) {
    mirrorSelectedRegion(direction);
    return;
  }
  mirrorPattern(direction);
}

function mirrorSelectedRegion(direction) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是预览，请先应用或取消预览后再调整选区。";
    return;
  }
  if (!state.pattern.length || state.gridLocked || !state.selection.size) return;

  const plan = planSelectionMirror(state.pattern, state.selection, {
    stride: state.gridSize,
    direction,
  });
  applySelectionTransformPlan(
    plan,
    direction === "horizontal" ? "选区已左右镜像。" : "选区已上下镜像。",
    undefined,
    transformProtectedSelection("mirror", { direction }),
  );
}

function moveSelectedRegion(dx, dy) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是预览，请先应用或取消预览后再移动选区。";
    return;
  }
  if (!state.pattern.length || state.gridLocked || !state.selection.size) return;

  const plan = planSelectionMove(state.pattern, state.selection, {
    stride: state.gridSize,
    width: activeGridWidth(),
    height: activeGridHeight(),
    dx,
    dy,
  });
  if (plan?.blocked === "boundary") {
    elements.cellInfo.textContent = "选区已经到画布边缘，不能继续移动。";
    return;
  }
  applySelectionTransformPlan(
    plan,
    "选区已移动 1 格。",
    "选区移动会修改锁定颜色，请先解锁或开启“允许改锁定色”。",
    transformProtectedSelection("move", { dx, dy }),
  );
}

function rotateSelectedRegion(direction) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是预览，请先应用或取消预览后再旋转选区。";
    return;
  }
  if (!state.pattern.length || state.gridLocked || !state.selection.size) {
    elements.cellInfo.textContent = "请先框选要旋转的区域。";
    return;
  }

  const plan = planSelectionRotate(state.pattern, state.selection, {
    stride: state.gridSize,
    width: activeGridWidth(),
    height: activeGridHeight(),
    direction,
  });
  if (plan?.blocked === "boundary") {
    elements.cellInfo.textContent = "旋转后的选区会超出画布，请先向内移动选区。";
    return;
  }
  applySelectionTransformPlan(
    plan,
    direction === "clockwise" ? "选区已向右旋转 90°。" : "选区已向左旋转 90°。",
    "选区旋转会修改锁定颜色，请先解锁或开启“允许改锁定色”。",
    transformProtectedSelection("rotate", { direction }),
  );
}

function transformProtectedSelection(transform, options = {}) {
  const protectedSource = [...state.selection].filter((index) => state.protectedCells.has(index));
  if (!protectedSource.length) return [];
  const selectedPoints = [...state.selection].map((index) => ({
    index,
    x: index % state.gridSize,
    y: Math.floor(index / state.gridSize),
  }));
  const minX = Math.min(...selectedPoints.map((point) => point.x));
  const maxX = Math.max(...selectedPoints.map((point) => point.x));
  const minY = Math.min(...selectedPoints.map((point) => point.y));
  const maxY = Math.max(...selectedPoints.map((point) => point.y));
  return protectedSource.map((index) => {
    const x = index % state.gridSize;
    const y = Math.floor(index / state.gridSize);
    let nextX = x;
    let nextY = y;
    if (transform === "move") {
      nextX += Math.sign(Number(options.dx) || 0);
      nextY += Math.sign(Number(options.dy) || 0);
    } else if (transform === "mirror") {
      if (options.direction === "horizontal") nextX = minX + maxX - x;
      else nextY = minY + maxY - y;
    } else if (transform === "rotate") {
      const dx = x - minX;
      const dy = y - minY;
      if (options.direction === "clockwise") {
        nextX = minX + (maxY - minY) - dy;
        nextY = minY + dx;
      } else {
        nextX = minX + dy;
        nextY = minY + (maxX - minX) - dx;
      }
    }
    return nextY * state.gridSize + nextX;
  });
}

function applySelectionTransformPlan(
  plan,
  successMessage,
  lockedMessage = "选区镜像会修改锁定颜色，请先解锁或开启“允许改锁定色”。",
  protectedTargets = [],
) {
  if (!plan?.changes?.length) return;

  const clearColor = eraserFillColor();
  const changes = plan.changes
    .map((change) => ({
      index: change.index,
      color: change.code === CLIPBOARD_EMPTY_CODE ? clearColor : paletteColorByCode(change.code),
    }))
    .filter((change) => change.color && !samePatternColor(state.pattern[change.index], change.color));

  if (changes.some((change) => !canEditCell(change.index))) {
    elements.cellInfo.textContent = lockedMessage;
    return;
  }

  if (changes.length) pushHistory();
  const protectedSource = new Set([...state.selection].filter((index) => state.protectedCells.has(index)));
  const countChanges = [];
  for (const change of changes) {
    const before = state.pattern[change.index];
    state.pattern[change.index] = change.color;
    countChanges.push({ before, after: change.color });
    state.manualEditedCells.add(change.index);
    rememberPaletteColor(change.color);
  }

  state.selection = new Set(plan.selection);
  if (protectedSource.size) {
    protectedSource.forEach((index) => state.protectedCells.delete(index));
    protectedTargets.forEach((index) => state.protectedCells.add(index));
  }
  state.penPoints = [];
  updateProtectionUi();
  if (countChanges.length) {
    applyCountChanges(state.counts, countChanges);
    state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
    state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
    state.hasConfirmedGrid = true;
    state.manualEditCount += 1;
    state.editGridVersion += 1;
    markProjectDirty();
  }
  updateSelectionLabel();
  renderPattern();
  renderStats();
  elements.cellInfo.textContent = successMessage;
}

function drawLineBetweenCells(start, end, color) {
  if (state.isPreviewDirty || state.gridLocked) return;
  pushHistory();
  const constrainedColor = manualPaintColor(color);
  const visited = new Set();
  const countChanges = [];
  for (const point of interpolateCells(start, end)) {
    for (const brushCell of brushCellsForPoint(point, activeEditorGeometryOptions())) {
      const index = brushCell.y * state.gridSize + brushCell.x;
      if (visited.has(index) || !canEditCell(index)) continue;
      const before = state.pattern[index];
      state.pattern[index] = constrainedColor;
      countChanges.push({ before, after: constrainedColor });
      state.manualEditedCells.add(index);
      visited.add(index);
    }
  }
  applyCountChanges(state.counts, countChanges);
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  scheduleQualityMetricsRefresh();
  state.selectedCell = end;
  renderPattern();
  renderStats();
  elements.cellInfo.textContent = `已绘制直线：${start.x + 1},${start.y + 1} → ${end.x + 1},${end.y + 1}`;
  markProjectDirty();
}

function floodFillFromCell(cell, color) {
  if (state.isPreviewDirty || state.gridLocked || !state.pattern.length) return;
  const startIndex = cell.y * state.gridSize + cell.x;
  const source = state.pattern[startIndex];
  const target = manualPaintColor(color);
  if (!source || source.code === target.code && source.empty === target.empty) return;
  pushHistory();
  const queue = [startIndex];
  const visited = new Set([startIndex]);
  const targets = [];
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const item = state.pattern[index];
    if ((item.empty || "") !== (source.empty || "") || item.code !== source.code) continue;
    if (!canEditCell(index)) continue;
    targets.push(index);
    const x = index % state.gridSize;
    const y = Math.floor(index / state.gridSize);
    for (const next of getFourNeighbors(x, y, state.gridSize)) {
      const nextX = next % state.gridSize;
      const nextY = Math.floor(next / state.gridSize);
      if (!isActiveGridCell(nextX, nextY)) continue;
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  const countChanges = [];
  for (const index of targets) {
    const before = state.pattern[index];
    state.pattern[index] = target;
    countChanges.push({ before, after: target });
    state.manualEditedCells.add(index);
  }
  applyCountChanges(state.counts, countChanges);
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  scheduleQualityMetricsRefresh();
  renderPattern();
  renderStats();
  elements.cellInfo.textContent = `已填充 ${targets.length} 格为 ${target.code}。`;
  markProjectDirty();
}

function pickColorFromGrid(cell) {
  const color = state.pattern[cell.y * state.gridSize + cell.x];
  if (!color || color.empty) {
    elements.cellInfo.textContent = "当前格子为空，未吸取颜色。";
    return;
  }
  activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette" });
  elements.cellInfo.textContent = `已吸取：${color.code} ${color.name} / ${color.hex}`;
}

function handleReferenceImageClick(event) {
  if (state.activeTool !== "eyedropper" || !state.referenceImage) return;
  event.stopPropagation();
  const rect = elements.referenceFloatImage.getBoundingClientRect();
  const x = clampRange((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const y = clampRange((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  const sampleX = Math.min(state.referenceImage.width - 1, Math.max(0, Math.floor(x * state.referenceImage.width)));
  const sampleY = Math.min(state.referenceImage.height - 1, Math.max(0, Math.floor(y * state.referenceImage.height)));
  const [r, g, b, a] = sampleReferenceImagePixel(sampleX, sampleY);
  if (a < 8) {
    elements.cellInfo.textContent = "参考图点击位置透明，未吸取颜色。";
    return;
  }
  const rgb = { r, g, b, lab: rgbToLab({ r, g, b }) };
  const candidates = nearestPaletteCandidates(rgb, palette, 5);
  const color = candidates[0];
  if (!color) return;
  activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette" });
  elements.cellInfo.textContent = `已从参考图吸取：${color.code} ${color.name} / ${color.hex} / DeltaE ${color.deltaE.toFixed(1)}；候选 ${candidates.map((item) => item.code).join("、")}`;
  renderStats();
}

function sampleReferenceImagePixel(x, y) {
  if (state.referenceSampler.image !== state.referenceImage || !state.referenceSampler.context) {
    const canvas = document.createElement("canvas");
    canvas.width = state.referenceImage.width;
    canvas.height = state.referenceImage.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(state.referenceImage, 0, 0);
    state.referenceSampler = { image: state.referenceImage, canvas, context };
  }
  return state.referenceSampler.context.getImageData(x, y, 1, 1).data;
}

function handleCanvasWheel(event) {
  if (event.defaultPrevented) return;
  if (isTypingTarget(event.target)) return;
  if (state.editorView !== "grid") return;
  if (
    state.appMode === "draw" &&
    state.traceReference.adjustMode &&
    state.referenceImage &&
    !state.traceReference.locked &&
    state.traceReference.enabled
  ) {
    event.preventDefault();
    const point = getGridPointFromPointer(event);
    const direction = event.deltaY > 0 ? 1 / 1.08 : 1.08;
    setTraceReferenceScale(state.traceReference.scale * direction, point);
    return;
  }
  if (event.shiftKey) {
    event.preventDefault();
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    elements.canvasWrap.scrollLeft += horizontal;
    return;
  }
  event.preventDefault();
  const wrapRect = elements.canvasWrap.getBoundingClientRect();
  const delta = clampRange(event.deltaY, -180, 180);
  const factor = Math.exp(-delta * 0.0025);
  setZoom(state.zoom * factor, {
    anchorX: clampRange(event.clientX - wrapRect.left, 0, elements.canvasWrap.clientWidth),
    anchorY: clampRange(event.clientY - wrapRect.top, 0, elements.canvasWrap.clientHeight),
  });
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable || Boolean(target.closest?.("[contenteditable='true']"));
}

function beginCanvasPan(event) {
  const explicitPan = state.mobileCanvasPanMode;
  const primaryPointer = event.pointerType === "touch" || event.button === 0;
  if ((!state.isSpacePressed && !explicitPan) || !primaryPointer || isTypingTarget(event.target)) return false;
  if (!elements.canvasWrap.contains(event.target)) return false;
  if (state.isPanningCanvas) return true;
  event.preventDefault();
  state.isPanningCanvas = true;
  state.panPointerId = event.pointerId;
  state.panStartX = event.clientX;
  state.panStartY = event.clientY;
  state.panStartScrollLeft = elements.canvasWrap.scrollLeft;
  state.panStartScrollTop = elements.canvasWrap.scrollTop;
  elements.canvasWrap.setPointerCapture?.(event.pointerId);
  updateCanvasCursor();
  return true;
}

function handleCanvasPanPointerDown(event) {
  beginCanvasPan(event);
}

function handleCanvasPanPointerMove(event) {
  if (!state.isPanningCanvas || state.panPointerId !== event.pointerId) return;
  event.preventDefault();
  elements.canvasWrap.scrollLeft = state.panStartScrollLeft - (event.clientX - state.panStartX);
  elements.canvasWrap.scrollTop = state.panStartScrollTop - (event.clientY - state.panStartY);
  updateCanvasCursor();
}

function handleCanvasPanPointerUp(event) {
  if (!state.isPanningCanvas || state.panPointerId !== event.pointerId) return;
  if (elements.canvasWrap.hasPointerCapture?.(event.pointerId)) {
    elements.canvasWrap.releasePointerCapture(event.pointerId);
  }
  state.isPanningCanvas = false;
  state.panPointerId = null;
  updateCanvasCursor();
}

function handleCanvasDragOver(event) {
  if (state.isPreviewDirty) return;
  if (!state.pattern.length || state.gridLocked) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  document.querySelector("#canvasWrap")?.classList.add("is-drag-target");
}

function handleCanvasDragLeave() {
  document.querySelector("#canvasWrap")?.classList.remove("is-drag-target");
}

function handleCanvasDrop(event) {
  event.preventDefault();
  document.querySelector("#canvasWrap")?.classList.remove("is-drag-target");
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；切换到编辑模式后即可拖拽填色。";
    return;
  }
  if (state.gridLocked) return;
  const code = event.dataTransfer.getData("text/plain");
  const color = paletteColorByCode(code);
  if (!color) return;
  activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette", announce: false });
  const cell = getCellFromPointer(event);
  if (state.selection.size) {
    fillSelectionWithColor(color);
  } else if (cell) {
    applyColorToIndices([cell.y * state.gridSize + cell.x], color);
  }
}

function getCellFromPointer(event) {
  const plot = activePlotMetrics();
  const rect = elements.patternCanvas.getBoundingClientRect();
  const scaleX = elements.patternCanvas.width / rect.width;
  const scaleY = elements.patternCanvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  if (
    canvasX < plot.gridX ||
    canvasX >= plot.gridX + plot.gridWidth ||
    canvasY < plot.gridY ||
    canvasY >= plot.gridY + plot.gridHeight
  ) {
    return null;
  }

  const cell = plot.cell;
  return {
    x: Math.floor((canvasX - plot.gridX) / cell),
    y: Math.floor((canvasY - plot.gridY) / cell),
  };
}

function getCanvasPointFromPointer(event) {
  const rect = elements.patternCanvas.getBoundingClientRect();
  const scaleX = elements.patternCanvas.width / rect.width;
  const scaleY = elements.patternCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getGridPointFromPointer(event) {
  const plot = activePlotMetrics();
  const point = getCanvasPointFromPointer(event);
  const cell = plot.cell;
  return {
    x: (point.x - plot.gridX) / cell,
    y: (point.y - plot.gridY) / cell,
  };
}

function pointInsideGeometry(point, geometry) {
  return Boolean(
    geometry &&
    point.x >= geometry.left &&
    point.x <= geometry.left + geometry.width &&
    point.y >= geometry.top &&
    point.y <= geometry.top + geometry.height
  );
}

function tryStartTraceReferenceDrag(event) {
  if (!REFERENCE_FEATURE_ENABLED) return false;
  const trace = state.traceReference;
  if (
    state.editorView !== "grid" ||
    !state.referenceImage ||
    !trace.enabled ||
    !trace.visible ||
    !trace.adjustMode ||
    trace.locked
  ) {
    return false;
  }
  const geometry = traceReferenceGeometry();
  const point = getCanvasPointFromPointer(event);
  if (!pointInsideGeometry(point, geometry)) return false;
  event.preventDefault();
  trace.dragging = true;
  trace.pointerId = event.pointerId;
  trace.startClientX = event.clientX;
  trace.startClientY = event.clientY;
  trace.startX = trace.x || 0;
  trace.startY = trace.y || 0;
  elements.patternCanvas.setPointerCapture?.(event.pointerId);
  elements.cellInfo.textContent = "正在移动画布参考图。滚轮可缩放，点“完成调整”后继续画格子。";
  return true;
}

function moveTraceReferenceDrag(event) {
  const trace = state.traceReference;
  if (!trace.dragging || trace.pointerId !== event.pointerId) return;
  const plot = activePlotMetrics();
  const rect = elements.patternCanvas.getBoundingClientRect();
  const cssToCanvasX = elements.patternCanvas.width / rect.width;
  const cssToCanvasY = elements.patternCanvas.height / rect.height;
  const cell = plot.cell;
  trace.x = trace.startX + ((event.clientX - trace.startClientX) * cssToCanvasX) / cell;
  trace.y = trace.startY + ((event.clientY - trace.startClientY) * cssToCanvasY) / cell;
  if (trace.snapToGrid) {
    trace.x = Math.round(trace.x);
    trace.y = Math.round(trace.y);
  }
  requestPatternRender();
}

function finishTraceReferenceDrag(event) {
  const trace = state.traceReference;
  if (trace.pointerId === event.pointerId && elements.patternCanvas.hasPointerCapture?.(event.pointerId)) {
    elements.patternCanvas.releasePointerCapture(event.pointerId);
  }
  trace.dragging = false;
  trace.pointerId = null;
  elements.cellInfo.textContent = "画布参考图位置已调整，不影响图纸数据。";
  markProjectDirty();
}

function pickColorFromTraceReference(event) {
  if (!REFERENCE_FEATURE_ENABLED) return false;
  if (state.activeTool !== "eyedropper" || !state.referenceImage) return false;
  if (!state.traceReference.enabled || !state.traceReference.visible || state.traceReference.opacity <= 0) return false;
  const geometry = traceReferenceGeometry();
  const point = getCanvasPointFromPointer(event);
  if (!pointInsideGeometry(point, geometry)) return false;
  const ratioX = clampRange((point.x - geometry.left) / Math.max(1, geometry.width), 0, 1);
  const ratioY = clampRange((point.y - geometry.top) / Math.max(1, geometry.height), 0, 1);
  const sampleX = Math.min(state.referenceImage.width - 1, Math.max(0, Math.floor(ratioX * state.referenceImage.width)));
  const sampleY = Math.min(state.referenceImage.height - 1, Math.max(0, Math.floor(ratioY * state.referenceImage.height)));
  const [r, g, b, a] = sampleReferenceImagePixel(sampleX, sampleY);
  if (a < 8) {
    elements.cellInfo.textContent = "画布参考图该位置透明，未吸取颜色。";
    return true;
  }
  const rgb = { r, g, b, lab: rgbToLab({ r, g, b }) };
  const candidates = nearestPaletteCandidates(rgb, palette, 5);
  const color = candidates[0];
  if (!color) return true;
  activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette", announce: false });
  elements.cellInfo.textContent = `已从画布参考图吸取：${color.code} ${color.name} / DeltaE ${color.deltaE.toFixed(1)}；候选 ${candidates.map((item) => item.code).join("、")}`;
  return true;
}

function visibleCanvasTool(tool) {
  return ["brush", "eraser", "eyedropper", "rect", "pen", "sameColor", "protect"].includes(tool);
}

function setActiveTool(tool) {
  if (!visibleCanvasTool(tool)) tool = "brush";
  if (tool !== state.activeTool) {
    state.previousActiveTool = state.activeTool;
  }
  if (tool === "pen" && state.activeTool !== "pen") {
    state.selection.clear();
  }
  state.activeTool = tool;
  state.dragStartCell = null;
  state.dragPreview = null;
  state.lineStartCell = null;
  state.traceReference.adjustMode = false;
  if (tool !== "pen") state.penPoints = [];
  elements.finishPenButton.hidden = tool !== "pen";
  document.querySelectorAll(".canvas-tool").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });
  if (elements.editToolPanel) elements.editToolPanel.dataset.activeTool = tool;
  syncTraceReferenceControls();
  updateCanvasCursor();
  updateSelectionLabel();
  elements.cellInfo.textContent = toolHint(tool);
  renderPattern();
}

function updateCanvasCursor() {
  let cursor = "default";
  if (state.isPanningCanvas) {
    cursor = "grabbing";
  } else if (state.isSpacePressed || state.mobileCanvasPanMode) {
    cursor = "grab";
  } else if (state.traceReference.adjustMode) {
    cursor = state.traceReference.locked ? "not-allowed" : "move";
  } else if (state.editing && !state.gridLocked) {
    if (state.activeTool === "eyedropper") cursor = "copy";
    else if (state.activeTool === "eraser") cursor = "cell";
    else cursor = "crosshair";
  }
  elements.patternCanvas.style.cursor = cursor;
  elements.canvasWrap.style.cursor = cursor;
  elements.canvasWrap.classList.toggle("is-space-pan", state.isSpacePressed && !state.isPanningCanvas);
  elements.canvasWrap.classList.toggle("is-mobile-pan", state.mobileCanvasPanMode && !state.isPanningCanvas);
  elements.canvasWrap.classList.toggle("is-panning", state.isPanningCanvas);
}

function toolHint(tool) {
  const hints = {
    paint: "改色：点击单格，或先选区再填充。",
    brush: "画笔：先选颜色，按住拖动，路过的格子会改成当前颜色；按住 Shift 可拉直。",
    bucket: "填充：点击一个区域，用当前颜色填充相同颜色的连通区域。",
    line: "直线：点击起点，再点击终点绘制直线；Shift 会吸附水平、垂直或 45 度。",
    eyedropper: "吸管：点击图纸格子吸取颜色，并设为当前画笔颜色。",
    rect: "框选：拖出矩形选区。",
    hline: "横线：拖动选择一段横向格子。",
    pen: "钢笔：连续点击围出区域，双击或点完成钢笔。",
    eraser: "擦除：点击或按住拖动，空背景模式下会擦成空白格。",
    protect: "保护：划过的格子不会被局部清理、减色或自动优化；可在设置中切换取消保护。",
    sameColor: "同色：点击图纸或右侧色块，选择全部同色格。",
  };
  return hints[tool] || "";
}

function finishPenSelection() {
  if (state.penPoints.length < 3) {
    elements.cellInfo.textContent = "钢笔选区至少需要 3 个点。";
    return false;
  }
  const selected = new Set();
  for (let y = 0; y < activeGridHeight(); y += 1) {
    for (let x = 0; x < activeGridWidth(); x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, state.penPoints)) {
        selected.add(y * state.gridSize + x);
      }
    }
  }
  state.selection = selected;
  state.penPoints = [];
  updateSelectionLabel();
  renderPattern();
  elements.cellInfo.textContent = `钢笔选区已闭合，共选中 ${selected.size} 个像素，可直接填色或复制。`;
  return true;
}

function clearSelection() {
  state.selection.clear();
  state.penPoints = [];
  updateSelectionLabel();
  renderPattern();
}

function updateSelectionLabel() {
  elements.selectionLabel.textContent = state.selection.size ? `${state.selection.size} 格` : state.penPoints.length ? `${state.penPoints.length} 点` : "未选区";
  if (elements.mobileConfirmSelectionButton) {
    const ready = state.selection.size > 0 || state.penPoints.length >= 3;
    const confirmed = state.selection.size > 0 && !["pen", "rect", "hline"].includes(state.activeTool);
    elements.mobileConfirmSelectionButton.disabled = !ready;
    elements.mobileConfirmSelectionButton.classList.toggle("is-ready", ready);
    elements.mobileConfirmSelectionButton.classList.toggle("is-confirmed", confirmed);
    elements.mobileConfirmSelectionButton.setAttribute("aria-pressed", String(confirmed));
    const label = elements.mobileConfirmSelectionButton.querySelector("span");
    if (label) label.textContent = confirmed ? `已选 ${state.selection.size}` : "确定选取";
  }
  elements.copySelectionButton.disabled = !state.selection.size;
  elements.pasteSelectionButton.disabled = !state.selectionClipboard;
  if (elements.protectSelectionButton) elements.protectSelectionButton.disabled = !state.selection.size || state.isPreviewDirty;
  if (elements.unprotectSelectionButton) elements.unprotectSelectionButton.disabled = !state.selection.size || state.isPreviewDirty;
  if (elements.previewSelectionOptimizeButton) elements.previewSelectionOptimizeButton.disabled = !state.selection.size || state.isPreviewDirty;
}

function copySelectionPixels() {
  if (!state.pattern.length || !state.selection.size) {
    elements.cellInfo.textContent = "请先用框选或钢笔选择要复制的像素。";
    return;
  }
  state.selectionClipboard = createSelectionClipboard(state.pattern, state.selection, {
    stride: state.gridSize,
  });
  if (!state.selectionClipboard) return;
  updateSelectionLabel();
  elements.cellInfo.textContent = `已复制 ${state.selectionClipboard.cells.length} 个像素，可点击“粘贴选区”或按 Ctrl + V。`;
}

function pasteSelectionPixels() {
  const clipboard = state.selectionClipboard;
  if (!clipboard) {
    elements.cellInfo.textContent = "还没有复制选区。";
    return;
  }
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；切换到编辑模式后再粘贴选区。";
    return;
  }
  if (!state.editing || state.gridLocked || !state.pattern.length) return;

  const pastePlan = planSelectionPaste(clipboard, {
    stride: state.gridSize,
    width: activeGridWidth(),
    height: activeGridHeight(),
    hoverCell: state.brushHoverCell,
    canPaste: (index) => index >= 0 && index < state.pattern.length && canEditCell(index),
  });
  const changes = pastePlan?.changes || [];
  if (!changes.length) {
    elements.cellInfo.textContent = "粘贴位置没有可编辑的格子，请解锁相关颜色后再试。";
    return;
  }

  pushHistory();
  const pastedSelection = new Set();
  const countChanges = [];
  for (const change of changes) {
    const color = change.code === CLIPBOARD_EMPTY_CODE ? EMPTY_CELL : paletteColorByCode(change.code);
    if (!color) continue;
    const before = state.pattern[change.index];
    state.pattern[change.index] = color;
    countChanges.push({ before, after: color });
    state.manualEditedCells.add(change.index);
    rememberPaletteColor(color);
    pastedSelection.add(change.index);
  }
  clipboard.pasteCount += 1;
  state.selection = pastedSelection;
  state.penPoints = [];
  applyCountChanges(state.counts, countChanges);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.hasConfirmedGrid = true;
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  updateSelectionLabel();
  renderPattern();
  renderStats();
  markProjectDirty();
  const clippedHint = pastePlan.clippedCount ? `，另有 ${pastePlan.clippedCount} 个像素超出画布未粘贴` : "";
  const lockedHint = pastePlan.blockedCount ? `，${pastePlan.blockedCount} 个锁定格未修改` : "";
  elements.cellInfo.textContent = `已从鼠标所在格粘贴 ${pastedSelection.size} 个像素${clippedHint}${lockedHint}，结果已自动选中。`;
}

function snapshotPattern() {
  return {
    size: state.patternSize || state.gridSize,
    width: activeGridWidth(),
    height: activeGridHeight(),
    ...createHistoryPatternPayload(state.pattern),
    manualEditedCells: [...state.manualEditedCells],
    protectedCells: [...state.protectedCells],
    lockedColorCodes: [...state.lockedColorCodes],
    allowedColorCodes: [...state.allowedColorCodes],
    disabledColorCodes: [...state.disabledColorCodes],
    selectedColorCode: state.selectedColor?.code || "",
    projectPaletteCodes: state.projectPalette.map((item) => item.code),
  };
}

function restorePattern(snapshot) {
  const codes = historySnapshotCodes(snapshot);
  if (!Array.isArray(snapshot) && snapshot.size) {
    state.gridWidth = Number(snapshot.width) || snapshot.size;
    state.gridHeight = Number(snapshot.height) || snapshot.size;
    state.gridSize = Math.max(snapshot.size, state.gridWidth, state.gridHeight);
    elements.sizeLabel.textContent = gridDimensionsLabel();
    elements.customSizeInput.value = state.gridWidth;
    elements.customHeightInput.value = state.gridHeight;
    document.querySelectorAll(".seg-option").forEach((button) => {
      button.classList.toggle(
        "is-active",
        state.gridWidth === state.gridHeight && Number(button.dataset.size) === state.gridWidth,
      );
    });
  }
  const byCode = new Map(palette.map((item) => [item.code, item]));
  state.pattern = codes.map((code) => (code === "__EMPTY__" ? EMPTY_CELL : byCode.get(code) || fallbackPaletteColor()));
  state.manualEditedCells = new Set(Array.isArray(snapshot.manualEditedCells) ? snapshot.manualEditedCells : []);
  state.protectedCells = new Set(Array.isArray(snapshot.protectedCells) ? snapshot.protectedCells : []);
  if (!Array.isArray(snapshot)) {
    state.lockedColorCodes = new Set(snapshot.lockedColorCodes || []);
    state.allowedColorCodes = new Set(snapshot.allowedColorCodes || state.allowedColorCodes);
    state.disabledColorCodes = new Set(snapshot.disabledColorCodes || []);
    state.selectedColor = paletteColorByCode(snapshot.selectedColorCode) || state.selectedColor;
    state.projectPalette = Array.isArray(snapshot.projectPaletteCodes)
      ? snapshot.projectPaletteCodes.map((code) => paletteColorByCode(code)).filter(Boolean)
      : state.projectPalette;
  }
  state.patternSize = state.gridSize;
  state.counts = buildCounts(state.pattern);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  clearPreviewState();
  updateSelectedColorUi();
  renderConstraintPalette();
  state.selection.clear();
  state.penPoints = [];
  updateSelectionLabel();
  renderPattern();
  renderStats();
  markProjectDirty();
}

function pushHistory(snapshot = snapshotPattern()) {
  if (!state.pattern.length || !snapshot) return false;
  const latest = state.undoStack[state.undoStack.length - 1];
  if (latest && historySnapshotsEqual(latest, snapshot)) {
    updateHistoryButtons();
    return false;
  }
  state.undoStack.push(snapshot);
  trimEditorHistory(state.undoStack);
  state.redoStack = [];
  updateHistoryButtons();
  return true;
}

function historyEntryLimit() {
  const cells = activeGridWidth() * activeGridHeight();
  if (cells > 10000) return 24;
  if (cells > 4096) return 32;
  if (cells > 2304) return 48;
  return 60;
}

function trimEditorHistory(stack) {
  return trimHistoryStack(stack, {
    maxEntries: historyEntryLimit(),
    maxBytes: HISTORY_MEMORY_BUDGET,
  });
}

function clearHistory() {
  state.undoStack = [];
  state.redoStack = [];
  updateHistoryButtons();
}

function undoEdit() {
  const currentSnapshot = snapshotPattern();
  while (state.undoStack.length && historySnapshotsEqual(state.undoStack[state.undoStack.length - 1], currentSnapshot)) {
    state.undoStack.pop();
  }
  if (!state.undoStack.length) {
    updateHistoryButtons();
    elements.cellInfo.textContent = "暂无可撤回的有效修改。";
    return;
  }
  const previousSnapshot = state.undoStack.pop();
  restorePattern(previousSnapshot);
  state.redoStack.push(currentSnapshot);
  trimEditorHistory(state.redoStack);
  updateHistoryButtons();
  elements.cellInfo.textContent = "已撤回一步";
  markProjectDirty();
}

function redoEdit() {
  const currentSnapshot = snapshotPattern();
  while (state.redoStack.length && historySnapshotsEqual(state.redoStack[state.redoStack.length - 1], currentSnapshot)) {
    state.redoStack.pop();
  }
  if (!state.redoStack.length) {
    updateHistoryButtons();
    elements.cellInfo.textContent = "暂无可重做的有效修改。";
    return;
  }
  const nextSnapshot = state.redoStack.pop();
  restorePattern(nextSnapshot);
  state.undoStack.push(currentSnapshot);
  trimEditorHistory(state.undoStack);
  updateHistoryButtons();
  elements.cellInfo.textContent = "已重做一步";
  markProjectDirty();
}

function updateHistoryButtons() {
  elements.undoButton.disabled = !state.undoStack.length;
  elements.redoButton.disabled = !state.redoStack.length;
}

function replaceColorInGrid(oldColorId, newColorId, options = {}) {
  const oldCode = String(oldColorId || "").trim().toUpperCase();
  const newCode = String(newColorId || "").trim().toUpperCase();
  if (!oldCode || !newCode || oldCode === newCode) return false;
  if (!state.pattern.length) {
    elements.cellInfo.textContent = "当前还没有正式图纸，不能替换色号。";
    return false;
  }
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前显示的是预览，请先应用或取消预览，再替换正式图纸色号。";
    return false;
  }

  const newColor = paletteColorByCode(newCode);
  if (!newColor) {
    elements.cellInfo.textContent = `未找到色号 ${newCode}。`;
    return false;
  }

  const oldCount = state.pattern.filter((item) => !item.empty && item.code === oldCode).length;
  if (!oldCount && !state.lockedColorCodes.has(oldCode)) {
    elements.cellInfo.textContent = `当前图纸里没有 ${oldCode}。`;
    return false;
  }

  if (state.lockedColorCodes.has(oldCode) && !options.confirmedLocked) {
    const ok = window.confirm(`当前颜色 ${oldCode} 已锁定，共影响 ${oldCount} 颗。是否仍然替换为 ${newCode}？\n确认后锁定状态会转移到 ${newCode}。`);
    if (!ok) return false;
  }

  const beforePattern = [...state.pattern];
  const beforeCounts = buildCounts(beforePattern);
  const beforeLockedOld = state.lockedColorCodes.has(oldCode);
  pushHistory();

  if (state.colorMode === "fixedPalette") {
    state.allowedColorCodes.add(newCode);
    state.disabledColorCodes.delete(newCode);
  }

  state.pattern = state.pattern.map((item) => {
    if (item.empty || item.code !== oldCode) return item;
    return newColor;
  });

  if (beforeLockedOld) {
    state.lockedColorCodes.delete(oldCode);
    state.lockedColorCodes.add(newCode);
    state.allowedColorCodes.add(newCode);
  }
  if (state.selectedColor?.code === oldCode) {
    state.selectedColor = newColor;
  }
  rememberPaletteColor(newColor);
  state.pattern = validateColorConstraints(state.pattern);

  const validation = validateColorReplacementResult(oldCode, newCode, beforePattern, state.pattern, beforeCounts);
  if (!validation.ok) {
    restorePattern(state.undoStack.pop());
    elements.cellInfo.textContent = validation.message;
    return false;
  }

  state.counts = buildCounts(state.pattern);
  state.projectPalette = [...new Map([...state.projectPalette, ...state.counts.values()].map((item) => [item.code, paletteColorByCode(item.code) || item])).values()];
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  refreshDiagnosticsFromCurrentPattern("replaceColor");
  state.hasConfirmedGrid = true;
  state.editGridVersion += 1;
  state.selection.clear();
  updateSelectedColorUi();
  updateSelectionLabel();
  renderPattern();
  renderStats();
  renderConstraintPalette();
  updateHistoryButtons();
  elements.cellInfo.textContent = `${oldCode} 已替换为 ${newCode}，共替换 ${oldCount} 颗。`;
  markProjectDirty();
  return true;
}

function validateColorReplacementResult(oldCode, newCode, beforeGrid, afterGrid, beforeCounts = buildCounts(beforeGrid)) {
  const oldPositions = [];
  beforeGrid.forEach((item, index) => {
    if (!item.empty && item.code === oldCode) oldPositions.push(index);
  });
  const badPosition = oldPositions.find((index) => afterGrid[index]?.code !== newCode);
  if (badPosition !== undefined) {
    return { ok: false, message: `${oldCode} 替换失败：第 ${badPosition + 1} 格没有变成 ${newCode}，已回滚。` };
  }
  const afterCounts = buildCounts(afterGrid);
  const expectedNewCount = (beforeCounts.get(oldCode)?.count || 0) + (beforeCounts.get(newCode)?.count || 0);
  const actualNewCount = afterCounts.get(newCode)?.count || 0;
  if (actualNewCount !== expectedNewCount) {
    return { ok: false, message: `${newCode} 数量校验失败：应为 ${expectedNewCount}，实际 ${actualNewCount}，已回滚。` };
  }
  if ((afterCounts.get(oldCode)?.count || 0) > 0) {
    return { ok: false, message: `${oldCode} 仍存在于图纸中，已回滚。` };
  }
  if (state.selectedColor?.code === oldCode) {
    return { ok: false, message: `当前画笔色仍是 ${oldCode}，已回滚。` };
  }
  return { ok: true, message: "" };
}

function promptReplaceColor(oldCode) {
  const affectedCount = state.pattern.reduce(
    (total, item) => total + Number(!item.empty && item.code === oldCode),
    0,
  );
  const nextCode = window.prompt(`把 ${oldCode} 替换为哪个 MARD 色号？\n当前图纸将影响 ${affectedCount} 颗。`, "");
  if (nextCode === null) return;
  replaceColorInGrid(oldCode, nextCode);
}

function handleKeyboardShortcuts(event) {
  if (isTypingTarget(event.target)) return;
  const key = event.key.toLowerCase();
  if (event.code === "Space") {
    event.preventDefault();
    if (!state.isSpacePressed) {
      state.isSpacePressed = true;
      updateCanvasCursor();
    }
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    if (event.repeat) return;
    const previousTool = state.previousActiveTool;
    if (visibleCanvasTool(previousTool) && previousTool !== state.activeTool) {
      setActiveTool(previousTool);
    } else {
      elements.cellInfo.textContent = "请先切换一次工具，之后按 Tab 可切回上一个工具。";
    }
    return;
  }

  if (state.isSpacePressed || state.isPanningCanvas) return;

  if (!event.ctrlKey && !event.metaKey && !event.altKey && state.selection.size && (key === "delete" || key === "backspace")) {
    event.preventDefault();
    eraseCurrentSelection();
    return;
  }

  const selectionMoves = {
    arrowleft: [-1, 0],
    arrowright: [1, 0],
    arrowup: [0, -1],
    arrowdown: [0, 1],
  };
  if (!event.ctrlKey && !event.metaKey && !event.altKey && state.selection.size && selectionMoves[key]) {
    event.preventDefault();
    moveSelectedRegion(...selectionMoves[key]);
    return;
  }

  const shortcuts = {
    b: "brush",
    i: "eyedropper",
    p: "pen",
    q: "protect",
    u: "eraser",
  };
  if (!event.ctrlKey && !event.metaKey && !event.altKey && shortcuts[key]) {
    event.preventDefault();
    setActiveTool(shortcuts[key]);
    return;
  }

  if (!event.ctrlKey && !event.metaKey) return;
  if (key === "d") {
    event.preventDefault();
    clearSelection();
    elements.cellInfo.textContent = "选区已清空。";
  } else if (key === "c" && state.selection.size) {
    event.preventDefault();
    copySelectionPixels();
  } else if (key === "v" && state.selectionClipboard) {
    event.preventDefault();
    pasteSelectionPixels();
  } else if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redoEdit();
  } else if (key === "z") {
    event.preventDefault();
    undoEdit();
  } else if (key === "y") {
    event.preventDefault();
    redoEdit();
  } else if (key === "=" || key === "+") {
    event.preventDefault();
    setZoom(state.zoom + state.zoomState.step);
  } else if (key === "-" || key === "_") {
    event.preventDefault();
    setZoom(state.zoom - state.zoomState.step);
  } else if (key === "0") {
    event.preventDefault();
    setZoom(1, { center: true });
  }
}

function handleKeyboardKeyUp(event) {
  if (isTypingTarget(event.target)) return;
  if (event.code !== "Space") return;
  event.preventDefault();
  state.isSpacePressed = false;
  if (state.isPanningCanvas) {
    if (state.panPointerId != null && elements.canvasWrap.hasPointerCapture?.(state.panPointerId)) {
      elements.canvasWrap.releasePointerCapture(state.panPointerId);
    }
    state.isPanningCanvas = false;
    state.panPointerId = null;
  }
  updateCanvasCursor();
}

function fillSelectionWithCurrentColor() {
  fillSelectionWithColor(state.selectedColor);
}

function fillSelectionWithColor(color) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；切换到编辑模式后即可填充选区。";
    return;
  }
  if (state.gridLocked) return;
  if (!state.selection.size) return;
  rememberPaletteColor(color);
  applyColorToIndices([...state.selection], color);
}

function selectAllMatchingColor(color) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；切换到编辑模式后即可选择同色格。";
    return;
  }
  state.selection = new Set();
  state.pattern.forEach((item, index) => {
    if (item.code === color.code) state.selection.add(index);
  });
  updateSelectionLabel();
  elements.cellInfo.textContent = `已选中 ${color.code} 共 ${state.selection.size} 格，可拖拽或点击其他颜色后填充。`;
  renderPattern();
}

function rememberPaletteColor(color) {
  if (color.empty) return;
  state.recentColorCodes = [color.code, ...state.recentColorCodes.filter((code) => code !== color.code)].slice(0, 8);
  if (!state.projectPalette.some((item) => item.code === color.code)) {
    state.projectPalette.push(color);
  }
}

function applyColorToIndices(indices, color, recordHistory = true) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；切换到编辑模式后即可修改。";
    return;
  }
  if (state.gridLocked && recordHistory) return;
  const constrainedColor = manualPaintColor(color);
  const targetIndices = [...new Set(indices)].filter((index) => {
    if (!canEditCell(index)) return false;
    return !samePatternColor(state.pattern[index], constrainedColor);
  });
  if (!targetIndices.length) {
    updateSelectionLabel();
    requestPatternRender();
    return false;
  }
  if (recordHistory) pushHistory();
  rememberPaletteColor(constrainedColor);
  const countChanges = [];
  for (const index of targetIndices) {
    const before = state.pattern[index];
    state.pattern[index] = constrainedColor;
    countChanges.push({ before, after: constrainedColor });
    state.manualEditedCells.add(index);
  }
  applyCountChanges(state.counts, countChanges);
  const validation = validateColorConstraints(state.pattern, { withReport: true });
  state.pattern = validation.pattern;
  if (validation.violationCount) state.counts = buildCounts(state.pattern);
  state.hasConfirmedGrid = true;
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  scheduleQualityMetricsRefresh();
  updateSelectionLabel();
  updateProtectionUi();
  renderPattern();
  renderStats();
  return true;
}

function toggleEditing() {
  state.editing = !state.editing;
  elements.editToggle.classList.toggle("is-active", state.editing);
  updateCanvasCursor();
  elements.editToolPanel.hidden = !state.editing;
  elements.cellInfo.textContent = state.editing ? "点选右侧颜色，再点图纸格子改色" : "编辑已关闭";
}

function toggleGridLock() {
  state.gridLocked = !state.gridLocked;
  updateGridLockUi();
}

function updateGridLockUi() {
  elements.lockGridButton.classList.toggle("is-active", state.gridLocked);
  elements.lockGridButton.innerHTML = state.gridLocked
    ? '<i data-lucide="lock" aria-hidden="true"></i> 锁定'
    : '<i data-lucide="lock-open" aria-hidden="true"></i> 解锁';
  updateCanvasCursor();
  if (state.gridLocked) {
    elements.cellInfo.textContent = "格子已锁定：可以缩放查看，不会误改颜色。";
  }
  window.lucide?.createIcons();
}

function toggleToolboxLock() {
  state.toolboxLocked = !state.toolboxLocked;
  updateToolboxLockUi();
}

function updateToolboxLockUi() {
  if (state.toolboxLocked) {
    state.toolboxMoveActive = false;
    state.toolboxDrag = null;
    elements.editToolPanel.classList.remove("is-dragging");
  }
  elements.editToolPanel.classList.toggle("is-locked", state.toolboxLocked);
  elements.toolboxLockButton.classList.toggle("is-active", state.toolboxLocked);
  elements.toolboxLockButton.innerHTML = state.toolboxLocked
    ? '<i data-lucide="lock" aria-hidden="true"></i>'
    : '<i data-lucide="unlock" aria-hidden="true"></i>';
  elements.toolboxLockButton.title = state.toolboxLocked ? "工具栏位置已锁定" : "锁住工具栏位置";
  window.lucide?.createIcons();
}

function setupToolboxDrag() {
  const panel = elements.editToolPanel;
  const handle = panel?.querySelector(".group-title");
  if (!panel || !handle) return;
  if (panel.classList.contains("is-docked")) return;

  handle.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    if (state.toolboxLocked) return;
    state.toolboxMoveActive = !state.toolboxMoveActive;
    panel.classList.toggle("is-dragging", state.toolboxMoveActive);
    const rect = panel.getBoundingClientRect();
    state.toolboxDrag = {
      offsetX: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      offsetY: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    };
  });

  document.addEventListener("pointermove", (event) => {
    if (!state.toolboxMoveActive || !state.toolboxDrag || state.toolboxLocked) return;
    const left = clampRange(event.clientX - state.toolboxDrag.offsetX, 8, window.innerWidth - panel.offsetWidth - 8);
    const top = clampRange(event.clientY - state.toolboxDrag.offsetY, 8, window.innerHeight - 80);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  });
}

function baseCanvasCssSize() {
  const view = state.editorView === "sheet" ? sheet : gridEditor;
  const width = state.editorView === "sheet" ? 540 : 840;
  return {
    width,
    height: width * (view.height / view.width),
  };
}

function setZoom(value, options = {}) {
  const zoomOptions = options && typeof options === "object" ? options : {};
  const settings = state.zoomState || { minZoom: 0.25, maxZoom: 4, step: 0.1 };
  const nextZoom = clampRange(Number(value) || 1, settings.minZoom, settings.maxZoom);
  const wrap = elements.canvasWrap;
  const previousZoom = Math.max(0.01, state.zoom || 1);
  const hasAnchor = Number.isFinite(zoomOptions.anchorX) && Number.isFinite(zoomOptions.anchorY);
  const base = baseCanvasCssSize();
  const targetWidth = `${Math.round(base.width * nextZoom)}px`;
  const targetHeight = `${Math.round(base.height * nextZoom)}px`;
  const zoomChanged = Math.abs(nextZoom - previousZoom) > 0.0001;
  const canvasSizeChanged = elements.patternCanvas.style.width !== targetWidth || elements.patternCanvas.style.height !== targetHeight;

  if (!zoomChanged && !canvasSizeChanged && !zoomOptions.center && !hasAnchor) {
    elements.zoomLabel.textContent = `${Math.round(nextZoom * 100)}%`;
    return false;
  }

  const anchorX = hasAnchor ? zoomOptions.anchorX : wrap.clientWidth / 2;
  const anchorY = hasAnchor ? zoomOptions.anchorY : wrap.clientHeight / 2;
  const anchorContentX = wrap.scrollLeft + anchorX;
  const anchorContentY = wrap.scrollTop + anchorY;
  const oldScrollWidth = Math.max(1, wrap.scrollWidth - wrap.clientWidth);
  const oldScrollHeight = Math.max(1, wrap.scrollHeight - wrap.clientHeight);
  const centerRatioX = oldScrollWidth ? (wrap.scrollLeft + wrap.clientWidth / 2) / Math.max(1, wrap.scrollWidth) : 0.5;
  const centerRatioY = oldScrollHeight ? (wrap.scrollTop + wrap.clientHeight / 2) / Math.max(1, wrap.scrollHeight) : 0.5;
  const renderDetailBefore = state.pattern.length ? canvasRenderDetail(activePlotMetrics().cell) : null;

  state.zoom = nextZoom;
  elements.patternCanvas.style.width = targetWidth;
  elements.patternCanvas.style.height = targetHeight;
  elements.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;

  requestAnimationFrame(() => {
    if (renderDetailBefore !== null && renderDetailBefore !== canvasRenderDetail(activePlotMetrics().cell)) {
      requestPatternRender();
    }
    if (zoomOptions.center) {
      wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2);
      wrap.scrollTop = Math.max(0, (wrap.scrollHeight - wrap.clientHeight) / 2);
      return;
    }
    if (hasAnchor) {
      const zoomRatio = nextZoom / previousZoom;
      wrap.scrollLeft = Math.max(0, anchorContentX * zoomRatio - anchorX);
      wrap.scrollTop = Math.max(0, anchorContentY * zoomRatio - anchorY);
      return;
    }
    wrap.scrollLeft = Math.max(0, centerRatioX * wrap.scrollWidth - wrap.clientWidth / 2);
    wrap.scrollTop = Math.max(0, centerRatioY * wrap.scrollHeight - wrap.clientHeight / 2);
  });
  return true;
}

function fitCanvasToScreen() {
  const wrap = elements.canvasWrap;
  const base = baseCanvasCssSize();
  const availableWidth = Math.max(120, wrap.clientWidth - 36);
  const availableHeight = Math.max(120, wrap.clientHeight - 36);
  const fitZoom = Math.min(availableWidth / base.width, availableHeight / base.height);
  setZoom(fitZoom, { center: true });
}

