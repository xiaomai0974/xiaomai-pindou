/* 小麦拼豆 — 01-runtime.js
 * 共享状态、色板匹配与 DOM 引用
 */
const colorUtils = window.XiaomaiColorUtils;
if (!colorUtils) {
  throw new Error("颜色计算模块加载失败，请刷新页面后重试。");
}
const {
  clamp,
  colorDistance,
  contrastColor,
  deltaE2000,
  hexToRgb,
  paletteMatchDistance,
  rgbToLab,
} = colorUtils;

const gridUtils = window.XiaomaiGridUtils;
if (!gridUtils) {
  throw new Error("网格工具模块加载失败，请刷新页面后重试。");
}
const {
  applyCountChanges,
  boundsForCells,
  buildCounts,
  calculateUsedBounds: calculateGridUsedBounds,
  countNeighborColors,
  getEightNeighbors,
  getFourNeighbors,
  interpolateCells,
  isBorderIndex,
  mergeCellBounds,
  pointInPolygon,
  samePatternColor,
  snapLineEnd,
  totalBeadCount: countPatternBeads,
} = gridUtils;

const backgroundUtils = window.XiaomaiBackgroundUtils;
if (!backgroundUtils) {
  throw new Error("背景处理模块加载失败，请刷新页面后重试。");
}
const {
  applyBackgroundModeToGrid: applyGridBackgroundMode,
  checkBackgroundModeConsistency: checkGridBackgroundModeConsistency,
  computeBackgroundMask: computeGridBackgroundMask,
  countBackgroundNoise: countGridBackgroundNoise,
  detectBackgroundColor: detectGridBackgroundColor,
} = backgroundUtils;

const editorGeometry = window.XiaomaiEditorGeometry;
if (!editorGeometry) {
  throw new Error("编辑器几何模块加载失败，请刷新页面后重试。");
}
const {
  brushCellsForPoint,
  buildSelectionFromDrag,
  mirroredIndex,
  symmetryPointsFor,
} = editorGeometry;

const editorClipboard = window.XiaomaiEditorClipboard;
if (!editorClipboard) {
  throw new Error("编辑剪贴板模块加载失败，请刷新页面后重试。");
}
const {
  EMPTY_CODE: CLIPBOARD_EMPTY_CODE,
  createSelectionClipboard,
  planSelectionMirror,
  planSelectionMove,
  planSelectionPaste,
  planSelectionRotate,
} = editorClipboard;

const localEditUtils = window.XiaomaiLocalEditUtils;
if (!localEditUtils) {
  throw new Error("局部编辑优化模块加载失败，请刷新页面后重试。");
}
const {
  buildSuspectColorReview,
  optimizeSelection,
} = localEditUtils;

const imageUtils = window.XiaomaiImageUtils;
if (!imageUtils) {
  throw new Error("图片工具模块加载失败，请刷新页面后重试。");
}
const {
  buildPreprocessOutlineMask,
  restorePreprocessOutlines,
} = imageUtils;

const preprocessUtils = window.XiaomaiPreprocessUtils;
if (!preprocessUtils) {
  throw new Error("底图预处理模块加载失败，请刷新页面后重试。");
}
const {
  cleanupAntiAliasPixels,
  cleanupBaseImageBackground,
  cleanupMaterialTexture,
  reduceBaseImageNoise,
  simplifyBaseImageFlatColors,
  stabilizeBaseImageRegions,
} = preprocessUtils;

const samplingUtils = window.XiaomaiSamplingUtils;
if (!samplingUtils) {
  throw new Error("图片采样模块加载失败，请刷新页面后重试。");
}
const {
  averageSampleCell: averagePixelSample,
  detectFlatIllustration,
  dominantSampleCell,
} = samplingUtils;

const qualityUtils = window.XiaomaiQualityUtils;
if (!qualityUtils) {
  throw new Error("质量分析模块加载失败，请刷新页面后重试。");
}
const {
  calculateColorJumpScore,
  calculateOutlineConnectivity,
  calculateRegionColorChaosScore,
  colorFamily,
  countEdgeBreaks,
  countIsolatedPixels,
} = qualityUtils;

const paletteSelectionUtils = window.XiaomaiPaletteSelection;
if (!paletteSelectionUtils) {
  throw new Error("代表色选择模块加载失败，请刷新页面后重试。");
}
const { selectRepresentativePalette } = paletteSelectionUtils;

const projectCodec = window.XiaomaiProjectCodec;
if (!projectCodec) {
  throw new Error("项目编解码模块加载失败，请刷新页面后重试。");
}
const {
  arrayToMask,
  deserializeGrid: deserializeProjectGrid,
  maskToArray,
  serializeGrid,
} = projectCodec;

const pdfUtils = window.XiaomaiPdfUtils;
if (!pdfUtils) {
  throw new Error("PDF 工具模块加载失败，请刷新页面后重试。");
}
const {
  createPdf,
  pdfColor,
  pdfTextToken,
  pdfTextWidth,
  roundPdf,
} = pdfUtils;
const exportRenderer = window.XiaomaiExportRenderer;
if (!exportRenderer) {
  throw new Error("导出渲染模块加载失败，请刷新页面后重试。");
}

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
const DEFAULT_COLOR_LIMIT = 24;
const REFERENCE_FEATURE_ENABLED = true;
const DEFAULT_LOCAL_PREPROCESS_SETTINGS = Object.freeze({
  enabled: true,
  flatColorSimplification: false,
  antiAliasCleanup: false,
  outlinePreserve: false,
  noiseReduction: false,
  materialTextureCleanup: true,
  backgroundCleanup: true,
  regionColorStabilization: true,
  regionToneCompression: false,
  outlineColorConvergence: false,
});
const DEFAULT_GENERATION_SETTINGS = Object.freeze({
  appMode: "auto",
  patternMode: "illustration",
  processingProfile: "detail64",
  pixelBackground: "empty",
  dither: false,
  removeTransparent: false,
  lineBoost: false,
  outlineMode: "light",
  dominantSampling: false,
  mergeSimilarColors: false,
  cleanSmallRegions: false,
  animeMode: false,
  minRegionSize: 2,
  accurateMatch: true,
});

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
const paletteIndexByCode = new Map(palette.map((item, index) => [item.code, index]));
const paletteColorByCodeMap = new Map(palette.map((item) => [item.code, item]));
const paletteSearchTextByCode = new Map(
  palette.map((item) => [item.code, `${item.code} ${item.name} ${item.hex} ${item.brand}`.toLowerCase()]),
);
const historyUtils = window.XiaomaiHistoryUtils;
if (!historyUtils) {
  throw new Error("撤回历史工具加载失败，请刷新页面后重试。");
}
const { createHistoryPatternPayload, historySnapshotCodes, historySnapshotsEqual, trimHistoryStack } = historyUtils;
const HISTORY_MEMORY_BUDGET = 6 * 1024 * 1024;
const NEAREST_COLOR_CACHE_LIMIT = 12000;
const NEAREST_CANDIDATE_CACHE_LIMIT = 3000;

const nearestColorCache = new Map();
const nearestCandidateCache = new Map();

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
const projectStoreApi = window.XiaomaiProjectStore;
if (!projectStoreApi) {
  throw new Error("项目存储模块加载失败，请刷新页面后重试。");
}
const projectStore = projectStoreApi.createProjectStore({
  indexedDB: window.indexedDB,
  dbName: AUTOSAVE_DB_NAME,
  dbVersion: PROJECT_DB_VERSION,
  autosaveStoreName: AUTOSAVE_STORE_NAME,
  autosaveKey: AUTOSAVE_KEY,
  libraryMetaStoreName: LIBRARY_META_STORE_NAME,
  libraryDataStoreName: LIBRARY_DATA_STORE_NAME,
});
const state = {
  image: null,
  sourceImageState: null,
  fileName: "",
  appMode: DEFAULT_GENERATION_SETTINGS.appMode,
  patternMode: DEFAULT_GENERATION_SETTINGS.patternMode,
  processingProfile: DEFAULT_GENERATION_SETTINGS.processingProfile,
  gridSize: 64,
  gridWidth: 64,
  gridHeight: 64,
  colorLimit: DEFAULT_COLOR_LIMIT,
  pixelBackground: DEFAULT_GENERATION_SETTINGS.pixelBackground,
  showCellCodes: true,
  showCoordinates: true,
  guideEvery: 5,
  colorMode: "max",
  allowedColorCodes: new Set(),
  lockedColorCodes: new Set(),
  disabledColorCodes: new Set(),
  paletteSearch: "",
  toolPaletteSearch: "",
  toolPaletteShowAll: false,
  recentColorCodes: [],
  showSelectedColorsOnly: false,
  dither: DEFAULT_GENERATION_SETTINGS.dither,
  showGrid: true,
  fitMode: "subject",
  removeTransparent: DEFAULT_GENERATION_SETTINGS.removeTransparent,
  lineBoost: DEFAULT_GENERATION_SETTINGS.lineBoost,
  outlineMode: DEFAULT_GENERATION_SETTINGS.outlineMode,
  dominantSampling: DEFAULT_GENERATION_SETTINGS.dominantSampling,
  mergeSimilarColors: DEFAULT_GENERATION_SETTINGS.mergeSimilarColors,
  cleanSmallRegions: DEFAULT_GENERATION_SETTINGS.cleanSmallRegions,
  animeMode: DEFAULT_GENERATION_SETTINGS.animeMode,
  minRegionSize: DEFAULT_GENERATION_SETTINGS.minRegionSize,
  minRegionSizeBeforeAnime: null,
  animeAdjustedMinRegionSize: null,
  mergeBoost: 0,
  localPreprocessSettings: { ...DEFAULT_LOCAL_PREPROCESS_SETTINGS },
  optimizedBaseImage: null,
  optimizedBaseImageSignature: "",
  referenceImage: null,
  referenceImageUrl: "",
  referenceName: "",
  referenceVisible: false,
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
    enabled: false,
    visible: false,
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
  previewKind: "conversion",
  previewChangedIndexes: [],
  previewCanvasSnapshot: null,
  rawMappedGrid: [],
  rawSampleData: [],
  rawDiagnosticSignature: "",
  rawDebugCandidates: [],
  colorTrace: [],
  colorMatchMetrics: null,
  accurateMatch: DEFAULT_GENERATION_SETTINGS.accurateMatch,
  colorDebugEnabled: false,
  backgroundMask: null,
  isPreviewDirty: false,
  hasConfirmedGrid: false,
  editGridVersion: 0,
  previewGridVersion: 0,
  manualEditCount: 0,
  manualEditedCells: new Set(),
  protectedCells: new Set(),
  protectionMode: "add",
  colorReviewItems: [],
  colorReviewGridVersion: -1,
  patternSize: 64,
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
  mobileCanvasPanMode: false,
  isPanningCanvas: false,
  panPointerId: null,
  panStartX: 0,
  panStartY: 0,
  panStartScrollLeft: 0,
  panStartScrollTop: 0,
  previousActiveTool: null,
  strokeVisited: new Set(),
  strokeHistorySnapshot: null,
  strokeChanged: false,
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
  autosaveInFlight: false,
  autosaveQueued: false,
  autosaveSessionVersion: 0,
  projectRevision: 0,
  lastAutosavedRevision: -1,
  suspendHistory: false,
  selectedColor: null,
  selectedCell: null,
  toolboxDrag: null,
  toolboxMoveActive: false,
  toolboxLocked: false,
  exportInProgress: false,
  exportWatermarkEnabled: true,
};

const colorPostprocessApi = window.XiaomaiColorPostprocess;
if (!colorPostprocessApi) {
  throw new Error("颜色后处理模块加载失败，请刷新页面后重试。");
}
const colorPostprocessor = colorPostprocessApi.createColorPostprocessor({
  backgroundColorCodes,
  buildCounts,
  buildProtectedIndexSet,
  colorDistance,
  colorFamily,
  countNeighborColors,
  detectBackgroundColor,
  getAccurateMatch: () => state.accurateMatch,
  getFourNeighbors,
  getLockedColorCodes: () => state.lockedColorCodes,
  getProcessingProfile: () => state.processingProfile,
  isBorderIndex,
  isColorLocked,
  nearestColorFromList,
  outlineColorCodes,
  totalBeadCount,
});
const {
  analyzeColorRegions,
  cleanIsolatedPixels,
  cleanPatternRegions,
  forceMaxColors,
  isProtectedRegion,
  mergeLowUsageColors,
  mergeSimilarUsedColors,
} = colorPostprocessor;

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

function activeEditorGeometryOptions() {
  return {
    width: activeGridWidth(),
    height: activeGridHeight(),
    stride: state.gridSize,
    brushSize: state.brushSize,
    brushShape: state.brushShape,
    symmetryMode: state.symmetryMode,
  };
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
  colorLimitNumber: document.querySelector("#colorLimitNumber"),
  customSizeInput: document.querySelector("#customSizeInput"),
  customHeightInput: document.querySelector("#customHeightInput"),
  applyCustomSizeButton: document.querySelector("#applyCustomSizeButton"),
  uploadWidthInput: document.querySelector("#uploadWidthInput"),
  uploadHeightInput: document.querySelector("#uploadHeightInput"),
  uploadSizeLabel: document.querySelector("#uploadSizeLabel"),
  applyUploadSizeButton: document.querySelector("#applyUploadSizeButton"),
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
  mobileReferenceCloseButton: document.querySelector("#mobileReferenceCloseButton"),
  mobileTraceReferenceOpacity: document.querySelector("#mobileTraceReferenceOpacity"),
  mobileTraceReferenceOpacityLabel: document.querySelector("#mobileTraceReferenceOpacityLabel"),
  pendingPreviewBar: document.querySelector("#pendingPreviewBar"),
  confirmPreviewButton: document.querySelector("#confirmPreviewButton"),
  discardPreviewButton: document.querySelector("#discardPreviewButton"),
  exportButton: document.querySelector("#exportButton"),
  exportFormat: document.querySelector("#exportFormat"),
  exportWatermarkToggle: document.querySelector("#exportWatermarkToggle"),
  resetButton: document.querySelector("#resetButton"),
  copyListButton: document.querySelector("#copyListButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomResetButton: document.querySelector("#zoomResetButton"),
  fitButton: document.querySelector("#fitButton"),
  mobileReferenceControlsButton: document.querySelector("#mobileReferenceControlsButton"),
  mobileCanvasPanButton: document.querySelector("#mobileCanvasPanButton"),
  mobileToolPanButton: document.querySelector("#mobileToolPanButton"),
  zoomLabel: document.querySelector("#zoomLabel"),
  editToggle: document.querySelector("#editToggle"),
  lockGridButton: document.querySelector("#lockGridButton"),
  editToolPanel: document.querySelector("#editToolPanel"),
  toolboxLockButton: document.querySelector("#toolboxLockButton"),
  selectionLabel: document.querySelector("#selectionLabel"),
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  toolColorSearchInput: document.querySelector("#toolColorSearchInput"),
  toolPaletteAllButton: document.querySelector("#toolPaletteAllButton"),
  toolColorPalette: document.querySelector("#toolColorPalette"),
  toolPropertiesTitle: document.querySelector("#toolPropertiesTitle"),
  mobileColorActions: document.querySelector("#mobileColorActions"),
  mobileColorActionSwatch: document.querySelector("#mobileColorActionSwatch"),
  mobileColorActionCode: document.querySelector("#mobileColorActionCode"),
  mobileColorActionCount: document.querySelector("#mobileColorActionCount"),
  mobileReplaceColorInput: document.querySelector("#mobileReplaceColorInput"),
  mobileReplaceColorButton: document.querySelector("#mobileReplaceColorButton"),
  mobileColorLockButton: document.querySelector("#mobileColorLockButton"),
  protectedCellCount: document.querySelector("#protectedCellCount"),
  protectSelectionButton: document.querySelector("#protectSelectionButton"),
  unprotectSelectionButton: document.querySelector("#unprotectSelectionButton"),
  previewSelectionOptimizeButton: document.querySelector("#previewSelectionOptimizeButton"),
  reviewSuspectColorsButton: document.querySelector("#reviewSuspectColorsButton"),
  colorReviewPanel: document.querySelector("#colorReviewPanel"),
  colorReviewSummary: document.querySelector("#colorReviewSummary"),
  colorReviewList: document.querySelector("#colorReviewList"),
  brushSizeInput: document.querySelector("#brushSizeInput"),
  brushShapeSelect: document.querySelector("#brushShapeSelect"),
  symmetryModeSelect: document.querySelector("#symmetryModeSelect"),
  mirrorHorizontalButton: document.querySelector("#mirrorHorizontalButton"),
  mirrorVerticalButton: document.querySelector("#mirrorVerticalButton"),
  rotateSelectionLeftButton: document.querySelector("#rotateSelectionLeftButton"),
  rotateSelectionRightButton: document.querySelector("#rotateSelectionRightButton"),
  allowLockedEditToggle: document.querySelector("#allowLockedEditToggle"),
  fillSelectionButton: document.querySelector("#fillSelectionButton"),
  finishPenButton: document.querySelector("#finishPenButton"),
  mobileConfirmSelectionButton: document.querySelector("#mobileConfirmSelectionButton"),
  copySelectionButton: document.querySelector("#copySelectionButton"),
  pasteSelectionButton: document.querySelector("#pasteSelectionButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  currentColorSwatch: document.querySelector("#currentColorSwatch"),
  currentColorName: document.querySelector("#currentColorName"),
  currentColorControl: document.querySelector("#currentColorControl"),
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
  mobileCropZoom: document.querySelector("#mobileCropZoom"),
  confirmCropButton: document.querySelector("#confirmCropButton"),
  mobileConfirmCropButton: document.querySelector("#mobileConfirmCropButton"),
  skipCropButton: document.querySelector("#skipCropButton"),
  cropCloseButton: document.querySelector("#cropCloseButton"),
  cropZoomOutButton: document.querySelector("#cropZoomOutButton"),
  cropZoomInButton: document.querySelector("#cropZoomInButton"),
  cropResetButton: document.querySelector("#cropResetButton"),
  cropMirrorButton: document.querySelector("#cropMirrorButton"),
  desktopCropResetButton: document.querySelector("#desktopCropResetButton"),
  desktopCropMirrorButton: document.querySelector("#desktopCropMirrorButton"),
  cropReplaceButton: document.querySelector("#cropReplaceButton"),
  projectName: document.querySelector("#projectName"),
  projectMeta: document.querySelector("#projectMeta"),
  paletteList: document.querySelector("#paletteList"),
  legendStrip: document.querySelector("#legendStrip"),
  totalBeads: document.querySelector("#totalBeads"),
  colorModeLabel: document.querySelector("#colorModeLabel"),
  constraintPalette: document.querySelector("#constraintPalette"),
  paletteSearchInput: document.querySelector("#paletteSearchInput"),
  showSelectedColorsButton: document.querySelector("#showSelectedColorsButton"),
  unlockAllColorsButton: document.querySelector("#unlockAllColorsButton"),
  accurateMatchToggle: document.querySelector("#accurateMatchToggle"),
  colorDebugToggle: document.querySelector("#colorDebugToggle"),
  colorDebugInfo: document.querySelector("#colorDebugInfo"),
};

const ctx = elements.patternCanvas.getContext("2d");
const cropCtx = elements.cropCanvas?.getContext("2d");
const canvasRenderer = window.XiaomaiCanvasRenderer;
if (!canvasRenderer) {
  throw new Error("画布渲染模块加载失败，请刷新页面后重试。");
}
const renderCache = {
  statsSignature: null,
  constraintSignature: null,
  toolPaletteSignature: null,
};
const gridLinePathCache = {
  signature: null,
  minor: null,
  guide: null,
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
let colorLimitPreviewTimer = null;
let imageProcessingRevision = 0;
let activePreviewRequestSignature = "";
let pendingPreviewRequestSignature = "";
let palettePanelRenderFrameId = null;
let toolPaletteRenderFrameId = null;
let qualityMetricsRefreshHandle = null;
let autosaveIntervalId = null;
let autosaveRecoveryTimer = null;
let copyListResetTimer = null;
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

function boundedCacheGet(cache, key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function boundedCacheSet(cache, key, value, limit) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > limit) {
    cache.delete(cache.keys().next().value);
  }
  return value;
}

function schedulePalettePanelRender() {
  if (palettePanelRenderFrameId !== null) return;
  palettePanelRenderFrameId = window.requestAnimationFrame(() => {
    palettePanelRenderFrameId = null;
    renderConstraintPalette();
    renderStats();
  });
}

function scheduleToolPaletteRender() {
  if (toolPaletteRenderFrameId !== null) return;
  toolPaletteRenderFrameId = window.requestAnimationFrame(() => {
    toolPaletteRenderFrameId = null;
    renderToolColorPalette();
  });
}

function cancelQualityMetricsRefresh() {
  if (!qualityMetricsRefreshHandle) return;
  if (qualityMetricsRefreshHandle.kind === "idle") {
    window.cancelIdleCallback?.(qualityMetricsRefreshHandle.id);
  } else {
    window.clearTimeout(qualityMetricsRefreshHandle.id);
  }
  qualityMetricsRefreshHandle = null;
}

function scheduleQualityMetricsRefresh() {
  cancelQualityMetricsRefresh();
  const expectedGridVersion = state.editGridVersion;
  const refresh = () => {
    qualityMetricsRefreshHandle = null;
    if (state.isPreviewDirty || expectedGridVersion !== state.editGridVersion || !state.pattern.length) return;
    state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  };
  if (typeof window.requestIdleCallback === "function") {
    qualityMetricsRefreshHandle = {
      kind: "idle",
      id: window.requestIdleCallback(refresh, { timeout: 500 }),
    };
  } else {
    qualityMetricsRefreshHandle = {
      kind: "timeout",
      id: window.setTimeout(refresh, 80),
    };
  }
}

function cancelScheduledUiWork() {
  window.clearTimeout(colorLimitPreviewTimer);
  colorLimitPreviewTimer = null;
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = null;
  window.clearTimeout(state.autosaveStatusTimer);
  state.autosaveStatusTimer = null;
  window.clearTimeout(autosaveRecoveryTimer);
  autosaveRecoveryTimer = null;
  window.clearTimeout(copyListResetTimer);
  copyListResetTimer = null;
  if (palettePanelRenderFrameId !== null) window.cancelAnimationFrame(palettePanelRenderFrameId);
  if (toolPaletteRenderFrameId !== null) window.cancelAnimationFrame(toolPaletteRenderFrameId);
  if (state.renderFrameId !== null) window.cancelAnimationFrame(state.renderFrameId);
  palettePanelRenderFrameId = null;
  toolPaletteRenderFrameId = null;
  state.renderFrameId = null;
  pendingPatternRenderBounds = null;
  pendingFullPatternRender = false;
  cancelQualityMetricsRefresh();
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
  crop: { x: 120, y: 70, width: 380, height: 380 },
  ratio: null,
  mirrored: false,
  dragMode: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  startCrop: null,
};

let mobileCanvasGestureController = null;
state.colorLimit = Math.min(state.colorLimit, palette.length);
state.selectedColor = palette.find((item) => item.code === "H7") || palette.find((item) => item.lab.l < 20) || palette[0];
state.allowedColorCodes = new Set(palette.slice(0, state.colorLimit).map((item) => item.code));
validateMardPalette();

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
  if (state.colorMode === "fixedPalette") {
    return Math.min(effectiveAllowedPalette().length, Math.max(state.colorLimit, lockedCount));
  }
  return Math.min(palette.length, Math.max(state.colorLimit, lockedCount));
}

function lockedColorConvergenceOptions() {
  const preferredLockedTargets = paletteByCodes(state.lockedColorCodes);
  return {
    preferLockedTargets: state.processingProfile === "photoColor" && preferredLockedTargets.length > 0,
    preferredLockedTargets,
  };
}

function isColorLocked(colorOrCode) {
  const code = typeof colorOrCode === "string" ? colorOrCode : colorOrCode.code;
  return state.lockedColorCodes.has(code);
}

function paletteColorByCode(code) {
  return paletteColorByCodeMap.get(code);
}

function searchMatchedPaletteColors() {
  if (!state.paletteSearch) return [];
  const query = state.paletteSearch.toLowerCase();
  return palette.filter((item) => paletteSearchTextByCode.get(item.code).includes(query));
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

function representativePaletteForPixels(pixels, sourcePalette = effectiveAllowedPalette()) {
  const flatIllustration = Boolean(pixels?.autoIllustrationMode);
  return selectRepresentativePalette(pixels, sourcePalette, {
    target: targetColorLimit(),
    size: state.gridSize,
    lockedColorCodes: state.lockedColorCodes,
    emptyBackground: usesEmptyBackground(),
    nearestColor: nearestPaletteColor,
    colorDistance,
    colorFamily,
    familyCaps: flatIllustration
      ? flatIllustrationFamilyCaps(targetColorLimit())
      : adaptiveFamilyCaps(targetColorLimit()),
  });
}

function flatIllustrationFamilyCaps(target) {
  const scale = Math.min(1, Math.max(0.45, target / 24));
  const scaled = (value, minimum = 1) => Math.max(minimum, Math.round(value * scale));
  return {
    "red-pink": scaled(4),
    "skin-beige": scaled(3),
    "orange-brown": scaled(3),
    yellow: scaled(3),
    green: scaled(3),
    blue: scaled(3),
    purple: scaled(3),
    "black-gray-white": scaled(4, 2),
    other: scaled(2),
  };
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
  const cached = boundedCacheGet(nearestColorCache, cacheKey);
  if (cached) return cached;

  let best = sourcePalette[0];
  let bestDistance = Infinity;

  const sourceLab = color.lab || rgbToLab(color);
  for (const item of sourcePalette) {
    const distance = deltaE2000(sourceLab, item.lab || rgbToLab(item.rgb));
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }

  return boundedCacheSet(nearestColorCache, cacheKey, best, NEAREST_COLOR_CACHE_LIMIT);
}

function nearestPaletteCandidates(color, sourcePalette = palette, limit = 5) {
  if (!color || color.empty) return [];
  const paletteKey = paletteSignature(sourcePalette);
  const cacheKey = `${paletteKey}:${Math.round(color.r ?? color.rgb?.r ?? 0)},${Math.round(color.g ?? color.rgb?.g ?? 0)},${Math.round(color.b ?? color.rgb?.b ?? 0)}`;
  const cached = boundedCacheGet(nearestCandidateCache, cacheKey);
  if (cached?.length >= limit) return cached.slice(0, limit);
  const sourceLab = color.lab || rgbToLab(color);
  const cachedLimit = Math.max(5, limit);
  const candidates = sourcePalette
    .map((item) => ({ ...item, deltaE: deltaE2000(sourceLab, item.lab || rgbToLab(item.rgb)) }))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, cachedLimit);
  boundedCacheSet(nearestCandidateCache, cacheKey, candidates, NEAREST_CANDIDATE_CACHE_LIMIT);
  return candidates.slice(0, limit);
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
    if (error?.name === "AbortError") throw error;
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
  paletteWorker = new Worker("palette-worker.js?v=20260720-1", { name: "xiaomai-palette-mapper" });
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

function cancelPendingPaletteWorkerRequests(message = "已取消过期颜色匹配") {
  if (!pendingPaletteWorkerRequests.size) return;
  const error = new Error(message);
  error.name = "AbortError";
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

function recordColorDiagnostics(pixels, rawPattern, currentPattern, changedBy = "postProcess") {
  state.rawSampleData = pixels;
  state.rawMappedGrid = [...rawPattern];
  state.rawDebugCandidates = new Array(pixels.length);
  state.colorTrace = rawPattern.map((rawColor, index) => {
    const currentColor = currentPattern[index] || rawColor;
    return {
      rawCode: rawColor?.empty ? "" : rawColor?.code,
      currentCode: currentColor?.empty ? "" : currentColor?.code,
      changedBy: rawColor?.code === currentColor?.code && rawColor?.empty === currentColor?.empty ? "" : changedBy,
    };
  });
  state.colorMatchMetrics = calculateColorMatchMetrics(pixels, currentPattern);
  syncDiagnosticControls();
}

function clearColorDiagnostics() {
  state.rawMappedGrid = [];
  state.rawSampleData = [];
  state.rawDiagnosticSignature = "";
  state.rawDebugCandidates = [];
  state.colorTrace = [];
  state.colorMatchMetrics = null;
  syncDiagnosticControls();
}

function refreshDiagnosticsFromCurrentPattern(changedBy = "manualEdit") {
  if (!state.rawMappedGrid.length || state.rawMappedGrid.length !== state.pattern.length) return;
  state.colorTrace = state.rawMappedGrid.map((rawColor, index) => {
    const currentColor = state.pattern[index] || rawColor;
    return {
      rawCode: rawColor?.empty ? "" : rawColor?.code,
      currentCode: currentColor?.empty ? "" : currentColor?.code,
      changedBy: rawColor?.code === currentColor?.code && rawColor?.empty === currentColor?.empty ? "" : changedBy,
    };
  });
  state.colorMatchMetrics = calculateColorMatchMetrics(state.rawSampleData, state.pattern);
  syncDiagnosticControls();
}

function calculateColorMatchMetrics(pixels, pattern) {
  if (!pixels?.length || pixels.length !== pattern?.length) return null;
  const allowed = effectiveAllowedPalette();
  let compared = 0;
  let totalDeltaE = 0;
  let totalScore = 0;
  let lowConfidenceCellCount = 0;

  for (let index = 0; index < pattern.length; index += 1) {
    const sample = pixels[index];
    const mapped = pattern[index];
    if (!sample || sample.empty || sample.background || !mapped || mapped.empty) continue;
    const candidates = nearestPaletteCandidates(sample, allowed, 2);
    const mappedDeltaE = paletteMatchDistance(sample, mapped);
    const ambiguity = candidates.length > 1 ? Math.max(0, 3 - (candidates[1].deltaE - candidates[0].deltaE)) : 0;
    const cellScore = clampRange(100 - mappedDeltaE * 2.2 - ambiguity * 1.5, 0, 100);
    totalDeltaE += mappedDeltaE;
    totalScore += cellScore;
    compared += 1;
    if (mappedDeltaE > 8 || cellScore < 75) lowConfidenceCellCount += 1;
  }

  return {
    comparedCellCount: compared,
    averageDeltaE: compared ? Math.round((totalDeltaE / compared) * 100) / 100 : 0,
    lowConfidenceCellCount,
    colorMatchScore: compared ? Math.round((totalScore / compared) * 10) / 10 : 0,
  };
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
