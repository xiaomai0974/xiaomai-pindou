const fallbackPaletteData = [
  ["B1", "纯白", "#ffffff"],
  ["H7", "黑色", "#151515"],
  ["F9", "番茄红", "#d9303e"],
  ["E8", "柠檬黄", "#ffd533"],
  ["B4", "宝蓝", "#2366b5"],
  ["B2", "草绿", "#65b943"],
  ["F14", "肤色", "#d99a72"],
  ["H5", "深灰", "#4d4d4d"],
  ["H2", "浅灰", "#b8b8b8"],
  ["E2", "浅紫", "#c9b8ef"],
  ["E4", "桃粉", "#ec668c"],
  ["F1", "奶白", "#f7f2e8"],
  ["F3", "浅粉", "#f8a9bd"],
  ["F6", "橙黄", "#f9a22f"],
  ["C6", "湖蓝", "#26a8d5"],
  ["B6", "薄荷绿", "#9ce0c1"],
  ["E6", "紫色", "#7652b8"],
  ["G4", "焦糖", "#aa6b3d"],
  ["F7", "浅肤", "#f2c7a4"],
  ["D7", "莓果红", "#a81f42"],
  ["C3", "天蓝", "#7cc7ef"],
  ["B8", "青绿", "#2eb998"],
  ["G7", "深棕", "#422a1e"],
  ["E1", "奶油黄", "#ffe78a"],
  ["F5", "珊瑚橙", "#f36d3d"],
  ["C9", "海军蓝", "#1d355f"],
  ["B9", "墨绿", "#23724c"],
  ["B7", "橄榄绿", "#7d8f38"],
  ["F2", "米色", "#ddc7a0"],
  ["F8", "杏色", "#f3b36d"],
  ["E9", "玫粉", "#d33e89"],
  ["E7", "深紫", "#4a347e"],
  ["D9", "酒红", "#6e2031"],
  ["C8", "青蓝", "#126b78"],
  ["C1", "浅青", "#a7e4e0"],
  ["G2", "棕色", "#70462c"],
].map(([code, name, hex]) => ({ colorId: code, colorName: name, hex, brand: "MARD" }));

const PALETTE_NAME = "MARD 221";
const PALETTE_LIMIT = 221;
const DEFAULT_COLOR_LIMIT = 16;

const paletteSource = Array.isArray(window.MARD_221_PALETTE) && window.MARD_221_PALETTE.length
  ? window.MARD_221_PALETTE
  : fallbackPaletteData.slice(0, PALETTE_LIMIT);

const palette = paletteSource.slice(0, PALETTE_LIMIT).map((entry) => {
  const code = entry.colorId || entry.code;
  const name = code === "F1" ? "奶白" : entry.colorName || entry.name || code;
  const hex = code === "F1" ? "#f7f2e8" : entry.hex;
  const rgb = hexToRgb(hex);
  return {
    code,
    colorId: code,
    name,
    colorName: name,
    hex,
    rgb,
    lab: rgbToLab(rgb),
    brand: entry.brand || "MARD",
  };
});

const nearestColorCache = new Map();

const sheet = {
  width: 1080,
  height: 1440,
  plotX: 74,
  plotY: 154,
  plotSize: 932,
  titleY: 76,
  legendY: 1240,
};

const gridEditor = {
  width: 1800,
  height: 1800,
  plotX: 120,
  plotY: 120,
  plotSize: 1560,
};

const EMPTY_CELL = {
  code: "",
  name: "空",
  hex: "#ffffff",
  rgb: { r: 255, g: 255, b: 255 },
  lab: rgbToLab({ r: 255, g: 255, b: 255 }),
  empty: true,
};

const PROJECT_FILE_VERSION = 1;
const PROJECT_FILE_EXTENSION = "xiaomai";
const AUTOSAVE_DB_NAME = "xiaomai-pindou-projects";
const AUTOSAVE_STORE_NAME = "projects";
const AUTOSAVE_KEY = "latest";
const PROJECT_DB_VERSION = 2;
const LIBRARY_META_STORE_NAME = "libraryMeta";
const LIBRARY_DATA_STORE_NAME = "libraryData";

const state = {
  image: null,
  sourceImageState: null,
  fileName: "",
  appMode: "auto",
  patternMode: "illustration",
  processingProfile: "compact48",
  gridSize: 48,
  gridWidth: 48,
  gridHeight: 48,
  colorLimit: DEFAULT_COLOR_LIMIT,
  pixelBackground: "empty",
  showCellCodes: true,
  showCoordinates: true,
  guideEvery: 5,
  colorMode: "max",
  allowedColorCodes: new Set(),
  lockedColorCodes: new Set(),
  disabledColorCodes: new Set(),
  paletteSearch: "",
  showSelectedColorsOnly: false,
  dither: false,
  showGrid: true,
  fitMode: "subject",
  removeTransparent: true,
  lineBoost: true,
  outlineMode: "light",
  dominantSampling: true,
  mergeSimilarColors: true,
  cleanSmallRegions: true,
  animeMode: false,
  minRegionSize: 3,
  mergeBoost: 0,
  localPreprocessSettings: {
    enabled: true,
    flatColorSimplification: true,
    antiAliasCleanup: true,
    outlinePreserve: true,
    noiseReduction: true,
    materialTextureCleanup: true,
    backgroundCleanup: true,
    regionColorStabilization: true,
    regionToneCompression: true,
    outlineColorConvergence: true,
  },
  optimizedBaseImage: null,
  optimizedBaseImageSignature: "",
  referenceImage: null,
  referenceImageUrl: "",
  referenceName: "",
  referenceVisible: true,
  referenceAbove: false,
  referenceOpacity: 0.35,
  referenceLocked: false,
  referencePanel: {
    x: null,
    y: null,
    width: 220,
    height: 220,
    zoom: 1,
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startPanelX: 0,
    startPanelY: 0,
  },
  traceReference: {
    enabled: true,
    visible: true,
    opacity: 0.35,
    zMode: "aboveGrid",
    scale: 1,
    x: null,
    y: null,
    locked: true,
    snapToGrid: false,
    adjustMode: false,
    dragging: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
  },
  viewMode: "pixel",
  pattern: [],
  previewPattern: [],
  previewCounts: new Map(),
  previewQualityMetrics: null,
  previewBackgroundMask: null,
  previewPreservesManualEdits: false,
  previewCanvasSnapshot: null,
  rawMappedGrid: [],
  rawSampleData: [],
  rawDebugCandidates: [],
  finalGrid: [],
  colorTrace: [],
  accurateMatch: true,
  colorDebugEnabled: false,
  diagnosticViewMode: "raw",
  baselineGrid: [],
  optimizedGrid: [],
  compareMetrics: null,
  backgroundMask: null,
  isPreviewDirty: false,
  hasConfirmedGrid: false,
  editGridVersion: 0,
  previewGridVersion: 0,
  manualEditCount: 0,
  manualEditedCells: new Set(),
  patternSize: 48,
  counts: new Map(),
  projectPalette: [],
  qualityMetrics: null,
  usedBounds: null,
  zoom: 1,
  zoomState: {
    minZoom: 0.25,
    maxZoom: 4,
    step: 0.1,
  },
  editorView: "grid",
  editing: true,
  gridLocked: false,
  activeTool: "brush",
  brushSize: 1,
  brushShape: "square",
  symmetryMode: "none",
  allowEditLockedCells: false,
  isSpacePressed: false,
  isPanningCanvas: false,
  panPointerId: null,
  panStartX: 0,
  panStartY: 0,
  panStartScrollLeft: 0,
  panStartScrollTop: 0,
  previousActiveTool: null,
  strokeVisited: new Set(),
  lineStartCell: null,
  brushHoverCell: null,
  selection: new Set(),
  selectionClipboard: null,
  dragStartCell: null,
  dragPreview: null,
  isBrushPainting: false,
  lastBrushIndex: null,
  lastBrushCell: null,
  isErasing: false,
  lastEraseIndex: null,
  lastEraseCell: null,
  penPoints: [],
  renderFrameId: null,
  isProcessingPattern: false,
  referenceSampler: {
    image: null,
    canvas: null,
    context: null,
  },
  undoStack: [],
  redoStack: [],
  projectDirty: false,
  projectSavedAt: null,
  projectCreatedAt: null,
  libraryProjectId: null,
  projectRestoring: false,
  autosaveTimer: null,
  autosaveStatusTimer: null,
  suspendHistory: false,
  selectedColor: null,
  selectedCell: null,
  toolboxDrag: null,
  toolboxMoveActive: false,
  toolboxLocked: false,
  exportWatermarkEnabled: true,
  pendingOptimizePlans: [],
};

function activeGridWidth() {
  return clampRange(Math.round(Number(state.gridWidth) || state.gridSize || 48), 16, 160);
}

function activeGridHeight() {
  return clampRange(Math.round(Number(state.gridHeight) || state.gridSize || 48), 16, 160);
}

function gridDimensionsLabel() {
  return `${activeGridWidth()} x ${activeGridHeight()}`;
}

function isActiveGridCell(x, y) {
  return x >= 0 && y >= 0 && x < activeGridWidth() && y < activeGridHeight();
}

function constrainPatternToCanvas(pattern) {
  if (!Array.isArray(pattern)) return pattern;
  const stride = state.gridSize;
  const width = activeGridWidth();
  const height = activeGridHeight();
  if (width === stride && height === stride) return [...pattern];
  return pattern.map((item, index) => {
    const x = index % stride;
    const y = Math.floor(index / stride);
    return x < width && y < height ? item : EMPTY_CELL;
  });
}

const elements = {
  uploadZone: document.querySelector(".upload-zone"),
  imageInput: document.querySelector("#imageInput"),
  openProjectButton: document.querySelector("#openProjectButton"),
  saveProjectButton: document.querySelector("#saveProjectButton"),
  projectFileInput: document.querySelector("#projectFileInput"),
  projectSaveStatus: document.querySelector("#projectSaveStatus"),
  saveToLibraryButton: document.querySelector("#saveToLibraryButton"),
  projectLibraryCount: document.querySelector("#projectLibraryCount"),
  projectLibraryList: document.querySelector("#projectLibraryList"),
  sizeLabel: document.querySelector("#sizeLabel"),
  colorLabel: document.querySelector("#colorLabel"),
  fitModeLabel: document.querySelector("#fitModeLabel"),
  colorLimit: document.querySelector("#colorLimit"),
  customColorLimitInput: document.querySelector("#customColorLimitInput"),
  applyCustomColorLimitButton: document.querySelector("#applyCustomColorLimitButton"),
  customSizeInput: document.querySelector("#customSizeInput"),
  customHeightInput: document.querySelector("#customHeightInput"),
  applyCustomSizeButton: document.querySelector("#applyCustomSizeButton"),
  recropButton: document.querySelector("#recropButton"),
  appModeLabel: document.querySelector("#appModeLabel"),
  appModeOptions: document.querySelectorAll(".app-mode-option"),
  newBlankCanvasButton: document.querySelector("#newBlankCanvasButton"),
  patternModeLabel: document.querySelector("#patternModeLabel"),
  pixelModeOptions: document.querySelectorAll(".pattern-mode-option"),
  processingProfileLabel: document.querySelector("#processingProfileLabel"),
  processingProfileHint: document.querySelector("#processingProfileHint"),
  processingProfileOptions: document.querySelectorAll(".processing-profile-option"),
  pixelBackgroundLabel: document.querySelector("#pixelBackgroundLabel"),
  backgroundHint: document.querySelector("#backgroundHint"),
  showCodesToggle: document.querySelector("#showCodesToggle"),
  showCoordsToggle: document.querySelector("#showCoordsToggle"),
  guideEvery5Toggle: document.querySelector("#guideEvery5Toggle"),
  ditherToggle: document.querySelector("#ditherToggle"),
  gridToggle: document.querySelector("#gridToggle"),
  transparentToggle: document.querySelector("#transparentToggle"),
  lineBoostToggle: document.querySelector("#lineBoostToggle"),
  outlineModeSelect: document.querySelector("#outlineModeSelect"),
  dominantSamplingToggle: document.querySelector("#dominantSamplingToggle"),
  mergeSimilarToggle: document.querySelector("#mergeSimilarToggle"),
  cleanSmallRegionsToggle: document.querySelector("#cleanSmallRegionsToggle"),
  animeModeToggle: document.querySelector("#animeModeToggle"),
  minRegionSize: document.querySelector("#minRegionSize"),
  minRegionLabel: document.querySelector("#minRegionLabel"),
  referenceInput: document.querySelector("#referenceInput"),
  referenceStatus: document.querySelector("#referenceStatus"),
  referenceVisibleToggle: document.querySelector("#referenceVisibleToggle"),
  referenceAboveToggle: document.querySelector("#referenceAboveToggle"),
  referenceOpacity: document.querySelector("#referenceOpacity"),
  referenceOpacityLabel: document.querySelector("#referenceOpacityLabel"),
  referenceMenuButton: document.querySelector("#referenceMenuButton"),
  referenceMenu: document.querySelector("#referenceMenu"),
  referenceMenuStatus: document.querySelector("#referenceMenuStatus"),
  referenceUploadMenuText: document.querySelector("#referenceUploadMenuText"),
  referenceToggleVisibleButton: document.querySelector("#referenceToggleVisibleButton"),
  referenceLockButton: document.querySelector("#referenceLockButton"),
  referenceFitButton: document.querySelector("#referenceFitButton"),
  referenceClearButton: document.querySelector("#referenceClearButton"),
  referenceOpacityProxy: document.querySelector("#referenceOpacityProxy"),
  referenceOpacityProxyLabel: document.querySelector("#referenceOpacityProxyLabel"),
  traceReferenceToolbar: document.querySelector("#traceReferenceToolbar"),
  traceReferenceToggle: document.querySelector("#traceReferenceToggle"),
  traceReferenceAdjustButton: document.querySelector("#traceReferenceAdjustButton"),
  traceReferenceLockButton: document.querySelector("#traceReferenceLockButton"),
  traceReferenceOpacity: document.querySelector("#traceReferenceOpacity"),
  traceReferenceOpacityLabel: document.querySelector("#traceReferenceOpacityLabel"),
  traceReferenceZoomOutButton: document.querySelector("#traceReferenceZoomOutButton"),
  traceReferenceZoomInButton: document.querySelector("#traceReferenceZoomInButton"),
  traceReferenceFitButton: document.querySelector("#traceReferenceFitButton"),
  traceReferenceCenterButton: document.querySelector("#traceReferenceCenterButton"),
  traceReferenceClearButton: document.querySelector("#traceReferenceClearButton"),
  traceReferenceSnapToggle: document.querySelector("#traceReferenceSnapToggle"),
  pendingPreviewBar: document.querySelector("#pendingPreviewBar"),
  confirmPreviewButton: document.querySelector("#confirmPreviewButton"),
  discardPreviewButton: document.querySelector("#discardPreviewButton"),
  exportButton: document.querySelector("#exportButton"),
  exportFormat: document.querySelector("#exportFormat"),
  exportWatermarkToggle: document.querySelector("#exportWatermarkToggle"),
  coverButton: document.querySelector("#coverButton"),
  resetButton: document.querySelector("#resetButton"),
  copyListButton: document.querySelector("#copyListButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomResetButton: document.querySelector("#zoomResetButton"),
  fitButton: document.querySelector("#fitButton"),
  zoomLabel: document.querySelector("#zoomLabel"),
  editToggle: document.querySelector("#editToggle"),
  lockGridButton: document.querySelector("#lockGridButton"),
  editToolPanel: document.querySelector("#editToolPanel"),
  toolboxLockButton: document.querySelector("#toolboxLockButton"),
  selectionLabel: document.querySelector("#selectionLabel"),
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  brushSizeInput: document.querySelector("#brushSizeInput"),
  brushShapeSelect: document.querySelector("#brushShapeSelect"),
  symmetryModeSelect: document.querySelector("#symmetryModeSelect"),
  mirrorHorizontalButton: document.querySelector("#mirrorHorizontalButton"),
  mirrorVerticalButton: document.querySelector("#mirrorVerticalButton"),
  allowLockedEditToggle: document.querySelector("#allowLockedEditToggle"),
  fillSelectionButton: document.querySelector("#fillSelectionButton"),
  finishPenButton: document.querySelector("#finishPenButton"),
  copySelectionButton: document.querySelector("#copySelectionButton"),
  pasteSelectionButton: document.querySelector("#pasteSelectionButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  currentColorSwatch: document.querySelector("#currentColorSwatch"),
  currentColorName: document.querySelector("#currentColorName"),
  cellInfo: document.querySelector("#cellInfo"),
  patternCanvas: document.querySelector("#patternCanvas"),
  canvasWrap: document.querySelector("#canvasWrap"),
  referenceFloatPanel: document.querySelector("#referenceFloatPanel"),
  referenceFloatHeader: document.querySelector("#referenceFloatHeader"),
  referenceFloatImage: document.querySelector("#referenceFloatImage"),
  referenceFloatLockButton: document.querySelector("#referenceFloatLockButton"),
  referenceFloatZoomOutButton: document.querySelector("#referenceFloatZoomOutButton"),
  referenceFloatZoomInButton: document.querySelector("#referenceFloatZoomInButton"),
  referenceFloatFitButton: document.querySelector("#referenceFloatFitButton"),
  referenceFloatHideButton: document.querySelector("#referenceFloatHideButton"),
  localPreprocessToolbar: document.querySelector("#localPreprocessToolbar"),
  localPreprocessEnabledToggle: document.querySelector("#localPreprocessEnabledToggle"),
  localPreprocessMenuButton: document.querySelector("#localPreprocessMenuButton"),
  localPreprocessPanel: document.querySelector("#localPreprocessPanel"),
  flatColorSimplificationToggle: document.querySelector("#flatColorSimplificationToggle"),
  antiAliasCleanupToggle: document.querySelector("#antiAliasCleanupToggle"),
  outlinePreservePreprocessToggle: document.querySelector("#outlinePreservePreprocessToggle"),
  noiseReductionToggle: document.querySelector("#noiseReductionToggle"),
  materialTextureCleanupToggle: document.querySelector("#materialTextureCleanupToggle"),
  backgroundCleanupToggle: document.querySelector("#backgroundCleanupToggle"),
  regionColorStabilizationToggle: document.querySelector("#regionColorStabilizationToggle"),
  regionToneCompressionToggle: document.querySelector("#regionToneCompressionToggle"),
  outlineColorConvergenceToggle: document.querySelector("#outlineColorConvergenceToggle"),
  localPreprocessPreviewButton: document.querySelector("#localPreprocessPreviewButton"),
  localPreprocessApplyButton: document.querySelector("#localPreprocessApplyButton"),
  localPreprocessRestoreButton: document.querySelector("#localPreprocessRestoreButton"),
  localPreprocessStatus: document.querySelector("#localPreprocessStatus"),
  cropModal: document.querySelector("#cropModal"),
  cropCanvas: document.querySelector("#cropCanvas"),
  cropZoom: document.querySelector("#cropZoom"),
  confirmCropButton: document.querySelector("#confirmCropButton"),
  skipCropButton: document.querySelector("#skipCropButton"),
  emptyState: document.querySelector("#emptyState"),
  projectName: document.querySelector("#projectName"),
  projectMeta: document.querySelector("#projectMeta"),
  paletteList: document.querySelector("#paletteList"),
  legendStrip: document.querySelector("#legendStrip"),
  totalBeads: document.querySelector("#totalBeads"),
  colorModeLabel: document.querySelector("#colorModeLabel"),
  constraintPalette: document.querySelector("#constraintPalette"),
  paletteSearchInput: document.querySelector("#paletteSearchInput"),
  showSelectedColorsButton: document.querySelector("#showSelectedColorsButton"),
  smartOptimizeButton: document.querySelector("#smartOptimizeButton"),
  variantButton: document.querySelector("#variantButton"),
  optimizePanel: document.querySelector("#optimizePanel"),
  optimizeBody: document.querySelector("#optimizeBody"),
  closeOptimizeButton: document.querySelector("#closeOptimizeButton"),
  accurateMatchToggle: document.querySelector("#accurateMatchToggle"),
  colorDebugToggle: document.querySelector("#colorDebugToggle"),
  showFinalGridButton: document.querySelector("#showFinalGridButton"),
  showRawGridButton: document.querySelector("#showRawGridButton"),
  colorDebugInfo: document.querySelector("#colorDebugInfo"),
};

const ctx = elements.patternCanvas.getContext("2d");
const cropCtx = elements.cropCanvas?.getContext("2d");
const renderCache = {
  statsSignature: null,
  constraintSignature: null,
};
const plotMetricsCache = {
  signature: null,
  value: null,
};
const watermarkTileCache = new Map();
const performanceMetrics = new Map();
let pendingPatternRenderBounds = null;
let pendingFullPatternRender = false;
let paletteWorker = null;
let paletteWorkerDisabled = false;
let paletteWorkerRequestId = 0;
let previewUpdateVersion = 0;
const pendingPaletteWorkerRequests = new Map();

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function recordPerformance(name, durationMs, skipped = false) {
  const metric = performanceMetrics.get(name) || {
    runs: 0,
    skipped: 0,
    totalMs: 0,
    maxMs: 0,
    lastMs: 0,
  };
  if (skipped) {
    metric.skipped += 1;
  } else {
    metric.runs += 1;
    metric.totalMs += durationMs;
    metric.maxMs = Math.max(metric.maxMs, durationMs);
    metric.lastMs = durationMs;
  }
  performanceMetrics.set(name, metric);
}

function measurePerformance(name, action) {
  const startedAt = performanceNow();
  try {
    return action();
  } finally {
    recordPerformance(name, performanceNow() - startedAt);
  }
}

function performanceSummary() {
  return Object.fromEntries(
    [...performanceMetrics.entries()].map(([name, metric]) => [
      name,
      {
        runs: metric.runs,
        skipped: metric.skipped,
        averageMs: metric.runs ? Number((metric.totalMs / metric.runs).toFixed(2)) : 0,
        maxMs: Number(metric.maxMs.toFixed(2)),
        lastMs: Number(metric.lastMs.toFixed(2)),
      },
    ]),
  );
}

window.xiaomaiPerformance = {
  summary: performanceSummary,
  reset() {
    performanceMetrics.clear();
  },
};

const cropState = {
  image: null,
  file: null,
  zoom: 1,
  baseScale: 1,
  offsetX: 0,
  offsetY: 0,
  crop: { x: 120, y: 70, size: 380 },
  dragMode: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  startCrop: null,
};
state.colorLimit = Math.min(state.colorLimit, palette.length);
state.selectedColor = palette.find((item) => item.code === "H7") || palette.find((item) => item.lab.l < 20) || palette[0];
state.allowedColorCodes = new Set(palette.slice(0, state.colorLimit).map((item) => item.code));
validateMardPalette();

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function colorDistance(a, b) {
  return deltaE(a.lab || rgbToLab(a), b.lab || rgbToLab(b));
}

function rgbToLab(rgb) {
  const linear = [rgb.r, rgb.g, rgb.b].map((value) => {
    const normalized = value / 255;
    return normalized > 0.04045 ? ((normalized + 0.055) / 1.055) ** 2.4 : normalized / 12.92;
  });

  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = (linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722) / 1.0;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function deltaE(a, b) {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function activePalette() {
  const colors = palette.slice(0, clampColorLimit(state.colorLimit));
  const background = state.pixelBackground === "white" ? whiteBeadColor() : null;
  if (background && !colors.some((item) => item.code === background.code)) colors.push(background);
  return colors;
}

function clampColorLimit(value) {
  const lockedCount = state.lockedColorCodes.size;
  const parsed = Math.round(Number(value));
  const fallback = Number.isFinite(parsed) ? parsed : state.colorLimit;
  return clampRange(Math.max(1, fallback, lockedCount), 1, palette.length);
}

function paletteSignature(sourcePalette) {
  if (sourcePalette.length === palette.length) return `all-${palette.length}`;
  return sourcePalette.map((item) => item.code).join("|");
}

function whiteBeadColor() {
  return palette.find((item) => item.code === "F1") || nearestPaletteColor({ r: 247, g: 242, b: 232, lab: rgbToLab({ r: 247, g: 242, b: 232 }) }, palette);
}

function fallbackPaletteColor() {
  return palette.find((item) => !state.disabledColorCodes.has(item.code)) || palette[0];
}

function paletteByCodes(codes) {
  const codeSet = codes instanceof Set ? codes : new Set(codes);
  return palette.filter((item) => codeSet.has(item.code));
}

function backgroundColorCodes() {
  return state.pixelBackground === "white" ? new Set(["F1"]) : new Set();
}

function effectiveAllowedPalette() {
  let source;
  if (state.colorMode === "fixedPalette") {
    source = paletteByCodes(new Set([...state.allowedColorCodes, ...state.lockedColorCodes, ...backgroundColorCodes()]));
  } else {
    source = palette;
  }

  const filtered = source.filter((item) => !state.disabledColorCodes.has(item.code) || state.lockedColorCodes.has(item.code));
  if (filtered.length) return filtered;

  return activePalette().filter((item) => !state.disabledColorCodes.has(item.code)).length
    ? activePalette().filter((item) => !state.disabledColorCodes.has(item.code))
    : [fallbackPaletteColor()];
}

function targetColorLimit() {
  const lockedCount = state.lockedColorCodes.size;
  if (state.colorMode === "auto") return palette.length;
  if (state.colorMode === "fixedPalette") {
    return Math.min(effectiveAllowedPalette().length, Math.max(state.colorLimit, lockedCount));
  }
  return Math.min(palette.length, Math.max(state.colorLimit, lockedCount));
}

function isColorLocked(colorOrCode) {
  const code = typeof colorOrCode === "string" ? colorOrCode : colorOrCode.code;
  return state.lockedColorCodes.has(code);
}

function paletteColorByCode(code) {
  return palette.find((item) => item.code === code);
}

function searchMatchedPaletteColors() {
  if (!state.paletteSearch) return [];
  const query = state.paletteSearch.toLowerCase();
  return palette.filter((item) => `${item.code} ${item.name} ${item.hex} ${item.brand}`.toLowerCase().includes(query));
}

function addVisiblePaletteColor(map, color) {
  if (!color || color.empty) return;
  const sourceColor = paletteColorByCode(color.code) || color;
  if (!map.has(sourceColor.code)) map.set(sourceColor.code, sourceColor);
}

function visiblePaletteSourceColors() {
  const colors = new Map();
  for (const item of sortedCounts()) addVisiblePaletteColor(colors, item);

  const fixedCodes = new Set([...state.allowedColorCodes, ...state.lockedColorCodes]);
  if (state.colorMode === "fixedPalette") {
    for (const item of paletteByCodes(fixedCodes)) addVisiblePaletteColor(colors, item);
  } else {
    for (const item of state.projectPalette) addVisiblePaletteColor(colors, item);
  }

  for (const code of state.lockedColorCodes) addVisiblePaletteColor(colors, paletteColorByCode(code));
  for (const code of backgroundColorCodes()) addVisiblePaletteColor(colors, paletteColorByCode(code));
  addVisiblePaletteColor(colors, state.selectedColor);
  for (const item of searchMatchedPaletteColors()) addVisiblePaletteColor(colors, item);

  return [...colors.values()];
}

function ensureColorInFixedPalette(color) {
  if (!color || color.empty || state.colorMode !== "fixedPalette") return false;
  state.disabledColorCodes.delete(color.code);
  if (state.allowedColorCodes.has(color.code)) return false;
  state.allowedColorCodes.add(color.code);
  return true;
}

function activatePaintColor(colorOrCode, options = {}) {
  const color = typeof colorOrCode === "string" ? paletteColorByCode(colorOrCode) : colorOrCode;
  if (!color || color.empty) return null;
  const addToAllowed = options.addToAllowed !== false;
  if (addToAllowed) ensureColorInFixedPalette(color);
  state.selectedColor = paletteColorByCode(color.code) || color;
  rememberPaletteColor(state.selectedColor);
  updateSelectedColorUi();
  renderConstraintPalette();
  renderStats();
  renderPattern();
  if (options.announce !== false) {
    elements.cellInfo.textContent = `${state.selectedColor.code} 已设为当前画笔色。`;
  }
  return state.selectedColor;
}

function manualPaintColor(color) {
  if (!color || color.empty) return EMPTY_CELL;
  const resolved = paletteColorByCode(color.code) || nearestPaletteColor(color, palette);
  if (state.colorMode === "fixedPalette") {
    ensureColorInFixedPalette(resolved);
    return resolved;
  }
  return effectiveAllowedPalette().some((item) => item.code === resolved.code)
    ? resolved
    : nearestPaletteColor(resolved, effectiveAllowedPalette());
}

function validateColorConstraints(pattern, options = {}) {
  const allowed = effectiveAllowedPalette();
  const allowedCodes = new Set(allowed.map((item) => item.code));
  const lockedCodes = options.lockedColorCodes || state.lockedColorCodes;
  let violationCount = 0;

  const remapped = constrainPatternToCanvas(pattern).map((color) => {
    if (color.empty) return color;
    const isAllowed = allowedCodes.has(color.code) && !state.disabledColorCodes.has(color.code);
    if (isAllowed || lockedCodes.has(color.code)) return color;
    violationCount += 1;
    return nearestPaletteColor(color, allowed);
  });

  return options.withReport ? { pattern: remapped, violationCount } : remapped;
}

function adaptivePaletteForPixels(pixels) {
  const counted = new Map();
  for (const pixel of pixels) {
    if (pixel.empty) continue;
    const nearest = nearestPaletteColor(pixel, effectiveAllowedPalette());
    const weight = pixel.background ? 0.15 : 1;
    counted.set(nearest.code, (counted.get(nearest.code) || 0) + weight);
  }

  const candidates = effectiveAllowedPalette()
    .map((item) => ({ ...item, score: counted.get(item.code) || 0 }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const target = targetColorLimit();
  const mergeDistance = adaptiveMergeDistance();
  const familyCounts = new Map();
  const familyCaps = adaptiveFamilyCaps(target);

  for (const item of candidates) {
    if (selected.length >= target) break;
    const family = colorFamily(item);
    const familyCount = familyCounts.get(family) || 0;
    const locked = state.lockedColorCodes.has(item.code);
    if (!locked && familyCount >= (familyCaps[family] || familyCaps.other)) continue;
    const isSimilar =
      state.mergeSimilarColors && selected.some((picked) => colorDistance(item, picked) < mergeDistance);
    if (!isSimilar || locked) {
      selected.push(item);
      familyCounts.set(family, familyCount + 1);
    }
  }

  // Sparse artwork still needs a few distinct tones, but near-duplicates are
  // not reintroduced just to reach an arbitrary palette size.
  for (const item of candidates) {
    if (selected.length >= Math.min(target, 4)) break;
    if (selected.some((picked) => picked.code === item.code)) continue;
    if (selected.some((picked) => colorDistance(item, picked) < mergeDistance * 0.75)) continue;
    selected.push(item);
  }

  return selected.length ? selected : effectiveAllowedPalette();
}

function adaptiveMergeDistance() {
  const target = targetColorLimit();
  const sizeBias = state.processingProfile === "compact48" ? 1.5 : state.gridSize <= 64 ? -0.5 : -1;
  const limitBias = target <= 12 ? 2.5 : target <= 18 ? 1.5 : target <= 24 ? 0.5 : 0;
  return (state.animeMode ? 9 : 7) + sizeBias + limitBias + (state.mergeBoost || 0);
}

function adaptiveFamilyCaps(target) {
  const base = colorFamilyCaps(state.gridSize);
  if (target > 24) return base;
  const scale = target <= 12 ? 0.65 : target <= 18 ? 0.8 : 1;
  const caps = {};
  for (const [family, cap] of Object.entries(base)) {
    caps[family] = Math.max(family === "black-gray-white" ? 3 : 2, Math.round(cap * scale));
  }
  return caps;
}

function nearestPaletteColor(color, sourcePalette = activePalette()) {
  if (color.empty) return color;
  const paletteKey = paletteSignature(sourcePalette);
  const cacheKey = `${paletteKey}:${Math.round(color.r ?? color.rgb?.r ?? 0)},${Math.round(color.g ?? color.rgb?.g ?? 0)},${Math.round(color.b ?? color.rgb?.b ?? 0)}:${color.code || ""}`;
  if (nearestColorCache.has(cacheKey)) return nearestColorCache.get(cacheKey);

  let best = sourcePalette[0];
  let bestDistance = Infinity;

  for (const item of sourcePalette) {
    const distance = colorDistance(color, item.rgb);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }

  if (nearestColorCache.size > 50000) nearestColorCache.clear();
  nearestColorCache.set(cacheKey, best);
  return best;
}

function nearestPaletteCandidates(color, sourcePalette = palette, limit = 5) {
  if (!color || color.empty) return [];
  return sourcePalette
    .map((item) => ({ ...item, deltaE: colorDistance(color, item) }))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, limit);
}

function mapSamplesToPalette(pixels, size, sourcePalette, allowDither = true) {
  return measurePerformance("pipeline.paletteMap", () => mapSamplesToPaletteNow(pixels, size, sourcePalette, allowDither));
}

async function mapSamplesToPaletteAsync(pixels, size, sourcePalette, allowDither = true) {
  const startedAt = performanceNow();
  const dither = Boolean(allowDither && state.dither && state.patternMode !== "pixelPattern");
  try {
    const indices = await requestPaletteWorkerMapping(pixels, size, sourcePalette, dither);
    recordPerformance("pipeline.paletteMapWorker", performanceNow() - startedAt);
    return Array.from(indices, (paletteIndex, pixelIndex) =>
      paletteIndex < 0 ? pixels[pixelIndex] : sourcePalette[paletteIndex] || nearestPaletteColor(pixels[pixelIndex], sourcePalette),
    );
  } catch (error) {
    recordPerformance("pipeline.paletteMapFallback", performanceNow() - startedAt);
    console.warn("色板后台计算不可用，已切回兼容模式。", error);
    return mapSamplesToPalette(pixels, size, sourcePalette, allowDither);
  } finally {
    recordPerformance("pipeline.paletteMapAsyncTotal", performanceNow() - startedAt);
  }
}

function requestPaletteWorkerMapping(pixels, size, sourcePalette, dither) {
  if (paletteWorkerDisabled || typeof Worker !== "function") {
    return Promise.reject(new Error("当前浏览器不支持 Web Worker"));
  }
  const worker = ensurePaletteWorker();
  const requestId = ++paletteWorkerRequestId;
  const payloadPixels = pixels.map((pixel) => ({
    r: Number(pixel.r ?? pixel.rgb?.r ?? 255),
    g: Number(pixel.g ?? pixel.rgb?.g ?? 255),
    b: Number(pixel.b ?? pixel.rgb?.b ?? 255),
    empty: Boolean(pixel.empty),
  }));
  const payloadPalette = sourcePalette.map((color) => ({
    rgb: color.rgb,
    lab: color.lab,
  }));

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      pendingPaletteWorkerRequests.delete(requestId);
      reject(new Error("后台颜色匹配超时"));
    }, 30000);
    pendingPaletteWorkerRequests.set(requestId, { resolve, reject, timeoutId });
    worker.postMessage({ type: "mapPalette", requestId, pixels: payloadPixels, palette: payloadPalette, size, dither });
  });
}

function ensurePaletteWorker() {
  if (paletteWorker) return paletteWorker;
  paletteWorker = new Worker("palette-worker.js?v=20260717-1", { name: "xiaomai-palette-mapper" });
  paletteWorker.addEventListener("message", handlePaletteWorkerMessage);
  paletteWorker.addEventListener("error", handlePaletteWorkerError);
  return paletteWorker;
}

function handlePaletteWorkerMessage(event) {
  const { type, requestId, indices, message } = event.data || {};
  const pending = pendingPaletteWorkerRequests.get(requestId);
  if (!pending) return;
  window.clearTimeout(pending.timeoutId);
  pendingPaletteWorkerRequests.delete(requestId);
  if (type === "mapped" && indices) pending.resolve(indices);
  else pending.reject(new Error(message || "后台颜色匹配失败"));
}

function handlePaletteWorkerError(event) {
  const error = new Error(event.message || "后台颜色匹配线程异常");
  paletteWorkerDisabled = true;
  paletteWorker?.terminate();
  paletteWorker = null;
  for (const pending of pendingPaletteWorkerRequests.values()) {
    window.clearTimeout(pending.timeoutId);
    pending.reject(error);
  }
  pendingPaletteWorkerRequests.clear();
}

function mapSamplesToPaletteNow(pixels, size, sourcePalette, allowDither = true) {
  const pattern = new Array(size * size);
  if (allowDither && state.dither && state.patternMode !== "pixelPattern") {
    const working = pixels.map((pixel) => ({ ...pixel }));
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = y * size + x;
        const oldPixel = working[index];
        const matched = nearestPaletteColor(oldPixel, sourcePalette);
        pattern[index] = matched;
        const error = {
          r: oldPixel.r - matched.rgb.r,
          g: oldPixel.g - matched.rgb.g,
          b: oldPixel.b - matched.rgb.b,
        };
        spreadError(working, size, x + 1, y, error, 7 / 16);
        spreadError(working, size, x - 1, y + 1, error, 3 / 16);
        spreadError(working, size, x, y + 1, error, 5 / 16);
        spreadError(working, size, x + 1, y + 1, error, 1 / 16);
      }
    }
    return pattern;
  }

  pixels.forEach((pixel, index) => {
    pattern[index] = nearestPaletteColor(pixel, sourcePalette);
  });
  return pattern;
}

function recordColorDiagnostics(pixels, rawPattern, finalPattern, changedBy = "postProcess") {
  state.rawSampleData = pixels;
  state.rawMappedGrid = [...rawPattern];
  state.finalGrid = [...finalPattern];
  state.rawDebugCandidates = pixels.map((pixel) => nearestPaletteCandidates(pixel, palette, 5));
  state.colorTrace = rawPattern.map((rawColor, index) => {
    const finalColor = finalPattern[index] || rawColor;
    return {
      rawCode: rawColor?.empty ? "" : rawColor?.code,
      finalCode: finalColor?.empty ? "" : finalColor?.code,
      changedBy: rawColor?.code === finalColor?.code && rawColor?.empty === finalColor?.empty ? "" : changedBy,
    };
  });
  syncDiagnosticControls();
}

function clearColorDiagnostics() {
  state.rawMappedGrid = [];
  state.rawSampleData = [];
  state.rawDebugCandidates = [];
  state.finalGrid = [];
  state.colorTrace = [];
  state.diagnosticViewMode = state.accurateMatch ? "raw" : "final";
  syncDiagnosticControls();
}

function refreshFinalDiagnosticsFromCurrentPattern(changedBy = "manualEdit") {
  if (!state.rawMappedGrid.length || state.rawMappedGrid.length !== state.pattern.length) return;
  state.finalGrid = [...state.pattern];
  state.colorTrace = state.rawMappedGrid.map((rawColor, index) => {
    const finalColor = state.pattern[index] || rawColor;
    return {
      rawCode: rawColor?.empty ? "" : rawColor?.code,
      finalCode: finalColor?.empty ? "" : finalColor?.code,
      changedBy: rawColor?.code === finalColor?.code && rawColor?.empty === finalColor?.empty ? "" : changedBy,
    };
  });
  syncDiagnosticControls();
}

function validateMardPalette() {
  const issues = [];
  const seen = new Set();
  if (palette.length !== PALETTE_LIMIT) issues.push(`${PALETTE_NAME} 色板数量为 ${palette.length}，不是 ${PALETTE_LIMIT}。`);
  for (const item of palette) {
    if (seen.has(item.code)) issues.push(`重复色号：${item.code}`);
    seen.add(item.code);
    if (!/^#[0-9a-f]{6}$/i.test(item.hex)) issues.push(`${item.code} hex 不合法：${item.hex}`);
    const rgb = hexToRgb(item.hex);
    if (rgb.r !== item.rgb.r || rgb.g !== item.rgb.g || rgb.b !== item.rgb.b) issues.push(`${item.code} rgb 与 hex 不一致。`);
    if (colorDistance({ lab: rgbToLab(item.rgb) }, item) > 0.2) issues.push(`${item.code} LAB 计算异常。`);
  }
  if (issues.length) console.warn(`${PALETTE_NAME} palette validation`, issues);
  return issues;
}

function setupEvents() {
  setupPaletteEventDelegation();
  elements.openProjectButton.addEventListener("click", () => elements.projectFileInput.click());
  elements.saveProjectButton.addEventListener("click", saveProjectFile);
  elements.saveToLibraryButton.addEventListener("click", saveCurrentProjectToLibrary);
  elements.projectLibraryList.addEventListener("click", handleProjectLibraryAction);
  elements.projectFileInput.addEventListener("change", handleProjectFileOpen);
  elements.imageInput.addEventListener("change", handleImageUpload);
  elements.recropButton.addEventListener("click", openCurrentImageCropper);
  elements.uploadZone.addEventListener("dragover", handleDragOver);
  elements.uploadZone.addEventListener("dragleave", handleDragLeave);
  elements.uploadZone.addEventListener("drop", handleDrop);
  elements.colorLimit.addEventListener("input", handleColorLimitChange);
  elements.applyCustomColorLimitButton.addEventListener("click", applyCustomColorLimit);
  elements.customColorLimitInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyCustomColorLimit();
  });
  elements.applyCustomSizeButton.addEventListener("click", applyCustomSize);
  elements.customSizeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyCustomSize();
  });
  elements.customHeightInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyCustomSize();
  });
  elements.pixelModeOptions.forEach((button) => {
    button.addEventListener("click", () => setPatternMode(button.dataset.patternMode));
  });
  elements.processingProfileOptions.forEach((button) => {
    button.addEventListener("click", () => setProcessingProfile(button.dataset.processingProfile, { updateDefaults: true }));
  });
  document.querySelectorAll(".color-preset").forEach((button) => {
    button.addEventListener("click", () => setColorLimit(button.dataset.colors === "all" ? palette.length : Number(button.dataset.colors)));
  });
  elements.appModeOptions.forEach((button) => {
    button.addEventListener("click", () => setAppMode(button.dataset.appMode));
  });
  elements.newBlankCanvasButton.addEventListener("click", () =>
    createBlankCanvas({ confirmReplace: true, resetLibraryIdentity: true }),
  );
  elements.brushSizeInput.addEventListener("input", () => setBrushSize(Number(elements.brushSizeInput.value)));
  document.querySelectorAll(".brush-size-preset").forEach((button) => {
    button.addEventListener("click", () => setBrushSize(Number(button.dataset.brushSize)));
  });
  elements.brushShapeSelect.addEventListener("change", () => {
    state.brushShape = elements.brushShapeSelect.value;
    renderPattern();
  });
  elements.symmetryModeSelect.addEventListener("change", () => {
    state.symmetryMode = elements.symmetryModeSelect.value;
    elements.cellInfo.textContent = symmetryModeHint();
    renderPattern();
    markProjectDirty();
  });
  elements.mirrorHorizontalButton.addEventListener("click", () => mirrorPattern("horizontal"));
  elements.mirrorVerticalButton.addEventListener("click", () => mirrorPattern("vertical"));
  elements.allowLockedEditToggle.addEventListener("change", () => {
    state.allowEditLockedCells = elements.allowLockedEditToggle.checked;
    elements.cellInfo.textContent = state.allowEditLockedCells ? "已允许修改锁定色格子。" : "已保护锁定色格子，画笔不会改它们。";
  });
  document.querySelectorAll(".pixel-bg-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".pixel-bg-option").forEach((option) => option.classList.remove("is-active"));
      button.classList.add("is-active");
      state.pixelBackground = button.dataset.bg;
      updatePixelBackgroundLabel();
      updateBackgroundHint();
      requestPreviewUpdate("背景预览已更新，请确认应用后再编辑或导出。", { backgroundOnly: true });
    });
  });
  elements.showCodesToggle.addEventListener("change", () => {
    state.showCellCodes = elements.showCodesToggle.checked;
    renderPattern();
  });
  elements.showCoordsToggle.addEventListener("change", () => {
    state.showCoordinates = elements.showCoordsToggle.checked;
    renderPattern();
  });
  elements.guideEvery5Toggle.addEventListener("change", () => {
    state.guideEvery = elements.guideEvery5Toggle.checked ? 5 : 10;
    renderPattern();
  });
  elements.ditherToggle.addEventListener("change", () => {
    state.dither = elements.ditherToggle.checked;
    requestPreviewUpdate();
  });
  elements.gridToggle.addEventListener("change", () => {
    state.showGrid = elements.gridToggle.checked;
    renderPattern();
  });
  elements.transparentToggle.addEventListener("change", () => {
    state.removeTransparent = elements.transparentToggle.checked;
    requestPreviewUpdate();
  });
  elements.lineBoostToggle.addEventListener("change", () => {
    state.lineBoost = elements.lineBoostToggle.checked;
    requestPreviewUpdate();
  });
  elements.accurateMatchToggle.addEventListener("change", () => {
    state.accurateMatch = elements.accurateMatchToggle.checked;
    state.diagnosticViewMode = state.accurateMatch ? "raw" : "final";
    syncDiagnosticControls();
    requestPreviewUpdate(
      state.accurateMatch
        ? `准确匹配已生成预览：先做 ${PALETTE_NAME} LAB/DeltaE 精确匹配，再遵守最大颜色、空背景和制作优化。`
        : "已退出准确匹配并更新预览，请确认应用。",
    );
  });
  elements.colorDebugToggle.addEventListener("change", () => {
    state.colorDebugEnabled = elements.colorDebugToggle.checked;
    elements.cellInfo.textContent = state.colorDebugEnabled
      ? "颜色诊断已开启：点击任意格子查看采样、MARD 候选和后处理变化。"
      : "颜色诊断已关闭。";
  });
  elements.showFinalGridButton.addEventListener("click", () => {
    state.diagnosticViewMode = "final";
    syncDiagnosticControls();
    renderPattern();
    renderStats();
  });
  elements.showRawGridButton.addEventListener("click", () => {
    state.diagnosticViewMode = "raw";
    syncDiagnosticControls();
    renderPattern();
    renderStats();
  });
  elements.outlineModeSelect.addEventListener("change", () => {
    state.outlineMode = elements.outlineModeSelect.value;
    state.lineBoost = state.outlineMode !== "off";
    elements.lineBoostToggle.checked = state.lineBoost;
    requestPreviewUpdate("轮廓预览已更新，请确认应用。");
  });
  elements.localPreprocessEnabledToggle.addEventListener("change", () => {
    state.localPreprocessSettings.enabled = elements.localPreprocessEnabledToggle.checked;
    invalidateOptimizedBaseImage();
    syncLocalPreprocessControls();
    requestPreviewUpdate(
      state.localPreprocessSettings.enabled
        ? "本地底图优化预览已更新，请确认应用。"
        : "已关闭本地底图优化并恢复原图预览，请确认应用。",
    );
  });
  elements.localPreprocessMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLocalPreprocessPanel();
  });
  [
    ["flatColorSimplification", elements.flatColorSimplificationToggle],
    ["antiAliasCleanup", elements.antiAliasCleanupToggle],
    ["outlinePreserve", elements.outlinePreservePreprocessToggle],
    ["noiseReduction", elements.noiseReductionToggle],
    ["materialTextureCleanup", elements.materialTextureCleanupToggle],
    ["backgroundCleanup", elements.backgroundCleanupToggle],
    ["regionColorStabilization", elements.regionColorStabilizationToggle],
    ["regionToneCompression", elements.regionToneCompressionToggle],
    ["outlineColorConvergence", elements.outlineColorConvergenceToggle],
  ].forEach(([key, element]) => {
    element.addEventListener("change", () => {
      state.localPreprocessSettings[key] = element.checked;
      invalidateOptimizedBaseImage();
      syncLocalPreprocessControls();
      if (state.localPreprocessSettings.enabled) {
        requestPreviewUpdate("本地底图优化预览已更新，请确认应用。");
      }
    });
  });
  elements.localPreprocessPreviewButton.addEventListener("click", () => {
    if (!state.localPreprocessSettings.enabled) {
      state.localPreprocessSettings.enabled = true;
      elements.localPreprocessEnabledToggle.checked = true;
    }
    invalidateOptimizedBaseImage();
    syncLocalPreprocessControls();
    requestPreviewUpdate("本地底图优化预览已更新，请确认应用。");
  });
  elements.localPreprocessApplyButton.addEventListener("click", confirmPendingPreview);
  elements.localPreprocessRestoreButton.addEventListener("click", () => {
    state.localPreprocessSettings.enabled = false;
    invalidateOptimizedBaseImage();
    syncLocalPreprocessControls();
    requestPreviewUpdate("已还原原图转换流程，并生成原图预览。当前正式图纸未改变。");
  });
  elements.dominantSamplingToggle.addEventListener("change", () => {
    state.dominantSampling = elements.dominantSamplingToggle.checked;
    requestPreviewUpdate();
  });
  elements.mergeSimilarToggle.addEventListener("change", () => {
    state.mergeSimilarColors = elements.mergeSimilarToggle.checked;
    requestPreviewUpdate();
  });
  elements.cleanSmallRegionsToggle.addEventListener("change", () => {
    state.cleanSmallRegions = elements.cleanSmallRegionsToggle.checked;
    requestPreviewUpdate();
  });
  elements.animeModeToggle.addEventListener("change", () => {
    state.animeMode = elements.animeModeToggle.checked;
    if (state.processingProfile === "photoColor") {
      if (Number(elements.minRegionSize.value) > 3) {
        elements.minRegionSize.value = 2;
        state.minRegionSize = 2;
        elements.minRegionLabel.textContent = "2 颗";
      }
    } else if (state.animeMode && Number(elements.minRegionSize.value) < 6) {
      elements.minRegionSize.value = 6;
      state.minRegionSize = 6;
      elements.minRegionLabel.textContent = "6 颗";
    } else if (!state.animeMode && Number(elements.minRegionSize.value) === 6) {
      const restoredSize = state.processingProfile === "photoColor" ? 1 : state.processingProfile === "detail64" ? 2 : 3;
      elements.minRegionSize.value = restoredSize;
      state.minRegionSize = restoredSize;
      elements.minRegionLabel.textContent = `${restoredSize} 颗`;
    }
    requestPreviewUpdate();
  });
  elements.minRegionSize.addEventListener("input", () => {
    state.minRegionSize = Number(elements.minRegionSize.value);
    elements.minRegionLabel.textContent = `${state.minRegionSize} 颗`;
    requestPreviewUpdate();
  });
  elements.referenceInput.addEventListener("change", handleReferenceUpload);
  elements.referenceVisibleToggle.addEventListener("change", () => {
    state.referenceVisible = elements.referenceVisibleToggle.checked;
    state.traceReference.visible = state.referenceVisible;
    state.traceReference.enabled = state.referenceVisible && Boolean(state.referenceImage);
    updateReferenceMenuState();
    syncTraceReferenceControls();
    renderReferenceFloatPanel();
    renderPattern();
  });
  elements.referenceAboveToggle.addEventListener("change", () => {
    state.referenceAbove = elements.referenceAboveToggle.checked;
    updateReferenceMenuState();
    renderPattern();
  });
  elements.referenceOpacity.addEventListener("input", () => {
    state.referenceOpacity = Number(elements.referenceOpacity.value) / 100;
    elements.referenceOpacityLabel.textContent = `${elements.referenceOpacity.value}%`;
    elements.referenceOpacityProxy.value = elements.referenceOpacity.value;
    elements.referenceOpacityProxyLabel.textContent = `${elements.referenceOpacity.value}%`;
    updateReferenceMenuState();
    renderReferenceFloatPanel();
    renderPattern();
  });
  elements.referenceMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleReferenceMenu();
  });
  elements.referenceToggleVisibleButton.addEventListener("click", () => {
    state.traceReference.visible = !state.traceReference.visible;
    state.traceReference.enabled = state.traceReference.visible && Boolean(state.referenceImage);
    state.referenceVisible = state.traceReference.visible;
    elements.referenceVisibleToggle.checked = state.referenceVisible;
    updateReferenceMenuState();
    syncTraceReferenceControls();
    renderReferenceFloatPanel();
    renderPattern();
  });
  elements.referenceLockButton.addEventListener("click", () => {
    state.traceReference.locked = !state.traceReference.locked;
    state.referenceLocked = state.traceReference.locked;
    updateReferenceMenuState();
    syncTraceReferenceControls();
    renderReferenceFloatPanel();
  });
  elements.referenceFitButton.addEventListener("click", () => {
    fitReferencePanel();
    renderPattern();
    elements.cellInfo.textContent = state.referenceImage ? "参考图已适配到当前图纸视图。" : "请先上传参考图。";
  });
  elements.referenceClearButton.addEventListener("click", clearReferenceImage);
  elements.referenceFloatLockButton.addEventListener("click", (event) => {
    event.stopPropagation();
    state.referenceLocked = !state.referenceLocked;
    updateReferenceMenuState();
    renderReferenceFloatPanel();
  });
  elements.referenceFloatZoomOutButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setReferenceZoom(state.referencePanel.zoom - 0.15);
  });
  elements.referenceFloatZoomInButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setReferenceZoom(state.referencePanel.zoom + 0.15);
  });
  elements.referenceFloatFitButton.addEventListener("click", (event) => {
    event.stopPropagation();
    fitReferencePanel();
  });
  elements.referenceFloatHideButton.addEventListener("click", (event) => {
    event.stopPropagation();
    state.referenceVisible = false;
    elements.referenceVisibleToggle.checked = false;
    updateReferenceMenuState();
    renderReferenceFloatPanel();
  });
  elements.referenceFloatImage.addEventListener("click", handleReferenceImageClick);
  elements.referenceFloatHeader.addEventListener("pointerdown", handleReferencePanelPointerDown);
  window.addEventListener("pointermove", handleReferencePanelPointerMove);
  window.addEventListener("pointerup", handleReferencePanelPointerUp);
  elements.referenceOpacityProxy.addEventListener("input", () => {
    state.referenceOpacity = Number(elements.referenceOpacityProxy.value) / 100;
    elements.referenceOpacity.value = elements.referenceOpacityProxy.value;
    elements.referenceOpacityLabel.textContent = `${elements.referenceOpacityProxy.value}%`;
    elements.referenceOpacityProxyLabel.textContent = `${elements.referenceOpacityProxy.value}%`;
    updateReferenceMenuState();
    renderReferenceFloatPanel();
  });
  elements.traceReferenceToggle.addEventListener("change", () => {
    state.traceReference.enabled = elements.traceReferenceToggle.checked;
    state.traceReference.visible = elements.traceReferenceToggle.checked;
    syncTraceReferenceControls();
    renderPattern();
  });
  elements.traceReferenceAdjustButton.addEventListener("click", () => {
    state.traceReference.adjustMode = !state.traceReference.adjustMode;
    if (state.traceReference.adjustMode) {
      state.traceReference.enabled = true;
      state.traceReference.visible = true;
    }
    syncTraceReferenceControls();
    renderPattern();
    markProjectDirty();
  });
  elements.traceReferenceLockButton.addEventListener("click", () => {
    state.traceReference.locked = !state.traceReference.locked;
    syncTraceReferenceControls();
    renderPattern();
    markProjectDirty();
  });
  elements.traceReferenceOpacity.addEventListener("input", () => {
    state.traceReference.opacity = Number(elements.traceReferenceOpacity.value) / 100;
    syncTraceReferenceControls();
    renderPattern();
  });
  elements.traceReferenceZoomOutButton.addEventListener("click", () => setTraceReferenceScale(state.traceReference.scale / 1.12));
  elements.traceReferenceZoomInButton.addEventListener("click", () => setTraceReferenceScale(state.traceReference.scale * 1.12));
  elements.traceReferenceFitButton.addEventListener("click", () => {
    fitTraceReferenceToCanvas();
    renderPattern();
    markProjectDirty();
  });
  elements.traceReferenceCenterButton.addEventListener("click", () => {
    centerTraceReference();
    renderPattern();
    markProjectDirty();
  });
  elements.traceReferenceClearButton.addEventListener("click", clearReferenceImage);
  elements.traceReferenceSnapToggle?.addEventListener("change", () => {
    state.traceReference.snapToGrid = elements.traceReferenceSnapToggle.checked;
    if (state.traceReference.snapToGrid) {
      state.traceReference.x = Math.round(state.traceReference.x || 0);
      state.traceReference.y = Math.round(state.traceReference.y || 0);
      renderPattern();
    }
  });
  document.addEventListener("click", (event) => {
    if (!elements.referenceMenu || elements.referenceMenu.hidden) return;
    if (event.target.closest("#referenceToolbar")) return;
    closeReferenceMenu();
  });
  document.addEventListener("click", (event) => {
    if (!elements.localPreprocessPanel || elements.localPreprocessPanel.hidden) return;
    if (event.target.closest("#localPreprocessToolbar")) return;
    closeLocalPreprocessPanel();
  });
  elements.smartOptimizeButton?.addEventListener("click", showSmartOptimize);
  elements.variantButton.addEventListener("click", showImageVariants);
  elements.closeOptimizeButton.addEventListener("click", () => {
    elements.optimizePanel.hidden = true;
  });
  elements.paletteSearchInput.addEventListener("input", () => {
    state.paletteSearch = elements.paletteSearchInput.value.trim().toLowerCase();
    renderConstraintPalette();
    renderStats();
  });
  elements.showSelectedColorsButton.addEventListener("click", () => {
    state.showSelectedColorsOnly = !state.showSelectedColorsOnly;
    elements.showSelectedColorsButton.classList.toggle("is-active", state.showSelectedColorsOnly);
    elements.showSelectedColorsButton.textContent = state.showSelectedColorsOnly ? "显示全部" : "只看使用";
    renderConstraintPalette();
  });
  elements.exportButton.addEventListener("click", exportPattern);
  elements.exportWatermarkToggle.addEventListener("change", () => {
    state.exportWatermarkEnabled = elements.exportWatermarkToggle.checked;
    markProjectDirty();
  });
  elements.coverButton.addEventListener("click", exportPattern);
  elements.resetButton.addEventListener("click", () => {
    if (confirmReplaceCurrentProject("重置")) resetApp();
  });
  elements.copyListButton.addEventListener("click", copyBeadList);
  elements.zoomInButton.addEventListener("click", () => setZoom(state.zoom + state.zoomState.step));
  elements.zoomOutButton.addEventListener("click", () => setZoom(state.zoom - state.zoomState.step));
  elements.zoomResetButton.addEventListener("click", () => setZoom(1, { center: true }));
  elements.fitButton.addEventListener("click", fitCanvasToScreen);
  elements.editToggle.addEventListener("click", toggleEditing);
  elements.lockGridButton.addEventListener("click", toggleGridLock);
  setupCropEvents();
  elements.toolboxLockButton.addEventListener("click", toggleToolboxLock);
  elements.undoButton.addEventListener("click", undoEdit);
  elements.redoButton.addEventListener("click", redoEdit);
  elements.fillSelectionButton.addEventListener("click", fillSelectionWithCurrentColor);
  elements.finishPenButton.addEventListener("click", finishPenSelection);
  elements.copySelectionButton.addEventListener("click", copySelectionPixels);
  elements.pasteSelectionButton.addEventListener("click", pasteSelectionPixels);
  elements.clearSelectionButton.addEventListener("click", clearSelection);
  document.querySelectorAll(".canvas-tool").forEach((button) => {
    button.addEventListener("click", () => setActiveTool(button.dataset.tool));
    button.addEventListener("dblclick", () => {
      if (button.dataset.tool === "eraser") eraseCurrentSelection();
    });
  });
  elements.patternCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
  elements.patternCanvas.addEventListener("pointermove", handleCanvasPointerMove);
  elements.patternCanvas.addEventListener("pointerup", handleCanvasPointerUp);
  elements.patternCanvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  elements.canvasWrap.addEventListener("pointerdown", handleCanvasPanPointerDown);
  elements.canvasWrap.addEventListener("pointermove", handleCanvasPanPointerMove);
  elements.canvasWrap.addEventListener("pointerup", handleCanvasPanPointerUp);
  elements.canvasWrap.addEventListener("pointercancel", handleCanvasPanPointerUp);
  elements.canvasWrap.addEventListener("wheel", handleCanvasWheel, { passive: false });
  elements.patternCanvas.addEventListener("dragover", handleCanvasDragOver);
  elements.patternCanvas.addEventListener("dragleave", handleCanvasDragLeave);
  elements.patternCanvas.addEventListener("drop", handleCanvasDrop);
  elements.patternCanvas.addEventListener("dblclick", () => {
    if (state.activeTool === "pen") finishPenSelection();
    if (state.activeTool === "eraser") eraseCurrentSelection();
  });
  elements.patternCanvas.addEventListener("click", handleCanvasClick);
  elements.patternCanvas.addEventListener("mousemove", handleCanvasMove);
  window.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("keyup", handleKeyboardKeyUp);
  window.addEventListener("beforeunload", handleBeforeUnload);
  setupToolboxDrag();
  setupProjectDirtyTracking();

  document.querySelectorAll(".seg-option").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSize = Number(button.dataset.size);
      if (state.appMode === "draw" && state.pattern.length && !window.confirm("切换尺寸会新建空白画布并覆盖当前图纸，确定继续吗？")) {
        return;
      }
      document.querySelectorAll(".seg-option").forEach((option) => option.classList.remove("is-active"));
      button.classList.add("is-active");
      state.gridSize = nextSize;
      state.gridWidth = nextSize;
      state.gridHeight = nextSize;
      elements.sizeLabel.textContent = gridDimensionsLabel();
      if (state.patternMode === "pixelPattern") {
        applyPixelSizeDefaults(true);
      } else {
        applySizePresetDefaults(true);
      }
      syncControlsFromState();
      if (state.appMode === "draw") {
        createBlankCanvas({ confirmReplace: false });
      } else {
        requestPreviewUpdate();
      }
    });
  });

  document.querySelectorAll(".view-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".view-option").forEach((option) => option.classList.remove("is-active"));
      button.classList.add("is-active");
      state.viewMode = button.dataset.view;
      renderPattern();
    });
  });

  document.querySelectorAll(".fit-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".fit-option").forEach((option) => option.classList.remove("is-active"));
      button.classList.add("is-active");
      state.fitMode = button.dataset.fit;
      elements.fitModeLabel.textContent = state.fitMode === "subject" ? "主体完整" : "居中裁剪";
      requestPreviewUpdate();
    });
  });

  document.querySelectorAll(".editor-view-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".editor-view-option").forEach((option) => option.classList.remove("is-active"));
      button.classList.add("is-active");
      state.editorView = button.dataset.editorView;
      setZoom(state.zoom);
      renderPattern();
    });
  });

  document.querySelectorAll(".color-mode-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".color-mode-option").forEach((option) => option.classList.remove("is-active"));
      button.classList.add("is-active");
      state.colorMode = button.dataset.colorMode;
      if (state.colorMode === "fixedPalette") {
        const usedCodes = state.counts.size ? [...state.counts.keys()] : activePalette().map((item) => item.code);
        state.allowedColorCodes = new Set([
          ...state.allowedColorCodes,
          ...usedCodes,
          ...state.lockedColorCodes,
          state.selectedColor?.code,
        ].filter(Boolean));
      }
      renderConstraintPalette();
      requestPreviewUpdate("颜色约束预览已更新，请确认应用。");
    });
  });

  window.setInterval(() => {
    if (state.projectDirty) scheduleProjectAutoSave(0);
  }, 30000);
}

function setupProjectDirtyTracking() {
  const selectors = [
    "#colorLimit",
    "#customColorLimitInput",
    "#customSizeInput",
    "#customHeightInput",
    "#ditherToggle",
    "#gridToggle",
    "#transparentToggle",
    "#lineBoostToggle",
    "#outlineModeSelect",
    "#dominantSamplingToggle",
    "#mergeSimilarToggle",
    "#cleanSmallRegionsToggle",
    "#animeModeToggle",
    "#minRegionSize",
    "#showCodesToggle",
    "#showCoordsToggle",
    "#guideEvery5Toggle",
    "#referenceVisibleToggle",
    "#referenceAboveToggle",
    "#referenceOpacity",
    "#referenceOpacityProxy",
    "#traceReferenceToggle",
    "#traceReferenceOpacity",
    "#traceReferenceSnapToggle",
    "#brushSizeInput",
    "#brushShapeSelect",
    "#symmetryModeSelect",
    "#allowLockedEditToggle",
    "#localPreprocessEnabledToggle",
    "#flatColorSimplificationToggle",
    "#antiAliasCleanupToggle",
    "#outlinePreservePreprocessToggle",
    "#noiseReductionToggle",
    "#materialTextureCleanupToggle",
    "#backgroundCleanupToggle",
    "#regionColorStabilizationToggle",
    "#regionToneCompressionToggle",
    "#outlineColorConvergenceToggle",
  ].join(",");
  document.addEventListener("change", (event) => {
    if (event.target.matches(selectors)) markProjectDirty();
  });
  document.addEventListener("input", (event) => {
    if (event.target.matches(selectors)) markProjectDirty();
  });
  document.addEventListener("click", (event) => {
    if (
      event.target.closest(
        ".constraint-chip, .palette-row, .legend-chip, .canvas-tool, .app-mode-option, .seg-option, .fit-option, .color-mode-option, .brush-size-preset, .pixel-bg-option, .editor-view-option, #editToggle, #lockGridButton, #toolboxLockButton, #fillSelectionButton, #clearSelectionButton, #mirrorHorizontalButton, #mirrorVerticalButton",
      )
    ) {
      markProjectDirty();
    }
  });
}

function handleBeforeUnload(event) {
  if (!state.projectDirty) return;
  event.preventDefault();
  event.returnValue = "当前项目尚未保存，确定离开吗？";
}

function elevateToolboxLayer() {
  const workspace = document.querySelector(".workspace");
  if (!elements.editToolPanel || !workspace) return;
  if (elements.editToolPanel.parentElement !== workspace) {
    workspace.prepend(elements.editToolPanel);
  }
  elements.editToolPanel.classList.add("is-docked");
  elements.editToolPanel.style.left = "";
  elements.editToolPanel.style.top = "";
}

function setupWorkbenchLayout() {
  const controlPanel = document.querySelector(".control-panel");
  const railButtons = Array.from(document.querySelectorAll(".sidebar-rail-button[data-sidebar-target]"));
  const panelSelectors = {
    upload: ".upload-card",
    size: ".size-card",
    colors: ".palette-settings-card",
    process: ".image-process-card",
    project: ".project-card",
  };
  const drawerPanels = new Map();

  Object.entries(panelSelectors).forEach(([key, selector]) => {
    const panel = controlPanel?.querySelector(selector);
    if (!panel) return;
    panel.classList.add("workbench-drawer-panel");
    panel.dataset.sidebarPanel = key;
    drawerPanels.set(key, panel);
  });

  const closeSidebarDrawer = () => {
    controlPanel?.classList.remove("has-open-drawer");
    drawerPanels.forEach((panel) => panel.classList.remove("is-sidebar-open"));
    railButtons.forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-expanded", "false");
    });
  };

  const openSidebarDrawer = (key) => {
    const panel = drawerPanels.get(key);
    if (!panel) return;
    const wasOpen = panel.classList.contains("is-sidebar-open");
    closeSidebarDrawer();
    if (wasOpen) return;
    controlPanel?.classList.add("has-open-drawer");
    panel.classList.add("is-sidebar-open");
    if (panel instanceof HTMLDetailsElement) panel.open = true;
    const button = railButtons.find((item) => item.dataset.sidebarTarget === key);
    button?.classList.add("is-active");
    button?.setAttribute("aria-expanded", "true");
    if (key === "project") renderProjectLibrary();
  };

  railButtons.forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      setWorkbenchMode("transform", { preserveDrawer: true });
      openSidebarDrawer(button.dataset.sidebarTarget);
    });
  });

  if (window.innerWidth > 760 && drawerPanels.has("size")) {
    openSidebarDrawer("size");
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".sidebar-rail-nav, .workbench-drawer-panel")) return;
    closeSidebarDrawer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebarDrawer();
  });

  const statsTabs = Array.from(document.querySelectorAll(".stats-tab[data-stats-tab]"));
  const statsContents = Array.from(document.querySelectorAll("[data-stats-content]"));
  const statsPanel = document.querySelector(".stats-panel");
  const statsSearchTools = statsPanel?.querySelector(".constraint-tools");
  const statsDiagnosticTools = statsPanel?.querySelector(".color-diagnostic-tools");
  if (statsSearchTools) {
    statsSearchTools.classList.add("stats-search-tools");
    statsTabs[0]?.closest(".stats-tabs")?.insertAdjacentElement("afterend", statsSearchTools);
  }
  if (statsDiagnosticTools) {
    statsDiagnosticTools.classList.add("stats-footer-tools");
    statsPanel.appendChild(statsDiagnosticTools);
  }
  statsTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.statsTab;
      statsTabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      statsContents.forEach((content) => {
        const active = content.dataset.statsContent === target;
        content.hidden = !active;
        content.classList.toggle("is-active", active);
      });
    });
  });

  const statsCollapseButton = document.querySelector("#statsCollapseButton");
  if (window.innerWidth <= 760 && statsPanel && statsCollapseButton) {
    document.body.classList.add("stats-panel-collapsed");
    statsPanel.classList.add("is-collapsed");
    statsCollapseButton.title = "展开右侧面板";
    statsCollapseButton.innerHTML = '<i data-lucide="panel-right-open" aria-hidden="true"></i>';
  }
  statsCollapseButton?.addEventListener("click", () => {
    const collapsed = !document.body.classList.contains("stats-panel-collapsed");
    document.body.classList.toggle("stats-panel-collapsed", collapsed);
    statsPanel?.classList.toggle("is-collapsed", collapsed);
    statsCollapseButton.title = collapsed ? "展开右侧面板" : "收起右侧面板";
    statsCollapseButton.innerHTML = collapsed
      ? '<i data-lucide="panel-right-open" aria-hidden="true"></i>'
      : '<i data-lucide="panel-right-close" aria-hidden="true"></i>';
    window.lucide?.createIcons();
    window.setTimeout(() => {
      if (state.pattern.length) fitCanvasToScreen();
    }, 180);
  });

  const propertiesButton = document.querySelector("#toolPropertiesButton");
  const closeToolProperties = (force = false) => {
    if (!force && document.body.dataset.workbenchMode === "edit") return;
    elements.editToolPanel?.classList.remove("is-properties-open");
    propertiesButton?.setAttribute("aria-expanded", "false");
  };
  propertiesButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !elements.editToolPanel.classList.contains("is-properties-open");
    elements.editToolPanel.classList.toggle("is-properties-open", open);
    propertiesButton.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest("#editToolPanel")) return;
    closeToolProperties();
  });
  document.querySelector("#toolPropertiesCloseButton")?.addEventListener("click", () => closeToolProperties(true));
}

const WORKBENCH_MODE_STORAGE_KEY = "xiaomai-workbench-mode-v1";

function syncModeHeaderProject() {
  const topName = document.querySelector("#topProjectName");
  const topStatus = document.querySelector("#topProjectStatus");
  if (topName && elements.projectName) topName.textContent = elements.projectName.textContent || "小麦拼豆";
  if (topStatus && elements.projectSaveStatus) {
    topStatus.textContent = elements.projectSaveStatus.textContent || "未保存";
    topStatus.classList.toggle("is-dirty", state.projectDirty);
  }
}

function setFocusCanvasMode(active, options = {}) {
  const focusButton = document.querySelector("#focusCanvasButton");
  document.body.classList.toggle("focus-canvas-mode", active);
  focusButton?.classList.toggle("is-active", active);
  if (focusButton) {
    focusButton.innerHTML = active
      ? '<i data-lucide="minimize-2" aria-hidden="true"></i>退出专注'
      : '<i data-lucide="maximize-2" aria-hidden="true"></i>专注模式';
  }
  if (active) {
    elements.editToolPanel?.classList.remove("is-properties-open");
    document.querySelector("#toolPropertiesButton")?.setAttribute("aria-expanded", "false");
  }
  window.lucide?.createIcons();
  if (options.fit !== false) {
    window.setTimeout(() => state.pattern.length && fitCanvasToScreen(), 180);
  }
}

function canLeaveTransformWithCurrentPreview(mode) {
  if (mode === "transform") return true;
  if (state.isProcessingPattern) {
    elements.cellInfo.textContent = "转图预览仍在处理中，请稍等片刻。";
    return false;
  }
  if (state.isPreviewDirty && state.previewPattern.length) {
    elements.cellInfo.textContent = "请先确认应用或放弃本次参数预览，再进入编辑或导出。";
    elements.confirmPreviewButton?.focus();
    return false;
  }
  return true;
}

function setWorkbenchMode(mode, options = {}) {
  if (!["transform", "edit", "export"].includes(mode)) mode = "edit";
  if (!canLeaveTransformWithCurrentPreview(mode)) return false;
  if (mode !== "edit" && document.body.classList.contains("focus-canvas-mode")) {
    setFocusCanvasMode(false, { fit: false });
  }
  document.body.dataset.workbenchMode = mode;
  document.querySelectorAll(".workbench-mode-button").forEach((button) => {
    const active = button.dataset.workbenchMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const propertiesButton = document.querySelector("#toolPropertiesButton");
  if (mode === "edit") {
    elements.editToolPanel?.classList.add("is-properties-open");
    propertiesButton?.setAttribute("aria-expanded", "true");
  } else {
    elements.editToolPanel?.classList.remove("is-properties-open");
    propertiesButton?.setAttribute("aria-expanded", "false");
  }

  const statsPanel = document.querySelector(".stats-panel");
  const statsCollapseButton = document.querySelector("#statsCollapseButton");
  if (mode === "export" && statsPanel) {
    document.body.classList.remove("stats-panel-collapsed");
    statsPanel.classList.remove("is-collapsed");
    if (statsCollapseButton) {
      statsCollapseButton.title = "收起右侧面板";
      statsCollapseButton.innerHTML = '<i data-lucide="panel-right-close" aria-hidden="true"></i>';
    }
    document.querySelector('.stats-tab[data-stats-tab="beads"]')?.click();
  }

  if (!options.preserveDrawer && mode !== "transform") {
    document.querySelectorAll(".workbench-drawer-panel.is-sidebar-open").forEach((panel) => panel.classList.remove("is-sidebar-open"));
  }
  try {
    window.localStorage.setItem(WORKBENCH_MODE_STORAGE_KEY, mode);
  } catch {}
  window.lucide?.createIcons();
  window.setTimeout(() => {
    if (state.pattern.length) fitCanvasToScreen();
  }, 180);
  return true;
}

function setupWorkbenchModes() {
  const toolbarHistory = document.querySelector(".toolbar-history");
  if (toolbarHistory && elements.undoButton && elements.redoButton) {
    elements.undoButton.innerHTML = '<i data-lucide="undo-2" aria-hidden="true"></i><span>撤销</span>';
    elements.redoButton.innerHTML = '<i data-lucide="redo-2" aria-hidden="true"></i><span>重做</span>';
    toolbarHistory.append(elements.undoButton, elements.redoButton);
  }

  const statsPanel = document.querySelector(".stats-panel");
  const exportActions = document.querySelector(".export-actions");
  if (statsPanel && exportActions) {
    exportActions.classList.add("mode-export-actions");
    statsPanel.appendChild(exportActions);
  }

  document.querySelectorAll(".workbench-mode-button").forEach((button) => {
    button.addEventListener("click", () => setWorkbenchMode(button.dataset.workbenchMode));
  });
  elements.confirmPreviewButton?.addEventListener("click", confirmPendingPreview);
  elements.discardPreviewButton?.addEventListener("click", discardPendingPreview);
  document.querySelector("#topSaveProjectButton")?.addEventListener("click", () => elements.saveProjectButton?.click());
  document.querySelector("#focusCanvasButton")?.addEventListener("click", () => {
    setFocusCanvasMode(!document.body.classList.contains("focus-canvas-mode"));
  });

  const observer = new MutationObserver(syncModeHeaderProject);
  if (elements.projectName) observer.observe(elements.projectName, { childList: true, subtree: true, characterData: true });
  if (elements.projectSaveStatus) observer.observe(elements.projectSaveStatus, { childList: true, subtree: true, characterData: true });
  syncModeHeaderProject();

  let initialMode = "edit";
  try {
    const storedMode = window.localStorage.getItem(WORKBENCH_MODE_STORAGE_KEY);
    if (["transform", "edit", "export"].includes(storedMode)) initialMode = storedMode;
  } catch {}
  setWorkbenchMode(initialMode);
}

function handleColorLimitChange() {
  setColorLimit(Number(elements.colorLimit.value), true);
}

function applyCustomColorLimit() {
  setColorLimit(Number(elements.customColorLimitInput.value), true);
}

function applyCustomSize() {
  const width = Math.round(Number(elements.customSizeInput.value));
  const height = Math.round(Number(elements.customHeightInput.value));
  const value = Math.max(width, height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(value)) return;
  if (state.appMode === "draw" && state.pattern.length && !window.confirm("修改尺寸会新建空白画布并覆盖当前图纸，确定继续吗？")) {
    elements.customSizeInput.value = activeGridWidth();
    elements.customHeightInput.value = activeGridHeight();
    return;
  }
  if (state.appMode !== "draw" && state.pattern.length) {
    capturePreviewCanvasSnapshot();
    if (!state.image) {
      restorePreviewCanvasSnapshot();
      elements.cellInfo.textContent = "当前项目没有原图，不能重新计算尺寸；图纸已保持不变。";
      return;
    }
  }
  state.gridWidth = clampRange(width, 16, 160);
  state.gridHeight = clampRange(height, 16, 160);
  state.gridSize = Math.max(state.gridWidth, state.gridHeight);
  state.traceReference.x = null;
  state.traceReference.y = null;
  state.traceReference.scale = 1;
  if (state.patternMode === "pixelPattern") {
    applyPixelSizeDefaults(false);
  } else {
    applySizePresetDefaults(false);
  }
  syncControlsFromState();
  if (state.appMode === "draw") {
    createBlankCanvas({ confirmReplace: false });
  } else {
    if (state.image) {
      requestPreviewUpdate(`已按 ${gridDimensionsLabel()} 完整适配图片，请确认应用。`);
    } else {
      renderPattern();
      elements.cellInfo.textContent = `画布已设为 ${gridDimensionsLabel()}，现在可以上传图片。`;
    }
  }
}

function setColorLimit(value, regenerate = true) {
  const requested = Math.round(Number(value));
  const lockedCount = state.lockedColorCodes.size;
  state.colorLimit = clampColorLimit(value);
  syncColorLimitControls();
  if (Number.isFinite(requested) && lockedCount > requested) {
    elements.cellInfo.textContent = "锁定颜色数量已经超过最大颜色数，请提高最大颜色数或取消部分锁定颜色。";
  }
  if (state.colorMode !== "fixedPalette") {
    state.allowedColorCodes = new Set([
      ...palette.slice(0, state.colorLimit).map((item) => item.code),
      ...state.lockedColorCodes,
    ]);
  }
  if (!effectiveAllowedPalette().some((item) => item.code === state.selectedColor.code)) {
    state.selectedColor = effectiveAllowedPalette()[0];
    updateSelectedColorUi();
  }
  renderConstraintPalette();
  if (regenerate) requestPreviewUpdate("颜色数量预览已更新，请确认应用。");
}

function syncColorLimitControls() {
  const max = palette.length;
  elements.colorLimit.max = max;
  elements.customColorLimitInput.max = max;
  elements.colorLimit.value = state.colorLimit;
  elements.customColorLimitInput.value = state.colorLimit;
  elements.colorLabel.textContent = `${state.colorLimit} / ${max} 色`;
  document.querySelectorAll(".color-preset").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.colors) === state.colorLimit);
  });
}

function setPatternMode(mode) {
  const preserveConfirmedDimensions = state.pattern.length && !state.image;
  if (state.pattern.length && state.image) capturePreviewCanvasSnapshot();
  state.patternMode = mode;
  elements.pixelModeOptions.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.patternMode === mode);
  });
  document.body.classList.toggle("is-pixel-pattern", mode === "pixelPattern");
  elements.patternModeLabel.textContent = mode === "pixelPattern" ? "像素图纸" : "普通图纸";

  if (mode === "pixelPattern") {
    if (!preserveConfirmedDimensions && ![30, 32, 34, 40, 48, 64].includes(state.gridSize)) {
      state.gridSize = 32;
      state.gridWidth = 32;
      state.gridHeight = 32;
    }
    state.dither = false;
    state.dominantSampling = true;
    state.lineBoost = true;
    state.mergeSimilarColors = true;
    state.cleanSmallRegions = true;
    state.animeMode = false;
    state.pixelBackground = state.pixelBackground || "white";
    state.viewMode = "pixel";
    applyPixelSizeDefaults(true);
  } else {
    if (!preserveConfirmedDimensions && state.gridSize < 48) {
      state.gridSize = 48;
      state.gridWidth = Math.max(48, activeGridWidth());
      state.gridHeight = Math.max(48, activeGridHeight());
    }
    state.minRegionSize = Math.max(state.minRegionSize, 4);
  }

  syncControlsFromState();
  if (state.image) requestPreviewUpdate("图纸模式预览已更新，请确认应用。");
  else {
    renderPattern();
    if (preserveConfirmedDimensions) elements.cellInfo.textContent = "当前没有原图，已切换显示模式并保留原图纸尺寸。";
  }
}

function setAppMode(mode) {
  state.appMode = mode === "draw" ? "draw" : "auto";
  document.querySelectorAll(".app-mode-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.appMode === state.appMode);
  });
  elements.appModeLabel.textContent = state.appMode === "draw" ? "画图模式" : "自动转图";
  document.body.classList.toggle("is-draw-mode", state.appMode === "draw");
  if (state.appMode === "draw") {
    state.editing = true;
    state.editorView = "grid";
    state.gridLocked = false;
    state.colorMode = "auto";
    state.allowedColorCodes = new Set(palette.map((item) => item.code));
    state.traceReference.enabled = true;
    state.traceReference.visible = true;
    document.querySelectorAll(".color-mode-option").forEach((option) => option.classList.toggle("is-active", option.dataset.colorMode === state.colorMode));
    elements.colorModeLabel.textContent = "自动颜色";
    setActiveTool("brush");
    if (state.referenceImage && !Number.isFinite(state.traceReference.x)) fitTraceReferenceToCanvas();
    if (!state.pattern.length) {
      createBlankCanvas({ confirmReplace: false });
    } else {
      renderPattern();
      renderStats();
      elements.cellInfo.textContent = "已进入画图模式，当前图纸已保留，可以继续手动画。";
    }
  } else {
    state.traceReference.adjustMode = false;
    setActiveTool("brush");
    elements.cellInfo.textContent = "已切回自动转图模式。上传图片后按参数生成预览。";
  }
  syncControlsFromState();
  markProjectDirty();
}

function createBlankCanvas(options = {}) {
  if (options.confirmReplace && state.pattern.length && !window.confirm("新建空白画布会覆盖当前正式图纸，确定继续吗？")) {
    return;
  }
  if (state.pattern.length && !state.suspendHistory) pushHistory();
  if (options.resetLibraryIdentity) {
    state.libraryProjectId = null;
    state.projectCreatedAt = null;
    state.fileName = "手绘图纸";
  }
  const fill = state.pixelBackground === "white" ? whiteBeadColor() : EMPTY_CELL;
  state.pattern = Array.from({ length: state.gridSize * state.gridSize }, (_, index) => {
    const x = index % state.gridSize;
    const y = Math.floor(index / state.gridSize);
    return isActiveGridCell(x, y) ? fill : EMPTY_CELL;
  });
  state.patternSize = state.gridSize;
  state.counts = buildCounts(state.pattern);
  state.projectPalette = fill.empty ? [] : [fill];
  state.backgroundMask = new Uint8Array(state.pattern.length);
  clearPreviewState();
  state.hasConfirmedGrid = true;
  state.manualEditedCells = new Set();
  state.manualEditCount = 0;
  state.fileName = state.fileName || "手绘图纸";
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.editGridVersion += 1;
  updateHistoryButtons();
  updateSelectedColorUi();
  renderPattern();
  renderStats();
  elements.projectName.textContent = state.fileName;
  elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / 空白画布`;
  elements.cellInfo.textContent = `已新建 ${gridDimensionsLabel()} 空白画布，背景为 ${fill.empty ? "空背景" : fill.code}。`;
  markProjectDirty();
}

function setBrushSize(value) {
  state.brushSize = clampRange(Math.round(Number(value) || 1), 1, 9);
  elements.brushSizeInput.value = state.brushSize;
  document.querySelectorAll(".brush-size-preset").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.brushSize) === state.brushSize);
  });
  renderPattern();
}

function recommendedProcessingProfile(size = state.gridSize) {
  return size <= 48 ? "compact48" : "detail64";
}

function setProcessingProfile(profile, options = {}) {
  const { updateDefaults = false, regenerate = true } = options;
  state.processingProfile = ["compact48", "detail64", "photoColor"].includes(profile) ? profile : "compact48";
  if (updateDefaults) {
    if (state.processingProfile === "compact48") {
      state.dominantSampling = true;
      state.mergeSimilarColors = true;
      state.cleanSmallRegions = true;
      state.animeMode = false;
      state.localPreprocessSettings.enabled = true;
      state.minRegionSize = state.gridSize <= 34 ? 1 : 3;
      setColorLimit(state.gridSize <= 34 ? 12 : 16, false);
    } else if (state.processingProfile === "detail64") {
      state.dominantSampling = true;
      state.mergeSimilarColors = true;
      state.cleanSmallRegions = true;
      state.animeMode = false;
      state.localPreprocessSettings.enabled = true;
      state.minRegionSize = state.gridSize <= 64 ? 2 : 3;
      setColorLimit(state.gridSize <= 64 ? 24 : state.gridSize <= 100 ? 28 : 32, false);
    } else {
      state.dominantSampling = true;
      state.mergeSimilarColors = true;
      state.cleanSmallRegions = true;
      state.animeMode = false;
      state.localPreprocessSettings.enabled = false;
      state.minRegionSize = 2;
      state.accurateMatch = true;
      if (elements.accurateMatchToggle) elements.accurateMatchToggle.checked = true;
      setColorLimit(palette.length, false);
    }
  }
  syncProcessingProfileControls();
  syncControlsFromState();
  if (regenerate && state.image) {
    const label = state.processingProfile === "compact48" ? "48 精简版" : state.processingProfile === "detail64" ? "64+ 细节版" : "照片原色";
    requestPreviewUpdate(`已切换到${label}并更新预览，请确认应用。`);
  }
}

function syncProcessingProfileControls() {
  const detail = state.processingProfile === "detail64";
  const photo = state.processingProfile === "photoColor";
  if (elements.processingProfileLabel) elements.processingProfileLabel.textContent = photo ? "照片原色" : detail ? "64+ 细节版" : "48 精简版";
  if (elements.processingProfileHint) {
    elements.processingProfileHint.textContent = photo
      ? "高保真映射并轻度整理近色与孤点；不限制总颜色，不做全局色系压缩。"
      : detail
      ? "轻度清理，保留更多明暗层次、小装饰和结构细节。"
      : "强收敛杂色，突出轮廓与远看识别度。";
  }
  elements.processingProfileOptions.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.processingProfile === state.processingProfile);
  });
}

function applyPixelSizeDefaults(updateColor = true) {
  if (state.processingProfile !== "photoColor") state.processingProfile = recommendedProcessingProfile();
  if (state.processingProfile === "photoColor") {
    state.minRegionSize = 2;
    if (updateColor) setColorLimit(palette.length, false);
    return;
  }
  state.minRegionSize = state.gridSize <= 34 ? 1 : state.gridSize <= 48 ? 3 : 2;
  if (updateColor) {
    setColorLimit(state.gridSize <= 34 ? 12 : state.gridSize <= 48 ? 16 : state.gridSize <= 64 ? 24 : 28, false);
  }
}

function applySizePresetDefaults(updateColor = true) {
  if (state.processingProfile !== "photoColor") state.processingProfile = recommendedProcessingProfile();
  if (state.processingProfile === "photoColor") {
    state.minRegionSize = 2;
    if (updateColor) setColorLimit(palette.length, false);
    return;
  }
  if (state.gridSize <= 48) {
    state.dominantSampling = true;
    state.lineBoost = true;
    state.mergeSimilarColors = true;
    state.cleanSmallRegions = true;
    state.minRegionSize = 3;
    if (updateColor) setColorLimit(16, false);
  } else if (state.gridSize <= 64) {
    state.dominantSampling = true;
    state.lineBoost = true;
    state.mergeSimilarColors = true;
    state.cleanSmallRegions = true;
    state.minRegionSize = 2;
    if (updateColor) setColorLimit(24, false);
  } else if (state.gridSize <= 100) {
    state.minRegionSize = 3;
    if (updateColor) setColorLimit(28, false);
  } else {
    state.minRegionSize = 3;
    if (updateColor) setColorLimit(32, false);
  }
}

function syncControlsFromState() {
  elements.sizeLabel.textContent = gridDimensionsLabel();
  elements.customSizeInput.value = activeGridWidth();
  elements.customHeightInput.value = activeGridHeight();
  elements.appModeLabel.textContent = state.appMode === "draw" ? "画图模式" : "自动转图";
  elements.appModeOptions.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.appMode === state.appMode);
  });
  syncProcessingProfileControls();
  document.body.classList.toggle("is-draw-mode", state.appMode === "draw");
  elements.brushSizeInput.value = state.brushSize;
  elements.brushShapeSelect.value = state.brushShape;
  elements.symmetryModeSelect.value = state.symmetryMode;
  elements.allowLockedEditToggle.checked = state.allowEditLockedCells;
  document.querySelectorAll(".brush-size-preset").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.brushSize) === state.brushSize);
  });
  syncColorLimitControls();
  document.querySelectorAll(".seg-option").forEach((button) => {
    button.classList.toggle("is-active", activeGridWidth() === activeGridHeight() && Number(button.dataset.size) === state.gridSize);
  });
  document.querySelectorAll(".view-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.viewMode);
  });
  document.querySelectorAll(".fit-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.fit === state.fitMode);
  });
  elements.fitModeLabel.textContent = state.fitMode === "center" ? "居中裁剪" : "主体完整";
  document.querySelectorAll(".pixel-bg-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.bg === state.pixelBackground);
  });
  elements.ditherToggle.checked = state.dither;
  elements.lineBoostToggle.checked = state.lineBoost;
  elements.outlineModeSelect.value = state.lineBoost ? state.outlineMode : "off";
  syncLocalPreprocessControls();
  elements.dominantSamplingToggle.checked = state.dominantSampling;
  elements.mergeSimilarToggle.checked = state.mergeSimilarColors;
  elements.cleanSmallRegionsToggle.checked = state.cleanSmallRegions;
  elements.animeModeToggle.checked = state.animeMode;
  elements.minRegionSize.value = state.minRegionSize;
  elements.minRegionLabel.textContent = `${state.minRegionSize} 颗`;
  elements.showCodesToggle.checked = state.showCellCodes;
  elements.showCoordsToggle.checked = state.showCoordinates;
  elements.guideEvery5Toggle.checked = state.guideEvery === 5;
  elements.referenceVisibleToggle.checked = state.referenceVisible;
  elements.referenceAboveToggle.checked = state.referenceAbove;
  elements.referenceOpacity.value = Math.round(state.referenceOpacity * 100);
  elements.referenceOpacityLabel.textContent = `${Math.round(state.referenceOpacity * 100)}%`;
  updateReferenceMenuState();
  syncTraceReferenceControls();
  updatePixelBackgroundLabel();
  syncDiagnosticControls();
}

function syncTraceReferenceControls() {
  const trace = state.traceReference;
  const hasReference = Boolean(state.referenceImage);
  const canAdjust = hasReference && trace.enabled && trace.visible;
  elements.traceReferenceToolbar?.classList.toggle("is-unavailable", !hasReference);
  elements.traceReferenceToolbar?.classList.toggle("is-adjusting", Boolean(trace.adjustMode));
  elements.traceReferenceToggle.checked = Boolean(trace.enabled && trace.visible);
  elements.traceReferenceAdjustButton.classList.toggle("is-active", Boolean(trace.adjustMode));
  elements.traceReferenceAdjustButton.disabled = !hasReference;
  elements.traceReferenceAdjustButton.textContent = trace.adjustMode ? "完成调整" : "调整参考图";
  elements.traceReferenceLockButton.disabled = !hasReference;
  elements.traceReferenceLockButton.classList.toggle("is-active", Boolean(trace.locked));
  elements.traceReferenceLockButton.title = trace.locked ? "已锁定，点击解锁画布参考图" : "未锁定，点击锁定画布参考图";
  const traceVisibility = Math.round(trace.opacity * 100);
  elements.traceReferenceOpacity.value = traceVisibility;
  elements.traceReferenceOpacityLabel.textContent = `${traceVisibility}%`;
  elements.traceReferenceOpacity.disabled = !hasReference;
  elements.traceReferenceZoomOutButton.disabled = !canAdjust || trace.locked;
  elements.traceReferenceZoomInButton.disabled = !canAdjust || trace.locked;
  elements.traceReferenceFitButton.disabled = !hasReference;
  elements.traceReferenceCenterButton.disabled = !hasReference;
  if (elements.traceReferenceSnapToggle) {
    elements.traceReferenceSnapToggle.checked = Boolean(trace.snapToGrid);
    elements.traceReferenceSnapToggle.disabled = !hasReference;
  }
  updateCanvasCursor();
}

function updatePixelBackgroundLabel() {
  const labels = { empty: "空背景", white: "F1 背景", transparent: "透明背景" };
  elements.pixelBackgroundLabel.textContent = labels[state.pixelBackground] || "F1 背景";
  updateBackgroundHint();
}

function updateBackgroundHint() {
  if (!elements.backgroundHint) return;
  const hasTransparentSource = Boolean(state.sourceImageState?.hasAlpha);
  const shouldSuggestEmpty = hasTransparentSource && state.pixelBackground === "white";
  elements.backgroundHint.hidden = !shouldSuggestEmpty;
  elements.backgroundHint.textContent = shouldSuggestEmpty
    ? "检测到透明背景。F1 会计入总颗数，切换空背景可减少用豆。"
    : "";
}

function moveQuickTogglesToToolbar() {
  const target = document.querySelector(".top-parameter-toggles") || document.querySelector(".advanced-parameter-toggles");
  if (!target) return;
  const ids = ["gridToggle", "showCodesToggle"];
  for (const id of ids) {
    const toggle = elements[id]?.closest(".toggle");
    if (toggle) target.appendChild(toggle);
  }
  document.querySelectorAll(".control-panel .control-group.compact").forEach((group) => {
    if (!group.querySelector(".toggle, button, input")) group.hidden = true;
  });
}

function organizeWorkbenchSidebar() {
  const panel = document.querySelector(".control-panel");
  const project = document.querySelector(".project-card");
  const upload = document.querySelector(".upload-card");
  const imageProcess = document.querySelector(".image-process-card");
  const advanced = document.querySelector(".advanced-settings");
  const size = document.querySelector(".size-card");
  const paletteSettings = document.querySelector(".palette-settings-card");
  const background = document.querySelector(".background-card");
  const exportActions = document.querySelector(".export-actions");
  if (!panel) return;
  if (advanced && background && background.parentElement !== advanced) advanced.appendChild(background);
  if (imageProcess && advanced && advanced.parentElement !== imageProcess) imageProcess.appendChild(advanced);
  for (const section of [upload, size, paletteSettings, imageProcess, project, exportActions]) {
    if (section) panel.appendChild(section);
  }
}

function toggleLocalPreprocessPanel() {
  const isOpen = !elements.localPreprocessPanel.hidden;
  elements.localPreprocessPanel.hidden = isOpen;
  elements.localPreprocessMenuButton.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) syncLocalPreprocessControls();
}

function closeLocalPreprocessPanel() {
  elements.localPreprocessPanel.hidden = true;
  elements.localPreprocessMenuButton.setAttribute("aria-expanded", "false");
}

function invalidateOptimizedBaseImage() {
  state.optimizedBaseImage = null;
  state.optimizedBaseImageSignature = "";
}

function syncLocalPreprocessControls() {
  const settings = state.localPreprocessSettings;
  elements.localPreprocessEnabledToggle.checked = settings.enabled;
  elements.flatColorSimplificationToggle.checked = settings.flatColorSimplification;
  elements.antiAliasCleanupToggle.checked = settings.antiAliasCleanup;
  elements.outlinePreservePreprocessToggle.checked = settings.outlinePreserve;
  elements.noiseReductionToggle.checked = settings.noiseReduction;
  elements.materialTextureCleanupToggle.checked = settings.materialTextureCleanup;
  elements.backgroundCleanupToggle.checked = settings.backgroundCleanup;
  elements.regionColorStabilizationToggle.checked = settings.regionColorStabilization;
  elements.regionToneCompressionToggle.checked = settings.regionToneCompression;
  elements.outlineColorConvergenceToggle.checked = settings.outlineColorConvergence;
  [
    elements.flatColorSimplificationToggle,
    elements.antiAliasCleanupToggle,
    elements.outlinePreservePreprocessToggle,
    elements.noiseReductionToggle,
    elements.materialTextureCleanupToggle,
    elements.backgroundCleanupToggle,
    elements.regionColorStabilizationToggle,
    elements.regionToneCompressionToggle,
    elements.outlineColorConvergenceToggle,
  ].forEach((input) => {
    input.disabled = !settings.enabled;
    input.closest(".toggle")?.classList.toggle("is-disabled", !settings.enabled);
  });
  elements.localPreprocessApplyButton.disabled = !(state.isPreviewDirty && state.previewPattern.length);
  elements.localPreprocessStatus.textContent = settings.enabled
    ? state.optimizedBaseImage
      ? "已使用本地优化底图生成预览"
      : "开启后自动更新预览，确认应用后进入编辑或导出"
    : "默认关闭，当前使用原图转换流程";
}

function syncDiagnosticControls() {
  if (!elements.accurateMatchToggle) return;
  elements.accurateMatchToggle.checked = state.accurateMatch;
  elements.colorDebugToggle.checked = state.colorDebugEnabled;
  elements.showFinalGridButton.classList.toggle("is-active", state.diagnosticViewMode !== "raw");
  elements.showRawGridButton.classList.toggle("is-active", state.diagnosticViewMode === "raw");
  elements.showRawGridButton.disabled = !state.rawMappedGrid.length;
  elements.colorDebugInfo.textContent =
    state.diagnosticViewMode === "raw"
      ? `正在查看原始匹配：只包含采样 + ${PALETTE_NAME} LAB/DeltaE 匹配。`
      : "正在查看最终结果：包含减色、合并、清理等后处理。开启颜色诊断后按住 Alt 点击格子查看变化。";
}

function serializeGrid(pattern) {
  return Array.isArray(pattern) ? pattern.map((item) => (item?.empty ? "__EMPTY__" : item?.code || "__EMPTY__")) : [];
}

function deserializeGrid(codes, expectedLength = 0) {
  if (!Array.isArray(codes)) return [];
  const safeLength = expectedLength > 0 ? Math.min(codes.length, expectedLength) : codes.length;
  const grid = codes
    .slice(0, safeLength)
    .map((code) => (code === "__EMPTY__" || !code ? EMPTY_CELL : paletteColorByCode(code) || fallbackPaletteColor()));
  if (expectedLength > 0 && grid.length) {
    while (grid.length < expectedLength) grid.push(EMPTY_CELL);
  }
  return grid;
}

function maskToArray(mask) {
  if (!mask) return [];
  return Array.from(mask);
}

function arrayToMask(values, length) {
  if (!Array.isArray(values)) return null;
  const mask = new Uint8Array(length || values.length);
  values.slice(0, mask.length).forEach((value, index) => {
    mask[index] = Number(value) ? 1 : 0;
  });
  return mask;
}

function serializableReferencePanel() {
  const panel = { ...state.referencePanel };
  for (const transientKey of ["dragging", "pointerId", "startX", "startY", "startPanelX", "startPanelY"]) {
    delete panel[transientKey];
  }
  return panel;
}

function serializableTraceReference() {
  const trace = { ...state.traceReference };
  for (const transientKey of ["dragging", "pointerId", "startClientX", "startClientY", "startX", "startY"]) {
    delete trace[transientKey];
  }
  return trace;
}

function buildProjectData() {
  const now = new Date().toISOString();
  if (!state.projectCreatedAt) state.projectCreatedAt = now;
  const sourceImageData = state.image ? imageToDataUrl(state.image, 2200) : state.sourceImageState?.croppedImageData || "";
  const referenceImageData = state.referenceImageUrl || (state.referenceImage ? imageToDataUrl(state.referenceImage, 2200) : "");
  const usedColors = [...buildCounts(state.pattern).values()].map((item) => ({
    code: item.code,
    name: item.name,
    hex: item.hex,
    count: item.count,
  }));

  return {
    version: PROJECT_FILE_VERSION,
    appName: "小麦拼豆",
    createdAt: state.projectCreatedAt,
    updatedAt: now,
    fileName: state.fileName,
    libraryState: {
      id: state.libraryProjectId,
    },
    canvas: {
      width: activeGridWidth(),
      height: activeGridHeight(),
      backgroundMode: state.pixelBackground,
      backgroundColorId: state.pixelBackground === "white" ? "F1" : "",
    },
    sourceImageState: {
      ...(state.sourceImageState || {}),
      originalImageData: state.sourceImageState?.originalImageData || sourceImageData,
      croppedImageData: state.sourceImageState?.croppedImageData || sourceImageData,
      useCroppedImage: Boolean(sourceImageData),
    },
    gridState: {
      editGrid: serializeGrid(state.pattern),
      previewGrid: serializeGrid(state.previewPattern),
      rawMappedGrid: serializeGrid(state.rawMappedGrid),
      finalGrid: serializeGrid(state.finalGrid),
      backgroundMask: maskToArray(state.backgroundMask),
      previewBackgroundMask: maskToArray(state.previewBackgroundMask),
      isPreviewDirty: state.isPreviewDirty,
      manualEditedCells: [...state.manualEditedCells],
    },
    paletteState: {
      paletteName: PALETTE_NAME,
      usedColors,
      allowedPalette: [...state.allowedColorCodes],
      lockedColors: [...state.lockedColorCodes],
      disabledColors: [...state.disabledColorCodes],
      activePaintColor: state.selectedColor?.code || "",
      maxColors: state.colorLimit,
      colorConstraintMode: state.colorMode,
      projectPalette: state.projectPalette.map((item) => item.code).filter(Boolean),
    },
    settings: {
      localPreprocessEnabled: state.localPreprocessSettings.enabled,
      flatColorSimplification: state.localPreprocessSettings.flatColorSimplification,
      antiAliasCleanup: state.localPreprocessSettings.antiAliasCleanup,
      outlinePreserve: state.localPreprocessSettings.outlinePreserve,
      noiseReduction: state.localPreprocessSettings.noiseReduction,
      materialTextureCleanup: state.localPreprocessSettings.materialTextureCleanup,
      backgroundCleanup: state.localPreprocessSettings.backgroundCleanup,
      regionColorStabilization: state.localPreprocessSettings.regionColorStabilization,
      regionToneCompression: state.localPreprocessSettings.regionToneCompression,
      outlineColorConvergence: state.localPreprocessSettings.outlineColorConvergence,
      preserveOutline: state.lineBoost,
      outlineStrength: state.outlineMode,
      outlineMode: state.outlineMode,
      dominantSampling: state.dominantSampling,
      mergeSimilarColors: state.mergeSimilarColors,
      cleanIsolatedPixels: state.cleanSmallRegions,
      animeMode: state.animeMode,
      ditherEnabled: state.dither,
      removeTransparent: state.removeTransparent,
      fitMode: state.fitMode,
      patternMode: state.patternMode,
      processingProfile: state.processingProfile,
      minRegionSize: state.minRegionSize,
      accurateMatch: state.accurateMatch,
    },
    displaySettings: {
      codeVisibilityVersion: 2,
      showColorCode: state.showCellCodes,
      showCoordinates: state.showCoordinates,
      showFiveGridLines: state.guideEvery === 5,
      showGrid: state.showGrid,
      guideEvery: state.guideEvery,
      zoom: state.zoom,
      editorView: state.editorView,
      viewMode: state.viewMode,
    },
    exportSettings: {
      watermarkEnabled: state.exportWatermarkEnabled,
    },
    referenceImageState: {
      imageData: referenceImageData,
      name: state.referenceName,
      visible: state.referenceVisible,
      above: state.referenceAbove,
      opacity: state.referenceOpacity,
      locked: state.referenceLocked,
      panel: serializableReferencePanel(),
    },
    canvasReferenceLayerState: {
      imageData: referenceImageData,
      ...serializableTraceReference(),
    },
    drawModeState: {
      enabled: state.appMode === "draw",
      appMode: state.appMode,
      activeTool: state.activeTool,
      brushSize: state.brushSize,
      brushShape: state.brushShape,
      symmetryMode: state.symmetryMode,
      allowEditLockedCells: state.allowEditLockedCells,
      editing: state.editing,
      gridLocked: state.gridLocked,
    },
  };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function hasMeaningfulProject() {
  return Boolean(state.pattern.length || state.image || state.referenceImage);
}

function confirmReplaceCurrentProject(actionLabel = "继续") {
  if (!state.projectDirty || !hasMeaningfulProject()) return true;
  return window.confirm(`当前图纸还有未保存修改。${actionLabel}会替换当前内容，确定继续吗？`);
}

function projectFileNameForData(projectData) {
  const raw = (projectData?.fileName || "未标题-1").replace(/\.[^.]+$/, "");
  const safe = raw.replace(/[\\/:*?"<>|]/g, "_").trim() || "未标题-1";
  return `${safe}.${PROJECT_FILE_EXTENSION}`;
}

function downloadProjectData(projectData) {
  const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, projectFileNameForData(projectData));
}

async function requestPersistentStorage() {
  try {
    await navigator.storage?.persist?.();
  } catch (error) {
    console.warn("无法申请持久化存储", error);
  }
}

async function saveProjectFile() {
  try {
    const projectData = buildProjectData();
    await saveLibraryProject(projectData);
    await writeAutosaveProject(projectData, { dirty: false });
    await requestPersistentStorage();
    downloadProjectData(projectData);
    markProjectSaved("已下载并保存到图纸库");
    await renderProjectLibrary();
  } catch (error) {
    console.error("保存项目失败", error);
    updateProjectSaveStatus("保存失败");
    elements.cellInfo.textContent = `保存项目失败：${error.message || error}`;
  }
}

async function handleProjectFileOpen(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    if (!confirmReplaceCurrentProject("导入项目")) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await restoreProjectData(data, { fileName: file.name, libraryProjectId: null });
    markProjectSaved("项目已打开");
    await writeAutosaveProject(buildProjectData(), { dirty: false });
    elements.cellInfo.textContent = `已打开项目：${file.name}，可以继续编辑和导出。`;
  } catch (error) {
    console.error("打开项目失败", error);
    elements.cellInfo.textContent = `打开项目失败：${error.message || error}`;
  } finally {
    event.target.value = "";
  }
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

async function restoreProjectData(projectData, options = {}) {
  if (!projectData || typeof projectData !== "object") throw new Error("项目文件格式不正确。");
  if (projectData.appName && projectData.appName !== "小麦拼豆") {
    console.warn("非小麦拼豆项目文件，尝试兼容打开。", projectData.appName);
  }

  state.projectRestoring = true;
  try {
    const canvas = projectData.canvas || {};
    const gridState = projectData.gridState || {};
    const paletteState = projectData.paletteState || {};
    const settings = projectData.settings || {};
    const display = projectData.displaySettings || {};
    const exportSettings = projectData.exportSettings || {};
    const reference = projectData.referenceImageState || {};
    const trace = projectData.canvasReferenceLayerState || {};
    const draw = projectData.drawModeState || {};
    const source = projectData.sourceImageState || {};
    const sourceData = source.croppedImageData || source.originalImageData || "";
    const referenceData = reference.imageData || trace.imageData || "";

    state.gridWidth = clampRange(Number(canvas.width || projectData.gridSize || 48), 16, 160);
    state.gridHeight = clampRange(Number(canvas.height || projectData.gridSize || state.gridWidth), 16, 160);
    state.gridSize = Math.max(state.gridWidth, state.gridHeight);
    state.patternSize = state.gridSize;
    state.fileName = (options.fileName || projectData.fileName || source.fileName || "小麦拼豆项目").replace(/\.(xiaomai|xmbd)$/i, "");
    state.projectCreatedAt = projectData.createdAt || new Date().toISOString();
    state.libraryProjectId = Object.prototype.hasOwnProperty.call(options, "libraryProjectId")
      ? options.libraryProjectId
      : projectData.libraryState?.id || null;
    state.sourceImageState = { ...source };
    state.image = await loadImageFromDataUrl(sourceData);
    if (state.image) {
      state.sourceImageState.croppedImageData = sourceData;
      state.sourceImageState.originalImageData = source.originalImageData || sourceData;
      state.sourceImageState.width = state.image.width;
      state.sourceImageState.height = state.image.height;
    }

    state.pixelBackground = canvas.backgroundMode || "white";
    const expectedGridLength = state.gridSize * state.gridSize;
    state.pattern = deserializeGrid(gridState.editGrid, expectedGridLength);
    state.previewPattern = deserializeGrid(gridState.previewGrid, expectedGridLength);
    state.rawMappedGrid = deserializeGrid(gridState.rawMappedGrid, expectedGridLength);
    state.finalGrid = deserializeGrid(gridState.finalGrid, expectedGridLength);
    state.backgroundMask = arrayToMask(gridState.backgroundMask, state.pattern.length);
    state.previewBackgroundMask = arrayToMask(gridState.previewBackgroundMask, state.previewPattern.length);
    state.isPreviewDirty = Boolean(gridState.isPreviewDirty && state.previewPattern.length);
    state.manualEditedCells = new Set(
      (Array.isArray(gridState.manualEditedCells) ? gridState.manualEditedCells : []).filter(
        (index) => Number.isInteger(index) && index >= 0 && index < expectedGridLength,
      ),
    );
    state.manualEditCount = state.manualEditedCells.size;

    state.colorLimit = clampColorLimit(paletteState.maxColors || state.colorLimit);
    state.colorMode = ["auto", "max", "fixedPalette"].includes(paletteState.colorConstraintMode)
      ? paletteState.colorConstraintMode
      : "max";
    state.allowedColorCodes = new Set(paletteState.allowedPalette || []);
    state.lockedColorCodes = new Set(paletteState.lockedColors || []);
    state.disabledColorCodes = new Set(paletteState.disabledColors || []);
    state.lockedColorCodes.forEach((code) => state.allowedColorCodes.add(code));
    state.selectedColor = paletteColorByCode(paletteState.activePaintColor) || state.selectedColor || fallbackPaletteColor();
    state.projectPalette = Array.isArray(paletteState.projectPalette)
      ? paletteState.projectPalette.map((code) => paletteColorByCode(code)).filter(Boolean)
      : [];

    state.localPreprocessSettings = {
      enabled: Boolean(settings.localPreprocessEnabled),
      flatColorSimplification: settings.flatColorSimplification !== false,
      antiAliasCleanup: settings.antiAliasCleanup !== false,
      outlinePreserve: settings.outlinePreserve !== false,
      noiseReduction: settings.noiseReduction !== false,
      materialTextureCleanup: settings.materialTextureCleanup !== false,
      backgroundCleanup: settings.backgroundCleanup !== false,
      regionColorStabilization: settings.regionColorStabilization !== false,
      regionToneCompression: settings.regionToneCompression !== false,
      outlineColorConvergence: settings.outlineColorConvergence !== false,
    };
    state.lineBoost = settings.preserveOutline !== false;
    state.outlineMode = settings.outlineMode || settings.outlineStrength || "light";
    state.dominantSampling = settings.dominantSampling !== false;
    state.mergeSimilarColors = settings.mergeSimilarColors !== false;
    state.cleanSmallRegions = settings.cleanIsolatedPixels !== false;
    state.animeMode = settings.animeMode !== false;
    state.dither = Boolean(settings.ditherEnabled);
    state.removeTransparent = settings.removeTransparent !== false;
    state.fitMode = settings.fitMode || "subject";
    if (state.fitMode === "contain") state.fitMode = "subject";
    state.patternMode = settings.patternMode || state.patternMode || "illustration";
    state.processingProfile = settings.processingProfile || recommendedProcessingProfile(state.gridSize);
    state.minRegionSize = Number(settings.minRegionSize || state.minRegionSize || 4);
    if (state.processingProfile === "photoColor" && state.minRegionSize > 3) state.minRegionSize = 2;
    state.accurateMatch = Boolean(settings.accurateMatch);
    state.optimizedBaseImage = null;
    state.optimizedBaseImageSignature = "";

    state.showCellCodes = Number(display.codeVisibilityVersion || 0) >= 2 ? display.showColorCode !== false : true;
    state.showCoordinates = display.showCoordinates !== false;
    state.guideEvery = Number(display.guideEvery || (display.showFiveGridLines === false ? 10 : 5));
    state.showGrid = display.showGrid !== false;
    state.viewMode = display.viewMode || "pixel";
    state.editorView = display.editorView || "grid";
    state.zoom = Number(display.zoom || 1);
    state.exportWatermarkEnabled = exportSettings.watermarkEnabled !== false;
    elements.exportWatermarkToggle.checked = state.exportWatermarkEnabled;

    state.referenceImage = await loadImageFromDataUrl(referenceData);
    state.referenceImageUrl = referenceData;
    state.referenceName = reference.name || state.fileName || "";
    state.referenceVisible = reference.visible !== false;
    state.referenceAbove = Boolean(reference.above);
    state.referenceOpacity = Number(reference.opacity ?? 0.35);
    state.referenceLocked = Boolean(reference.locked);
    state.referencePanel = { ...state.referencePanel, ...(reference.panel || {}), dragging: false, pointerId: null };

    state.traceReference = {
      ...state.traceReference,
      ...trace,
      imageData: undefined,
      dragging: false,
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      enabled: trace.enabled !== false,
      visible: trace.visible !== false,
      opacity: Number(trace.opacity ?? 0.35),
      zMode: "aboveGrid",
      scale: Number(trace.scale || 1),
      locked: trace.locked !== false,
      snapToGrid: false,
      adjustMode: false,
    };

    state.appMode = draw.appMode || (draw.enabled ? "draw" : "auto");
    state.activeTool = visibleCanvasTool(draw.activeTool) ? draw.activeTool : "brush";
    state.brushSize = Number(draw.brushSize || 1);
    state.brushShape = draw.brushShape || "square";
    state.symmetryMode = ["horizontal", "vertical", "both"].includes(draw.symmetryMode) ? draw.symmetryMode : "none";
    state.allowEditLockedCells = Boolean(draw.allowEditLockedCells);
    state.editing = draw.editing !== false;
    state.gridLocked = Boolean(draw.gridLocked);

    state.counts = buildCounts(state.pattern);
    state.previewCounts = buildCounts(state.previewPattern);
    state.projectPalette = [...new Map([...state.projectPalette, ...state.counts.values()].map((item) => [item.code, item])).values()];
    state.qualityMetrics = state.pattern.length ? calculateQualityMetrics(state.pattern, state.gridSize) : null;
    state.previewQualityMetrics = state.previewPattern.length ? calculateQualityMetrics(state.previewPattern, state.gridSize) : null;
    state.usedBounds = state.pattern.length ? calculateUsedBounds(state.pattern, state.gridSize) : null;
    state.hasConfirmedGrid = Boolean(state.pattern.length);
    state.editGridVersion += 1;
    state.previewGridVersion += state.isPreviewDirty ? 1 : 0;
    state.selection.clear();
    state.penPoints = [];
    clearHistory();

    syncControlsFromState();
    syncColorLimitControls();
    updateSelectedColorUi();
    updatePreviewButtons();
    updateHistoryButtons();
    updateGridLockUi();
    updateToolboxLockUi();
    updateReferenceMenuState();
    syncTraceReferenceControls();
    syncDiagnosticControls();
    renderReferenceFloatPanel();
    renderConstraintPalette();
    setZoom(state.zoom);
    renderPattern();
    renderStats();
    elements.projectName.textContent = "小麦拼豆";
    elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / 已恢复项目`;
  } finally {
    state.projectRestoring = false;
  }
}

function updateProjectSaveStatus(text) {
  if (!elements.projectSaveStatus) return;
  elements.projectSaveStatus.textContent = text;
  elements.projectSaveStatus.classList.toggle("is-dirty", state.projectDirty);
  syncModeHeaderProject();
}

function markProjectDirty(status = "未保存") {
  if (state.projectRestoring) return;
  state.projectDirty = true;
  updateProjectSaveStatus(status);
  scheduleProjectAutoSave();
}

function markProjectSaved(status = "已保存") {
  state.projectDirty = false;
  state.projectSavedAt = new Date().toISOString();
  updateProjectSaveStatus(status);
}

function scheduleProjectAutoSave(delay = 2000) {
  if (state.projectRestoring) return;
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(autoSaveProject, delay);
}

async function autoSaveProject() {
  if (state.projectRestoring) return;
  if (!hasMeaningfulProject()) return;
  try {
    updateProjectSaveStatus("自动保存中");
    const projectData = buildProjectData();
    await writeAutosaveProject(projectData, { dirty: state.projectDirty });
    updateProjectSaveStatus(state.projectDirty ? "自动保存成功 / 未保存" : "已保存");
    window.clearTimeout(state.autosaveStatusTimer);
    state.autosaveStatusTimer = window.setTimeout(() => {
      updateProjectSaveStatus(state.projectDirty ? "未保存" : "已保存");
    }, 1800);
  } catch (error) {
    console.error("自动保存失败", error);
    updateProjectSaveStatus("自动保存失败");
  }
}

function openProjectDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("当前环境不支持 IndexedDB。"));
      return;
    }
    const request = indexedDB.open(AUTOSAVE_DB_NAME, PROJECT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUTOSAVE_STORE_NAME)) db.createObjectStore(AUTOSAVE_STORE_NAME);
      const metaStore = db.objectStoreNames.contains(LIBRARY_META_STORE_NAME)
        ? request.transaction.objectStore(LIBRARY_META_STORE_NAME)
        : db.createObjectStore(LIBRARY_META_STORE_NAME, { keyPath: "id" });
      if (!metaStore.indexNames.contains("updatedAt")) metaStore.createIndex("updatedAt", "updatedAt");
      if (!db.objectStoreNames.contains(LIBRARY_DATA_STORE_NAME)) {
        db.createObjectStore(LIBRARY_DATA_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("图纸库正在被其他页面使用，请关闭旧页面后重试。"));
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("本地存储事务失败。"));
    transaction.onabort = () => reject(transaction.error || new Error("本地存储事务已取消。"));
  });
}

async function writeAutosaveProject(data, options = {}) {
  const db = await openProjectDb();
  try {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, "readwrite");
    transaction.objectStore(AUTOSAVE_STORE_NAME).put(
      {
        schemaVersion: 2,
        dirty: options.dirty ?? state.projectDirty,
        projectId: state.libraryProjectId,
        updatedAt: data.updatedAt || new Date().toISOString(),
        payload: data,
      },
      AUTOSAVE_KEY,
    );
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function readAutosaveProject() {
  const db = await openProjectDb();
  try {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, "readonly");
    const raw = await idbRequest(transaction.objectStore(AUTOSAVE_STORE_NAME).get(AUTOSAVE_KEY));
    await transactionDone(transaction);
    if (!raw) return null;
    if (raw.payload) return raw;
    return {
      schemaVersion: 1,
      dirty: true,
      projectId: raw.libraryState?.id || null,
      updatedAt: raw.updatedAt,
      payload: raw,
    };
  } finally {
    db.close();
  }
}

async function clearAutosaveProject() {
  const db = await openProjectDb();
  try {
    const transaction = db.transaction(AUTOSAVE_STORE_NAME, "readwrite");
    transaction.objectStore(AUTOSAVE_STORE_NAME).delete(AUTOSAVE_KEY);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

function createLibraryProjectId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pattern-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function projectDataHasContent(projectData) {
  return Boolean(
    projectData?.gridState?.editGrid?.length ||
      projectData?.sourceImageState?.croppedImageData ||
      projectData?.sourceImageState?.originalImageData ||
      projectData?.referenceImageState?.imageData,
  );
}

function compactProjectDataForLibrary(projectData) {
  const compact = typeof structuredClone === "function" ? structuredClone(projectData) : JSON.parse(JSON.stringify(projectData));
  const source = compact.sourceImageState || {};
  if (source.originalImageData && source.originalImageData === source.croppedImageData) source.originalImageData = "";
  if (compact.canvasReferenceLayerState && compact.referenceImageState?.imageData) {
    compact.canvasReferenceLayerState.imageData = "";
  }
  return compact;
}

function createProjectThumbnail() {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 180;
  const thumbnailCtx = canvas.getContext("2d");
  thumbnailCtx.fillStyle = "#fffdf8";
  thumbnailCtx.fillRect(0, 0, canvas.width, canvas.height);
  const widthCells = activeGridWidth();
  const heightCells = activeGridHeight();
  const cell = Math.max(1, Math.min(216 / widthCells, 144 / heightCells));
  const plotWidth = widthCells * cell;
  const plotHeight = heightCells * cell;
  const startX = (canvas.width - plotWidth) / 2;
  const startY = 24 + (144 - plotHeight) / 2;
  thumbnailCtx.fillStyle = "#fff";
  thumbnailCtx.fillRect(startX, startY, plotWidth, plotHeight);
  for (let y = 0; y < heightCells; y += 1) {
    for (let x = 0; x < widthCells; x += 1) {
      const item = state.pattern[y * state.gridSize + x];
      if (!item || item.empty) continue;
      thumbnailCtx.fillStyle = item.hex;
      thumbnailCtx.fillRect(startX + x * cell, startY + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
  thumbnailCtx.fillStyle = "#111";
  thumbnailCtx.font = "700 12px Microsoft YaHei, sans-serif";
  thumbnailCtx.fillText(state.fileName || "未命名图纸", 12, 16);
  return canvas.toDataURL("image/webp", 0.82);
}

async function saveLibraryProject(projectData = buildProjectData()) {
  if (!projectDataHasContent(projectData)) throw new Error("当前还没有可以保存的图纸。请先上传图片或新建画布。");
  const previousId = state.libraryProjectId;
  const id = previousId || createLibraryProjectId();
  const savedAt = new Date().toISOString();
  state.libraryProjectId = id;
  projectData.libraryState = { id };
  const payload = compactProjectDataForLibrary(projectData);
  const meta = {
    id,
    name: projectData.fileName || "未命名图纸",
    nameLower: (projectData.fileName || "未命名图纸").toLocaleLowerCase(),
    createdAt: projectData.createdAt || savedAt,
    updatedAt: projectData.updatedAt || savedAt,
    savedAt,
    width: Number(projectData.canvas?.width || activeGridWidth()),
    height: Number(projectData.canvas?.height || activeGridHeight()),
    beadCount: totalBeadCount(),
    colorCount: state.counts.size,
    thumbnail: createProjectThumbnail(),
    projectFileVersion: projectData.version || PROJECT_FILE_VERSION,
  };
  const db = await openProjectDb();
  try {
    const transaction = db.transaction([LIBRARY_META_STORE_NAME, LIBRARY_DATA_STORE_NAME], "readwrite");
    transaction.objectStore(LIBRARY_META_STORE_NAME).put(meta);
    transaction.objectStore(LIBRARY_DATA_STORE_NAME).put({ id, payload });
    await transactionDone(transaction);
    return id;
  } catch (error) {
    state.libraryProjectId = previousId;
    throw error;
  } finally {
    db.close();
  }
}

async function listLibraryProjectMeta() {
  const db = await openProjectDb();
  try {
    const transaction = db.transaction(LIBRARY_META_STORE_NAME, "readonly");
    const records = await idbRequest(transaction.objectStore(LIBRARY_META_STORE_NAME).getAll());
    await transactionDone(transaction);
    return records.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  } finally {
    db.close();
  }
}

async function readLibraryProject(id) {
  const db = await openProjectDb();
  try {
    const transaction = db.transaction(LIBRARY_DATA_STORE_NAME, "readonly");
    const record = await idbRequest(transaction.objectStore(LIBRARY_DATA_STORE_NAME).get(id));
    await transactionDone(transaction);
    return record?.payload || null;
  } finally {
    db.close();
  }
}

async function removeLibraryProject(id) {
  const db = await openProjectDb();
  try {
    const transaction = db.transaction([LIBRARY_META_STORE_NAME, LIBRARY_DATA_STORE_NAME], "readwrite");
    transaction.objectStore(LIBRARY_META_STORE_NAME).delete(id);
    transaction.objectStore(LIBRARY_DATA_STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

function appendLibraryAction(actions, label, action, id, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.libraryAction = action;
  button.dataset.libraryId = id;
  if (className) button.className = className;
  actions.appendChild(button);
}

async function renderProjectLibrary() {
  if (!elements.projectLibraryList) return;
  elements.projectLibraryList.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "project-library-empty";
  loading.textContent = "正在读取图纸库…";
  elements.projectLibraryList.appendChild(loading);
  try {
    const records = await listLibraryProjectMeta();
    elements.projectLibraryCount.textContent = `${records.length} 张`;
    elements.projectLibraryList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "project-library-empty";
      empty.textContent = "还没有保存过的图纸。";
      elements.projectLibraryList.appendChild(empty);
      return;
    }
    records.forEach((record) => {
      const card = document.createElement("article");
      card.className = "project-library-item";
      if (record.id === state.libraryProjectId) card.classList.add("is-current");
      const image = document.createElement("img");
      image.className = "project-library-thumbnail";
      image.alt = "";
      image.loading = "lazy";
      image.src = record.thumbnail || "";
      const content = document.createElement("div");
      content.className = "project-library-content";
      const title = document.createElement("strong");
      title.textContent = record.name || "未命名图纸";
      const meta = document.createElement("span");
      meta.textContent = `${record.width}×${record.height} · ${record.beadCount || 0}颗 · ${record.colorCount || 0}色`;
      const date = document.createElement("time");
      date.dateTime = record.updatedAt || "";
      date.textContent = record.updatedAt ? new Date(record.updatedAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" }) : "";
      const actions = document.createElement("div");
      actions.className = "project-library-actions";
      appendLibraryAction(actions, "打开", "open", record.id, "primary");
      appendLibraryAction(actions, "下载", "download", record.id);
      appendLibraryAction(actions, "删除", "delete", record.id, "danger");
      content.append(title, meta, date, actions);
      card.append(image, content);
      elements.projectLibraryList.appendChild(card);
    });
  } catch (error) {
    console.error("读取图纸库失败", error);
    elements.projectLibraryCount.textContent = "读取失败";
    const failure = document.createElement("p");
    failure.className = "project-library-empty";
    failure.textContent = `图纸库读取失败：${error.message || error}`;
    elements.projectLibraryList.replaceChildren(failure);
  }
}

async function saveCurrentProjectToLibrary() {
  try {
    const projectData = buildProjectData();
    await saveLibraryProject(projectData);
    await writeAutosaveProject(projectData, { dirty: false });
    await requestPersistentStorage();
    markProjectSaved("已保存到图纸库");
    elements.cellInfo.textContent = "当前图纸已保存到“我做过的图纸”，以后可直接打开。";
    await renderProjectLibrary();
  } catch (error) {
    console.error("保存到图纸库失败", error);
    updateProjectSaveStatus("图纸库保存失败");
    elements.cellInfo.textContent = `保存到图纸库失败：${error.message || error}`;
  }
}

async function openLibraryProject(id) {
  if (!confirmReplaceCurrentProject("打开其他图纸")) return;
  try {
    const projectData = await readLibraryProject(id);
    if (!projectData) throw new Error("这张图纸已经不存在。" );
    await restoreProjectData(projectData, { fileName: projectData.fileName, libraryProjectId: id });
    markProjectSaved("已打开图纸库项目");
    await writeAutosaveProject(buildProjectData(), { dirty: false });
    elements.cellInfo.textContent = `已从图纸库打开：${projectData.fileName || "未命名图纸"}`;
    await renderProjectLibrary();
  } catch (error) {
    console.error("打开图纸库项目失败", error);
    elements.cellInfo.textContent = `打开图纸失败：${error.message || error}`;
  }
}

async function downloadLibraryProject(id) {
  try {
    const projectData = await readLibraryProject(id);
    if (!projectData) throw new Error("这张图纸已经不存在。" );
    downloadProjectData(projectData);
  } catch (error) {
    elements.cellInfo.textContent = `下载图纸失败：${error.message || error}`;
  }
}

async function deleteLibraryProject(id) {
  const actionButton = [...elements.projectLibraryList.querySelectorAll("button[data-library-id]")].find(
    (button) => button.dataset.libraryId === id,
  );
  const metaTitle = actionButton?.closest(".project-library-item")?.querySelector("strong")?.textContent;
  if (!window.confirm(`确定从图纸库删除“${metaTitle || "这张图纸"}”吗？此操作无法撤销。`)) return;
  try {
    if (id === state.libraryProjectId) {
      window.clearTimeout(state.autosaveTimer);
      state.libraryProjectId = null;
    }
    await removeLibraryProject(id);
    elements.cellInfo.textContent = "已从图纸库删除。当前画布内容仍然保留。";
    await renderProjectLibrary();
  } catch (error) {
    elements.cellInfo.textContent = `删除图纸失败：${error.message || error}`;
  }
}

function handleProjectLibraryAction(event) {
  const button = event.target.closest("button[data-library-action]");
  if (!button) return;
  const { libraryAction, libraryId } = button.dataset;
  if (libraryAction === "open") openLibraryProject(libraryId);
  if (libraryAction === "download") downloadLibraryProject(libraryId);
  if (libraryAction === "delete") deleteLibraryProject(libraryId);
}

async function checkAutosaveRecovery() {
  try {
    if (state.pattern.length || state.image) return;
    const record = await readAutosaveProject();
    const data = record?.payload;
    if (!record?.dirty || !projectDataHasContent(data)) return;
    const updatedAt = record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "上次";
    if (!window.confirm(`检测到未保存项目（${updatedAt}），是否恢复？`)) {
      await clearAutosaveProject();
      return;
    }
    await restoreProjectData(data, { fileName: data.fileName || "自动保存项目", libraryProjectId: record.projectId || null });
    markProjectDirty("已恢复自动保存 / 未保存");
    elements.cellInfo.textContent = "已从自动保存恢复项目。请点击“保存项目”导出 .xiaomai 文件。";
  } catch (error) {
    console.warn("自动保存恢复检查失败", error);
  }
}

function handleImageUpload(event) {
  const [file] = event.target.files;
  if (file && !confirmReplaceCurrentProject("上传新图片")) {
    event.target.value = "";
    return;
  }
  elements.projectMeta.textContent = file ? `已选择图片：${file.name}，正在读取...` : "没有读取到图片文件，请重新选择";
  elements.cellInfo.textContent = file ? "正在读取图片..." : "没有读取到图片文件，请重新选择";
  loadImageFile(file);
  window.setTimeout(() => {
    event.target.value = "";
  }, 0);
}

function handleDragOver(event) {
  event.preventDefault();
  elements.uploadZone.classList.add("is-dragging");
}

function handleDragLeave() {
  elements.uploadZone.classList.remove("is-dragging");
}

function handleDrop(event) {
  event.preventDefault();
  elements.uploadZone.classList.remove("is-dragging");
  const [file] = event.dataTransfer.files;
  if (file && !confirmReplaceCurrentProject("上传新图片")) return;
  loadImageFile(file);
}

function loadImageFile(file) {
  if (!file) return;
  const looksLikeImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
  if (!looksLikeImage) {
    elements.projectMeta.textContent = "请选择图片文件";
    return;
  }

  const image = new Image();
  image.onload = () => {
    elements.projectMeta.textContent = `图片已读取：${image.width} x ${image.height}，正在适配 ${gridDimensionsLabel()} 画布`;
    elements.cellInfo.textContent = "图片会完整适配当前画布，不会强制裁成正方形。";
    URL.revokeObjectURL(image.src);
    state.libraryProjectId = null;
    state.projectCreatedAt = null;
    acceptSourceImage(image, file, {
      skipped: true,
      originalWidth: image.width,
      originalHeight: image.height,
    });
  };
  image.onerror = () => {
    elements.projectMeta.textContent = "图片读取失败，请换 JPG、PNG 或 WebP";
    elements.cellInfo.textContent = "图片读取失败，请换 JPG、PNG 或 WebP";
    URL.revokeObjectURL(image.src);
  };
  image.src = URL.createObjectURL(file);
}

function openCurrentImageCropper() {
  if (!state.image) {
    elements.cellInfo.textContent = "请先上传图片，再重新裁剪。";
    return;
  }
  const file = {
    name: state.sourceImageState?.fileName || `${state.fileName || "未命名图片"}.png`,
    type: state.sourceImageState?.hasAlpha ? "image/png" : "image/jpeg",
  };
  elements.projectMeta.textContent = "正在重新裁剪当前图片...";
  elements.cellInfo.textContent = "拖动裁剪框调整主体范围，确认后重新生成预览。";
  openCropper(state.image, file);
}

function acceptSourceImage(image, file, cropInfo = {}) {
  try {
    if (state.appMode === "draw") {
      state.referenceImage = image;
      state.referenceImageUrl = imageToDataUrl(image);
      state.referenceName = file.name.replace(/\.[^.]+$/, "");
      state.referenceVisible = true;
      state.traceReference.enabled = true;
      state.traceReference.visible = true;
      state.traceReference.locked = true;
      state.traceReference.adjustMode = false;
      elements.referenceVisibleToggle.checked = true;
      elements.referenceStatus.textContent = state.referenceName;
      resetReferencePanelPosition();
      fitTraceReferenceToCanvas();
      updateReferenceMenuState();
      syncTraceReferenceControls();
      renderReferenceFloatPanel();
      if (!state.pattern.length) createBlankCanvas({ confirmReplace: false });
      else renderPattern();
      elements.projectMeta.textContent = `参考图已导入：${image.width} x ${image.height}，画图模式不会自动转图。`;
      elements.cellInfo.textContent = "参考图已放到透明描图层；使用顶部工具可调整位置、层级和透明度。";
      markProjectDirty();
      return;
    }
    elements.projectMeta.textContent = `图片已读取：${image.width} x ${image.height}，正在生成图纸...`;
    state.image = image;
    state.referenceImage = image;
    state.referenceImageUrl = imageToDataUrl(image);
    state.sourceImageState = {
      fileName: file.name,
      width: image.width,
      height: image.height,
      originalWidth: cropInfo.originalWidth || image.width,
      originalHeight: cropInfo.originalHeight || image.height,
      crop: cropInfo.crop || null,
      cropSkipped: Boolean(cropInfo.skipped),
      hasAlpha: imageHasTransparentPixels(image),
    };
    state.fileName = file.name.replace(/\.[^.]+$/, "");
    state.referenceName = state.fileName;
    state.referenceVisible = true;
    state.traceReference.enabled = true;
    state.traceReference.visible = true;
    state.traceReference.adjustMode = false;
    state.traceReference.locked = true;
    state.traceReference.x = null;
    state.traceReference.y = null;
    state.traceReference.scale = 1;
    state.selectedCell = null;
    state.selection.clear();
    state.penPoints = [];
    state.pattern = [];
    clearPreviewState();
    state.backgroundMask = null;
    clearColorDiagnostics();
    invalidateOptimizedBaseImage();
    state.hasConfirmedGrid = false;
    state.editGridVersion = 0;
    state.previewGridVersion = 0;
    state.manualEditCount = 0;
    state.manualEditedCells = new Set();
    state.counts = new Map();
    state.projectPalette = [];
    clearHistory();
    state.suspendHistory = true;
    elements.projectName.textContent = state.fileName || "小麦拼豆";
    elements.referenceStatus.textContent = state.referenceName;
    updateBackgroundHint();
    updateReferenceMenuState();
    fitTraceReferenceToCanvas();
    syncTraceReferenceControls();
    renderReferenceFloatPanel();
    renderPattern();
    markProjectDirty();
    window.setTimeout(generatePattern, 20);
  } catch (error) {
    console.error("生成图纸失败", error);
    elements.projectMeta.textContent = "生成图纸失败";
    elements.cellInfo.textContent = `生成失败：${error.message || error}`;
  }
}

function imageHasTransparentPixels(image) {
  const canvas = document.createElement("canvas");
  const maxSide = 160;
  const scale = Math.min(1, maxSide / Math.max(image.width || maxSide, image.height || maxSide));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const imageCtx = canvas.getContext("2d", { willReadFrequently: true });
  imageCtx.clearRect(0, 0, canvas.width, canvas.height);
  imageCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = imageCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 245) return true;
  }
  return false;
}

function openCropper(image, file) {
  if (!cropCtx || !elements.cropModal) {
    acceptSourceImage(image, file, { skipped: true });
    return;
  }
  const canvas = elements.cropCanvas;
  const fitScale = Math.min((canvas.width * 0.86) / image.width, (canvas.height * 0.86) / image.height);
  cropState.image = image;
  cropState.file = file;
  cropState.zoom = 1;
  cropState.baseScale = Math.max(0.05, fitScale);
  const drawW = image.width * cropState.baseScale;
  const drawH = image.height * cropState.baseScale;
  cropState.offsetX = (canvas.width - drawW) / 2;
  cropState.offsetY = (canvas.height - drawH) / 2;
  const size = Math.min(canvas.width, canvas.height) * 0.72;
  cropState.crop = {
    x: (canvas.width - size) / 2,
    y: (canvas.height - size) / 2,
    size,
  };
  cropState.dragMode = null;
  cropState.pointerId = null;
  elements.cropZoom.value = "1";
  elements.cropModal.hidden = false;
  drawCropper();
}

function setupCropEvents() {
  if (!elements.cropCanvas) return;
  elements.confirmCropButton.addEventListener("click", confirmCrop);
  elements.skipCropButton.addEventListener("click", skipCrop);
  elements.cropZoom.addEventListener("input", () => {
    zoomCropper(Number(elements.cropZoom.value), elements.cropCanvas.width / 2, elements.cropCanvas.height / 2);
  });
  elements.cropCanvas.addEventListener("pointerdown", handleCropPointerDown);
  elements.cropCanvas.addEventListener("pointermove", handleCropPointerMove);
  elements.cropCanvas.addEventListener("pointerup", endCropDrag);
  elements.cropCanvas.addEventListener("pointercancel", endCropDrag);
  elements.cropCanvas.addEventListener("wheel", handleCropWheel, { passive: false });
}

function cropScale() {
  return cropState.baseScale * cropState.zoom;
}

function drawCropper() {
  if (!cropCtx || !cropState.image) return;
  const canvas = elements.cropCanvas;
  const scale = cropScale();
  cropCtx.clearRect(0, 0, canvas.width, canvas.height);
  cropCtx.fillStyle = "#f3f4f5";
  cropCtx.fillRect(0, 0, canvas.width, canvas.height);
  cropCtx.drawImage(
    cropState.image,
    cropState.offsetX,
    cropState.offsetY,
    cropState.image.width * scale,
    cropState.image.height * scale,
  );

  const { x, y, size } = cropState.crop;
  cropCtx.save();
  cropCtx.fillStyle = "rgba(0, 0, 0, 0.48)";
  cropCtx.beginPath();
  cropCtx.rect(0, 0, canvas.width, canvas.height);
  cropCtx.rect(x, y, size, size);
  cropCtx.fill("evenodd");
  cropCtx.restore();

  cropCtx.strokeStyle = "#e83b64";
  cropCtx.lineWidth = 3;
  cropCtx.strokeRect(x, y, size, size);
  cropCtx.strokeStyle = "rgba(255,255,255,0.78)";
  cropCtx.lineWidth = 1;
  for (let i = 1; i < 3; i += 1) {
    const pos = x + (size / 3) * i;
    cropCtx.beginPath();
    cropCtx.moveTo(pos, y);
    cropCtx.lineTo(pos, y + size);
    cropCtx.stroke();
    const row = y + (size / 3) * i;
    cropCtx.beginPath();
    cropCtx.moveTo(x, row);
    cropCtx.lineTo(x + size, row);
    cropCtx.stroke();
  }

  cropCtx.fillStyle = "#ffffff";
  cropCtx.strokeStyle = "#111111";
  for (const [hx, hy] of [
    [x, y],
    [x + size, y],
    [x, y + size],
    [x + size, y + size],
  ]) {
    cropCtx.beginPath();
    cropCtx.rect(hx - 5, hy - 5, 10, 10);
    cropCtx.fill();
    cropCtx.stroke();
  }
}

function cropPointerPosition(event) {
  const rect = elements.cropCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * elements.cropCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * elements.cropCanvas.height,
  };
}

function handleCropPointerDown(event) {
  if (!cropState.image) return;
  const point = cropPointerPosition(event);
  const crop = cropState.crop;
  const insideCrop =
    point.x >= crop.x && point.x <= crop.x + crop.size && point.y >= crop.y && point.y <= crop.y + crop.size;
  cropState.dragMode = insideCrop ? "crop" : "image";
  cropState.pointerId = event.pointerId;
  cropState.startX = point.x;
  cropState.startY = point.y;
  cropState.startOffsetX = cropState.offsetX;
  cropState.startOffsetY = cropState.offsetY;
  cropState.startCrop = { ...cropState.crop };
  elements.cropCanvas.setPointerCapture(event.pointerId);
}

function handleCropPointerMove(event) {
  if (!cropState.dragMode || cropState.pointerId !== event.pointerId) return;
  const point = cropPointerPosition(event);
  const dx = point.x - cropState.startX;
  const dy = point.y - cropState.startY;
  if (cropState.dragMode === "image") {
    cropState.offsetX = cropState.startOffsetX + dx;
    cropState.offsetY = cropState.startOffsetY + dy;
  } else {
    const size = cropState.startCrop.size;
    cropState.crop.x = clampRange(cropState.startCrop.x + dx, 0, elements.cropCanvas.width - size);
    cropState.crop.y = clampRange(cropState.startCrop.y + dy, 0, elements.cropCanvas.height - size);
  }
  drawCropper();
}

function endCropDrag(event) {
  if (cropState.pointerId === event.pointerId && elements.cropCanvas.hasPointerCapture(event.pointerId)) {
    elements.cropCanvas.releasePointerCapture(event.pointerId);
  }
  cropState.dragMode = null;
  cropState.pointerId = null;
}

function handleCropWheel(event) {
  if (!cropState.image) return;
  event.preventDefault();
  const point = cropPointerPosition(event);
  const delta = event.deltaY > 0 ? -0.08 : 0.08;
  zoomCropper(cropState.zoom + delta, point.x, point.y);
}

function zoomCropper(nextZoom, pivotX, pivotY) {
  const oldScale = cropScale();
  const imageX = (pivotX - cropState.offsetX) / oldScale;
  const imageY = (pivotY - cropState.offsetY) / oldScale;
  cropState.zoom = clampRange(nextZoom, 0.6, 3);
  elements.cropZoom.value = String(cropState.zoom);
  const nextScale = cropScale();
  cropState.offsetX = pivotX - imageX * nextScale;
  cropState.offsetY = pivotY - imageY * nextScale;
  drawCropper();
}

function selectedCropInImageSpace() {
  const scale = cropScale();
  const image = cropState.image;
  const requestedX = (cropState.crop.x - cropState.offsetX) / scale;
  const requestedY = (cropState.crop.y - cropState.offsetY) / scale;
  const requestedSize = cropState.crop.size / scale;
  const size = clampRange(requestedSize, 1, Math.min(image.width, image.height));
  const x = clampRange(requestedX, 0, Math.max(0, image.width - size));
  const y = clampRange(requestedY, 0, Math.max(0, image.height - size));
  return { x, y, size };
}

function confirmCrop() {
  if (!cropState.image || !cropState.file) return;
  const source = selectedCropInImageSpace();
  const outputSize = Math.round(clampRange(source.size, 512, 1600));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const canvasCtx = canvas.getContext("2d");
  canvasCtx.imageSmoothingEnabled = true;
  canvasCtx.drawImage(cropState.image, source.x, source.y, source.size, source.size, 0, 0, outputSize, outputSize);
  const croppedImage = new Image();
  croppedImage.onload = () => {
    elements.cropModal.hidden = true;
    acceptSourceImage(croppedImage, cropState.file, {
      originalWidth: cropState.image.width,
      originalHeight: cropState.image.height,
      crop: source,
    });
    cropState.image = null;
    cropState.file = null;
  };
  croppedImage.src = canvas.toDataURL("image/png");
}

function skipCrop() {
  if (!cropState.image || !cropState.file) return;
  elements.cropModal.hidden = true;
  acceptSourceImage(cropState.image, cropState.file, {
    skipped: true,
    originalWidth: cropState.image.width,
    originalHeight: cropState.image.height,
  });
  cropState.image = null;
  cropState.file = null;
}

function handleReferenceUpload(event) {
  const [file] = event.target.files;
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  const image = new Image();
  image.onload = () => {
    state.referenceImage = image;
    state.referenceImageUrl = image.src;
    state.referenceName = file.name.replace(/\.[^.]+$/, "");
    state.referenceVisible = true;
    state.traceReference.enabled = true;
    state.traceReference.visible = true;
    state.traceReference.adjustMode = false;
    state.traceReference.locked = true;
    elements.referenceVisibleToggle.checked = true;
    elements.referenceStatus.textContent = state.referenceName;
    resetReferencePanelPosition();
    fitTraceReferenceToCanvas();
    updateReferenceMenuState();
    syncTraceReferenceControls();
    renderReferenceFloatPanel();
    closeReferenceMenu();
    renderPattern();
    elements.cellInfo.textContent =
      state.appMode === "draw" ? "参考图已显示在画布描图层，可以降低透明度后描着画。" : "参考图已上传，切到画图模式可叠到画布里描图。";
    markProjectDirty();
  };
  image.onerror = () => {
    elements.referenceStatus.textContent = "读取失败";
    updateReferenceMenuState();
  };
  reader.onload = () => {
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
  window.setTimeout(() => {
    elements.referenceInput.value = "";
  }, 0);
}

function imageToDataUrl(image, maxSize = 1600) {
  if (!image) return "";
  if (typeof image.src === "string" && image.src.startsWith("data:")) return image.src;
  const scale = Math.min(1, maxSize / Math.max(image.width || maxSize, image.height || maxSize));
  const width = Math.max(1, Math.round((image.width || maxSize) * scale));
  const height = Math.max(1, Math.round((image.height || maxSize) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const canvasCtx = canvas.getContext("2d");
  canvasCtx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function toggleReferenceMenu() {
  if (state.referenceImage && !state.traceReference.visible) {
    state.traceReference.visible = true;
    state.traceReference.enabled = true;
    state.referenceVisible = true;
    elements.referenceVisibleToggle.checked = true;
    updateReferenceMenuState();
    syncTraceReferenceControls();
    renderPattern();
    return;
  }
  const isOpen = !elements.referenceMenu.hidden;
  elements.referenceMenu.hidden = isOpen;
  elements.referenceMenuButton.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) updateReferenceMenuState();
}

function closeReferenceMenu() {
  elements.referenceMenu.hidden = true;
  elements.referenceMenuButton.setAttribute("aria-expanded", "false");
}

function updateReferenceMenuState() {
  const hasReference = Boolean(state.referenceImage);
  const statusParts = [];
  if (hasReference) statusParts.push("已上传");
  else statusParts.push("未上传");
  if (hasReference && !state.traceReference.visible) statusParts.push("已隐藏");
  if (hasReference && state.traceReference.locked) statusParts.push("已锁定");
  elements.referenceMenuStatus.textContent = statusParts.join(" · ");
  elements.referenceUploadMenuText.textContent = hasReference ? "替换参考图" : "上传参考图";
  elements.referenceToggleVisibleButton.querySelector("span").textContent = state.traceReference.visible ? "隐藏画布参考" : "显示画布参考";
  elements.referenceToggleVisibleButton.disabled = !hasReference;
  elements.referenceLockButton.querySelector("span").textContent = state.traceReference.locked ? "解锁画布参考" : "锁定画布参考";
  elements.referenceLockButton.disabled = !hasReference;
  elements.referenceFitButton.disabled = !hasReference;
  elements.referenceClearButton.disabled = !hasReference;
  elements.referenceOpacityProxy.value = Math.round(state.referenceOpacity * 100);
  elements.referenceOpacityProxyLabel.textContent = `${Math.round(state.referenceOpacity * 100)}%`;
  elements.referenceFloatLockButton.title = state.referenceLocked ? "解锁参考窗" : "锁定参考窗";
  elements.referenceFloatPanel.classList.toggle("is-locked", state.referenceLocked);
}

function clearReferenceImage() {
  state.referenceImage = null;
  state.referenceImageUrl = "";
  state.referenceName = "";
  state.referenceVisible = true;
  state.referenceLocked = false;
  state.traceReference.enabled = false;
  state.traceReference.visible = false;
  state.traceReference.locked = false;
  state.traceReference.adjustMode = false;
  state.traceReference.x = null;
  state.traceReference.y = null;
  state.traceReference.scale = 1;
  elements.referenceVisibleToggle.checked = true;
  elements.referenceStatus.textContent = "未导入";
  updateReferenceMenuState();
  syncTraceReferenceControls();
  renderReferenceFloatPanel();
  closeReferenceMenu();
  renderPattern();
  elements.cellInfo.textContent = "参考图已清除，图纸数据未改变。";
  markProjectDirty();
}

function resetReferencePanelPosition() {
  const panel = state.referencePanel;
  panel.width = panel.width || 220;
  panel.height = panel.height || 220;
  panel.zoom = 1;
  const wrap = elements.canvasWrap;
  const availableWidth = wrap?.clientWidth || 720;
  panel.x = Math.max(12, availableWidth - panel.width - 28);
  panel.y = 18;
}

function renderReferenceFloatPanel() {
  const panelEl = elements.referenceFloatPanel;
  if (!panelEl) return;
  panelEl.hidden = true;
}

function referencePanelBounds(x, y, width, height) {
  const wrap = elements.canvasWrap;
  const maxX = Math.max(12, (wrap?.scrollWidth || wrap?.clientWidth || 720) - width - 12);
  const maxY = Math.max(12, (wrap?.scrollHeight || wrap?.clientHeight || 720) - height - 12);
  return {
    x: clampRange(x, 12, maxX),
    y: clampRange(y, 12, maxY),
    width: clampRange(width, 160, 460),
    height: clampRange(height, 150, 460),
  };
}

function setReferenceZoom(value) {
  state.referencePanel.zoom = clampRange(value, 0.45, 3);
  renderReferenceFloatPanel();
}

function fitReferencePanel() {
  state.referenceVisible = true;
  state.traceReference.enabled = Boolean(state.referenceImage);
  state.traceReference.visible = true;
  state.referencePanel.zoom = 1;
  elements.referenceVisibleToggle.checked = true;
  resetReferencePanelPosition();
  fitTraceReferenceToCanvas();
  updateReferenceMenuState();
  syncTraceReferenceControls();
  renderReferenceFloatPanel();
}

function handleReferencePanelPointerDown(event) {
  if (state.referenceLocked || !state.referenceVisible) return;
  event.preventDefault();
  const panel = state.referencePanel;
  panel.dragging = true;
  panel.pointerId = event.pointerId;
  panel.startX = event.clientX;
  panel.startY = event.clientY;
  panel.startPanelX = panel.x ?? 0;
  panel.startPanelY = panel.y ?? 0;
  elements.referenceFloatHeader.setPointerCapture(event.pointerId);
}

function handleReferencePanelPointerMove(event) {
  const panel = state.referencePanel;
  if (!panel.dragging || panel.pointerId !== event.pointerId) return;
  const next = referencePanelBounds(
    panel.startPanelX + event.clientX - panel.startX,
    panel.startPanelY + event.clientY - panel.startY,
    panel.width,
    panel.height,
  );
  panel.x = next.x;
  panel.y = next.y;
  renderReferenceFloatPanel();
}

function handleReferencePanelPointerUp(event) {
  const panel = state.referencePanel;
  if (panel.pointerId === event.pointerId && elements.referenceFloatHeader.hasPointerCapture(event.pointerId)) {
    elements.referenceFloatHeader.releasePointerCapture(event.pointerId);
  }
  panel.dragging = false;
  panel.pointerId = null;
}

async function generatePattern() {
  const startedAt = performanceNow();
  try {
    clearPreviewState();
    if (!state.image) {
      renderPattern();
      return;
    }

    if (state.pattern.length && !state.suspendHistory) {
      pushHistory();
    }

    const size = state.gridSize;
    const sourceImage = conversionSourceImage();
    const pixels = buildPixelSamples(sourceImage, size);
    const directPalette = state.colorMode === "fixedPalette" ? effectiveAllowedPalette() : palette;
    const limitedPalette = state.accurateMatch || state.processingProfile === "photoColor" ? directPalette : adaptivePaletteForPixels(pixels);
    const pattern = await mapSamplesToPaletteAsync(
      pixels,
      size,
      limitedPalette,
      !(state.accurateMatch || state.processingProfile === "photoColor"),
    );

    if (state.processingProfile === "photoColor") {
      const photoResult = finalizePhotoColorMatch(pattern, pixels, size);
      state.pattern = photoResult.pattern;
      recordColorDiagnostics(pixels, pattern, state.pattern, "photoColorMatch");
      state.patternSize = size;
      state.counts = buildCounts(state.pattern);
      state.projectPalette = [...state.counts.values()].sort((a, b) => b.count - a.count).map((item) => paletteColorByCode(item.code) || item);
      state.qualityMetrics = calculateQualityMetrics(state.pattern, size);
      state.usedBounds = calculateUsedBounds(state.pattern, size);
      state.backgroundMask = photoResult.backgroundMask;
      state.hasConfirmedGrid = true;
      state.editGridVersion += 1;
      state.suspendHistory = false;
      elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 照片原色映射`;
      renderPattern();
      renderStats();
      markProjectDirty();
      return;
    }

    if (state.accurateMatch) {
      const accurateResult = finalizeAccurateMatch(pattern, pixels, size);
      state.pattern = accurateResult.pattern;
      recordColorDiagnostics(pixels, pattern, state.pattern, "accurateMatchCleanup");
      state.patternSize = size;
      state.counts = buildCounts(state.pattern);
      state.projectPalette = [...state.counts.values()].sort((a, b) => b.count - a.count).map((item) => paletteColorByCode(item.code) || item);
      state.qualityMetrics = calculateQualityMetrics(state.pattern, size);
      state.usedBounds = calculateUsedBounds(state.pattern, size);
      state.backgroundMask = accurateResult.backgroundMask;
      state.hasConfirmedGrid = true;
      state.editGridVersion += 1;
      state.suspendHistory = false;
      elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 准确匹配 + 制作优化`;
      renderPattern();
      renderStats();
      showQualityHint();
      markProjectDirty();
      return;
    }

    const backgroundMask = computeBackgroundMask(pattern, pixels, size, true);
    const maskedPattern = applyBackgroundModeToGrid(pattern, backgroundMask, state.pixelBackground);
    state.pattern = postProcessPattern(maskedPattern, size);
    if (totalBeadCount(state.pattern) === 0 && totalBeadCount(pattern) > 0) {
      state.pattern = postProcessPattern(pattern, size);
      elements.cellInfo.textContent = "背景识别过强，已自动保留原图主体。";
    }
    state.pattern = validateColorConstraints(state.pattern);
    recordColorDiagnostics(pixels, pattern, state.pattern, "postProcess");
    state.patternSize = size;
    state.counts = buildCounts(state.pattern);
    state.projectPalette = [...state.counts.values()].sort((a, b) => b.count - a.count).map((item) => palette.find((color) => color.code === item.code) || item);
    state.qualityMetrics = calculateQualityMetrics(state.pattern, size);
    state.usedBounds = calculateUsedBounds(state.pattern, size);
    state.backgroundMask = backgroundMask;
    state.hasConfirmedGrid = true;
    state.editGridVersion += 1;
    state.suspendHistory = false;
    elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 所需最小行列 ${state.usedBounds.width} x ${state.usedBounds.height}`;
    renderPattern();
    renderStats();
    showQualityHint();
    markProjectDirty();
  } catch (error) {
    console.error("generatePattern failed", error);
    elements.projectMeta.textContent = "生成图纸失败";
    elements.cellInfo.textContent = `生成失败：${error.message || error}`;
  } finally {
    recordPerformance("pipeline.generateTotal", performanceNow() - startedAt);
  }
}

async function buildPatternResultFromImage() {
  if (!state.image) return null;
  const size = state.gridSize;
  const sourceImage = conversionSourceImage();
  const pixels = buildPixelSamples(sourceImage, size);
  const directPalette = state.colorMode === "fixedPalette" ? effectiveAllowedPalette() : palette;
  const limitedPalette = state.accurateMatch || state.processingProfile === "photoColor" ? directPalette : adaptivePaletteForPixels(pixels);
  const pattern = await mapSamplesToPaletteAsync(
    pixels,
    size,
    limitedPalette,
    !(state.accurateMatch || state.processingProfile === "photoColor"),
  );

  if (state.processingProfile === "photoColor") {
    const photoResult = finalizePhotoColorMatch(pattern, pixels, size);
    recordColorDiagnostics(pixels, pattern, photoResult.pattern, "photoColorMatch");
    return {
      pattern: photoResult.pattern,
      backgroundMask: photoResult.backgroundMask,
      size,
    };
  }

  if (state.accurateMatch) {
    const accurateResult = finalizeAccurateMatch(pattern, pixels, size);
    recordColorDiagnostics(pixels, pattern, accurateResult.pattern, "accurateMatchCleanup");
    return {
      pattern: accurateResult.pattern,
      backgroundMask: accurateResult.backgroundMask,
      size,
    };
  }

  const backgroundMask = computeBackgroundMask(pattern, pixels, size, true);
  const maskedPattern = applyBackgroundModeToGrid(pattern, backgroundMask, state.pixelBackground);
  let processed = postProcessPattern(maskedPattern, size);
  if (totalBeadCount(processed) === 0 && totalBeadCount(pattern) > 0) {
    processed = postProcessPattern(pattern, size);
  }
  return {
    pattern: (() => {
      const finalPattern = validateColorConstraints(processed);
      recordColorDiagnostics(pixels, pattern, finalPattern, "postProcess");
      return finalPattern;
    })(),
    backgroundMask,
    size,
  };
}

function finalizeAccurateMatch(pattern, pixels, size) {
  const backgroundMask = computeBackgroundMask(pattern, pixels, size, true);
  const maskedPattern = applyBackgroundModeToGrid(pattern, backgroundMask, state.pixelBackground);
  let processed = postProcessPattern(maskedPattern, size);
  if (totalBeadCount(processed) === 0 && totalBeadCount(pattern) > 0) {
    processed = postProcessPattern(pattern, size);
  }
  return {
    pattern: validateColorConstraints(processed),
    backgroundMask,
  };
}

function finalizePhotoColorMatch(pattern, pixels, size) {
  const backgroundMask = computeBackgroundMask(pattern, pixels, size, true);
  const maskedPattern = applyBackgroundModeToGrid(pattern, backgroundMask, state.pixelBackground);
  let processed = totalBeadCount(maskedPattern) === 0 && totalBeadCount(pattern) > 0 ? pattern : maskedPattern;
  processed = mergeSimilarUsedColors(processed, size, state.mergeSimilarColors ? 4.2 : 2.4);
  processed = cleanPhotoLowContrastIsolated(processed, size);
  if (state.mergeSimilarColors) {
    processed = mergeSimilarUsedColors(processed, size, Math.min(5.2, 4.2 + (state.mergeBoost || 0)));
  }
  if (state.cleanSmallRegions) {
    processed = cleanPhotoLowContrastIsolated(processed, size);
    const photoRegionSize = Math.max(1, Math.min(3, state.minRegionSize));
    if (photoRegionSize > 1) processed = cleanPatternRegions(processed, size, photoRegionSize);
  }
  if (state.animeMode) {
    processed = capRegionPalettes(processed, size, "light");
    processed = reduceNeighborhoodNoise(processed, size, "detail");
  }
  if (state.localPreprocessSettings.enabled && state.localPreprocessSettings.regionToneCompression) {
    processed = compressConnectedRegionTones(processed, size);
  }
  if (state.localPreprocessSettings.enabled && state.localPreprocessSettings.regionColorStabilization) {
    processed = reduceNeighborhoodNoise(processed, size, "detail");
  }
  if (state.localPreprocessSettings.enabled && state.localPreprocessSettings.outlineColorConvergence) {
    processed = convergeOutlineColors(processed, size);
  }
  processed = repairOutlines(processed, size, outlineStrengthForSize());
  return {
    pattern: validateColorConstraints(processed),
    backgroundMask,
  };
}

function cleanPhotoLowContrastIsolated(pattern, size) {
  const output = [...pattern];
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (color.empty || protectedIndexes.has(index) || state.manualEditedCells.has(index) || isColorLocked(color)) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighbors = getFourNeighbors(x, y, size).map((next) => pattern[next]).filter((item) => !item.empty);
    if (neighbors.length < 2 || neighbors.some((item) => item.code === color.code)) continue;
    const winner = countNeighborColors(neighbors)
      .sort((a, b) => b.count - a.count || colorDistance(color, a.color) - colorDistance(color, b.color))[0];
    if (!winner || winner.count < 2) continue;
    if (colorDistance(color, winner.color) > 10) continue;
    output[index] = winner.color;
  }
  return output;
}

function conversionSourceImage() {
  if (!state.localPreprocessSettings.enabled) return state.image;
  return optimizedBaseImage();
}

function optimizedBaseImage() {
  if (!state.image || !state.localPreprocessSettings.enabled) return state.image;
  const signature = localPreprocessSignature();
  if (state.optimizedBaseImage && state.optimizedBaseImageSignature === signature) return state.optimizedBaseImage;

  const canvas = document.createElement("canvas");
  const maxSide = state.localPreprocessSettings.materialTextureCleanup ? 900 : 1400;
  const scale = Math.min(1, maxSide / Math.max(state.image.width || maxSide, state.image.height || maxSide));
  canvas.width = Math.max(1, Math.round(state.image.width * scale));
  canvas.height = Math.max(1, Math.round(state.image.height * scale));
  const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
  canvasCtx.imageSmoothingEnabled = true;
  canvasCtx.imageSmoothingQuality = "high";
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvasCtx.drawImage(state.image, 0, 0, canvas.width, canvas.height);

  const original = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
  const outlineMask = state.localPreprocessSettings.outlinePreserve
    ? buildPreprocessOutlineMask(original.data, canvas.width, canvas.height)
    : new Uint8Array(canvas.width * canvas.height);
  let imageData = new ImageData(new Uint8ClampedArray(original.data), canvas.width, canvas.height);

  if (state.localPreprocessSettings.backgroundCleanup) {
    imageData = cleanupBaseImageBackground(imageData, outlineMask);
  }
  if (state.localPreprocessSettings.antiAliasCleanup) {
    imageData = cleanupAntiAliasPixels(imageData, outlineMask);
  }
  const detailProfile = state.processingProfile === "detail64";
  if (state.localPreprocessSettings.materialTextureCleanup && !detailProfile) {
    imageData = cleanupMaterialTexture(imageData, outlineMask);
  }
  if (state.localPreprocessSettings.noiseReduction && !detailProfile) {
    imageData = reduceBaseImageNoise(imageData, outlineMask);
  }
  if (state.localPreprocessSettings.flatColorSimplification && !detailProfile) {
    imageData = simplifyBaseImageFlatColors(imageData, outlineMask);
  }
  if (state.localPreprocessSettings.regionColorStabilization && !detailProfile) {
    imageData = stabilizeBaseImageRegions(imageData, outlineMask);
  }
  if (state.localPreprocessSettings.outlinePreserve) {
    restorePreprocessOutlines(original, imageData, outlineMask);
  }

  canvasCtx.putImageData(imageData, 0, 0);
  state.optimizedBaseImage = canvas;
  state.optimizedBaseImageSignature = signature;
  syncLocalPreprocessControls();
  return canvas;
}

function localPreprocessSignature() {
  return JSON.stringify({
    settings: state.localPreprocessSettings,
    width: state.image?.width || 0,
    height: state.image?.height || 0,
    name: state.sourceImageState?.fileName || state.fileName || "",
    background: state.pixelBackground,
    processingProfile: state.processingProfile,
  });
}

function buildPreprocessOutlineMask(data, width, height) {
  const mask = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const alpha = data[offset + 3];
      if (alpha < 48) continue;
      const lum = preprocessLuminance(data[offset], data[offset + 1], data[offset + 2]);
      if (lum > 98) continue;
      let maxContrast = 0;
      let darkSimilar = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const n = ((y + dy) * width + (x + dx)) * 4;
          if (data[n + 3] < 48) continue;
          const nLum = preprocessLuminance(data[n], data[n + 1], data[n + 2]);
          maxContrast = Math.max(maxContrast, Math.abs(nLum - lum));
          if (nLum < 110 && Math.abs(nLum - lum) < 24) darkSimilar += 1;
        }
      }
      if (maxContrast >= 34 && (darkSimilar >= 1 || lum < 56)) {
        mask[index] = 1;
      }
    }
  }
  return removeTinyPreprocessMaskParts(mask, width, height);
}

function removeTinyPreprocessMaskParts(mask, width, height) {
  const cleaned = new Uint8Array(mask);
  const visited = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue;
    const queue = [index];
    const cells = [];
    visited[index] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      cells.push(current);
      const x = current % width;
      const y = Math.floor(current / width);
      for (const next of preprocessFourNeighbors(x, y, width, height)) {
        if (!mask[next] || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    if (cells.length < 3) {
      for (const cell of cells) cleaned[cell] = 0;
    }
  }
  return cleaned;
}

function cleanupBaseImageBackground(imageData, outlineMask) {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  const edge = estimatePreprocessEdgeBackground(data, width, height);
  const fill = whiteBeadColor().rgb;
  for (let index = 0; index < width * height; index += 1) {
    if (outlineMask[index]) continue;
    const offset = index * 4;
    const alpha = data[offset + 3];
    const closeToEdge = colorDistanceRgb(data[offset], data[offset + 1], data[offset + 2], edge.r, edge.g, edge.b) < 18;
    const bgLike = alpha < 48 || closeToEdge || isPreprocessNearBackground(data[offset], data[offset + 1], data[offset + 2], alpha);
    if (!bgLike) continue;
    if (state.pixelBackground === "white") {
      out[offset] = fill.r;
      out[offset + 1] = fill.g;
      out[offset + 2] = fill.b;
      out[offset + 3] = 255;
    } else {
      out[offset + 3] = 0;
    }
  }
  return output;
}

function cleanupAntiAliasPixels(imageData, outlineMask) {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  const fill = whiteBeadColor().rgb;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (outlineMask[index]) continue;
      const offset = index * 4;
      const alpha = data[offset + 3];
      const lum = preprocessLuminance(data[offset], data[offset + 1], data[offset + 2]);
      const saturation = preprocessSaturation(data[offset], data[offset + 1], data[offset + 2]);
      const hasSolidNeighbor = preprocessFourNeighbors(x, y, width, height).some((next) => data[next * 4 + 3] > 230);
      if ((alpha > 35 && alpha < 210 && hasSolidNeighbor) || (lum > 218 && saturation < 28)) {
        if (state.pixelBackground === "white") {
          out[offset] = fill.r;
          out[offset + 1] = fill.g;
          out[offset + 2] = fill.b;
          out[offset + 3] = 255;
        } else {
          out[offset + 3] = 0;
        }
      }
    }
  }
  return output;
}

function cleanupMaterialTexture(imageData, outlineMask) {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  const bins = new Uint32Array(width * height);
  const radius = state.processingProfile === "photoColor" ? 1 : state.gridSize <= 64 ? 2 : 1;

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] < 48) continue;
    bins[index] = 1 + (Math.floor(data[offset] / 24) << 8) + (Math.floor(data[offset + 1] / 24) << 4) + Math.floor(data[offset + 2] / 24);
  }

  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      const index = y * width + x;
      if (outlineMask[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 48) continue;

      const keys = [];
      const counts = [];
      const samples = [];
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const next = (y + dy) * width + (x + dx);
          if (!bins[next] || outlineMask[next]) continue;
          const key = bins[next];
          let slot = keys.indexOf(key);
          if (slot < 0) {
            slot = keys.length;
            keys.push(key);
            counts.push(0);
            samples.push([]);
          }
          counts[slot] += 1;
          samples[slot].push(next);
        }
      }
      if (!counts.length) continue;
      let winner = 0;
      for (let slot = 1; slot < counts.length; slot += 1) {
        if (counts[slot] > counts[winner]) winner = slot;
      }
      const minimumShare = radius === 2 ? 0.28 : 0.34;
      const sampleCount = counts.reduce((sum, count) => sum + count, 0);
      if (counts[winner] < Math.ceil(sampleCount * minimumShare)) continue;

      let r = 0;
      let g = 0;
      let b = 0;
      for (const sample of samples[winner]) {
        const sampleOffset = sample * 4;
        r += data[sampleOffset];
        g += data[sampleOffset + 1];
        b += data[sampleOffset + 2];
      }
      r /= samples[winner].length;
      g /= samples[winner].length;
      b /= samples[winner].length;
      let representative = samples[winner][0];
      let bestDistance = Infinity;
      for (const sample of samples[winner]) {
        const sampleOffset = sample * 4;
        const distance = colorDistanceRgb(data[sampleOffset], data[sampleOffset + 1], data[sampleOffset + 2], r, g, b);
        if (distance < bestDistance) {
          bestDistance = distance;
          representative = sample;
        }
      }
      const representativeOffset = representative * 4;
      const replacementDistance = colorDistanceRgb(
        data[offset], data[offset + 1], data[offset + 2],
        data[representativeOffset], data[representativeOffset + 1], data[representativeOffset + 2],
      );
      if (replacementDistance < 7 || replacementDistance > 46) continue;
      out[offset] = data[representativeOffset];
      out[offset + 1] = data[representativeOffset + 1];
      out[offset + 2] = data[representativeOffset + 2];
    }
  }
  return output;
}

function reduceBaseImageNoise(imageData, outlineMask) {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (outlineMask[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 32) continue;
      const neighbors = preprocessFourNeighbors(x, y, width, height);
      const similar = neighbors.filter((next) => colorDistanceData(data, offset, next * 4) < 22).length;
      if (similar > 0) continue;
      const replacement = averagePreprocessPixels(data, neighbors);
      out[offset] = replacement.r;
      out[offset + 1] = replacement.g;
      out[offset + 2] = replacement.b;
      out[offset + 3] = replacement.a;
    }
  }
  return output;
}

function simplifyBaseImageFlatColors(imageData, outlineMask) {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  const step = state.processingProfile === "photoColor" ? 10 : state.gridSize <= 48 ? 22 : state.gridSize <= 64 ? 18 : 14;
  for (let index = 0; index < width * height; index += 1) {
    if (outlineMask[index]) continue;
    const offset = index * 4;
    if (data[offset + 3] < 32) continue;
    if (isPreprocessNearBackground(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) continue;
    out[offset] = quantizeChannel(data[offset], step);
    out[offset + 1] = quantizeChannel(data[offset + 1], step);
    out[offset + 2] = quantizeChannel(data[offset + 2], step);
  }
  return output;
}

function stabilizeBaseImageRegions(imageData, outlineMask) {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (outlineMask[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 32) continue;
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const next = (y + dy) * width + (x + dx);
          if (!outlineMask[next]) neighbors.push(next);
        }
      }
      const avg = averagePreprocessPixels(data, neighbors);
      const photoProfile = state.processingProfile === "photoColor";
      const stabilizationDistance = photoProfile ? 18 : 32;
      const sourceWeight = photoProfile ? 0.75 : 0.55;
      if (colorDistanceRgb(data[offset], data[offset + 1], data[offset + 2], avg.r, avg.g, avg.b) < stabilizationDistance) {
        out[offset] = Math.round(data[offset] * sourceWeight + avg.r * (1 - sourceWeight));
        out[offset + 1] = Math.round(data[offset + 1] * sourceWeight + avg.g * (1 - sourceWeight));
        out[offset + 2] = Math.round(data[offset + 2] * sourceWeight + avg.b * (1 - sourceWeight));
      }
    }
  }
  return output;
}

function restorePreprocessOutlines(original, target, outlineMask) {
  for (let index = 0; index < outlineMask.length; index += 1) {
    if (!outlineMask[index]) continue;
    const offset = index * 4;
    target.data[offset] = original.data[offset];
    target.data[offset + 1] = original.data[offset + 1];
    target.data[offset + 2] = original.data[offset + 2];
    target.data[offset + 3] = original.data[offset + 3];
  }
}

function estimatePreprocessEdgeBackground(data, width, height) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    const alpha = data[offset + 3] / 255;
    r += data[offset] * alpha + 255 * (1 - alpha);
    g += data[offset + 1] * alpha + 255 * (1 - alpha);
    b += data[offset + 2] * alpha + 255 * (1 - alpha);
    count += 1;
  };
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 80))) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 80))) {
    add(0, y);
    add(width - 1, y);
  }
  return { r: r / count, g: g / count, b: b / count };
}

function preprocessFourNeighbors(x, y, width, height) {
  const neighbors = [];
  if (x > 0) neighbors.push(y * width + x - 1);
  if (x < width - 1) neighbors.push(y * width + x + 1);
  if (y > 0) neighbors.push((y - 1) * width + x);
  if (y < height - 1) neighbors.push((y + 1) * width + x);
  return neighbors;
}

function averagePreprocessPixels(data, indexes) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let count = 0;
  for (const index of indexes) {
    const offset = index * 4;
    if (data[offset + 3] < 16) continue;
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
    a += data[offset + 3];
    count += 1;
  }
  return count
    ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), a: Math.round(a / count) }
    : { r: 255, g: 255, b: 255, a: 0 };
}

function quantizeChannel(value, step) {
  return clamp(Math.round(value / step) * step);
}

function preprocessLuminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function preprocessSaturation(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function colorDistanceRgb(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function colorDistanceData(data, offsetA, offsetB) {
  return colorDistanceRgb(data[offsetA], data[offsetA + 1], data[offsetA + 2], data[offsetB], data[offsetB + 1], data[offsetB + 2]);
}

function isPreprocessNearBackground(r, g, b, alpha) {
  if (alpha < 48) return true;
  const saturation = preprocessSaturation(r, g, b);
  return (r > 232 && g > 232 && b > 224 && saturation < 36) || (Math.max(r, g, b) > 238 && saturation < 22);
}

function capturePreviewCanvasSnapshot() {
  if (state.previewCanvasSnapshot || !state.pattern.length) return;
  state.previewCanvasSnapshot = {
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    gridSize: state.gridSize,
    patternSize: state.patternSize,
    traceX: state.traceReference.x,
    traceY: state.traceReference.y,
    traceScale: state.traceReference.scale,
  };
}

function restorePreviewCanvasSnapshot() {
  const snapshot = state.previewCanvasSnapshot;
  if (!snapshot) return false;
  state.gridWidth = snapshot.gridWidth;
  state.gridHeight = snapshot.gridHeight;
  state.gridSize = snapshot.gridSize;
  state.patternSize = snapshot.patternSize;
  state.traceReference.x = snapshot.traceX;
  state.traceReference.y = snapshot.traceY;
  state.traceReference.scale = snapshot.traceScale;
  state.previewCanvasSnapshot = null;
  syncControlsFromState();
  return true;
}

function clearPreviewState(options = {}) {
  if (options.restoreCanvas) restorePreviewCanvasSnapshot();
  else state.previewCanvasSnapshot = null;
  state.previewPattern = [];
  state.previewCounts = new Map();
  state.previewQualityMetrics = null;
  state.previewBackgroundMask = null;
  state.previewPreservesManualEdits = false;
  state.isPreviewDirty = false;
  if (options.syncControls !== false) updatePreviewButtons();
}

function setPendingPreview(pattern, options = {}) {
  const preview = Array.isArray(pattern) ? pattern : [];
  const size = Number(options.size) || state.gridSize;
  state.previewPattern = preview;
  state.previewCounts = options.counts || buildCounts(preview);
  state.previewQualityMetrics = options.qualityMetrics || calculateQualityMetrics(preview, size);
  state.previewBackgroundMask = Object.prototype.hasOwnProperty.call(options, "backgroundMask")
    ? options.backgroundMask
    : state.backgroundMask;
  state.previewPreservesManualEdits = Boolean(options.preservesManualEdits);
  state.previewGridVersion += 1;
  state.isPreviewDirty = preview.length > 0;
  state.patternSize = size;
  updatePreviewButtons();
  return preview;
}

function renderPendingPreview() {
  renderPattern();
  renderStats();
  showQualityHint();
}

async function requestPreviewUpdate(message = "参数预览已更新，请确认应用后再编辑或导出。", options = {}) {
  const requestVersion = ++previewUpdateVersion;
  setPatternProcessingBusy(true);
  try {
    let result = null;
    if (options.backgroundOnly && state.pattern.length) {
      const mask = state.backgroundMask || computeBackgroundMask(state.pattern, state.pattern, state.gridSize, true);
      result = {
        pattern: validateColorConstraints(applyBackgroundModeToGrid(state.pattern, mask, state.pixelBackground)),
        backgroundMask: mask,
        size: state.gridSize,
        preservesManualEdits: true,
      };
    } else {
      result = await buildPatternResultFromImage();
    }

    if (requestVersion !== previewUpdateVersion) return false;

    if (!result) {
      clearPreviewState({ restoreCanvas: true });
      elements.cellInfo.textContent = "请先上传图片，再生成预览。";
      renderPattern();
      return false;
    }

    setPendingPreview(result.pattern, {
      backgroundMask: result.backgroundMask,
      preservesManualEdits: result.preservesManualEdits,
      size: result.size,
    });
    renderPendingPreview();
    elements.projectMeta.textContent = `预览 / ${gridDimensionsLabel()} / ${totalBeadCount(result.pattern)} 颗 / ${state.previewCounts.size} 色`;
    elements.cellInfo.textContent = state.manualEditCount ? "当前已有手动编辑；确认应用新预览时会询问是否覆盖。" : message;
    markProjectDirty();
    return true;
  } catch (error) {
    if (requestVersion !== previewUpdateVersion) return false;
    console.error("生成预览失败", error);
    clearPreviewState({ restoreCanvas: true });
    elements.cellInfo.textContent = `生成预览失败：${error.message || error}`;
    return false;
  } finally {
    if (requestVersion === previewUpdateVersion) setPatternProcessingBusy(false);
  }
}

function applyPreviewToEditGrid() {
  if (!state.previewPattern.length) {
    elements.cellInfo.textContent = "当前没有可应用的预览。";
    return false;
  }
  if (state.pattern.length) pushHistory();
  state.pattern = validateColorConstraints([...state.previewPattern]);
  if (!state.previewPreservesManualEdits) {
    state.manualEditedCells = new Set();
    state.manualEditCount = 0;
  }
  state.patternSize = state.gridSize;
  state.counts = buildCounts(state.pattern);
  state.projectPalette = [...state.counts.values()].sort((a, b) => b.count - a.count);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.backgroundMask = state.previewBackgroundMask;
  refreshFinalDiagnosticsFromCurrentPattern("applyPreview");
  clearPreviewState();
  state.hasConfirmedGrid = true;
  state.editGridVersion += 1;
  renderPattern();
  renderStats();
  showQualityHint();
  updateHistoryButtons();
  elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 所需最小行列 ${state.usedBounds.width} x ${state.usedBounds.height}`;
  elements.cellInfo.textContent = "预览已确认应用，现在可以进入编辑或导出。";
  markProjectDirty();
  return true;
}

function confirmPendingPreview() {
  if (state.isProcessingPattern) {
    elements.cellInfo.textContent = "预览仍在处理中，请稍等片刻。";
    return false;
  }
  if (!state.isPreviewDirty || !state.previewPattern.length) return true;
  if (state.manualEditCount && !state.previewPreservesManualEdits) {
    const confirmed = window.confirm("应用新的转图预览会覆盖当前手动编辑，是否继续？");
    if (!confirmed) return false;
  }
  return applyPreviewToEditGrid();
}

function discardPendingPreview() {
  if (state.isProcessingPattern) return false;
  clearPreviewState({ restoreCanvas: true });
  renderPendingPreview();
  if (state.pattern.length) {
    const bounds = state.usedBounds || calculateUsedBounds(state.pattern, state.gridSize);
    elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 所需最小行列 ${bounds.width} x ${bounds.height}`;
    elements.cellInfo.textContent = "已放弃本次参数预览，保留当前已确认图纸。";
  } else {
    elements.projectMeta.textContent = "当前还没有已确认图纸";
    elements.cellInfo.textContent = "已放弃本次参数预览。";
  }
  return true;
}

function updatePreviewButtons() {
  const hasPreview = state.isPreviewDirty && state.previewPattern.length;
  const isBlocking = state.isProcessingPattern || hasPreview;
  if (elements.localPreprocessApplyButton) {
    elements.localPreprocessApplyButton.disabled = state.isProcessingPattern || !hasPreview;
  }
  if (elements.pendingPreviewBar) {
    elements.pendingPreviewBar.hidden = !isBlocking;
    const label = elements.pendingPreviewBar.querySelector("span");
    if (label) label.textContent = state.isProcessingPattern ? "正在生成参数预览…" : "参数已调整，当前是预览";
  }
  if (elements.confirmPreviewButton) elements.confirmPreviewButton.disabled = state.isProcessingPattern || !hasPreview;
  if (elements.discardPreviewButton) elements.discardPreviewButton.disabled = state.isProcessingPattern || !hasPreview;
  document.body.classList.toggle("preview-confirmation-pending", Boolean(isBlocking));
  document.querySelectorAll('.workbench-mode-button[data-workbench-mode="edit"], .workbench-mode-button[data-workbench-mode="export"]').forEach((button) => {
    button.disabled = Boolean(isBlocking);
    button.setAttribute("aria-disabled", String(Boolean(isBlocking)));
    button.title = isBlocking ? "请先确认应用或放弃当前参数预览" : "";
  });
}

function setPatternProcessingBusy(isBusy) {
  state.isProcessingPattern = isBusy;
  updatePreviewButtons();
  if (isBusy) elements.cellInfo.textContent = "正在后台匹配颜色，页面仍可继续操作…";
}

function buildPixelSamples(image, size) {
  return measurePerformance("pipeline.samples", () => buildPixelSamplesNow(image, size));
}

function buildPixelSamplesNow(image, size) {
  const sampleScale = state.patternMode === "pixelPattern" ? 6 : 4;
  const sampleSize = size * sampleScale;
  const activeSampleWidth = activeGridWidth() * sampleScale;
  const activeSampleHeight = activeGridHeight() * sampleScale;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = sampleSize;
  sourceCanvas.height = sampleSize;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const crop = { x: 0, y: 0, size: Math.max(image.width, image.height), contain: true };
  state.lastSampleCrop = crop;
  state.lastSampleSourceSize = { width: image.width, height: image.height };
  state.lastSampleScale = sampleScale;

  sourceCtx.clearRect(0, 0, sampleSize, sampleSize);
  sourceCtx.imageSmoothingEnabled = state.patternMode !== "pixelPattern";
  sourceCtx.imageSmoothingQuality = state.patternMode === "pixelPattern" ? "low" : "high";
  const scale = state.fitMode === "center"
    ? Math.max(activeSampleWidth / image.width, activeSampleHeight / image.height)
    : Math.min(activeSampleWidth / image.width, activeSampleHeight / image.height);
  const drawWidth = Math.max(1, Math.round(image.width * scale));
  const drawHeight = Math.max(1, Math.round(image.height * scale));
  const drawX = Math.round((activeSampleWidth - drawWidth) / 2);
  const drawY = Math.round((activeSampleHeight - drawHeight) / 2);
  sourceCtx.drawImage(image, 0, 0, image.width, image.height, drawX, drawY, drawWidth, drawHeight);

  const imageData = sourceCtx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;
  const pixels = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      pixels.push(sampleCell(data, sampleSize, x, y, sampleScale));
    }
  }

  return pixels;
}

function sampleCell(data, sampleSize, cellX, cellY, sampleScale) {
  if (!state.dominantSampling && (state.patternMode !== "pixelPattern" || state.processingProfile === "photoColor")) {
    return averageSampleCell(data, sampleSize, cellX, cellY, sampleScale);
  }

  const buckets = new Map();
  const bucketStep = state.patternMode === "pixelPattern" ? 16 : state.animeMode ? 24 : 18;
  let darkWeight = 0;
  let darkBucketKey = "";
  let backgroundPixels = 0;

  for (let yy = 0; yy < sampleScale; yy += 1) {
    for (let xx = 0; xx < sampleScale; xx += 1) {
      const px = cellX * sampleScale + xx;
      const py = cellY * sampleScale + yy;
      const index = (py * sampleSize + px) * 4;
      const alpha = data[index + 3] / 255;
      const pr = Math.round(data[index] * alpha + 255 * (1 - alpha));
      const pg = Math.round(data[index + 1] * alpha + 255 * (1 - alpha));
      const pb = Math.round(data[index + 2] * alpha + 255 * (1 - alpha));
      const luminance = 0.299 * pr + 0.587 * pg + 0.114 * pb;
      const background = isBackgroundLikePixel(pr, pg, pb, alpha);
      const outlineStrength = outlineStrengthForSize();
      const isDarkLine = state.lineBoost && luminance < (outlineStrength >= 3 ? 90 : outlineStrength >= 2 ? 82 : 74);
      const outlineWeight =
        outlineStrength >= 3 ? (state.gridSize <= 48 ? 2.2 : 1.9) : outlineStrength >= 2 ? 1.55 : 1.18;
      const weight = background ? 0 : isDarkLine ? outlineWeight : 1;
      if (weight <= 0) {
        backgroundPixels += 1;
        continue;
      }
      const key = `${Math.round(pr / bucketStep)},${Math.round(pg / bucketStep)},${Math.round(pb / bucketStep)}`;
      const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, weight: 0, backgroundWeight: 0 };

      bucket.r += pr * weight;
      bucket.g += pg * weight;
      bucket.b += pb * weight;
      bucket.weight += weight;
      if (background) bucket.backgroundWeight += weight;
      buckets.set(key, bucket);

      if (isDarkLine) {
        darkWeight += weight;
        darkBucketKey = key;
      }
    }
  }

  if (usesEmptyBackground() && backgroundPixels / Math.max(1, sampleScale * sampleScale) > 0.72) {
    if (state.pixelBackground === "white") return whiteBeadColor().rgb;
    return { ...EMPTY_CELL, background: true };
  }

  const minimumLineShare = outlineStrengthForSize() >= 3 ? 0.2 : outlineStrengthForSize() >= 2 ? 0.24 : 0.32;
  let winner = null;
  if (darkWeight >= sampleScale * sampleScale * minimumLineShare && buckets.has(darkBucketKey)) {
    winner = buckets.get(darkBucketKey);
  } else {
    for (const bucket of buckets.values()) {
      if (usesEmptyBackground() && bucket.backgroundWeight > bucket.weight * 0.7) continue;
      if (!winner || bucket.weight > winner.weight) {
        winner = bucket;
      }
    }
  }

  if (!winner) {
    if (state.pixelBackground === "white") return whiteBeadColor().rgb;
    return { ...EMPTY_CELL, background: true };
  }

  return {
    r: winner.r / winner.weight,
    g: winner.g / winner.weight,
    b: winner.b / winner.weight,
    background: winner.backgroundWeight > winner.weight * 0.55,
  };
}

function usesEmptyBackground() {
  return state.pixelBackground !== "white" && (state.patternMode === "pixelPattern" || state.gridSize === 48 || state.gridSize === 64);
}

function eraserFillColor() {
  return usesEmptyBackground() ? EMPTY_CELL : detectBackgroundColor(state.pattern, state.gridSize);
}

function computeBackgroundMask(pattern, pixels, size, force = false) {
  if (!force && !usesEmptyBackground()) return new Uint8Array(pattern.length);
  const edgeBackgroundColors = detectEdgeBackgroundColors(pattern, size);
  const visited = new Uint8Array(pattern.length);
  const queue = [];
  const pushIfBackground = (index) => {
    if (visited[index]) return;
    const sample = pixels[index];
    const color = pattern[index];
    const backgroundLike =
      sample?.empty ||
      sample?.background ||
      color.empty ||
      isLikelyBackgroundColor(color) ||
      edgeBackgroundColors.some((edgeColor) => colorDistance(color, edgeColor) <= 14);
    if (!backgroundLike) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let i = 0; i < size; i += 1) {
    pushIfBackground(i);
    pushIfBackground((size - 1) * size + i);
    pushIfBackground(i * size);
    pushIfBackground(i * size + size - 1);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const x = index % size;
    const y = Math.floor(index / size);
    for (const nextIndex of getFourNeighbors(x, y, size)) {
      pushIfBackground(nextIndex);
    }
  }

  return visited;
}

function applyBackgroundModeToGrid(pattern, mask, mode = state.pixelBackground) {
  if (!mask || !mask.length) return [...pattern];
  const fill = mode === "white" ? whiteBeadColor() : EMPTY_CELL;
  return pattern.map((color, index) => (mask[index] ? fill : color));
}

function detectEdgeBackgroundColors(pattern, size) {
  const border = [];
  for (let i = 0; i < size; i += 1) {
    border.push(pattern[i], pattern[(size - 1) * size + i], pattern[i * size], pattern[i * size + size - 1]);
  }
  return countNeighborColors(border.filter((item) => item && !item.empty))
    .filter((entry) => entry.count >= Math.max(2, size * 0.08) || isLikelyBackgroundColor(entry.color))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((entry) => entry.color);
}

function isLikelyBackgroundColor(color) {
  if (!color || color.empty) return true;
  const { r, g, b } = color.rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  return (r >= 228 && g >= 228 && b >= 220 && saturation < 34) || (color.lab.l > 88 && saturation < 42);
}

function averageSampleCell(data, sampleSize, cellX, cellY, sampleScale) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  let darkR = 0;
  let darkG = 0;
  let darkB = 0;
  let darkCount = 0;

  for (let yy = 0; yy < sampleScale; yy += 1) {
    for (let xx = 0; xx < sampleScale; xx += 1) {
      const px = cellX * sampleScale + xx;
      const py = cellY * sampleScale + yy;
      const index = (py * sampleSize + px) * 4;
      const alpha = data[index + 3] / 255;
      const pr = Math.round(data[index] * alpha + 255 * (1 - alpha));
      const pg = Math.round(data[index + 1] * alpha + 255 * (1 - alpha));
      const pb = Math.round(data[index + 2] * alpha + 255 * (1 - alpha));
      const luminance = 0.299 * pr + 0.587 * pg + 0.114 * pb;
      const background = isBackgroundLikePixel(pr, pg, pb, alpha);
      const weight = background ? 0.15 : 1;

      r += pr * weight;
      g += pg * weight;
      b += pb * weight;
      count += weight;

      if (outlineStrengthForSize() >= 2 && luminance < (outlineStrengthForSize() >= 3 ? 86 : 76)) {
        darkR += pr;
        darkG += pg;
        darkB += pb;
        darkCount += 1;
      }
    }
  }

  if (outlineStrengthForSize() >= 2 && darkCount >= Math.max(2, count * 0.22)) {
    return {
      r: darkR / darkCount,
      g: darkG / darkCount,
      b: darkB / darkCount,
    };
  }

  return {
    r: r / count,
    g: g / count,
    b: b / count,
    background: isBackgroundLikePixel(r / count, g / count, b / count, 1),
  };
}

function isBackgroundLikePixel(r, g, b, alpha = 1) {
  if (state.removeTransparent && alpha < 0.08) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  return r > 242 && g > 242 && b > 242 && saturation < 12;
}

function clampRange(value, min, max) {
  if (max <= min) return min;
  return Math.max(min, Math.min(max, value));
}

function spreadError(pixels, size, x, y, error, factor) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const target = pixels[y * size + x];
  target.r = clamp(target.r + error.r * factor);
  target.g = clamp(target.g + error.g * factor);
  target.b = clamp(target.b + error.b * factor);
}

function postProcessPattern(pattern, size) {
  return baselinePipeline(pattern, size);
}

function baselinePipeline(pattern, size) {
  let processed = validateColorConstraints(pattern);
  const detailProfile = state.processingProfile === "detail64";

  if (state.mergeSimilarColors) {
    const mergeLimit = detailProfile ? (size <= 64 ? 5.5 : 6) : (size <= 64 ? 7 : 8);
    processed = mergeSimilarUsedColors(processed, size, Math.min(mergeDeltaEForCurrentSettings(), mergeLimit));
  }

  if (state.cleanSmallRegions) {
    processed = cleanIsolatedPixels(processed, size);
    processed = cleanPatternRegions(processed, size, effectiveMinRegionSize());
    processed = cleanIsolatedPixels(processed, size);
  }

  if (state.localPreprocessSettings.enabled && state.localPreprocessSettings.regionToneCompression) {
    processed = compressConnectedRegionTones(processed, size);
  }
  if (state.localPreprocessSettings.enabled && state.localPreprocessSettings.regionColorStabilization) {
    processed = reduceNeighborhoodNoise(processed, size, detailProfile ? "detail" : "light");
    if (!detailProfile) processed = repairSaturatedAccentGaps(processed, size);
  }
  if (state.localPreprocessSettings.enabled && state.localPreprocessSettings.outlineColorConvergence) {
    processed = convergeOutlineColors(processed, size);
  }

  processed = mergeLowUsageColors(processed, size, { strength: detailProfile ? "detail" : "light" });
  processed = forceMaxColors(processed, size, targetColorLimit());
  if (state.patternMode === "pixelPattern" && outlineStrengthForSize() >= 2) {
    processed = hardEdgePostProcess(processed, size);
  }
  processed = repairOutlines(processed, size, outlineStrengthForSize());

  return validateColorConstraints(processed);
}

function finalPaletteSimplification(pattern, size, options = {}) {
  let processed = validateColorConstraints(pattern);
  const strength = options.strength || (size <= 48 ? "balanced" : "light");
  processed = compressColorFamilies(processed, size, strength);
  processed = capRegionPalettes(processed, size, strength);
  processed = reduceNeighborhoodNoise(processed, size, strength);
  processed = mergeLowUsageColors(processed, size, { strength });
  processed = forceMaxColors(processed, size, targetColorLimit());
  return validateColorConstraints(processed);
}

function outlineStrengthForSize() {
  if (!state.lineBoost) return 0;
  if (state.outlineMode === "off") return 0;
  if (state.outlineMode === "strong") return 3;
  if (state.outlineMode === "medium") return 2;
  return 1;
}

function colorFamilyCaps(size) {
  if (size <= 48) {
    return {
      "red-pink": 4,
      "skin-beige": 3,
      "orange-brown": 4,
      yellow: 2,
      green: 3,
      blue: 3,
      purple: 3,
      "black-gray-white": 4,
      other: 3,
    };
  }
  if (size <= 64) {
    return {
      "red-pink": 6,
      "skin-beige": 4,
      "orange-brown": 5,
      yellow: 3,
      green: 4,
      blue: 4,
      purple: 4,
      "black-gray-white": 5,
      other: 4,
    };
  }
  return {
    "red-pink": 8,
    "skin-beige": 6,
    "orange-brown": 7,
    yellow: 4,
    green: 6,
    blue: 6,
    purple: 5,
    "black-gray-white": 7,
    other: 6,
  };
}

function compressColorFamilies(pattern, size, strength = "balanced") {
  const counts = buildCounts(pattern);
  if (!counts.size) return pattern;
  const outlineCodes = outlineColorCodes(pattern, size);
  const protectedCodes = findProtectedColorCodes(pattern, size);
  const caps = colorFamilyCaps(size);
  const replacements = new Map();
  const byFamily = new Map();

  for (const item of counts.values()) {
    const family = colorFamily(item);
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(item);
  }

  for (const [family, colors] of byFamily.entries()) {
    let cap = Math.max(1, caps[family] || caps.other || 4);
    if (strength === "light") cap += 2;
    if (strength === "balanced" && size >= 64) cap += 1;
    if (size === 64) {
      if (family === "red-pink") cap = Math.max(cap, 4);
      if (family === "skin-beige") cap = Math.max(cap, 3);
      if (family === "black-gray-white") cap = Math.max(cap, 4);
    }
    if (colors.length <= cap) continue;
    const sorted = [...colors].sort((a, b) => {
      const pa = colorProtectionRank(a, outlineCodes, protectedCodes);
      const pb = colorProtectionRank(b, outlineCodes, protectedCodes);
      return pb - pa || b.count - a.count || colorLuminance(a) - colorLuminance(b);
    });
    const keep = sorted.slice(0, cap);
    const keepCodes = new Set(keep.map((item) => item.code));
    for (const color of sorted) {
      if (keepCodes.has(color.code)) continue;
      if (state.lockedColorCodes.has(color.code) || outlineCodes.has(color.code)) continue;
      const target = nearestColorFromList(color, keep.filter((item) => !item.empty));
      if (target) replacements.set(color.code, target);
    }
  }

  const compressed = replacements.size ? pattern.map((item) => replacements.get(item.code) || item) : pattern;
  return strength === "strong" ? reduceNeighborhoodNoise(compressed, size, "balanced") : compressed;
}

function colorProtectionRank(color, outlineCodes, protectedCodes) {
  if (state.lockedColorCodes.has(color.code)) return 1000;
  if (outlineCodes.has(color.code)) return 900;
  if (state.allowedColorCodes.has(color.code)) return 500;
  if (protectedCodes.has(color.code)) return 300;
  return 0;
}

function nearestColorFromList(color, candidates) {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => colorDistance(color, a) - colorDistance(color, b) || b.count - a.count)[0];
}

function capRegionPalettes(pattern, size, strength = "balanced") {
  const maxColorsPerRegion = size <= 48 ? (strength === "strong" ? 3 : 4) : size <= 64 ? (strength === "strong" ? 5 : strength === "light" ? 7 : 6) : 8;
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  const outlineMask = buildOutlineMask(pattern, size);
  const outlineCodes = outlineColorCodes(pattern, size);
  const background = detectBackgroundColor(pattern, size);
  const visited = new Uint8Array(pattern.length);
  const output = [...pattern];

  for (let start = 0; start < pattern.length; start += 1) {
    if (visited[start] || pattern[start].empty) continue;
    const family = colorFamily(pattern[start]);
    const region = [];
    const queue = [start];
    visited[start] = 1;

    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      region.push(index);
      const x = index % size;
      const y = Math.floor(index / size);
      for (const nextIndex of getFourNeighbors(x, y, size)) {
        if (visited[nextIndex]) continue;
        const next = pattern[nextIndex];
        if (next.empty) continue;
        if (outlineMask[index] || outlineMask[nextIndex]) continue;
        if (colorFamily(next) !== family) continue;
        if (colorDistance(pattern[index], next) > (strength === "strong" ? 24 : 20)) continue;
        visited[nextIndex] = 1;
        queue.push(nextIndex);
      }
    }

    if (region.length < 8) continue;
    const localCounts = new Map();
    for (const index of region) {
      const item = output[index];
      const entry = localCounts.get(item.code) || { ...item, count: 0 };
      entry.count += 1;
      localCounts.set(item.code, entry);
    }
    if (localCounts.size <= maxColorsPerRegion) continue;

    const keep = [...localCounts.values()]
      .sort((a, b) => {
        const pa = state.lockedColorCodes.has(a.code) || outlineCodes.has(a.code) ? 1 : 0;
        const pb = state.lockedColorCodes.has(b.code) || outlineCodes.has(b.code) ? 1 : 0;
        return pb - pa || b.count - a.count || colorDistance(a, background) - colorDistance(b, background);
      })
      .slice(0, maxColorsPerRegion);

    for (const index of region) {
      const item = output[index];
      if (protectedIndexes.has(index)) continue;
      if (keep.some((color) => color.code === item.code)) continue;
      const target = nearestColorFromList(item, keep);
      if (target) output[index] = target;
    }
  }

  return output;
}

function compressConnectedRegionTones(pattern, size) {
  const output = [...pattern];
  const outlineMask = buildOutlineMask(pattern, size);
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  const visited = new Uint8Array(pattern.length);
  const maxTones = state.processingProfile === "compact48" ? (size <= 48 ? 3 : 4) : size <= 64 ? 6 : 7;

  for (let start = 0; start < pattern.length; start += 1) {
    if (visited[start] || pattern[start].empty || outlineMask[start]) continue;
    const family = colorFamily(pattern[start]);
    const queue = [start];
    const region = [];
    visited[start] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      region.push(index);
      const x = index % size;
      const y = Math.floor(index / size);
      for (const next of getFourNeighbors(x, y, size)) {
        if (visited[next] || pattern[next].empty || outlineMask[next]) continue;
        if (colorFamily(pattern[next]) !== family) continue;
        if (colorDistance(pattern[index], pattern[next]) > 24) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    if (region.length < 8) continue;

    const localCounts = new Map();
    for (const index of region) {
      const color = pattern[index];
      const entry = localCounts.get(color.code) || { ...color, count: 0 };
      entry.count += 1;
      localCounts.set(color.code, entry);
    }
    if (localCounts.size <= maxTones) continue;

    const colors = [...localCounts.values()].sort((a, b) => b.count - a.count);
    const keep = [];
    const addKeep = (color) => {
      if (color && !keep.some((item) => item.code === color.code)) keep.push(color);
    };
    colors.filter((color) => isColorLocked(color)).forEach(addKeep);
    const toneLimit = Math.max(maxTones, keep.length);
    addKeep(colors[0]);
    const darkest = [...colors].sort((a, b) => a.lab.l - b.lab.l || b.count - a.count)[0];
    const lightest = [...colors].sort((a, b) => b.lab.l - a.lab.l || b.count - a.count)[0];
    if (Math.abs(darkest.lab.l - colors[0].lab.l) >= 7) addKeep(darkest);
    if (Math.abs(lightest.lab.l - colors[0].lab.l) >= 7) addKeep(lightest);
    for (const color of colors) {
      if (keep.length >= toneLimit) break;
      if (keep.every((item) => colorDistance(item, color) >= 5)) addKeep(color);
    }

    for (const index of region) {
      const color = output[index];
      if (protectedIndexes.has(index) || keep.some((item) => item.code === color.code)) continue;
      const target = nearestColorFromList(color, keep);
      if (target && colorDistance(color, target) <= 18) output[index] = target;
    }
  }
  return output;
}

function convergeOutlineColors(pattern, size) {
  const mask = buildOutlineMask(pattern, size);
  const counts = new Map();
  for (let index = 0; index < pattern.length; index += 1) {
    if (!mask[index] || pattern[index].empty || pattern[index].lab.l >= 56) continue;
    const color = pattern[index];
    const entry = counts.get(color.code) || { ...color, count: 0 };
    entry.count += 1;
    counts.set(color.code, entry);
  }
  const colors = [...counts.values()].sort((a, b) => {
    const lockedA = isColorLocked(a) ? 1 : 0;
    const lockedB = isColorLocked(b) ? 1 : 0;
    return lockedB - lockedA || b.count - a.count || a.lab.l - b.lab.l;
  });
  if (colors.length <= 2) return pattern;

  const keep = [];
  for (const color of colors) {
    if (isColorLocked(color)) keep.push(color);
  }
  if (!keep.length) keep.push(colors[0]);
  const second = colors.find((color) => !keep.some((item) => item.code === color.code) && keep.every((item) => colorDistance(item, color) >= 10));
  if (second && keep.length < 2) keep.push(second);

  const output = [...pattern];
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (!mask[index] || color.empty || isColorLocked(color) || state.manualEditedCells.has(index)) continue;
    if (keep.some((item) => item.code === color.code)) continue;
    const target = nearestColorFromList(color, keep);
    if (target && colorDistance(color, target) <= 14) output[index] = target;
  }
  return outlineChangeIsSafe(pattern, output, size) ? output : pattern;
}

function reduceNeighborhoodNoise(pattern, size, strength = "balanced") {
  const output = [...pattern];
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  const detail = strength === "detail";
  const minMajority = strength === "strong" ? 3 : detail ? 5 : 4;

  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (color.empty || protectedIndexes.has(index)) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighbors = getEightNeighbors(x, y, size).map((neighbor) => pattern[neighbor]).filter((item) => !item.empty);
    if (!neighbors.length) continue;
    const same = neighbors.filter((item) => item.code === color.code).length;
    if (same > (detail ? 0 : 1)) continue;
    const candidates = countNeighborColors(neighbors)
      .filter((candidate) => !state.lockedColorCodes.has(candidate.color.code))
      .sort((a, b) => b.count - a.count || colorDistance(color, a.color) - colorDistance(color, b.color));
    const winner = candidates[0];
    if (!winner || winner.count < minMajority) continue;
    if (detail && colorDistance(color, winner.color) > 16) continue;
    if (colorFamily(winner.color) !== colorFamily(color) && colorDistance(color, winner.color) > 22) continue;
    output[index] = winner.color;
  }

  return output;
}

function repairSaturatedAccentGaps(pattern, size) {
  const output = [...pattern];
  const outlineMask = buildOutlineMask(pattern, size);
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  const axes = [
    [-1, 0, 1, 0],
    [0, -1, 0, 1],
  ];
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const index = y * size + x;
      const current = pattern[index];
      if (current.empty || outlineMask[index] || protectedIndexes.has(index)) continue;
      const sameNeighbors = getFourNeighbors(x, y, size).filter((next) => pattern[next].code === current.code).length;
      if (sameNeighbors > 1) continue;
      for (const [ax, ay, bx, by] of axes) {
        const before = pattern[(y + ay) * size + x + ax];
        const after = pattern[(y + by) * size + x + bx];
        if (before.empty || after.empty || colorDistance(before, after) > 7) continue;
        const saturation = Math.max(before.rgb.r, before.rgb.g, before.rgb.b) - Math.min(before.rgb.r, before.rgb.g, before.rgb.b);
        if (saturation < 55 || colorDistance(current, before) < 8 || colorDistance(current, before) > 32) continue;
        output[index] = before;
        break;
      }
    }
  }
  return output;
}

function buildProtectedIndexSet(pattern, size) {
  const mask = buildOutlineMask(pattern, size);
  const protectedIndexes = new Set(state.manualEditedCells);
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (mask[index] || isColorLocked(color)) protectedIndexes.add(index);
  }
  return protectedIndexes;
}

function buildOutlineMask(pattern, size) {
  const mask = new Uint8Array(pattern.length);
  if (!state.lineBoost) return mask;
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (color.empty) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighborIndexes = getEightNeighbors(x, y, size);
    const fourNeighborIndexes = getFourNeighbors(x, y, size);
    const neighbors = neighborIndexes.map((neighbor) => pattern[neighbor]);
    const nonEmpty = neighbors.filter((item) => !item.empty);
    if (nonEmpty.length < 2) continue;

    const touchesBackground = neighbors.some((item) => item.empty);
    const maxContrast = Math.max(...nonEmpty.map((item) => colorDistance(color, item)));
    const highContrast = maxContrast >= (touchesBackground ? 24 : 34);
    const darkerThanNeighbors = nonEmpty.some((item) => color.lab.l + 18 < item.lab.l && colorDistance(color, item) > 24);
    const similarDarkNeighbors = neighborIndexes.filter((neighbor) => {
      const other = pattern[neighbor];
      return !other.empty && other.code === color.code && other.lab.l < 50;
    }).length;
    const structuralNeighbors = fourNeighborIndexes.filter((neighbor) => {
      const other = pattern[neighbor];
      return !other.empty && colorDistance(color, other) <= 14 && other.lab.l < 54;
    }).length;
    const continuous = similarDarkNeighbors >= 1 || structuralNeighbors >= 1;
    const strongDarkLine = color.lab.l < 34 && highContrast && continuous;
    const outerDarkBoundary = touchesBackground && color.lab.l < 50 && highContrast && (continuous || darkerThanNeighbors);
    const keyStroke = color.lab.l < 44 && highContrast && darkerThanNeighbors && continuous;

    if (strongDarkLine || outerDarkBoundary || keyStroke) {
      mask[index] = 1;
    }
  }
  return removeWeakOutlineMaskComponents(mask, pattern, size);
}

function removeWeakOutlineMaskComponents(mask, pattern, size) {
  const cleaned = new Uint8Array(mask);
  const visited = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue;
    const queue = [index];
    const cells = [];
    visited[index] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      cells.push(current);
      const x = current % size;
      const y = Math.floor(current / size);
      for (const next of getFourNeighbors(x, y, size)) {
        if (!mask[next] || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    const touchesBackground = cells.some((cell) => {
      const x = cell % size;
      const y = Math.floor(cell / size);
      return getEightNeighbors(x, y, size).some((neighbor) => pattern[neighbor].empty);
    });
    const highContrastCells = cells.filter((cell) => {
      const x = cell % size;
      const y = Math.floor(cell / size);
      return getEightNeighbors(x, y, size).some((neighbor) => !pattern[neighbor].empty && colorDistance(pattern[cell], pattern[neighbor]) >= 30);
    }).length;
    const tooWeak = cells.length < (touchesBackground ? 2 : 3) || highContrastCells < Math.ceil(cells.length * 0.45);
    if (tooWeak) {
      for (const cell of cells) cleaned[cell] = 0;
    }
  }
  return cleaned;
}

function outlineColorCodes(pattern, size) {
  const mask = buildOutlineMask(pattern, size);
  const codes = new Set();
  const totals = new Map();
  const masked = new Map();
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (color.empty) continue;
    totals.set(color.code, (totals.get(color.code) || 0) + 1);
    if (mask[index]) masked.set(color.code, (masked.get(color.code) || 0) + 1);
  }
  for (const [code, count] of masked.entries()) {
    const total = totals.get(code) || count;
    const structuralShare = count / Math.max(1, total);
    if (count >= 3 && (structuralShare >= 0.35 || count >= Math.max(6, size * 0.12))) {
      codes.add(code);
    }
  }
  return codes;
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

function repairOutlines(pattern, size, strength = 1) {
  if (strength <= 1) return pattern;
  let repaired = closeOutlineGaps(pattern, size, strength);
  repaired = removeOutlineSpikes(repaired, size, strength);
  return outlineChangeIsSafe(pattern, repaired, size) ? repaired : pattern;
}

function outlineChangeIsSafe(beforePattern, afterPattern, size) {
  const beforeMetrics = outlineConnectivityCheck(beforePattern, size);
  const beforeQuality = calculateQualityMetrics(beforePattern, size);
  const beforeDarkCells = countDarkCells(beforePattern);
  const foregroundCells = totalBeadCount(beforePattern);
  const afterMetrics = outlineConnectivityCheck(afterPattern, size);
  const afterQuality = calculateQualityMetrics(afterPattern, size);
  const afterDarkCells = countDarkCells(afterPattern);
  const beforeOutline = buildOutlineMask(beforePattern, size).reduce((sum, value) => sum + value, 0);
  const afterOutline = buildOutlineMask(afterPattern, size).reduce((sum, value) => sum + value, 0);
  const outlineGrowth = (afterOutline - beforeOutline) / Math.max(1, beforeOutline);
  const darkGrowth = afterDarkCells - beforeDarkCells;
  const noiseWorse = afterMetrics.outlineNoiseCount > beforeMetrics.outlineNoiseCount + Math.max(1, beforeMetrics.outlineNoiseCount * 0.1);
  const continuityWorse = afterMetrics.outlineContinuityScore < beforeMetrics.outlineContinuityScore - 0.2;
  const noUsefulBreakImprovement = afterMetrics.outlineBreakCount >= beforeMetrics.outlineBreakCount && noiseWorse;
  const readabilityWorse = afterQuality.beadFriendlinessScore < beforeQuality.beadFriendlinessScore - 0.25;
  return !(outlineGrowth > 0.03 || darkGrowth > Math.max(1, foregroundCells * 0.01) || continuityWorse || noUsefulBreakImprovement || readabilityWorse);
}

function countDarkCells(pattern) {
  return pattern.reduce((sum, color) => sum + (!color.empty && color.lab.l < 36 ? 1 : 0), 0);
}

function chooseOutlineColor(pattern, size) {
  const mask = buildOutlineMask(pattern, size);
  const counts = new Map();
  for (let index = 0; index < pattern.length; index += 1) {
    if (!mask[index]) continue;
    const item = pattern[index];
    if (item.empty) continue;
    const current = counts.get(item.code) || { ...item, count: 0 };
    current.count += 1;
    counts.set(item.code, current);
  }
  const dark = [...counts.values()].filter((item) => item.lab.l < 42).sort((a, b) => b.count - a.count || a.lab.l - b.lab.l)[0];
  if (dark) return dark;
  return nearestPaletteColor({ r: 18, g: 18, b: 18, lab: rgbToLab({ r: 18, g: 18, b: 18 }) }, effectiveAllowedPalette());
}

function closeOutlineGaps(pattern, size, strength = 1) {
  const output = [...pattern];
  const mask = buildOutlineMask(pattern, size);
  const outlineColor = chooseOutlineColor(pattern, size);
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  const maxGap = strength >= 3 ? 2 : 1;
  const maxNewCells = Math.max(1, Math.floor(totalBeadCount(pattern) * 0.01));
  let added = 0;

  for (let index = 0; index < pattern.length; index += 1) {
    if (!mask[index]) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    for (const [dx, dy] of directions) {
      for (let gap = 1; gap <= maxGap; gap += 1) {
        const endX = x + dx * (gap + 1);
        const endY = y + dy * (gap + 1);
        if (endX < 0 || endY < 0 || endX >= size || endY >= size) continue;
        const endIndex = endY * size + endX;
        if (!mask[endIndex]) continue;
        for (let step = 1; step <= gap; step += 1) {
          const fillX = x + dx * step;
          const fillY = y + dy * step;
          const fillIndex = fillY * size + fillX;
          if (added >= maxNewCells) return output;
          if (state.manualEditedCells.has(fillIndex) || isColorLocked(pattern[fillIndex])) continue;
          if (pattern[fillIndex].empty) continue;
          const localOutlineNeighbors = getEightNeighbors(fillX, fillY, size).filter((neighbor) => mask[neighbor]).length;
          if (localOutlineNeighbors > (strength >= 3 ? 5 : 4)) continue;
          if (colorDistance(pattern[fillIndex], outlineColor) < 18) continue;
          output[fillIndex] = outlineColor;
          added += 1;
        }
      }
    }
  }

  return output;
}
function removeOutlineSpikes(pattern, size, strength = 1) {
  const output = [...pattern];
  const mask = buildOutlineMask(pattern, size);
  const outlineCodes = outlineColorCodes(pattern, size);
  const limit = strength >= 2 ? 1 : 0;
  for (let index = 0; index < pattern.length; index += 1) {
    if (!mask[index] || state.manualEditedCells.has(index) || isColorLocked(pattern[index])) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighbors = getEightNeighbors(x, y, size);
    const outlineNeighbors = neighbors.filter((neighbor) => mask[neighbor]).length;
    if (outlineNeighbors > limit) continue;
    const replacement = countNeighborColors(neighbors.map((neighbor) => pattern[neighbor]).filter((item) => !item.empty && !outlineCodes.has(item.code)))
      .sort((a, b) => b.count - a.count || colorDistance(pattern[index], a.color) - colorDistance(pattern[index], b.color))[0]?.color;
    if (replacement) output[index] = replacement;
  }
  return output;
}

function effectiveMinRegionSize() {
  if (state.patternMode === "pixelPattern") {
    if (state.gridSize <= 34) return Math.max(1, Math.min(state.minRegionSize, 2));
    const cap = state.processingProfile === "detail64" ? 2 : 3;
    return Math.max(1, Math.min(state.minRegionSize, cap));
  }
  const sizeDefault = state.processingProfile === "detail64" ? (state.gridSize <= 64 ? 2 : 3) : state.gridSize >= 100 ? 5 : state.gridSize <= 64 ? 3 : 4;
  const requested = Math.max(Number(state.minRegionSize) || sizeDefault, sizeDefault);
  return state.animeMode ? Math.max(requested, 6) : requested;
}

function mergeDeltaEForCurrentSettings() {
  if (!state.mergeSimilarColors) return 0;
  if (state.patternMode === "pixelPattern") {
    let pixelDistance = state.gridSize <= 34 ? 9 : state.processingProfile === "compact48" ? 8 : state.gridSize <= 64 ? 5.5 : 6;
    pixelDistance += state.mergeBoost || 0;
    return pixelDistance;
  }
  if (state.gridSize === 48) return 11 + (state.mergeBoost || 0);
  if (state.gridSize === 64) return (state.processingProfile === "detail64" ? 5.5 : 8.5) + (state.mergeBoost || 0);
  let distance = state.animeMode ? 10 : 7;
  if (state.colorLimit <= 18) distance += 3;
  else if (state.colorLimit <= 22) distance += 1.5;
  distance += state.mergeBoost || 0;
  return distance;
}

function mergeSimilarUsedColors(pattern, size, mergeDeltaE) {
  let merged = [...pattern];
  let counts = buildCounts(merged);
  const outlineCodes = outlineColorCodes(pattern, size);
  const backgroundCodes = backgroundColorCodes();
  const colors = [...counts.values()].sort((a, b) => {
    const priorityA = (isColorLocked(a) ? 3 : 0) + (backgroundCodes.has(a.code) ? 2 : 0) + (outlineCodes.has(a.code) ? 1 : 0);
    const priorityB = (isColorLocked(b) ? 3 : 0) + (backgroundCodes.has(b.code) ? 2 : 0) + (outlineCodes.has(b.code) ? 1 : 0);
    return priorityB - priorityA || b.count - a.count;
  });
  const replacements = new Map();

  for (let i = 0; i < colors.length; i += 1) {
    const keep = resolveReplacement(colors[i], replacements);
    for (let j = i + 1; j < colors.length; j += 1) {
      const color = resolveReplacement(colors[j], replacements);
      if (keep.code === color.code || replacements.has(colors[j].code)) continue;
      if (isColorLocked(color) || outlineCodes.has(color.code) || backgroundCodes.has(color.code)) continue;
      if (backgroundCodes.has(keep.code)) continue;
      if (colorDistance(keep, color) <= mergeDeltaE) {
        replacements.set(color.code, keep);
      }
    }
  }

  if (!replacements.size) return merged;
  merged = merged.map((color) => replacements.get(color.code) || color);

  // A merge can expose more near-duplicates, so run one conservative second pass.
  counts = buildCounts(merged);
  const remaining = [...counts.values()].sort((a, b) => b.count - a.count);
  const secondPass = new Map();
  for (let i = 0; i < remaining.length; i += 1) {
    for (let j = i + 1; j < remaining.length; j += 1) {
      if (secondPass.has(remaining[j].code)) continue;
      if (isColorLocked(remaining[j]) || outlineCodes.has(remaining[j].code) || backgroundCodes.has(remaining[j].code)) continue;
      if (backgroundCodes.has(remaining[i].code)) continue;
      if (colorDistance(remaining[i], remaining[j]) <= mergeDeltaE * 0.8) {
        secondPass.set(remaining[j].code, remaining[i]);
      }
    }
  }

  return secondPass.size ? merged.map((color) => secondPass.get(color.code) || color) : merged;
}

function resolveReplacement(color, replacements) {
  let current = color;
  const seen = new Set();
  while (replacements.has(current.code) && !seen.has(current.code)) {
    seen.add(current.code);
    current = replacements.get(current.code);
  }
  return current;
}

function mergeLowUsageColors(pattern, size, options = {}) {
  let processed = [...pattern];
  const total = totalBeadCount(processed);
  const strong = options.strength === "strong";
  const detail = options.strength === "detail" || state.processingProfile === "detail64";
  const base = size === 48 ? (strong ? 0.008 : 0.005) : size === 64 ? (strong ? 0.005 : 0.003) : 0.005;
  const threshold = state.accurateMatch && !strong
    ? detail ? (size <= 64 ? 2 : 3) : size <= 48 ? 4 : size <= 64 ? 6 : 8
    : Math.max(8, Math.min(24, Math.ceil(total * base)));
  const outlineCodes = outlineColorCodes(processed, size);
  const protectedCodes = new Set([...findProtectedColorCodes(processed, size), ...outlineCodes]);
  let counts = buildCounts(processed);
  const lowUsage = [...counts.values()]
    .filter((item) => item.count < threshold && !protectedCodes.has(item.code) && !isColorLocked(item))
    .sort((a, b) => a.count - b.count);

  if (!lowUsage.length) return processed;

  for (const color of lowUsage) {
    counts = buildCounts(processed);
    const target = nearestMergeTarget(color, counts, protectedCodes);
    if (!target) continue;
    processed = processed.map((item) => (item.code === color.code ? target : item));
  }

  return processed;
}

function forceMaxColors(pattern, size, maxColors) {
  let processed = [...pattern];
  let counts = buildCounts(processed);
  if (counts.size <= maxColors) return processed;

  const softProtectedCodes = new Set([
    ...findProtectedColorCodes(processed, size),
    ...outlineColorCodes(processed, size),
  ]);
  const hardProtectedCodes = new Set([...backgroundColorCodes(), ...state.lockedColorCodes]);
  const detailProfile = state.processingProfile === "detail64";
  let guard = 0;
  while (counts.size > maxColors && guard < 500) {
    guard += 1;
    const colors = [...counts.values()].sort((a, b) => {
      const pa = hardProtectedCodes.has(a.code) ? 2 : softProtectedCodes.has(a.code) ? 1 : 0;
      const pb = hardProtectedCodes.has(b.code) ? 2 : softProtectedCodes.has(b.code) ? 1 : 0;
      return pa - pb || a.count - b.count || colorLuminance(a) - colorLuminance(b);
    });
    let source = null;
    let target = null;
    for (const candidateSource of colors) {
      if (hardProtectedCodes.has(candidateSource.code) || isColorLocked(candidateSource)) continue;
      const sameFamily = colors.filter((item) => item.code !== candidateSource.code && colorFamily(item) === colorFamily(candidateSource));
      const candidateTarget = nearestColorFromList(
        candidateSource,
        sameFamily.length ? sameFamily : colors.filter((item) => item.code !== candidateSource.code),
      );
      if (!candidateTarget) continue;
      const mergeDistance = colorDistance(candidateSource, candidateTarget);
      if (softProtectedCodes.has(candidateSource.code) && mergeDistance > (detailProfile ? 14 : 24)) continue;
      if (detailProfile && !sameFamily.length && mergeDistance > 18) continue;
      source = candidateSource;
      target = candidateTarget;
      break;
    }
    if (!source || !target || source.code === target.code) break;
    processed = processed.map((item) => (item.code === source.code ? target : item));
    counts = buildCounts(processed);
  }

  return processed;
}

function nearestMergeTarget(source, counts, protectedCodes = new Set(), allowProtectedTarget = true) {
  const candidates = [...counts.values()].filter((item) => {
    if (item.code === source.code) return false;
    if (isColorLocked(source)) return false;
    if (!allowProtectedTarget && protectedCodes.has(item.code) && !isColorLocked(item)) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const da = colorDistance(source, a);
    const db = colorDistance(source, b);
    return da - db || b.count - a.count;
  });
  return candidates[0];
}

function colorLuminance(color) {
  return 0.299 * color.rgb.r + 0.587 * color.rgb.g + 0.114 * color.rgb.b;
}

function findProtectedColorCodes(pattern, size) {
  const analysis = analyzeColorRegions(pattern, size);
  const background = detectBackgroundColor(pattern, size);
  const protectedCodes = new Set();

  for (const region of analysis.regions) {
    if (isProtectedRegion(region, pattern, size, background)) {
      protectedCodes.add(region.color.code);
    }
  }

  return protectedCodes;
}

function isProtectedRegion(region, pattern, size, background) {
  if (region.color.code === background.code || region.touchesBorder) return false;
  const area = region.cells.length;
  if (area < 2 || area > 30) return false;

  const neighbors = regionNeighborColors(region, pattern, size);
  if (!neighbors.length) return false;
  const nearestNeighborDistance = Math.min(...neighbors.map((color) => colorDistance(region.color, color)));
  const rgb = region.color.rgb;
  const saturation = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
  const connectedToEdge = neighbors.some((color) => colorDistance(region.color, color) > 25);
  return nearestNeighborDistance > 18 || (saturation > 55 && connectedToEdge);
}

function isProtectedSinglePixel(index, pattern, size, background) {
  if (isBorderIndex(index, size)) return false;
  const color = pattern[index];
  if (color.code === background.code) return false;
  const x = index % size;
  const y = Math.floor(index / size);
  const neighbors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
  if (!neighbors.length) return false;
  const nearestDistance = Math.min(...neighbors.map((neighbor) => colorDistance(color, neighbor)));
  const rgb = color.rgb;
  const saturation = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
  return nearestDistance > 28 && saturation > 45;
}

function regionNeighborColors(region, pattern, size) {
  const regionSet = new Set(region.cells);
  const neighbors = new Map();
  for (const index of region.cells) {
    const x = index % size;
    const y = Math.floor(index / size);
    for (const nextIndex of getFourNeighbors(x, y, size)) {
      if (regionSet.has(nextIndex)) continue;
      const color = pattern[nextIndex];
      neighbors.set(color.code, color);
    }
  }
  return [...neighbors.values()];
}

function hardEdgePostProcess(pattern, size) {
  if (outlineStrengthForSize() < 2) return pattern;
  const processed = [...pattern];
  const background = detectBackgroundColor(pattern, size);
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (color.empty || isColorLocked(color)) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighborColors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
    const touchesEmptyOrBackground = neighborColors.some((neighbor) => neighbor.empty || neighbor.code === background.code);
    if (!touchesEmptyOrBackground) continue;

    const darkNeighbor = neighborColors
      .filter((neighbor) => !neighbor.empty && neighbor.lab.l < 35 && neighbor.code !== color.code)
      .sort((a, b) => colorDistance(color, a) - colorDistance(color, b))[0];
    if (darkNeighbor && color.lab.l > 62 && colorDistance(color, darkNeighbor) > 30) {
      processed[index] = darkNeighbor;
    }
  }
  return validateColorConstraints(outlineChangeIsSafe(pattern, processed, size) ? processed : pattern);
}

function cleanIsolatedPixels(pattern, size) {
  const cleaned = [...pattern];
  const background = detectBackgroundColor(pattern, size);
  const protectedIndexes = buildProtectedIndexSet(pattern, size);

  for (let index = 0; index < pattern.length; index += 1) {
    const x = index % size;
    const y = Math.floor(index / size);
    const color = pattern[index];
    if (color.empty) continue;
    if (protectedIndexes.has(index)) continue;
    if (isColorLocked(color)) continue;
    const neighbors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
    const sameNeighborCount = neighbors.filter((neighbor) => neighbor.code === color.code).length;
    if (sameNeighborCount > 0) continue;
    if (isProtectedSinglePixel(index, pattern, size, background)) continue;

    const touchesBackground = neighbors.some((neighbor) => neighbor.code === background.code);
    const candidates = countNeighborColors(neighbors)
      .filter((candidate) => candidate.color.code !== background.code || touchesBackground)
      .filter((candidate) => !isColorLocked(candidate.color))
      .sort((a, b) => b.count - a.count || colorDistance(color, a.color) - colorDistance(color, b.color));

    if (candidates.length) {
      cleaned[index] = candidates[0].color;
    }
  }

  return cleaned;
}

function cleanPatternRegions(pattern, size, minRegionSize) {
  let cleaned = [...pattern];
  const passes = state.processingProfile === "detail64" ? 1 : 2;

  for (let pass = 0; pass < passes; pass += 1) {
    const analysis = analyzeColorRegions(cleaned, size);
    const background = detectBackgroundColor(cleaned, size);
    const protectedIndexes = buildProtectedIndexSet(cleaned, size);
    let changed = false;

    for (const region of analysis.regions) {
      if (region.color.empty) continue;
      if (region.cells.length >= minRegionSize) continue;
      if (isColorLocked(region.color)) continue;
      if (region.cells.some((index) => protectedIndexes.has(index))) continue;
      if (isProtectedRegion(region, cleaned, size, background)) continue;
      const replacement = chooseRegionReplacement(cleaned, size, region, analysis);
      if (!replacement) continue;

      for (const index of region.cells) {
        cleaned[index] = replacement;
      }
      changed = true;
    }

    if (!changed) break;
  }

  return cleaned;
}

function analyzeColorRegions(pattern, size) {
  const visited = new Uint8Array(pattern.length);
  const regions = [];
  const regionMap = new Int32Array(pattern.length);
  regionMap.fill(-1);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let start = 0; start < pattern.length; start += 1) {
    if (visited[start]) continue;

    const color = pattern[start];
    const cells = [];
    const queue = [start];
    visited[start] = 1;

    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      const x = index % size;
      const y = Math.floor(index / size);
      cells.push(index);

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const nextIndex = ny * size + nx;
        if (visited[nextIndex] || pattern[nextIndex].code !== color.code) continue;
        visited[nextIndex] = 1;
        queue.push(nextIndex);
      }
    }

    const regionIndex = regions.length;
    for (const cell of cells) {
      regionMap[cell] = regionIndex;
    }
    regions.push({ color, cells, touchesBorder: cells.some((cell) => isBorderIndex(cell, size)) });
  }

  return { regions, regionMap };
}

function chooseRegionReplacement(pattern, size, region, analysis) {
  const regionSet = new Set(region.cells);
  const neighbors = new Map();
  const background = detectBackgroundColor(pattern, size);

  for (const index of region.cells) {
    const x = index % size;
    const y = Math.floor(index / size);
    for (const nextIndex of getFourNeighbors(x, y, size)) {
      if (regionSet.has(nextIndex)) continue;
      const color = pattern[nextIndex];
      if (color.code === background.code && !region.touchesBorder) continue;
      if (isColorLocked(color)) continue;
      const neighborRegion = analysis.regions[analysis.regionMap[nextIndex]];
      const entry = neighbors.get(color.code) || {
        color,
        count: 0,
        area: 0,
        distance: colorDistance(region.color, color),
      };
      entry.count += 1;
      entry.area = Math.max(entry.area, neighborRegion?.cells.length || 0);
      neighbors.set(color.code, entry);
    }
  }

  if (!neighbors.size) return null;

  const entries = [...neighbors.values()];
  if (region.cells.length === 1) {
    entries.sort((a, b) => b.count - a.count || a.distance - b.distance || b.area - a.area);
  } else {
    entries.sort((a, b) => b.area - a.area || a.distance - b.distance || b.count - a.count);
  }
  return entries[0].color;
}

function getFourNeighbors(x, y, size) {
  const neighbors = [];
  if (x > 0) neighbors.push(y * size + x - 1);
  if (x < size - 1) neighbors.push(y * size + x + 1);
  if (y > 0) neighbors.push((y - 1) * size + x);
  if (y < size - 1) neighbors.push((y + 1) * size + x);
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

function detectBackgroundColor(pattern, size) {
  const borderColors = [];
  for (let i = 0; i < size; i += 1) {
    borderColors.push(pattern[i], pattern[(size - 1) * size + i], pattern[i * size], pattern[i * size + size - 1]);
  }
  const counted = countNeighborColors(borderColors);
  counted.sort((a, b) => b.count - a.count);
  return counted[0]?.color || whiteBeadColor();
}

function isBorderIndex(index, size) {
  const x = index % size;
  const y = Math.floor(index / size);
  return x === 0 || y === 0 || x === size - 1 || y === size - 1;
}

function calculateQualityMetrics(pattern, size) {
  const analysis = analyzeColorRegions(pattern, size);
  const totalColors = buildCounts(pattern).size;
  const isolatedPixelCount = countIsolatedPixels(pattern, size);
  const lowUsageColorCount = countLowUsageColors(pattern);
  const minSize = effectiveMinRegionSize();
  const background = detectBackgroundColor(pattern, size);
  const protectedFeatureCount = analysis.regions.filter((region) => isProtectedRegion(region, pattern, size, background)).length;
  const smallRegionCount = analysis.regions.filter((region) => region.cells.length < minSize && !isProtectedRegion(region, pattern, size, background)).length;
  const largestRegionSize = Math.max(...analysis.regions.map((region) => region.cells.length));
  const averageRegionSize = pattern.length / Math.max(1, analysis.regions.length);
  const largestRegionRatio = largestRegionSize / pattern.length;
  const foregroundCoverage = totalBeadCount(pattern) / Math.max(1, pattern.length);
  const colorConstraintViolationCount = validateColorConstraints(pattern, { withReport: true }).violationCount;
  const edgeBreakCount = countEdgeBreaks(pattern, size);
  const backgroundNoiseCount = countBackgroundNoise(pattern, size);
  const colorFamilyOveruseCount = countColorFamilyOveruse(pattern);
  const colorJumpScore = calculateColorJumpScore(pattern, size);
  const backgroundModeConsistency = checkBackgroundModeConsistency(pattern);
  const maxColorsViolation = state.colorMode !== "auto" && totalColors > targetColorLimit();
  const fixedPaletteViolation = state.colorMode === "fixedPalette" ? colorConstraintViolationCount : 0;
  const regionColorChaosScore = calculateRegionColorChaosScore(pattern, size);
  const singlePixelNoiseCount = countSinglePixelNoise(pattern, size);
  const ditherNoiseScore = state.dither ? Math.max(colorJumpScore, singlePixelNoiseCount) : 0;
  const outlineMetrics = outlineConnectivityCheck(pattern, size);
  const outlineScore = Math.max(0, Math.min(10, 10 - edgeBreakCount * 0.15));
  const featureScore = Math.max(0, Math.min(10, 10 - smallRegionCount * 0.04 - isolatedPixelCount * 0.08));
  const edgePreservationScore = Math.max(0, Math.min(10, 10 - (isolatedPixelCount / pattern.length) * 180 - (smallRegionCount / Math.max(1, analysis.regions.length)) * 12));

  const colorScore = Math.max(0, 10 - Math.abs(totalColors - state.colorLimit) * 0.5);
  const isolatedScore = Math.max(0, 10 - (isolatedPixelCount / pattern.length) * 520);
  const smallRegionScore = Math.max(0, 10 - (smallRegionCount / Math.max(1, analysis.regions.length)) * 32);
  const constraintScore = colorConstraintViolationCount ? 0 : 10;
  const averageRegionScore = Math.min(10, Math.log2(Math.max(2, averageRegionSize)) * 2.2);
  const beadFriendlinessScore = Math.max(
    0,
    Math.min(10, colorScore * 0.25 + isolatedScore * 0.22 + smallRegionScore * 0.22 + averageRegionScore * 0.1 + edgePreservationScore * 0.11 + constraintScore * 0.1),
  );

  return {
    totalColors,
    isolatedPixelCount,
    smallRegionCount,
    lowUsageColorCount,
    protectedFeatureCount,
    edgeBreakCount,
    backgroundNoiseCount,
    colorFamilyOveruseCount,
    colorJumpScore,
    backgroundModeConsistency,
    maxColorsViolation,
    fixedPaletteViolation,
    regionColorChaosScore,
    singlePixelNoiseCount,
    ditherNoiseScore,
    ...outlineMetrics,
    effectiveBeadCount: totalBeadCount(pattern),
    outlineScore: Math.round(outlineScore * 10) / 10,
    featureScore: Math.round(featureScore * 10) / 10,
    foregroundCoverage: Math.round(foregroundCoverage * 1000) / 1000,
    colorConstraintViolationCount,
    edgePreservationScore: Math.round(edgePreservationScore * 10) / 10,
    averageRegionSize: Math.round(averageRegionSize * 10) / 10,
    largestRegionRatio: Math.round(largestRegionRatio * 1000) / 1000,
    beadFriendlinessScore: Math.round(beadFriendlinessScore * 10) / 10,
  };
}

function countBackgroundNoise(pattern, size) {
  if (!usesEmptyBackground()) return 0;
  let noise = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const item = pattern[index];
    if (item.empty) continue;
    if (isBorderIndex(index, size) || isLikelyBackgroundColor(item)) noise += 1;
  }
  return noise;
}

function countColorFamilyOveruse(pattern) {
  const families = new Map();
  const caps = colorFamilyCaps(state.gridSize);
  for (const item of buildCounts(pattern).values()) {
    const family = colorFamily(item);
    families.set(family, (families.get(family) || 0) + 1);
  }
  return [...families.entries()].filter(([family, count]) => count > (caps[family] || caps.other || 4)).length;
}

function colorFamily(color) {
  if (color.lab.l < 24) return "black-gray-white";
  if (color.lab.l > 88 && Math.abs(color.lab.a) < 6 && Math.abs(color.lab.b) < 10) return "black-gray-white";
  const { r, g, b } = color.rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 18) return "black-gray-white";
  if (r > 165 && g > 120 && b > 90 && Math.abs(r - g) < 78 && r >= b) return "skin-beige";
  if (r >= g && r >= b) {
    if (r > 170 && g > 130 && b < 95) return "yellow";
    if (g > b + 42) return "orange-brown";
    return "red-pink";
  }
  if (g >= r && g >= b) return "green";
  if (b >= r && b >= g) return r > g + 18 ? "purple" : "blue";
  return "other";
}

function calculateColorJumpScore(pattern, size) {
  let jumps = 0;
  let edges = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = pattern[y * size + x];
      if (color.empty) continue;
      for (const nextIndex of getFourNeighbors(x, y, size)) {
        const neighbor = pattern[nextIndex];
        if (neighbor.empty) continue;
        edges += 1;
        if (colorDistance(color, neighbor) > 22) jumps += 1;
      }
    }
  }
  return Math.round((jumps / Math.max(1, edges)) * 100);
}

function checkBackgroundModeConsistency(pattern) {
  if (state.pixelBackground === "white") return pattern.some((item) => !item.empty) ? 1 : 0;
  return pattern.some((item) => item.empty) ? 1 : 0;
}

function calculateRegionColorChaosScore(pattern, size) {
  const visited = new Uint8Array(pattern.length);
  let chaoticRegions = 0;
  let totalRegions = 0;
  const limit = size <= 48 ? 4 : size <= 64 ? 6 : 8;
  for (let start = 0; start < pattern.length; start += 1) {
    if (visited[start] || pattern[start].empty) continue;
    const family = colorFamily(pattern[start]);
    const queue = [start];
    const colors = new Set();
    visited[start] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      colors.add(pattern[index].code);
      const x = index % size;
      const y = Math.floor(index / size);
      for (const nextIndex of getFourNeighbors(x, y, size)) {
        if (visited[nextIndex] || pattern[nextIndex].empty) continue;
        if (colorFamily(pattern[nextIndex]) !== family) continue;
        if (colorDistance(pattern[index], pattern[nextIndex]) > 30) continue;
        visited[nextIndex] = 1;
        queue.push(nextIndex);
      }
    }
    totalRegions += 1;
    if (colors.size > limit) chaoticRegions += 1;
  }
  return Math.round((chaoticRegions / Math.max(1, totalRegions)) * 100);
}

function countSinglePixelNoise(pattern, size) {
  let count = 0;
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  for (let index = 0; index < pattern.length; index += 1) {
    if (protectedIndexes.has(index) || pattern[index].empty) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const same = getFourNeighbors(x, y, size).filter((neighbor) => pattern[neighbor].code === pattern[index].code).length;
    if (!same) count += 1;
  }
  return count;
}

function outlineConnectivityCheck(pattern, size) {
  const mask = buildOutlineMask(pattern, size);
  let outlineCount = 0;
  let breaks = 0;
  let noise = 0;
  let boundaryCells = 0;
  let coveredBoundary = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const item = pattern[index];
    if (item.empty) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighbors = getEightNeighbors(x, y, size);
    const touchesBackground = neighbors.some((neighbor) => pattern[neighbor].empty);
    if (touchesBackground) {
      boundaryCells += 1;
      if (mask[index]) coveredBoundary += 1;
    }
    if (!mask[index]) continue;
    outlineCount += 1;
    const outlineNeighbors = neighbors.filter((neighbor) => mask[neighbor]).length;
    if (outlineNeighbors <= 1) {
      noise += 1;
      if (touchesBackground) breaks += 1;
    }
  }
  const continuity = outlineCount ? Math.max(0, 10 - (breaks / outlineCount) * 50 - (noise / outlineCount) * 20) : 10;
  return {
    outlineBreakCount: breaks,
    outlineContinuityScore: Math.round(continuity * 10) / 10,
    outlineNoiseCount: noise,
    outlineCoverageRatio: Math.round((coveredBoundary / Math.max(1, boundaryCells)) * 1000) / 1000,
  };
}

function countLowUsageColors(pattern) {
  const total = totalBeadCount(pattern);
  const base = state.gridSize === 48 ? 0.006 : state.gridSize === 64 ? 0.004 : 0.005;
  const threshold = Math.max(8, Math.min(24, Math.ceil(total * base)));
  return [...buildCounts(pattern).values()].filter((item) => item.count < threshold && !isColorLocked(item)).length;
}

function countEdgeBreaks(pattern, size) {
  let breaks = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const x = index % size;
    const y = Math.floor(index / size);
    const color = pattern[index];
    if (color.lab.l >= 34) continue;
    const neighbors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
    const same = neighbors.filter((neighbor) => neighbor.code === color.code).length;
    const highContrast = neighbors.some((neighbor) => colorDistance(color, neighbor) > 24);
    if (highContrast && same === 0) breaks += 1;
  }
  return breaks;
}

function countIsolatedPixels(pattern, size) {
  let count = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const x = index % size;
    const y = Math.floor(index / size);
    const color = pattern[index];
    if (color.empty) continue;
    const hasSameNeighbor = getFourNeighbors(x, y, size).some((neighborIndex) => pattern[neighborIndex].code === color.code);
    if (!hasSameNeighbor) count += 1;
  }
  return count;
}

function showQualityHint() {
  const metrics = displayQualityMetrics();
  if (!metrics) return;
  if (metrics.fixedPaletteViolation) {
    elements.cellInfo.textContent = "固定色板约束未满足：请重新映射到允许色板。";
  } else if (metrics.maxColorsViolation) {
    elements.cellInfo.textContent = "颜色数超过当前最大颜色数：建议智能优化或提高最大颜色数。";
  } else if (!metrics.backgroundModeConsistency) {
    elements.cellInfo.textContent = "背景显示与当前背景模式不一致：请重新生成预览或应用背景模式。";
  } else if (metrics.backgroundNoiseCount > state.gridSize) {
    elements.cellInfo.textContent = "背景参与图纸：建议使用空背景，或用擦除工具手动清理边缘。";
  } else if (metrics.colorFamilyOveruseCount > 0) {
    elements.cellInfo.textContent = "同一色系颜色过多：建议开启合并相近颜色或降低最大颜色数。";
  } else if (metrics.regionColorChaosScore > 24) {
    elements.cellInfo.textContent = "同一区域颜色过杂：建议使用智能优化做区域颜色稳定化。";
  } else if (metrics.outlineBreakCount > Math.max(2, state.gridSize * 0.05)) {
    elements.cellInfo.textContent = "描边存在断裂：建议开启保留轮廓并使用智能优化修补。";
  } else if (metrics.outlineContinuityScore < 7) {
    elements.cellInfo.textContent = "轮廓不连续：建议增强描边或使用 48/64 专用优化。";
  } else if (metrics.ditherNoiseScore > 30) {
    elements.cellInfo.textContent = "抖动混色导致颜色跳变：建议关闭或弱化抖动。";
  } else if (metrics.colorJumpScore > 38) {
    elements.cellInfo.textContent = "局部颜色跳变较多：建议使用智能优化做区域稳定化。";
  } else if (metrics.lowUsageColorCount > 3) {
    elements.cellInfo.textContent = "存在低用量颜色：建议智能优化合并碎色。";
  } else if (metrics.outlineScore < 6.5) {
    elements.cellInfo.textContent = "轮廓不够清晰：建议保留轮廓并使用 48/64 专用优化。";
  } else if (metrics.foregroundCoverage < 0.45) {
    elements.cellInfo.textContent = "主体偏小，建议使用主体放大。";
  } else if (metrics.foregroundCoverage > 0.78) {
    elements.cellInfo.textContent = "主体太满，建议增加留白。";
  } else if (metrics.isolatedPixelCount > state.gridSize * state.gridSize * 0.012) {
    elements.cellInfo.textContent = "孤立像素偏多：建议开启清理孤立像素，或提高最小区域。";
  } else if (metrics.totalColors > 24) {
    elements.cellInfo.textContent = "颜色偏多：建议开启合并相近颜色，或降低最大颜色数。";
  } else if (metrics.smallRegionCount > state.gridSize) {
    elements.cellInfo.textContent = "碎色块偏多：建议把最小区域调高到 6-8。";
  } else {
    elements.cellInfo.textContent = `拼豆友好度 ${metrics.beadFriendlinessScore}/10，适合继续手动修边。`;
  }
}

function showSmartOptimize() {
  if (!state.pattern.length) {
    elements.cellInfo.textContent = "请先上传图片生成图纸，再做智能优化。";
    return;
  }

  const baseMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  const baselinePlan = {
    key: "baseline",
    name: "基础版本",
    description: "不做强力优化，保留当前稳定效果",
    minRegionSize: effectiveMinRegionSize(),
    mergeDeltaE: 0,
    lowUsage: false,
    maxColors: targetColorLimit(),
    baseline: true,
  };
  const candidates = [baselinePlan, ...(state.patternMode === "pixelPattern"
    ? [
        {
          key: "light",
          name: "轻度像素优化",
          description: "只清孤点，最大程度保留像素细节",
          minRegionSize: Math.max(1, effectiveMinRegionSize()),
          mergeDeltaE: Math.max(4, mergeDeltaEForCurrentSettings() - 2),
          lowUsage: false,
          maxColors: targetColorLimit(),
        },
        {
          key: "balanced",
          name: "平衡像素优化",
          description: "推荐：硬边缘、少杂色、不过度平滑",
          minRegionSize: effectiveMinRegionSize(),
          mergeDeltaE: mergeDeltaEForCurrentSettings(),
          lowUsage: true,
          maxColors: targetColorLimit(),
        },
        {
          key: "strong",
          name: "强力像素优化",
          description: "更少颜色，但保留像素块感",
          minRegionSize: Math.min(3, effectiveMinRegionSize() + 1),
          mergeDeltaE: mergeDeltaEForCurrentSettings() + 2,
          lowUsage: true,
          maxColors: Math.max(4, Math.min(targetColorLimit(), state.colorLimit - 2)),
        },
      ]
    : [
    {
      key: "light",
      name: "轻度优化",
      description: "少量清理，尽量保留细节",
      minRegionSize: Math.max(2, effectiveMinRegionSize() - 2),
      mergeDeltaE: Math.max(4, mergeDeltaEForCurrentSettings() - 3),
      lowUsage: false,
      maxColors: targetColorLimit(),
    },
    {
      key: "balanced",
      name: "平衡优化",
      description: "推荐：清理碎点并压掉相近杂色",
      minRegionSize: effectiveMinRegionSize(),
      mergeDeltaE: mergeDeltaEForCurrentSettings(),
      lowUsage: true,
      maxColors: targetColorLimit(),
    },
    {
      key: "strong",
      name: "强力优化",
      description: "更少颜色，更适合实际制作",
      minRegionSize: Math.min(14, effectiveMinRegionSize() + 3),
      mergeDeltaE: mergeDeltaEForCurrentSettings() + 3,
      lowUsage: true,
      maxColors: Math.max(4, Math.min(targetColorLimit(), state.colorLimit - 3)),
    },
  ])].map((plan) => runOptimizeCandidate(state.pattern, state.gridSize, plan, baseMetrics));

  const validPlans = candidates.filter((plan) => plan.metrics.colorConstraintViolationCount === 0 && !plan.compare?.risky);
  const recommendable = validPlans.filter((plan) => plan.key !== "strong");
  const recommended = [...(validPlans.length ? validPlans : candidates)].sort(
    (a, b) => b.metrics.beadFriendlinessScore - a.metrics.beadFriendlinessScore,
  )[0];
  const safeRecommended = [...(recommendable.length ? recommendable : candidates.filter((plan) => plan.key === "baseline"))].sort(
    (a, b) => b.metrics.beadFriendlinessScore - a.metrics.beadFriendlinessScore,
  )[0] || recommended;
  state.baselineGrid = [...state.pattern];
  state.pendingOptimizePlans = candidates.map((plan) => ({ ...plan, recommended: plan.key === safeRecommended.key }));
  renderOptimizePanel("smart", baseMetrics, state.pendingOptimizePlans);
}

function showImageVariants() {
  if (!state.image) {
    elements.cellInfo.textContent = "请先上传图片，再生成多方案。";
    return;
  }

  const baseMetrics = state.pattern.length
    ? calculateQualityMetrics(state.pattern, state.gridSize)
    : { totalColors: 0, isolatedPixelCount: 0, smallRegionCount: 0, lowUsageColorCount: 0, beadFriendlinessScore: 0 };
  const allowedCount = effectiveAllowedPalette().length;
  const variants = [
    {
      key: "simple",
      name: "极简版",
      description: "颜色最少，强清理，适合小尺寸",
      colorLimit: Math.max(4, Math.min(8, state.colorLimit, allowedCount || 8)),
      animeMode: true,
      minRegionSize: Math.max(7, state.minRegionSize),
      mergeBoost: 4,
    },
    {
      key: "balanced",
      name: "平衡版",
      description: "默认推荐，识别度和制作难度平衡",
      colorLimit: state.colorLimit,
      animeMode: state.animeMode,
      minRegionSize: state.minRegionSize,
      mergeBoost: 0,
    },
    {
      key: "fidelity",
      name: "保真版",
      description: "保留更多颜色和细节，适合 100x100 以上",
      colorLimit: Math.min(palette.length, Math.max(state.colorLimit, state.colorLimit + 6)),
      animeMode: false,
      minRegionSize: Math.max(2, state.minRegionSize - 2),
      mergeBoost: -3,
    },
    {
      key: "outline",
      name: "轮廓增强版",
      description: "更重视深色轮廓，适合 Logo 和卡通图",
      colorLimit: state.colorLimit,
      animeMode: true,
      lineBoost: true,
      minRegionSize: Math.max(5, state.minRegionSize),
      mergeBoost: 1,
    },
  ].map((variant) => generateVariantCandidate(variant, baseMetrics));

  const validPlans = variants.filter((plan) => plan.metrics.colorConstraintViolationCount === 0);
  const recommended = [...(validPlans.length ? validPlans : variants)].sort(
    (a, b) => b.metrics.beadFriendlinessScore - a.metrics.beadFriendlinessScore,
  )[0];
  state.pendingOptimizePlans = variants.map((plan) => ({ ...plan, recommended: plan.key === recommended.key }));
  renderOptimizePanel("variants", baseMetrics, state.pendingOptimizePlans);
}

function generateVariantCandidate(variant, baseMetrics) {
  let pattern = generatePatternCandidate({
    colorLimit: variant.colorLimit,
    animeMode: variant.animeMode,
    minRegionSize: variant.minRegionSize,
    lineBoost: variant.lineBoost ?? state.lineBoost,
    mergeBoost: variant.mergeBoost,
  });
  if (state.pattern.length === pattern.length) {
    pattern = validateColorConstraints(restoreProtectedCells(state.pattern, pattern));
  }
  const metrics = calculateQualityMetrics(pattern, state.gridSize);
  return {
    ...variant,
    pattern,
    before: baseMetrics,
    metrics,
    preview: patternPreviewDataUrl(pattern, state.gridSize),
  };
}

function generatePatternCandidate(overrides) {
  const saved = {
    colorLimit: state.colorLimit,
    animeMode: state.animeMode,
    minRegionSize: state.minRegionSize,
    lineBoost: state.lineBoost,
    mergeBoost: state.mergeBoost,
  };
  Object.assign(state, overrides);

  const size = state.gridSize;
  const pixels = buildPixelSamples(state.image, size);
  const limitedPalette = adaptivePaletteForPixels(pixels);
  const candidate = pixels.map((pixel) => nearestPaletteColor(pixel, limitedPalette));
  const processed = postProcessPattern(candidate, size);

  Object.assign(state, saved);
  return validateColorConstraints(processed);
}

function runOptimizeCandidate(sourcePattern, size, plan, baseMetrics = null) {
  if (plan.baseline) {
    const metrics = baseMetrics || calculateQualityMetrics(sourcePattern, size);
    return {
      ...plan,
      pattern: [...sourcePattern],
      before: metrics,
      metrics,
      compare: compareOptimizationResult(sourcePattern, sourcePattern, size),
      preview: patternPreviewDataUrl(sourcePattern, size),
    };
  }
  let processed = validateColorConstraints(sourcePattern);
  const strength = plan.key === "strong" ? "strong" : plan.key === "light" ? "light" : "balanced";
  if (plan.key !== "light") {
    processed = finalPaletteSimplification(processed, size, { strength });
  } else {
    processed = reduceNeighborhoodNoise(processed, size, "light");
  }
  processed = cleanIsolatedPixels(processed, size);
  processed = cleanPatternRegions(processed, size, plan.minRegionSize);
  processed = cleanIsolatedPixels(processed, size);
  if (state.mergeSimilarColors) {
    processed = mergeSimilarUsedColors(processed, size, plan.mergeDeltaE);
  }
  if (plan.lowUsage) {
    processed = mergeLowUsageColors(processed, size, { strength });
  }
  processed = forceMaxColors(processed, size, plan.maxColors);
  processed = repairOutlines(processed, size, plan.key === "strong" ? 3 : plan.key === "balanced" && size <= 48 ? 2 : 0);
  processed = restoreProtectedCells(sourcePattern, processed);
  processed = validateColorConstraints(processed);

  const metrics = calculateQualityMetrics(processed, size);
  const compare = compareOptimizationResult(sourcePattern, processed, size);
  return {
    ...plan,
    pattern: processed,
    before: baseMetrics || calculateQualityMetrics(sourcePattern, size),
    metrics,
    compare,
    preview: patternPreviewDataUrl(processed, size),
  };
}

function restoreProtectedCells(sourcePattern, candidatePattern) {
  const restored = [...candidatePattern];
  for (let index = 0; index < sourcePattern.length; index += 1) {
    const source = sourcePattern[index];
    if (!source) continue;
    if (state.manualEditedCells.has(index) || isColorLocked(source)) {
      restored[index] = source;
    }
  }
  return restored;
}

function compareOptimizationResult(beforeGrid, afterGrid, size = state.gridSize) {
  const before = calculateQualityMetrics(beforeGrid, size);
  const after = calculateQualityMetrics(afterGrid, size);
  const outlineNoiseDelta = after.outlineNoiseCount - before.outlineNoiseCount;
  const continuityDelta = after.outlineContinuityScore - before.outlineContinuityScore;
  const jumpDelta = after.colorJumpScore - before.colorJumpScore;
  const chaosDelta = after.regionColorChaosScore - before.regionColorChaosScore;
  const scoreDelta = after.beadFriendlinessScore - before.beadFriendlinessScore;
  const risky =
    outlineNoiseDelta > Math.max(3, before.outlineNoiseCount * 0.2) ||
    continuityDelta < -0.35 ||
    jumpDelta > 8 ||
    chaosDelta > 8 ||
    scoreDelta < -0.4;
  const improved =
    !risky &&
    (after.totalColors < before.totalColors ||
      after.colorJumpScore < before.colorJumpScore ||
      after.regionColorChaosScore < before.regionColorChaosScore ||
      after.outlineBreakCount < before.outlineBreakCount ||
      after.beadFriendlinessScore >= before.beadFriendlinessScore);
  return {
    before,
    after,
    risky,
    improved,
    outlineNoiseDelta,
    continuityDelta: Math.round(continuityDelta * 10) / 10,
    jumpDelta,
    chaosDelta,
    scoreDelta: Math.round(scoreDelta * 10) / 10,
  };
}

function renderOptimizePanel(mode, beforeMetrics, plans) {
  elements.optimizePanel.hidden = false;
  const title = mode === "variants" ? "多方案" : "智能优化建议";
  const summary = `
    <div class="optimize-summary">
      ${metricPill("颜色", beforeMetrics.totalColors)}
      ${metricPill("孤点", beforeMetrics.isolatedPixelCount)}
      ${metricPill("小区域", beforeMetrics.smallRegionCount)}
      ${metricPill("低用量色", beforeMetrics.lowUsageColorCount)}
      ${metricPill("评分", beforeMetrics.beadFriendlinessScore)}
    </div>
  `;

  elements.optimizeBody.innerHTML = `
    <strong>${title}</strong>
    ${summary}
    <div class="plan-grid">
      ${plans.map((plan, index) => renderPlanCard(plan, index)).join("")}
    </div>
  `;

  document.querySelectorAll("[data-apply-plan]").forEach((button) => {
    button.addEventListener("click", () => applyOptimizePlan(Number(button.dataset.applyPlan)));
  });
  window.lucide?.createIcons();
}

function metricPill(label, value) {
  return `<span class="metric-pill">${label}: <strong>${value}</strong></span>`;
}

function renderPlanCard(plan, index) {
  const before = plan.before;
  const metrics = plan.metrics;
  const riskLabel = plan.compare?.risky ? " · 有风险" : plan.compare?.improved ? " · 更稳" : "";
  return `
    <article class="plan-card${plan.recommended ? " is-recommended" : ""}${plan.compare?.risky ? " is-risky" : ""}">
      <img class="plan-preview" src="${plan.preview}" alt="${plan.name}预览" />
      <strong>${plan.name}${plan.recommended ? " · 推荐" : ""}${riskLabel}</strong>
      <span>${plan.description}</span>
      <span>颜色 ${before.totalColors} → ${metrics.totalColors}</span>
      <span>颗数 ${before.effectiveBeadCount} → ${metrics.effectiveBeadCount}</span>
      <span>孤点 ${before.isolatedPixelCount} → ${metrics.isolatedPixelCount}</span>
      <span>杂色 ${before.regionColorChaosScore} → ${metrics.regionColorChaosScore}</span>
      <span>描边连续 ${before.outlineContinuityScore} → ${metrics.outlineContinuityScore}</span>
      <span>评分 ${before.beadFriendlinessScore} → ${metrics.beadFriendlinessScore}</span>
      <button data-apply-plan="${index}" type="button">预览这个方案</button>
    </article>
  `;
}

function applyOptimizePlan(index) {
  const plan = state.pendingOptimizePlans[index];
  if (!plan) return;
  setPendingPreview(validateColorConstraints(plan.pattern), {
    backgroundMask: state.backgroundMask,
    preservesManualEdits: true,
    size: state.gridSize,
  });
  state.optimizedGrid = [...state.previewPattern];
  state.compareMetrics = plan.compare || compareOptimizationResult(state.pattern, state.previewPattern, state.gridSize);
  elements.optimizePanel.hidden = true;
  renderPendingPreview();
  elements.cellInfo.textContent = `${plan.name} 已生成预览，请确认应用。`;
}

function patternPreviewDataUrl(pattern, size) {
  const canvas = document.createElement("canvas");
  const cell = Math.max(2, Math.floor(180 / size));
  canvas.width = size * cell;
  canvas.height = size * cell;
  const previewCtx = canvas.getContext("2d");
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const item = pattern[y * size + x];
      previewCtx.fillStyle = item.empty ? "#ffffff" : item.hex;
      previewCtx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  return canvas.toDataURL("image/png");
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

function displayPattern() {
  if (state.diagnosticViewMode === "raw" && state.rawMappedGrid.length) return state.rawMappedGrid;
  return state.isPreviewDirty && state.previewPattern.length ? state.previewPattern : state.pattern;
}

function displayCounts() {
  if (state.diagnosticViewMode === "raw" && state.rawMappedGrid.length) return buildCounts(state.rawMappedGrid);
  return state.isPreviewDirty && state.previewPattern.length ? state.previewCounts : state.counts;
}

function displayQualityMetrics() {
  return state.isPreviewDirty && state.previewPattern.length ? state.previewQualityMetrics : state.qualityMetrics;
}

function totalBeadCount(pattern = state.pattern) {
  return pattern.reduce((sum, item) => sum + (item.empty ? 0 : 1), 0);
}

function calculateUsedBounds(pattern = state.pattern, size = state.gridSize) {
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
      elements.emptyState.hidden = false;
      return;
    }

    elements.emptyState.hidden = true;
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
  const grid = state.gridSize;
  const cell = plot.cell;
  const pattern = displayPattern();
  const bounds = dirtyBounds || { minX: 0, minY: 0, maxX: plot.widthCells - 1, maxY: plot.heightCells - 1 };

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const item = pattern[y * grid + x];
      const cellX = plot.gridX + x * cell;
      const cellY = plot.gridY + y * cell;
      if (item.empty) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(cellX, cellY, cell, cell);
      } else if (state.viewMode === "bead") {
        drawSquareBead(cellX, cellY, cell, item);
      } else if (state.viewMode === "clean") {
        ctx.fillStyle = item.hex;
        ctx.fillRect(cellX, cellY, cell, cell);
      } else {
        ctx.fillStyle = item.hex;
        ctx.fillRect(cellX + 0.7, cellY + 0.7, Math.max(1, cell - 1.4), Math.max(1, cell - 1.4));
      }
    }
  }
}

function drawPatternCellCodes(dirtyBounds = null) {
  const plot = activePlotMetrics();
  const cell = plot.cell;
  if (state.viewMode !== "pixel" || !state.showCellCodes || !cellCodesFitCurrentZoom(cell)) return;
  const pattern = displayPattern();
  const bounds = dirtyBounds || { minX: 0, minY: 0, maxX: plot.widthCells - 1, maxY: plot.heightCells - 1 };
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const item = pattern[y * state.gridSize + x];
      if (!item || item.empty) continue;
      drawCellCode(item, plot.gridX + x * cell, plot.gridY + y * cell, cell);
    }
  }
}

function cellCodesFitCurrentZoom(internalCellSize) {
  const rect = elements.patternCanvas.getBoundingClientRect();
  if (!rect.width || !elements.patternCanvas.width) return true;
  const cssCellSize = internalCellSize * (rect.width / elements.patternCanvas.width);
  return cssCellSize >= 8;
}

function drawReferenceLayer() {
  const geometry = traceReferenceGeometry();
  if (!geometry) return;

  ctx.save();
  ctx.globalAlpha = clampRange(state.traceReference.opacity, 0, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    state.referenceImage,
    0,
    0,
    state.referenceImage.width,
    state.referenceImage.height,
    geometry.left,
    geometry.top,
    geometry.width,
    geometry.height,
  );
  ctx.restore();

  if (state.traceReference.adjustMode) {
    ctx.save();
    ctx.strokeStyle = state.traceReference.locked ? "#111" : "#e82f63";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(geometry.left, geometry.top, geometry.width, geometry.height);
    ctx.setLineDash([]);
    ctx.fillStyle = state.traceReference.locked ? "#111" : "#e82f63";
    ctx.font = "900 22px Microsoft YaHei, sans-serif";
    ctx.fillText(state.traceReference.locked ? "参考图已锁定" : "拖动参考图，滚轮缩放", geometry.left + 10, Math.max(28, geometry.top - 10));
    ctx.restore();
  }
}

function shouldDrawTraceReference(layer) {
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
  renderPattern();
  markProjectDirty();
}

function traceReferenceSizeCellsForScale(scale) {
  const base = traceBaseSizeCells();
  return { width: base.width * scale, height: base.height * scale };
}

function drawGridLines(dirtyBounds = null) {
  const plot = activePlotMetrics();
  const cell = plot.cell;
  const bounds = dirtyBounds || { minX: 0, minY: 0, maxX: plot.widthCells - 1, maxY: plot.heightCells - 1 };

  ctx.save();
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(plot.gridX, plot.gridY, plot.gridWidth, plot.gridHeight);

  for (let index = bounds.minX; index <= bounds.maxX + 1; index += 1) {
    const vertical = plot.gridX + index * cell;
    ctx.beginPath();
    const guide = state.patternMode === "pixelPattern" ? state.guideEvery : 10;
    ctx.strokeStyle = index % guide === 0 ? "#a8a2e5" : "rgba(216,216,216,0.9)";
    ctx.lineWidth = index % guide === 0 ? 1.6 : 0.75;
    ctx.moveTo(vertical, plot.gridY);
    ctx.lineTo(vertical, plot.gridY + plot.gridHeight);
    ctx.stroke();
  }

  for (let index = bounds.minY; index <= bounds.maxY + 1; index += 1) {
    const horizontal = plot.gridY + index * cell;
    ctx.beginPath();
    const guide = state.patternMode === "pixelPattern" ? state.guideEvery : 10;
    ctx.strokeStyle = index % guide === 0 ? "#a8a2e5" : "rgba(216,216,216,0.9)";
    ctx.lineWidth = index % guide === 0 ? 1.6 : 0.75;
    ctx.moveTo(plot.gridX, horizontal);
    ctx.lineTo(plot.gridX + plot.gridWidth, horizontal);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoordinateLabels() {
  if (!state.showCoordinates) return;
  const plot = activePlotMetrics();
  const cell = plot.cell;
  ctx.save();
  ctx.fillStyle = "#9b9b9b";
  const isGridEditor = state.editorView === "grid";
  ctx.font = `${isGridEditor ? 16 : 10}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const step = Math.max(plot.widthCells, plot.heightCells) <= 64 ? 2 : 5;
  const offset = isGridEditor ? 26 : 13;
  const sideOffset = isGridEditor ? 34 : 17;
  for (let index = 1; index <= plot.widthCells; index += 1) {
    if (index === 1 || index % step === 0 || plot.widthCells <= 32) {
      const center = plot.gridX + (index - 0.5) * cell;
      ctx.fillText(String(index), center, plot.gridY - offset);
      ctx.fillText(String(index), center, plot.gridY + plot.gridHeight + offset);
    }
  }
  for (let index = 1; index <= plot.heightCells; index += 1) {
    if (index === 1 || index % step === 0 || plot.heightCells <= 32) {
      const rowCenter = plot.gridY + (index - 0.5) * cell;
      ctx.fillText(String(index), plot.gridX - sideOffset, rowCenter);
      ctx.fillText(String(index), plot.gridX + plot.gridWidth + sideOffset, rowCenter);
    }
  }
  ctx.restore();
}

function drawCellCode(item, x, y, cell) {
  const isGridEditor = state.editorView === "grid";
  if (cell < (isGridEditor ? 8 : 7.5)) return;
  ctx.save();
  ctx.font = `900 ${Math.max(isGridEditor ? 6 : 5, cell * (isGridEditor ? 0.42 : 0.34))}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = contrastColor(item.rgb);
  ctx.fillText(item.code, x + cell / 2, y + cell / 2);
  ctx.restore();
}

function drawSquareBead(x, y, cell, item) {
  const radius = Math.max(1, cell * 0.42);
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  ctx.save();
  ctx.fillStyle = item.hex;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = Math.max(1, cell * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSelectedCell() {
  if (!state.selectedCell) return;
  const plot = activePlotMetrics();
  const cell = plot.cell;
  const x = plot.gridX + state.selectedCell.x * cell;
  const y = plot.gridY + state.selectedCell.y * cell;
  ctx.save();
  ctx.strokeStyle = "#ff4d5d";
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
  ctx.restore();
}

function drawSelectionOverlay(dirtyBounds = null) {
  const plot = activePlotMetrics();
  const cell = plot.cell;

  ctx.save();
  ctx.fillStyle = "rgba(232, 59, 100, 0.22)";
  ctx.strokeStyle = "#e83b64";
  ctx.lineWidth = Math.max(1, cell * 0.12);
  for (const index of state.selection) {
    const x = index % state.gridSize;
    const y = Math.floor(index / state.gridSize);
    if (!isActiveGridCell(x, y)) continue;
    if (dirtyBounds && (x < dirtyBounds.minX || x > dirtyBounds.maxX || y < dirtyBounds.minY || y > dirtyBounds.maxY)) continue;
    ctx.fillRect(plot.gridX + x * cell + 1, plot.gridY + y * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2));
  }

  if (state.penPoints.length) {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.beginPath();
    state.penPoints.forEach((point, index) => {
      const px = plot.gridX + (point.x + 0.5) * cell;
      const py = plot.gridY + (point.y + 0.5) * cell;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    for (const point of state.penPoints) {
      ctx.fillStyle = "#e83b64";
      ctx.fillRect(plot.gridX + (point.x + 0.25) * cell, plot.gridY + (point.y + 0.25) * cell, cell * 0.5, cell * 0.5);
    }
  }
  ctx.restore();
}

function drawBrushPreview() {
  if (!state.brushHoverCell || !state.pattern.length || state.editorView !== "grid") return;
  if (!["brush", "eraser", "line"].includes(state.activeTool)) return;
  const plot = activePlotMetrics();
  const cellSize = plot.cell;
  ctx.save();
  ctx.fillStyle = state.activeTool === "eraser" ? "rgba(255,255,255,0.35)" : "rgba(232, 59, 100, 0.20)";
  ctx.strokeStyle = state.activeTool === "eraser" ? "#111111" : "#e83b64";
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
    for (const brushCell of brushCellsForPoint(point)) {
      const key = `${brushCell.x},${brushCell.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(brushCell);
    }
  }
  return cells;
}

function contrastColor(rgb) {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.58 ? "#111111" : "#ffffff";
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
    const rank = (item) => {
      if (item.isActive) return 0;
      if (item.isLocked) return 1;
      if (item.isUsed) return 2;
      if (item.isAllowed) return 3;
      if (item.isSearchResult) return 4;
      return 5;
    };
    return rank(a) - rank(b) || b.count - a.count || palette.findIndex((item) => item.code === a.code) - palette.findIndex((item) => item.code === b.code);
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
    state.diagnosticViewMode,
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
    renderCache.statsSignature = signature;
  } finally {
    recordPerformance("render.stats", performanceNow() - startedAt);
  }
}

function renderStatsNow(sorted, total, listRows, pattern, usedBounds) {
  const usedColorCount = listRows.filter((item) => item.count > 0).length;
  elements.totalBeads.textContent = `${state.isPreviewDirty ? "预览 " : ""}共 ${usedColorCount} 色 / ${total.toLocaleString("zh-CN")} 颗`;
  state.usedBounds = usedBounds;

  if (!pattern.length && !state.projectPalette.length) {
    elements.paletteList.innerHTML = '<div class="empty-list">生成后会显示每种颜色需要多少颗</div>';
    elements.legendStrip.innerHTML = "<span>色卡会显示在这里</span>";
    renderPaletteChoices(sorted);
    return;
  }

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

  const boundsLabel = state.usedBounds ? `<span class="bounds-chip">所需最小行列 ${state.usedBounds.width} x ${state.usedBounds.height}</span>` : "";
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
  const base = state.pattern.length ? state.pattern : state.previewPattern;
  if (base.length) {
    setPendingPreview(validateColorConstraints(base), {
      backgroundMask: state.backgroundMask,
      preservesManualEdits: state.isPreviewDirty && state.previewPreservesManualEdits,
      size: state.gridSize,
    });
    renderPendingPreview();
    elements.cellInfo.textContent = "颜色约束预览已更新，请确认应用。";
  } else if (state.image) {
    requestPreviewUpdate("颜色约束预览已更新，请确认应用。");
  }
}

function renderConstraintPalette() {
  const startedAt = performanceNow();
  elements.colorModeLabel.textContent = "MARD 221";

  const query = state.paletteSearch;
  const filteredPalette = palette.filter((item) => {
    const locked = state.lockedColorCodes.has(item.code);
    const used = state.counts.has(item.code) || state.previewCounts.has(item.code);
    const active = state.selectedColor?.code === item.code;
    if (state.showSelectedColorsOnly && !used && !locked && !active) return false;
    if (!query) return true;
    return `${item.code} ${item.name} ${item.hex} ${item.brand}`.toLowerCase().includes(query);
  });

  const signature = [
    state.colorMode,
    query,
    Number(state.showSelectedColorsOnly),
    state.selectedColor?.code || "",
    filteredPalette
      .map(
        (item) =>
          `${item.code}:${Number(state.lockedColorCodes.has(item.code))}:${Number(state.allowedColorCodes.has(item.code))}:${Number(
            state.disabledColorCodes.has(item.code),
          )}`,
      )
      .join(","),
  ].join("|");

  if (renderCache.constraintSignature === signature) {
    recordPerformance("render.palette", performanceNow() - startedAt, true);
    return;
  }

  try {
    renderConstraintPaletteNow(filteredPalette);
    renderCache.constraintSignature = signature;
  } finally {
    recordPerformance("render.palette", performanceNow() - startedAt);
  }
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

function setupPaletteEventDelegation() {
  for (const root of [elements.paletteList, elements.legendStrip]) {
    root.addEventListener("dragstart", handlePaletteDragStart);
    root.addEventListener("click", handlePaletteClick);
    root.addEventListener("dblclick", handlePaletteDoubleClick);
  }
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
  const color = paletteColorByCode(code);
  if (!color) return;
  state.disabledColorCodes.delete(code);
  state.allowedColorCodes.add(code);
  if (state.lockedColorCodes.has(code)) state.lockedColorCodes.delete(code);
  else state.lockedColorCodes.add(code);
  if (activateColor) activatePaintColor(color, { addToAllowed: true, announce: false });
  elements.cellInfo.textContent = state.lockedColorCodes.has(code)
    ? `${code} 已锁定${activateColor ? "。" : "，不会被自动优化修改。"}`
    : `${code} 已解锁。`;
  if (state.colorMode === "fixedPalette") applyConstraintChange();
  else {
    renderConstraintPalette();
    renderStats();
    markProjectDirty();
  }
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
    if (["brush", "eraser", "line"].includes(state.activeTool)) {
      requestPatternRender([...previousPreviewCells, ...brushPreviewCellsForCell(cell)]);
    }
  }
  const item = state.pattern[cell.y * state.gridSize + cell.x];
  elements.cellInfo.textContent = `${cell.x + 1}, ${cell.y + 1} / 当前 ${item.code}，点击改成 ${state.selectedColor.code}`;
}

function handleCanvasClick(event) {
  if (state.colorDebugEnabled && event.altKey) {
    const debugCell = getCellFromPointer(event);
    if (debugCell) showColorDebugForCell(debugCell);
    return;
  }
  if (state.diagnosticViewMode === "raw") {
    state.diagnosticViewMode = "final";
    syncDiagnosticControls();
    renderPattern();
    renderStats();
    elements.cellInfo.textContent = "已切回最终图纸，可以继续编辑。颜色诊断请按住 Alt 点击格子。";
  }
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "当前是转图预览；请先确认应用再进入编辑。";
    return;
  }
  if (!state.editing || state.gridLocked || !state.pattern.length) return;
  if (["rect", "hline", "brush", "line"].includes(state.activeTool)) return;
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
  const finalColor = (state.isPreviewDirty && state.previewPattern.length ? state.previewPattern : state.pattern)[index] || state.finalGrid[index];
  const trace = state.colorTrace[index] || {};
  const candidates = state.rawDebugCandidates[index] || (sample ? nearestPaletteCandidates(sample, palette, 5) : []);
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
    `raw ${rawColor?.code || "空"} → final ${finalColor?.code || "空"}${changed} ｜候选 ${candidateText}`;
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

function handleCanvasPointerDown(event) {
  elements.patternCanvas.focus?.({ preventScroll: true });
  if (beginCanvasPan(event)) return;
  if (state.diagnosticViewMode === "raw") {
    state.diagnosticViewMode = "final";
    syncDiagnosticControls();
    renderPattern();
    renderStats();
    elements.cellInfo.textContent = "已切回最终图纸，可以继续编辑。";
  }
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
    pushHistory();
    state.isBrushPainting = true;
    state.lastBrushIndex = null;
    state.lastBrushCell = null;
    state.strokeVisited = new Set();
    elements.patternCanvas.setPointerCapture?.(event.pointerId);
    paintBrushCell(cell, event.shiftKey);
    return;
  }
  if (state.activeTool === "eraser") {
    if (state.selection.size) return;
    pushHistory();
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
  if (state.traceReference.dragging) {
    moveTraceReferenceDrag(event);
    return;
  }
  if (state.isBrushPainting) {
    const cell = getCellFromPointer(event);
    if (cell) paintBrushCell(cell, event.shiftKey);
    return;
  }
  if (state.isErasing) {
    const cell = getCellFromPointer(event);
    if (cell) eraseBrushCell(cell);
    return;
  }
  if (!state.dragStartCell) return;
  const cell = getCellFromPointer(event);
  if (!cell) return;
  state.dragPreview = cell;
  state.selection = buildSelectionFromDrag(state.dragStartCell, cell, state.activeTool);
  updateSelectionLabel();
  requestPatternRender();
}

function handleCanvasPointerUp(event) {
  if (state.traceReference.dragging) {
    finishTraceReferenceDrag(event);
    return;
  }
  if (state.isBrushPainting) {
    state.isBrushPainting = false;
    state.lastBrushIndex = null;
    state.lastBrushCell = null;
    state.strokeVisited = new Set();
    state.pattern = validateColorConstraints(state.pattern);
    state.counts = buildCounts(state.pattern);
    state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
    state.hasConfirmedGrid = true;
    state.manualEditCount += 1;
    state.editGridVersion += 1;
    renderStats();
    renderPattern();
    markProjectDirty();
    return;
  }
  if (state.isErasing) {
    state.isErasing = false;
    state.lastEraseIndex = null;
    state.lastEraseCell = null;
    state.strokeVisited = new Set();
    state.pattern = validateColorConstraints(state.pattern);
    state.counts = buildCounts(state.pattern);
    state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
    state.hasConfirmedGrid = true;
    state.manualEditCount += 1;
    state.editGridVersion += 1;
    renderStats();
    renderPattern();
    markProjectDirty();
    return;
  }
  if (!state.dragStartCell) return;
  const cell = getCellFromPointer(event) || state.dragPreview;
  state.selection = buildSelectionFromDrag(state.dragStartCell, cell, state.activeTool);
  state.dragStartCell = null;
  state.dragPreview = null;
  updateSelectionLabel();
  renderPattern();
}

function paintBrushCell(cell, snapLine = false) {
  const constrainedColor = manualPaintColor(state.selectedColor);
  const targetCell = snapLine && state.lastBrushCell ? snapLineEnd(state.lastBrushCell, cell) : cell;
  const cells = state.lastBrushCell ? interpolateCells(state.lastBrushCell, targetCell) : [targetCell];
  const dirtyCells = state.selectedCell ? [state.selectedCell] : [];
  for (const point of cells) {
    for (const symmetricPoint of symmetryPointsFor(point)) {
      for (const brushCell of brushCellsForPoint(symmetricPoint)) {
        const index = brushCell.y * state.gridSize + brushCell.x;
        if (state.strokeVisited.has(index) || !canEditCell(index)) continue;
        state.pattern[index] = constrainedColor;
        state.manualEditedCells.add(index);
        state.strokeVisited.add(index);
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
    for (const symmetricPoint of symmetryPointsFor(point)) {
      for (const brushCell of brushCellsForPoint(symmetricPoint)) {
        const index = brushCell.y * state.gridSize + brushCell.x;
        if (state.strokeVisited.has(index) || !canEditCell(index)) continue;
        state.pattern[index] = fill;
        state.manualEditedCells.add(index);
        state.strokeVisited.add(index);
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

function brushCellsForPoint(point) {
  const size = Math.max(1, state.brushSize || 1);
  const radius = Math.floor(size / 2);
  const cells = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = point.x + dx;
      const y = point.y + dy;
      if (!isActiveGridCell(x, y)) continue;
      if (state.brushShape === "circle" && Math.sqrt(dx * dx + dy * dy) > radius + 0.25) continue;
      cells.push({ x, y });
    }
  }
  if (!cells.length) cells.push(point);
  return cells;
}

function symmetryPointsFor(point) {
  const points = new Map();
  const add = (x, y) => {
    if (!isActiveGridCell(x, y)) return;
    points.set(`${x}:${y}`, { x, y });
  };
  const mirrorX = activeGridWidth() - 1 - point.x;
  const mirrorY = activeGridHeight() - 1 - point.y;
  add(point.x, point.y);
  if (state.symmetryMode === "horizontal" || state.symmetryMode === "both") add(mirrorX, point.y);
  if (state.symmetryMode === "vertical" || state.symmetryMode === "both") add(point.x, mirrorY);
  if (state.symmetryMode === "both") add(mirrorX, mirrorY);
  return [...points.values()];
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

function mirroredIndex(index, direction) {
  const x = index % state.gridSize;
  const y = Math.floor(index / state.gridSize);
  const targetX = direction === "horizontal" ? activeGridWidth() - 1 - x : x;
  const targetY = direction === "vertical" ? activeGridHeight() - 1 - y : y;
  return targetY * state.gridSize + targetX;
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
      mirrored[mirroredIndex(index, direction)] = state.pattern[index];
    }
  }
  state.pattern = mirrored;
  const activeIndexes = (indexes) => indexes.filter((index) => {
    const x = index % state.gridSize;
    const y = Math.floor(index / state.gridSize);
    return isActiveGridCell(x, y);
  });
  state.manualEditedCells = new Set(activeIndexes([...state.manualEditedCells]).map((index) => mirroredIndex(index, direction)));
  state.selection = new Set(activeIndexes([...state.selection]).map((index) => mirroredIndex(index, direction)));
  if (state.backgroundMask?.length === mirrored.length) {
    const mask = new Uint8Array(mirrored.length);
    for (let y = 0; y < activeGridHeight(); y += 1) {
      for (let x = 0; x < activeGridWidth(); x += 1) {
        const index = y * state.gridSize + x;
        mask[mirroredIndex(index, direction)] = state.backgroundMask[index];
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
  updateSelectionLabel();
  renderPattern();
  renderStats();
  elements.cellInfo.textContent = direction === "horizontal" ? "整张图纸已左右镜像。" : "整张图纸已上下镜像。";
  markProjectDirty();
}

function snapLineEnd(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) > Math.abs(dy) * 2) return { x: end.x, y: start.y };
  if (Math.abs(dy) > Math.abs(dx) * 2) return { x: start.x, y: end.y };
  const step = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: start.x + Math.sign(dx) * step, y: start.y + Math.sign(dy) * step };
}

function drawLineBetweenCells(start, end, color) {
  if (state.isPreviewDirty || state.gridLocked) return;
  pushHistory();
  const constrainedColor = manualPaintColor(color);
  const visited = new Set();
  for (const point of interpolateCells(start, end)) {
    for (const brushCell of brushCellsForPoint(point)) {
      const index = brushCell.y * state.gridSize + brushCell.x;
      if (visited.has(index) || !canEditCell(index)) continue;
      state.pattern[index] = constrainedColor;
      state.manualEditedCells.add(index);
      visited.add(index);
    }
  }
  state.counts = buildCounts(state.pattern);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.manualEditCount += 1;
  state.editGridVersion += 1;
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
  for (const index of targets) {
    state.pattern[index] = target;
    state.manualEditedCells.add(index);
  }
  state.counts = buildCounts(state.pattern);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.manualEditCount += 1;
  state.editGridVersion += 1;
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
  if (!state.isSpacePressed || event.button !== 0 || isTypingTarget(event.target)) return false;
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
  const color = palette.find((item) => item.code === code);
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

function tryStartTraceReferenceDrag(event) {
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
  if (
    !geometry ||
    point.x < geometry.left ||
    point.x > geometry.left + geometry.width ||
    point.y < geometry.top ||
    point.y > geometry.top + geometry.height
  ) {
    return false;
  }
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
  if (state.activeTool !== "eyedropper" || !state.referenceImage) return false;
  if (!state.traceReference.enabled || !state.traceReference.visible || state.traceReference.opacity <= 0) return false;
  const geometry = traceReferenceGeometry();
  const point = getCanvasPointFromPointer(event);
  if (
    !geometry ||
    point.x < geometry.left ||
    point.x > geometry.left + geometry.width ||
    point.y < geometry.top ||
    point.y > geometry.top + geometry.height
  ) {
    return false;
  }
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
  return ["brush", "eraser", "eyedropper", "rect", "pen", "sameColor"].includes(tool);
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
  elements.cellInfo.textContent = toolHint(tool);
  renderPattern();
}

function updateCanvasCursor() {
  let cursor = "default";
  if (state.isPanningCanvas) {
    cursor = "grabbing";
  } else if (state.isSpacePressed) {
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
  elements.canvasWrap.classList.toggle("is-panning", state.isPanningCanvas);
}

function toolHint(tool) {
  const hints = {
    paint: "改色：点击单格，或先选区再填充。",
    brush: "画笔：先选颜色，按住拖动，路过的格子会改成当前颜色；按住 Shift 可拉直。",
    bucket: "填充：点击一个区域，用当前颜色填充相同颜色的连通区域。",
    line: "直线：点击起点，再点击终点绘制直线；Shift 会吸附水平、垂直或 45 度。",
    eyedropper: "吸管：点击图纸格子吸色；画图模式下也可以点击画布参考图或参考图浮窗吸取并匹配 MARD 色。",
    rect: "框选：拖出矩形选区。",
    hline: "横线：拖动选择一段横向格子。",
    pen: "钢笔：连续点击围出区域，双击或点完成钢笔。",
    eraser: "擦除：点击或按住拖动，空背景模式下会擦成空白格。",
    sameColor: "同色：点击图纸或右侧色块，选择全部同色格。",
  };
  return hints[tool] || "";
}

function buildSelectionFromDrag(start, end, tool) {
  if (!start || !end) return new Set();
  const selected = new Set();
  let minX = Math.min(start.x, end.x);
  let maxX = Math.max(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxY = Math.max(start.y, end.y);

  if (tool === "hline") {
    minY = maxY = start.y;
  }

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      selected.add(y * state.gridSize + x);
    }
  }

  return selected;
}

function finishPenSelection() {
  if (state.penPoints.length < 3) {
    elements.cellInfo.textContent = "钢笔选区至少需要 3 个点。";
    return;
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

function clearSelection() {
  state.selection.clear();
  state.penPoints = [];
  updateSelectionLabel();
  renderPattern();
}

function updateSelectionLabel() {
  elements.selectionLabel.textContent = state.selection.size ? `${state.selection.size} 格` : state.penPoints.length ? `${state.penPoints.length} 点` : "未选区";
  elements.copySelectionButton.disabled = !state.selection.size;
  elements.pasteSelectionButton.disabled = !state.selectionClipboard;
}

function copySelectionPixels() {
  if (!state.pattern.length || !state.selection.size) {
    elements.cellInfo.textContent = "请先用框选或钢笔选择要复制的像素。";
    return;
  }
  const points = [...state.selection]
    .filter((index) => index >= 0 && index < state.pattern.length)
    .map((index) => ({ index, x: index % state.gridSize, y: Math.floor(index / state.gridSize) }));
  if (!points.length) return;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  state.selectionClipboard = {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    sourceX: minX,
    sourceY: minY,
    pasteCount: 0,
    cells: points.map((point) => {
      const color = state.pattern[point.index];
      return {
        dx: point.x - minX,
        dy: point.y - minY,
        code: color?.empty ? "__EMPTY__" : color?.code || "__EMPTY__",
      };
    }),
  };
  updateSelectionLabel();
  elements.cellInfo.textContent = `已复制 ${points.length} 个像素，可点击“粘贴选区”或按 Ctrl + V。`;
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

  const offset = clipboard.pasteCount + 1;
  const preferredX = state.brushHoverCell?.x ?? clipboard.sourceX + offset;
  const preferredY = state.brushHoverCell?.y ?? clipboard.sourceY + offset;
  const anchorX = Math.max(0, Math.min(activeGridWidth() - clipboard.width, preferredX));
  const anchorY = Math.max(0, Math.min(activeGridHeight() - clipboard.height, preferredY));
  const changes = clipboard.cells
    .map((cell) => {
      const x = anchorX + cell.dx;
      const y = anchorY + cell.dy;
      const index = y * state.gridSize + x;
      return { ...cell, index };
    })
    .filter((cell) => {
      const x = cell.index % state.gridSize;
      const y = Math.floor(cell.index / state.gridSize);
      return cell.index >= 0 && cell.index < state.pattern.length && isActiveGridCell(x, y) && canEditCell(cell.index);
    });
  if (!changes.length) {
    elements.cellInfo.textContent = "粘贴位置没有可编辑的格子，请解锁相关颜色后再试。";
    return;
  }

  pushHistory();
  const pastedSelection = new Set();
  for (const change of changes) {
    const color = change.code === "__EMPTY__" ? EMPTY_CELL : paletteColorByCode(change.code);
    if (!color) continue;
    state.pattern[change.index] = color;
    state.manualEditedCells.add(change.index);
    rememberPaletteColor(color);
    pastedSelection.add(change.index);
  }
  clipboard.pasteCount += 1;
  state.selection = pastedSelection;
  state.penPoints = [];
  state.counts = buildCounts(state.pattern);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.hasConfirmedGrid = true;
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  updateSelectionLabel();
  renderPattern();
  renderStats();
  markProjectDirty();
  elements.cellInfo.textContent = `已粘贴 ${pastedSelection.size} 个像素，粘贴结果已自动选中。`;
}

function snapshotPattern() {
  return {
    size: state.patternSize || state.gridSize,
    width: activeGridWidth(),
    height: activeGridHeight(),
    codes: state.pattern.map((item) => (item.empty ? "__EMPTY__" : item.code)),
    manualEditedCells: [...state.manualEditedCells],
    lockedColorCodes: [...state.lockedColorCodes],
    allowedColorCodes: [...state.allowedColorCodes],
    disabledColorCodes: [...state.disabledColorCodes],
    selectedColorCode: state.selectedColor?.code || "",
    projectPaletteCodes: state.projectPalette.map((item) => item.code),
  };
}

function restorePattern(snapshot) {
  const codes = Array.isArray(snapshot) ? snapshot : snapshot.codes;
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

function pushHistory() {
  if (!state.pattern.length) return;
  state.undoStack.push(snapshotPattern());
  if (state.undoStack.length > 60) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  updateHistoryButtons();
}

function clearHistory() {
  state.undoStack = [];
  state.redoStack = [];
  updateHistoryButtons();
}

function undoEdit() {
  if (!state.undoStack.length) return;
  const previousSnapshot = state.undoStack[state.undoStack.length - 1];
  const currentSnapshot = snapshotPattern();
  restorePattern(previousSnapshot);
  state.undoStack.pop();
  state.redoStack.push(currentSnapshot);
  updateHistoryButtons();
  elements.cellInfo.textContent = "已撤回一步";
  markProjectDirty();
}

function redoEdit() {
  if (!state.redoStack.length) return;
  const nextSnapshot = state.redoStack[state.redoStack.length - 1];
  const currentSnapshot = snapshotPattern();
  restorePattern(nextSnapshot);
  state.redoStack.pop();
  state.undoStack.push(currentSnapshot);
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
    const ok = window.confirm(`当前颜色 ${oldCode} 已锁定，是否仍然替换为 ${newCode}？\n确认后锁定状态会转移到 ${newCode}。`);
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
  refreshFinalDiagnosticsFromCurrentPattern("replaceColor");
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
  const nextCode = window.prompt(`把 ${oldCode} 替换为哪个 MARD 色号？`, "");
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

  const shortcuts = {
    b: "brush",
    i: "eyedropper",
    p: "pen",
    u: "eraser",
  };
  if (!event.ctrlKey && !event.metaKey && !event.altKey && shortcuts[key]) {
    event.preventDefault();
    setActiveTool(shortcuts[key]);
    return;
  }

  if (!event.ctrlKey && !event.metaKey) return;
  if (key === "c" && state.selection.size) {
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
  if (recordHistory) pushHistory();
  const constrainedColor = manualPaintColor(color);
  rememberPaletteColor(constrainedColor);
  for (const index of indices) {
    if (!canEditCell(index)) continue;
    state.pattern[index] = constrainedColor;
    state.manualEditedCells.add(index);
  }
  state.pattern = validateColorConstraints(state.pattern);
  state.counts = buildCounts(state.pattern);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.hasConfirmedGrid = true;
  state.manualEditCount += 1;
  state.editGridVersion += 1;
  updateSelectionLabel();
  renderPattern();
  renderStats();
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
  const settings = state.zoomState || { minZoom: 0.25, maxZoom: 4, step: 0.1 };
  const nextZoom = clampRange(Number(value) || 1, settings.minZoom, settings.maxZoom);
  const wrap = elements.canvasWrap;
  const previousZoom = Math.max(0.01, state.zoom || 1);
  const hasAnchor = Number.isFinite(options.anchorX) && Number.isFinite(options.anchorY);
  const anchorX = hasAnchor ? options.anchorX : wrap.clientWidth / 2;
  const anchorY = hasAnchor ? options.anchorY : wrap.clientHeight / 2;
  const anchorContentX = wrap.scrollLeft + anchorX;
  const anchorContentY = wrap.scrollTop + anchorY;
  const oldScrollWidth = Math.max(1, wrap.scrollWidth - wrap.clientWidth);
  const oldScrollHeight = Math.max(1, wrap.scrollHeight - wrap.clientHeight);
  const centerRatioX = oldScrollWidth ? (wrap.scrollLeft + wrap.clientWidth / 2) / Math.max(1, wrap.scrollWidth) : 0.5;
  const centerRatioY = oldScrollHeight ? (wrap.scrollTop + wrap.clientHeight / 2) / Math.max(1, wrap.scrollHeight) : 0.5;
  const codesVisibleBefore = state.pattern.length && state.showCellCodes ? cellCodesFitCurrentZoom(activePlotMetrics().cell) : null;

  state.zoom = nextZoom;
  const base = baseCanvasCssSize();
  elements.patternCanvas.style.width = `${Math.round(base.width * state.zoom)}px`;
  elements.patternCanvas.style.height = `${Math.round(base.height * state.zoom)}px`;
  elements.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;

  requestAnimationFrame(() => {
    if (
      codesVisibleBefore !== null &&
      codesVisibleBefore !== cellCodesFitCurrentZoom(activePlotMetrics().cell)
    ) {
      requestPatternRender();
    }
    if (options.center) {
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
}

function fitCanvasToScreen() {
  const wrap = elements.canvasWrap;
  const base = baseCanvasCssSize();
  const availableWidth = Math.max(120, wrap.clientWidth - 36);
  const availableHeight = Math.max(120, wrap.clientHeight - 36);
  const fitZoom = Math.min(availableWidth / base.width, availableHeight / base.height);
  setZoom(fitZoom, { center: true });
}

function exportPattern() {
  if (!canLeaveTransformWithCurrentPreview("export")) return;
  if (!state.pattern.length) return;
  const includeWatermark = elements.exportWatermarkToggle?.checked ?? state.exportWatermarkEnabled;
  state.exportWatermarkEnabled = includeWatermark;
  if (elements.exportFormat?.value === "pdf") {
    exportPatternPdf({ includeWatermark });
    return;
  }
  const readableCanvas = renderReadableExportCanvas({ includeWatermark });
  downloadCanvas(readableCanvas, `${state.fileName || "小麦拼豆"}-${activeGridWidth()}x${activeGridHeight()}-高清.png`);
}

function renderReadableExportCanvas(options = {}) {
  const includeWatermark = options.includeWatermark !== false;
  const widthCells = activeGridWidth();
  const heightCells = activeGridHeight();
  const largestSide = Math.max(widthCells, heightCells);
  const cellSize = largestSide >= 120 ? 38 : largestSide >= 100 ? 44 : largestSide >= 64 ? 42 : 46;
  const margin = Math.max(96, Math.round(cellSize * 2.5));
  const top = Math.max(180, Math.round(cellSize * 4.1));
  const plotWidth = widthCells * cellSize;
  const plotHeight = heightCells * cellSize;
  const legendRows = Math.ceil(sortedCounts().length / Math.max(1, Math.floor(plotWidth / 188)));
  const legendHeight = Math.max(280, 90 + legendRows * 82);
  const canvas = document.createElement("canvas");
  canvas.width = margin * 2 + plotWidth;
  canvas.height = top + plotHeight + legendHeight;
  const exportCtx = canvas.getContext("2d");

  exportCtx.fillStyle = "#fffdf8";
  exportCtx.fillRect(0, 0, canvas.width, canvas.height);
  exportCtx.fillStyle = "#111";
  exportCtx.font = `900 ${Math.max(54, Math.round(cellSize * 1.25))}px Microsoft YaHei, sans-serif`;
  exportCtx.fillText(includeWatermark ? "小麦拼豆" : "拼豆图纸", margin, 76);
  exportCtx.font = `500 ${Math.max(34, Math.round(cellSize * 0.8))}px Arial, Microsoft YaHei, sans-serif`;
  exportCtx.textAlign = "right";
  exportCtx.fillText(`${state.fileName || "pattern"}   ${gridDimensionsLabel()} / ${totalBeadCount()}颗 / ${state.counts.size}色`, canvas.width - margin, 76);
  exportCtx.textAlign = "left";

  drawReadableCells(exportCtx, margin, top, cellSize);
  drawReadableLegend(exportCtx, margin, top + plotHeight + 80, canvas.width - margin * 2);
  if (includeWatermark) drawReadableExportWatermark(exportCtx, canvas, top, top + plotHeight);

  return canvas;
}

function drawReadableExportWatermark(exportCtx, canvas, startY, endY) {
  const size = Math.max(52, Math.round(Math.min(canvas.width, canvas.height) * 0.055));
  const stepX = Math.max(300, size * 4.6);
  const stepY = Math.max(220, size * 2.8);
  exportCtx.save();
  exportCtx.beginPath();
  exportCtx.rect(0, startY, canvas.width, Math.max(0, endY - startY));
  exportCtx.clip();
  exportCtx.globalAlpha = 0.065;
  exportCtx.fillStyle = "#d92f62";
  exportCtx.font = `900 ${size}px Microsoft YaHei, sans-serif`;
  exportCtx.textAlign = "center";
  exportCtx.textBaseline = "middle";
  exportCtx.translate(canvas.width / 2, (startY + endY) / 2);
  exportCtx.rotate(-Math.PI / 7);
  for (let y = -canvas.height; y <= canvas.height; y += stepY) {
    const rowOffset = Math.round(y / stepY) % 2 ? stepX / 2 : 0;
    for (let x = -canvas.width; x <= canvas.width; x += stepX) {
      exportCtx.fillText("小麦拼豆", x + rowOffset, y);
    }
  }
  exportCtx.restore();
}

function drawReadableCells(exportCtx, startX, startY, cellSize) {
  const widthCells = activeGridWidth();
  const heightCells = activeGridHeight();
  const stride = state.gridSize;
  const plotWidth = widthCells * cellSize;
  const plotHeight = heightCells * cellSize;

  exportCtx.fillStyle = "#fff";
  exportCtx.fillRect(startX, startY, plotWidth, plotHeight);

  for (let y = 0; y < heightCells; y += 1) {
    for (let x = 0; x < widthCells; x += 1) {
      const item = state.pattern[y * stride + x];
      const cellX = startX + x * cellSize;
      const cellY = startY + y * cellSize;
      if (item.empty) {
        exportCtx.fillStyle = "#fff";
        exportCtx.fillRect(cellX, cellY, cellSize, cellSize);
        continue;
      }
      exportCtx.fillStyle = item.hex;
      exportCtx.fillRect(cellX, cellY, cellSize, cellSize);
      exportCtx.fillStyle = contrastColor(item.rgb);
      exportCtx.font = `900 ${Math.max(12, cellSize * 0.42)}px Arial, sans-serif`;
      exportCtx.textAlign = "center";
      exportCtx.textBaseline = "middle";
      exportCtx.fillText(item.code, cellX + cellSize / 2, cellY + cellSize / 2);
    }
  }

  exportCtx.textAlign = "center";
  exportCtx.textBaseline = "middle";
  exportCtx.font = "14px Arial, sans-serif";
  exportCtx.fillStyle = "#777";
  for (let index = 1; index <= widthCells; index += 1) {
    if (index === 1 || index % 5 === 0 || widthCells <= 64) {
      const center = startX + (index - 0.5) * cellSize;
      exportCtx.fillText(String(index), center, startY - 20);
      exportCtx.fillText(String(index), center, startY + plotHeight + 20);
    }
  }
  for (let index = 1; index <= heightCells; index += 1) {
    if (index === 1 || index % 5 === 0 || heightCells <= 64) {
      const rowCenter = startY + (index - 0.5) * cellSize;
      exportCtx.fillText(String(index), startX - 28, rowCenter);
      exportCtx.fillText(String(index), startX + plotWidth + 28, rowCenter);
    }
  }

  exportCtx.strokeStyle = "rgba(0,0,0,0.22)";
  exportCtx.lineWidth = 1;
  for (let index = 0; index <= widthCells; index += 1) {
    const offset = index * cellSize;
    exportCtx.beginPath();
    exportCtx.strokeStyle = index % 10 === 0 ? "#8f88da" : "rgba(0,0,0,0.18)";
    exportCtx.lineWidth = index % 10 === 0 ? 2 : 1;
    exportCtx.moveTo(startX + offset, startY);
    exportCtx.lineTo(startX + offset, startY + plotHeight);
    exportCtx.stroke();
  }
  for (let index = 0; index <= heightCells; index += 1) {
    const offset = index * cellSize;
    exportCtx.beginPath();
    exportCtx.strokeStyle = index % 10 === 0 ? "#8f88da" : "rgba(0,0,0,0.18)";
    exportCtx.lineWidth = index % 10 === 0 ? 2 : 1;
    exportCtx.moveTo(startX, startY + offset);
    exportCtx.lineTo(startX + plotWidth, startY + offset);
    exportCtx.stroke();
  }

  exportCtx.strokeStyle = "#111";
  exportCtx.lineWidth = 3;
  exportCtx.strokeRect(startX, startY, plotWidth, plotHeight);
}

function drawReadableLegend(exportCtx, startX, startY, maxWidth) {
  const sorted = sortedCounts();
  const chipWidth = 170;
  const chipHeight = 58;
  const gap = 18;
  const columns = Math.max(1, Math.floor(maxWidth / (chipWidth + gap)));

  exportCtx.fillStyle = "#111";
  exportCtx.font = "900 30px Microsoft YaHei, sans-serif";
  exportCtx.textAlign = "left";
  exportCtx.fillText("色卡", startX, startY - 30);

  sorted.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + col * (chipWidth + gap);
    const y = startY + row * (chipHeight + gap);
    exportCtx.fillStyle = item.hex;
    exportCtx.fillRect(x, y, 46, 46);
    exportCtx.strokeStyle = "#111";
    exportCtx.lineWidth = 2;
    exportCtx.strokeRect(x, y, 46, 46);
    exportCtx.fillStyle = contrastColor(item.rgb);
    exportCtx.font = "900 17px Arial, sans-serif";
    exportCtx.textAlign = "center";
    exportCtx.textBaseline = "middle";
    exportCtx.fillText(item.code, x + 23, y + 23);
    exportCtx.textAlign = "left";
    exportCtx.fillStyle = "#111";
    exportCtx.font = "800 22px Arial, Microsoft YaHei, sans-serif";
    exportCtx.fillText(`x${item.count}`, x + 58, y + 29);
  });
}

function downloadCanvas(canvas, fileName) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function exportPatternPdf(options = {}) {
  const pdfBytes = buildVectorPdf(options);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${state.fileName || "小麦拼豆"}-${activeGridWidth()}x${activeGridHeight()}-清晰图纸.pdf`;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function buildVectorPdf(options = {}) {
  const includeWatermark = options.includeWatermark !== false;
  const page = { width: 842, height: 595 };
  const widthCells = activeGridWidth();
  const heightCells = activeGridHeight();
  const stride = state.gridSize;
  const margin = 28;
  const titleY = 32;
  const legendX = 594;
  const legendWidth = page.width - legendX - margin;
  const maxPlotW = legendX - margin * 2 - 16;
  const maxPlotH = page.height - 112;
  const cell = Math.min(maxPlotW / widthCells, maxPlotH / heightCells);
  const plotWidth = cell * widthCells;
  const plotHeight = cell * heightCells;
  const startX = margin;
  const startY = 74;
  const commands = [];
  const text = (value, x, y, size = 9, align = "left", color = "#111111") => {
    const raw = String(value);
    const token = pdfTextToken(raw);
    const font = /[^\x20-\x7e]/.test(raw) ? "F2" : "F1";
    let tx = x;
    if (align === "right") tx = x - pdfTextWidth(raw, size);
    if (align === "center") tx = x - pdfTextWidth(raw, size) / 2;
    commands.push(`${pdfColor(hexToRgb(color))} rg`);
    commands.push(`BT /${font} ${roundPdf(size)} Tf ${roundPdf(tx)} ${roundPdf(page.height - y)} Td ${token} Tj ET`);
  };
  const rect = (x, y, width, height, color) => {
    const rgb = hexToRgb(color);
    commands.push(`${pdfColor(rgb)} rg ${roundPdf(x)} ${roundPdf(page.height - y - height)} ${roundPdf(width)} ${roundPdf(height)} re f`);
  };
  const strokeLine = (x1, y1, x2, y2, color = "#d8d8d8", width = 0.35) => {
    const rgb = hexToRgb(color);
    commands.push(`${pdfColor(rgb)} RG ${roundPdf(width)} w ${roundPdf(x1)} ${roundPdf(page.height - y1)} m ${roundPdf(x2)} ${roundPdf(page.height - y2)} l S`);
  };

  rect(0, 0, page.width, page.height, "#fffdf8");
  text(includeWatermark ? "小麦拼豆" : "拼豆图纸", margin, titleY, 16);
  text(`${gridDimensionsLabel()} / ${totalBeadCount()} beads / ${state.counts.size} colors / MARD ${palette.length}`, page.width - margin, titleY, 10, "right");
  text(state.fileName || "pattern", margin, titleY + 18, 9);

  rect(startX, startY, plotWidth, plotHeight, "#ffffff");
  for (let y = 0; y < heightCells; y += 1) {
    for (let x = 0; x < widthCells; x += 1) {
      const item = state.pattern[y * stride + x];
      const px = startX + x * cell;
      const py = startY + y * cell;
      if (!item.empty) {
        rect(px, py, cell, cell, item.hex);
        if (cell >= 3.2) {
          const ink = contrastColor(item.rgb) === "#ffffff" ? "#ffffff" : "#111111";
          text(item.code, px + cell / 2, py + cell * 0.63, Math.max(2.2, cell * 0.36), "center", ink);
        }
      }
    }
  }

  for (let i = 0; i <= widthCells; i += 1) {
    const pos = startX + i * cell;
    const guide = i % state.guideEvery === 0;
    strokeLine(pos, startY, pos, startY + plotHeight, guide ? "#8f88da" : "#d9d9d9", guide ? 0.7 : 0.25);
  }
  for (let i = 0; i <= heightCells; i += 1) {
    const guide = i % state.guideEvery === 0;
    const row = startY + i * cell;
    strokeLine(startX, row, startX + plotWidth, row, guide ? "#8f88da" : "#d9d9d9", guide ? 0.7 : 0.25);
  }
  strokeLine(startX, startY, startX + plotWidth, startY, "#111111", 1.1);
  strokeLine(startX, startY + plotHeight, startX + plotWidth, startY + plotHeight, "#111111", 1.1);
  strokeLine(startX, startY, startX, startY + plotHeight, "#111111", 1.1);
  strokeLine(startX + plotWidth, startY, startX + plotWidth, startY + plotHeight, "#111111", 1.1);

  const coordStep = Math.max(widthCells, heightCells) <= 64 ? 5 : 10;
  for (let i = 1; i <= widthCells; i += 1) {
    if (i === 1 || i % coordStep === 0 || i === widthCells) {
      const center = startX + (i - 0.5) * cell;
      text(i, center, startY - 7, 5, "center");
    }
  }
  for (let i = 1; i <= heightCells; i += 1) {
    if (i === 1 || i % coordStep === 0 || i === heightCells) {
      const rowCenter = startY + (i - 0.5) * cell;
      text(i, startX - 10, rowCenter + 1.5, 5, "right");
    }
  }

  text("Color List", legendX, 74, 13);
  const rows = sortedCounts();
  const maxLegendRows = 45;
  const columns = Math.max(1, Math.ceil(rows.length / maxLegendRows));
  const rowsPerColumn = Math.max(1, Math.ceil(rows.length / columns));
  const columnWidth = legendWidth / columns;
  const rowH = Math.min(16, (page.height - 112) / rowsPerColumn);
  rows.forEach((item, index) => {
    const column = Math.floor(index / rowsPerColumn);
    const row = index % rowsPerColumn;
    const x = legendX + column * columnWidth;
    const y = 92 + row * rowH;
    const swatch = Math.max(5, Math.min(10, rowH - 2));
    const fontSize = Math.max(4.5, Math.min(8, rowH * 0.56));
    rect(x, y - swatch, swatch, swatch, item.hex);
    strokeLine(x, y - swatch, x + swatch, y - swatch, "#111111", 0.25);
    strokeLine(x, y, x + swatch, y, "#111111", 0.25);
    strokeLine(x, y - swatch, x, y, "#111111", 0.25);
    strokeLine(x + swatch, y - swatch, x + swatch, y, "#111111", 0.25);
    text(`${item.code} x${item.count}`, x + swatch + 3, y - 1, fontSize);
    if (columns === 1 && columnWidth > 150) text(item.name || item.code, x + 78, y - 1, 7);
  });

  if (includeWatermark) {
    for (let y = startY + 48; y < startY + plotHeight; y += 92) {
      for (let x = startX + 62; x < startX + plotWidth; x += 138) {
        text("小麦拼豆", x, y, 15, "center", "#f5e8ed");
      }
    }
  }

  return createPdf(page.width, page.height, commands.join("\n"));
}

function pdfColor(rgb) {
  return `${roundPdf(rgb.r / 255)} ${roundPdf(rgb.g / 255)} ${roundPdf(rgb.b / 255)}`;
}

function roundPdf(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function pdfEscape(value) {
  return value.replace(/[^\x20-\x7e]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfTextWidth(value, size) {
  return Array.from(String(value)).reduce((sum, char) => sum + (/[\x20-\x7e]/.test(char) ? 0.5 : 0.9), 0) * size;
}

function pdfTextToken(value) {
  return /[^\x20-\x7e]/.test(value) ? `<${pdfUtf16BeHex(value)}>` : `(${pdfEscape(value)})`;
}

function pdfUtf16BeHex(value) {
  let hex = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    hex += code.toString(16).padStart(4, "0").toUpperCase();
  }
  return hex;
}

function createPdf(width, height, stream) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${roundPdf(width)} ${roundPdf(height)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [7 0 R] >>",
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> /FontDescriptor 8 0 R >>",
    "<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array([...pdf].map((char) => char.charCodeAt(0)));
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
  setTimeout(() => {
    elements.copyListButton.title = "复制清单";
  }, 1200);
}

function resetApp() {
  window.clearTimeout(state.autosaveTimer);
  state.image = null;
  state.sourceImageState = null;
  state.fileName = "";
  state.pixelBackground = "empty";
  state.accurateMatch = true;
  state.localPreprocessSettings.enabled = true;
  state.pattern = [];
  clearPreviewState();
  state.backgroundMask = null;
  clearColorDiagnostics();
  invalidateOptimizedBaseImage();
  state.hasConfirmedGrid = false;
  state.editGridVersion = 0;
  state.previewGridVersion = 0;
  state.manualEditCount = 0;
  state.manualEditedCells = new Set();
  state.projectDirty = false;
  state.projectSavedAt = null;
  state.projectCreatedAt = null;
  state.libraryProjectId = null;
  state.patternSize = state.gridSize;
  state.counts = new Map();
  state.projectPalette = [];
  state.selectedCell = null;
  state.symmetryMode = "none";
  state.referenceImage = null;
  state.referenceImageUrl = "";
  state.referenceName = "";
  state.referenceVisible = true;
  state.referenceAbove = false;
  state.referenceOpacity = 0.35;
  state.referenceLocked = false;
  state.traceReference = {
    ...state.traceReference,
    enabled: true,
    visible: true,
    opacity: 0.35,
    zMode: "aboveGrid",
    scale: 1,
    x: null,
    y: null,
    locked: true,
    snapToGrid: false,
    adjustMode: false,
    dragging: false,
    pointerId: null,
  };
  clearHistory();
  elements.imageInput.value = "";
  elements.referenceInput.value = "";
  elements.referenceStatus.textContent = "未导入";
  elements.referenceVisibleToggle.checked = true;
  elements.referenceAboveToggle.checked = false;
  elements.referenceOpacity.value = 35;
  elements.referenceOpacityLabel.textContent = "35%";
  closeReferenceMenu();
  updateReferenceMenuState();
  syncTraceReferenceControls();
  renderReferenceFloatPanel();
  elements.projectName.textContent = "小麦拼豆";
  elements.projectMeta.textContent = "上传图片后生成像素风拼豆图纸";
  elements.totalBeads.textContent = "共 0 颗";
  elements.symmetryModeSelect.value = "none";
  setActiveTool("brush");
  document.querySelectorAll(".pixel-bg-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.bg === state.pixelBackground);
  });
  updatePixelBackgroundLabel();
  syncDiagnosticControls();
  syncLocalPreprocessControls();
  updateBackgroundHint();
  updateProjectSaveStatus("未保存");
  renderPattern();
  renderStats();
  clearAutosaveProject().catch((error) => console.warn("清理自动恢复点失败", error));
  renderProjectLibrary();
}

function init() {
  organizeWorkbenchSidebar();
  elevateToolboxLayer();
  setupWorkbenchLayout();
  setupWorkbenchModes();
  moveQuickTogglesToToolbar();
  setupEvents();
  syncLocalPreprocessControls();
  syncColorLimitControls();
  updateSelectedColorUi();
  updateHistoryButtons();
  updatePreviewButtons();
  updateGridLockUi();
  updateToolboxLockUi();
  updateReferenceMenuState();
  syncTraceReferenceControls();
  syncDiagnosticControls();
  renderConstraintPalette();
  setZoom(1);
  renderPattern();
  renderStats();
  updateProjectSaveStatus("未保存");
  renderProjectLibrary();
  window.setTimeout(checkAutosaveRecovery, 350);
  if (window.lucide) {
    window.lucide.createIcons();
  } else {
    window.addEventListener("load", () => window.lucide?.createIcons());
  }
}

init();
