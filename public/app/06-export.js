/* 小麦拼豆 — 06-export.js
 * PNG / PDF 导出与用豆清单
 */
async function exportPattern() {
  if (!canLeaveTransformWithCurrentPreview("export")) return;
  if (!state.pattern.length || state.exportInProgress) return;
  const includeWatermark = elements.exportWatermarkToggle?.checked ?? state.exportWatermarkEnabled;
  const snapshot = currentExportSnapshot();
  state.exportWatermarkEnabled = includeWatermark;
  setExportBusy(true);
  elements.cellInfo.textContent = "正在生成清晰图纸，请稍候…";
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  try {
    if (elements.exportFormat?.value === "pdf") {
      await exportPatternPdf({ includeWatermark, ...snapshot });
    } else {
      const readableCanvas = renderReadableExportCanvas({ includeWatermark, ...snapshot });
      await downloadCanvas(readableCanvas, `${state.fileName || "小麦拼豆"}-${activeGridWidth()}x${activeGridHeight()}-高清.png`);
    }
    elements.cellInfo.textContent = "图纸已生成并开始下载。";
  } catch (error) {
    console.error("导出图纸失败", error);
    elements.cellInfo.textContent = `导出失败：${error.message || error}`;
  } finally {
    setExportBusy(false);
  }
}

function setExportBusy(isBusy) {
  state.exportInProgress = isBusy;
  elements.exportButton.disabled = isBusy;
}

function renderReadableExportCanvas(options = {}) {
  const includeWatermark = options.includeWatermark !== false;
  const pattern = options.pattern || displayPattern();
  const counts = options.counts || buildCounts(pattern);
  const rows = options.rows || [...counts.values()].sort((a, b) => b.count - a.count);
  return exportRenderer.renderReadableExportCanvas({
    document,
    includeWatermark,
    pattern,
    counts,
    rows,
    widthCells: activeGridWidth(),
    heightCells: activeGridHeight(),
    stride: state.gridSize,
    fileName: state.fileName,
    dimensionsLabel: gridDimensionsLabel(),
    totalBeads: totalBeadCount(pattern),
    contrastColor,
  });
}

function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("浏览器无法生成图片文件。"));
    }, type, quality);
  });
}

async function downloadCanvas(canvas, fileName) {
  try {
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, fileName);
  } finally {
    releaseCanvasMemory(canvas);
  }
}

async function exportPatternPdf(options = {}) {
  const pdfBytes = buildVectorPdf(options);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  downloadBlob(blob, `${state.fileName || "小麦拼豆"}-${activeGridWidth()}x${activeGridHeight()}-清晰图纸.pdf`);
}

function buildVectorPdf(options = {}) {
  const includeWatermark = options.includeWatermark !== false;
  const pattern = options.pattern || displayPattern();
  const counts = options.counts || buildCounts(pattern);
  return exportRenderer.buildVectorPdf({
    includeWatermark,
    pattern,
    counts,
    rows: options.rows || [...counts.values()].sort((a, b) => b.count - a.count),
    widthCells: activeGridWidth(),
    heightCells: activeGridHeight(),
    stride: state.gridSize,
    guideEvery: state.guideEvery,
    fileName: state.fileName,
    dimensionsLabel: gridDimensionsLabel(),
    totalBeads: totalBeadCount(pattern),
    paletteSize: palette.length,
    contrastColor,
    hexToRgb,
    pdfColor,
    pdfTextToken,
    pdfTextWidth,
    roundPdf,
    createPdf,
  });
}

async function copyBeadList() {
  if (!state.counts.size) return;
  const text = sortedCounts()
    .map((item) => `${item.code} ${item.name}: ${item.count} 颗`)
    .join("\n");

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }

  elements.copyListButton.title = "已复制";
  window.clearTimeout(copyListResetTimer);
  copyListResetTimer = window.setTimeout(() => {
    copyListResetTimer = null;
    elements.copyListButton.title = "复制清单";
  }, 1200);
}

