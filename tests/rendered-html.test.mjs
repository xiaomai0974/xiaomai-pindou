import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const clientRoot = new URL("../dist/client/", import.meta.url);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

async function assetResponse(request) {
  const pathname = new URL(request.url).pathname.replace(/^\/+/, "");
  if (!pathname || pathname.includes("..")) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(new URL(pathname, clientRoot));
    const extension = pathname.slice(pathname.lastIndexOf("."));
    return new Response(body, {
      status: 200,
      headers: { "content-type": contentTypes[extension] || "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function fetchFromWorker(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`),
    { ASSETS: { fetch: assetResponse } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("serves the Xiaomai bead designer homepage", async () => {
  const response = await fetchFromWorker("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>小麦拼豆 Beta<\/title>/);
  assert.match(html, /history-utils\.js\?v=20260724-1/);
  assert.match(html, /app\.js\?v=20260724-1/);
  assert.match(html, /id="patternCanvas"/);
  assert.match(html, /data-tool="pen"/);
  assert.match(html, /id="copySelectionButton"/);
  assert.match(html, /id="pasteSelectionButton"/);
  assert.match(html, /class="workbench-mode-header"/);
  assert.match(html, /data-workbench-mode="transform"/);
  assert.match(html, /data-workbench-mode="edit"/);
  assert.match(html, /data-workbench-mode="export"/);
  assert.match(html, /id="toolPropertiesCloseButton"/);
  assert.match(html, /id="toolColorPalette"/);
  assert.match(html, /id="toolColorSearchInput"/);
  assert.match(html, /id="toolPaletteAllButton"/);
  assert.doesNotMatch(html, /id="topExportModeButton"/);
  assert.doesNotMatch(html, /data-sidebar-target="export"/);
  assert.doesNotMatch(html, /id="smartOptimizeButton"/);
  assert.doesNotMatch(html, /data-sidebar-target="generate"/);
  assert.doesNotMatch(html, /id="generateButton"/);
  assert.doesNotMatch(html, /id="traceReferenceSnapToggle"/);
  assert.doesNotMatch(html, /id="traceReferenceZMode"/);
  assert.match(html, /id="pendingPreviewBar"/);
  assert.match(html, /id="confirmPreviewButton"/);
  assert.match(html, /id="discardPreviewButton"/);
  assert.match(html, /id="traceReferenceClearButton"/);
  assert.match(html, /原图显示/);
  assert.match(html, /id="traceReferenceOpacity"[^>]+value="35"/);
  assert.match(html, /<input id="accurateMatchToggle" type="checkbox" checked/);
  assert.match(html, /<button id="showFinalGridButton" class="is-active"/);
  assert.doesNotMatch(html, /<button id="showRawGridButton" class="is-active"/);
  assert.match(html, /class="processing-profile-option is-active" data-processing-profile="detail64"/);
  assert.match(html, /<input id="localPreprocessEnabledToggle" type="checkbox" checked/);
  [
    "flatColorSimplificationToggle",
    "antiAliasCleanupToggle",
    "outlinePreservePreprocessToggle",
    "noiseReductionToggle",
    "regionToneCompressionToggle",
    "outlineColorConvergenceToggle",
    "lineBoostToggle",
    "animeModeToggle",
  ].forEach((id) => {
    assert.match(html, new RegExp(`<input id="${id}" type="checkbox" \\/>`));
  });
  [
    "materialTextureCleanupToggle",
    "backgroundCleanupToggle",
    "regionColorStabilizationToggle",
    "transparentToggle",
    "dominantSamplingToggle",
    "mergeSimilarToggle",
    "cleanSmallRegionsToggle",
  ].forEach((id) => {
    assert.match(html, new RegExp(`<input id="${id}" type="checkbox" checked \\/>`));
  });
  assert.match(html, /id="minRegionSize"[^>]+value="2"/);
  assert.match(html, /id="customSizeInput"[^>]+type="number"[^>]+value="64"/);
  assert.match(html, /id="customHeightInput"[^>]+type="number"[^>]+value="64"/);
  assert.match(html, /id="colorLimit"[^>]+type="range"[^>]+value="24"/);
  assert.match(html, /id="colorLimitValue"[^>]*>24 色<\/output>/);
  assert.doesNotMatch(html, /id="customColorLimitInput"/);
  assert.doesNotMatch(html, /id="applyCustomColorLimitButton"/);
  assert.match(html, /支持 PNG \/ JPG，自动完整适配画布/);
  assert.match(html, /id="saveToLibraryButton"/);
  assert.match(html, /id="projectLibraryList"/);
  assert.match(html, /id="projectLibraryCount"/);
  assert.match(html, /我做过的图纸/);
  assert.match(html, /<input id="exportWatermarkToggle" type="checkbox" checked/);
  assert.match(html, /id="referenceExportHint"/);
  assert.match(html, /添加“小麦拼豆”水印/);
});

test("serves the current application script, utilities, worker, and stylesheet", async () => {
  const [scriptResponse, historyUtilsResponse, workerResponse, styleResponse, exportAdResponse] = await Promise.all([
    fetchFromWorker("/app.js"),
    fetchFromWorker("/history-utils.js"),
    fetchFromWorker("/palette-worker.js"),
    fetchFromWorker("/styles.css"),
    fetchFromWorker("/assets/wechat-custom-order.png"),
  ]);
  assert.equal(scriptResponse.status, 200);
  assert.equal(historyUtilsResponse.status, 200);
  assert.equal(workerResponse.status, 200);
  assert.equal(styleResponse.status, 200);
  assert.equal(exportAdResponse.status, 200);
  const script = await scriptResponse.text();
  const historyUtils = await historyUtilsResponse.text();
  assert.match(script, /function renderPattern\(options = \{\}\)/);
  assert.match(script, /function activeGridWidth\(\)/);
  assert.match(script, /function activeGridHeight\(\)/);
  assert.match(script, /const widthCells = activeGridWidth\(\);/);
  assert.match(script, /const heightCells = activeGridHeight\(\);/);
  assert.match(script, /diagnosticViewMode: "final"/);
  assert.match(script, /processingProfile: "detail64"/);
  assert.match(script, /removeTransparent: true/);
  assert.match(script, /lineBoost: false/);
  assert.match(script, /dominantSampling: true/);
  assert.match(script, /mergeSimilarColors: true/);
  assert.match(script, /cleanSmallRegions: true/);
  assert.match(script, /minRegionSize: 2/);
  assert.match(script, /render\.canvas\.partial/);
  assert.match(script, /function drawPatternCellCodes\(dirtyBounds = null\)/);
  assert.match(script, /codeVisibilityVersion: 2/);
  assert.match(script, /new Worker\("palette-worker\.js/);
  assert.match(script, /function copySelectionPixels\(\)/);
  assert.match(script, /function setupWorkbenchModes\(\)/);
  assert.match(script, /function setWorkbenchMode\(mode, options = \{\}\)/);
  assert.match(
    script,
    /if \(mode !== "transform" && state\.diagnosticViewMode === "raw"\) \{\s*state\.diagnosticViewMode = "final";/,
  );
  assert.match(script, /function renderToolColorPalette\(\)/);
  assert.match(script, /function toolPaletteRows\(\)/);
  assert.match(script, /toolPaletteSearch: ""/);
  assert.match(script, /function confirmPendingPreview\(\)/);
  assert.match(script, /function discardPendingPreview\(\)/);
  assert.match(script, /function clearPreviewState\(options = \{\}\)/);
  assert.match(script, /function setPendingPreview\(pattern, options = \{\}\)/);
  assert.match(script, /function renderPendingPreview\(\)/);
  assert.match(script, /function scheduleColorLimitPreview\(\)/);
  assert.match(script, /}, 140\);/);
  assert.match(script, /layer === "aboveGrid"/);
  assert.match(script, /state\.traceReference\.opacity = Number\(elements\.traceReferenceOpacity\.value\) \/ 100/);
  assert.match(script, /drawPatternCellCodes\(dirtyBounds\);[\s\S]+drawReferenceLayer\(\);[\s\S]+drawSelectionOverlay\(dirtyBounds\);/);
  assert.doesNotMatch(script, /applyPendingPreviewBeforeLeavingTransform/);
  assert.match(script, /elements\.customSizeInput\.value = state\.gridWidth/);
  assert.match(script, /elements\.customHeightInput\.value = state\.gridHeight/);
  assert.doesNotMatch(script, /elements\.customWidth\.value/);
  assert.match(script, /const PROJECT_DB_VERSION = 2/);
  assert.match(script, /const LIBRARY_META_STORE_NAME = "libraryMeta"/);
  assert.match(script, /const LIBRARY_DATA_STORE_NAME = "libraryData"/);
  assert.match(script, /function saveLibraryProject\(/);
  assert.match(script, /function renderProjectLibrary\(/);
  assert.match(script, /function clearAutosaveProject\(/);
  assert.match(script, /dirty: options\.dirty \?\? state\.projectDirty/);
  const autosaveSource = script.slice(script.indexOf("async function autoSaveProject"), script.indexOf("function openProjectDb"));
  assert.doesNotMatch(autosaveSource, /saveLibraryProject/);
  assert.match(script, /state\.manualEditCount = state\.manualEditedCells\.size/);
  assert.match(script, /state\.colorMode = paletteState\.colorConstraintMode === "fixedPalette" \? "fixedPalette" : "max"/);
  const targetLimitSource = script.slice(script.indexOf("function targetColorLimit"), script.indexOf("function isColorLocked"));
  assert.doesNotMatch(targetLimitSource, /return palette\.length/);
  assert.match(script, /function drawReadableExportWatermark\(/);
  assert.match(script, /const includeWatermark = options\.includeWatermark !== false/);
  assert.match(script, /const maxLegendRows = 45/);
  assert.match(script, /function capturePreviewCanvasSnapshot\(/);
  assert.match(script, /function restorePreviewCanvasSnapshot\(/);
  assert.match(script, /function deltaE2000\(/);
  assert.match(script, /function refineAccuratePaletteMatches\(/);
  assert.match(script, /function calculateColorMatchMetrics\(/);
  assert.match(script, /function buildBackgroundProtectionMask\(/);
  assert.match(script, /function buildConnectedBaseBackgroundMask\(/);
  assert.match(
    script,
    /function displayPattern\(\) \{\s*if \(state\.isPreviewDirty && state\.previewPattern\.length\) return state\.previewPattern;\s*if \(state\.diagnosticViewMode === "raw"/,
  );
  assert.match(
    script,
    /async function requestPreviewUpdate[\s\S]*?if \(state\.diagnosticViewMode === "raw"\) \{\s*state\.diagnosticViewMode = "final";/,
  );
  assert.match(script, /const transparent = state\.removeTransparent && alpha < 0\.08/);
  assert.match(script, /function currentExportSnapshot\(/);
  assert.match(script, /maxColors is a user-facing[\s\S]*?while \(counts\.size > maxColors && guard < 1000\)/);
  assert.match(
    script,
    /processed = repairOutlines\(processed, size, outlineStrengthForSize\(\)\);\s*processed = forceMaxColors\(processed, size, targetColorLimit\(\)\);/,
  );
  assert.match(script, /const EXPORT_AD_IMAGE_URL = "assets\/wechat-custom-order\.png"/);
  assert.match(script, /function loadExportAdImage\(/);
  assert.match(script, /function exportAdImageToJpegData\(/);
  assert.match(script, /\/XObject << \/Im1 11 0 R >>/);
  assert.match(script, /addEventListener\("pointercancel", handleCanvasPointerUp\)/);
  assert.match(script, /function commitStrokeHistory\(/);
  assert.match(script, /const \{ createHistoryPatternPayload, historySnapshotCodes, historySnapshotsEqual \} = historyUtils/);
  assert.match(historyUtils, /function historySnapshotsEqual\(/);
  assert.match(historyUtils, /global\.XiaomaiHistoryUtils = Object\.freeze/);
  assert.match(script, /function pushHistory\(snapshot = snapshotPattern\(\)\)/);
  assert.match(script, /while \(state\.undoStack\.length && historySnapshotsEqual/);
  assert.match(script, /exportPatternPdf\(\{ includeWatermark, exportAdImage, \.\.\.snapshot \}\)/);
  const exportSnapshotSource = script.slice(script.indexOf("function currentExportSnapshot"), script.indexOf("function renderPatternNow"));
  assert.match(exportSnapshotSource, /state\.isPreviewDirty && state\.previewPattern\.length/);
  assert.doesNotMatch(exportSnapshotSource, /displayPattern\(\)/);
  const exportCellSource = script.slice(script.indexOf("function drawReadableCells"), script.indexOf("function drawReadableLegend"));
  assert.match(exportCellSource, /const item = pattern\[y \* stride \+ x\]/);
  assert.doesNotMatch(exportCellSource, /state\.pattern\[y \* stride \+ x\]/);
  const pdfSource = script.slice(script.indexOf("function buildVectorPdf"), script.indexOf("function pdfColor"));
  assert.match(pdfSource, /const item = pattern\[y \* stride \+ x\]/);
  assert.doesNotMatch(pdfSource, /state\.pattern\[y \* stride \+ x\]/);
  assert.match(script, /state\.fitMode === "center"/);
  assert.match(script, /const codesVisibleBefore/);
  assert.doesNotMatch(script, /function openAutosaveDb\(/);
  assert.match(await workerResponse.text(), /function mapPaletteIndices\(/);
  const style = await styleResponse.text();
  assert.match(style, /\.canvas-wrap/);
  assert.match(style, /\.workbench-mode-header/);
  assert.match(style, /\.pending-preview-bar/);
  assert.match(style, /body\[data-workbench-mode="edit"\]/);
});

test("palette worker maps colors and preserves empty cells", async () => {
  const source = await readFile(new URL("../public/palette-worker.js", import.meta.url), "utf8");
  const messages = [];
  let messageHandler = null;
  const self = {
    addEventListener(type, handler) {
      if (type === "message") messageHandler = handler;
    },
    postMessage(message) {
      messages.push(message);
    },
  };
  const context = { self, Math, Number, Boolean, Array, Int16Array, Error, Map };
  vm.runInNewContext(source, context);
  assert.equal(typeof messageHandler, "function");
  assert.equal(typeof context.deltaE2000, "function");
  const referenceDeltaE = context.deltaE2000(
    { l: 50, a: 2.6772, b: -79.7751 },
    { l: 50, a: 0, b: -82.7485 },
  );
  assert.ok(Math.abs(referenceDeltaE - 2.0425) < 0.0002);

  messageHandler({
    data: {
      type: "mapPalette",
      requestId: 7,
      size: 2,
      dither: false,
      pixels: [
        { r: 8, g: 8, b: 8, empty: false },
        { r: 250, g: 250, b: 250, empty: false },
        { r: 32, g: 30, b: 28, empty: false },
        { r: 255, g: 255, b: 255, empty: true },
      ],
      palette: [
        { rgb: { r: 0, g: 0, b: 0 } },
        { rgb: { r: 255, g: 255, b: 255 } },
      ],
    },
  });

  assert.equal(messages[0].type, "mapped");
  assert.equal(messages[0].requestId, 7);
  assert.deepEqual(Array.from(messages[0].indices), [0, 1, 0, -1]);
});

test("base-image background cleanup only removes edge-connected light pixels", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const helperSource = source.slice(
    source.indexOf("function buildConnectedBaseBackgroundMask"),
    source.indexOf("function cleanupAntiAliasPixels"),
  );
  const context = { Uint8Array, Math };
  vm.runInNewContext(helperSource, context);

  const width = 5;
  const height = 5;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const setPixel = (x, y, r, g, b, a = 255) => {
    const offset = (y * width + x) * 4;
    pixels[offset] = r;
    pixels[offset + 1] = g;
    pixels[offset + 2] = b;
    pixels[offset + 3] = a;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) setPixel(x, y, 248, 246, 240);
  }
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) {
      if (x === 2 && y === 2) setPixel(x, y, 252, 252, 249);
      else setPixel(x, y, 185, 52, 78);
    }
  }
  setPixel(0, 2, 232, 229, 221);

  const mask = context.buildConnectedBaseBackgroundMask(
    pixels,
    width,
    height,
    { r: 248, g: 246, b: 240 },
  );
  assert.equal(mask[0], 1);
  assert.equal(mask[2 * width], 1);
  assert.equal(mask[2 * width + 2], 0);
  assert.equal(mask[1 * width + 1], 0);
});

test("edge background detection does not erase a dark subject touching one edge", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const detectionSource = source.slice(
    source.indexOf("function detectEdgeBackgroundColors"),
    source.indexOf("function averageSampleCell"),
  );
  const context = { Map, Set, Math };
  vm.runInNewContext(detectionSource, context);
  const color = (code, rgb, lightness) => ({ code, hex: code, rgb, lab: { l: lightness } });
  const skin = color("skin", { r: 220, g: 160, b: 135 }, 72);
  const black = color("black", { r: 15, g: 15, b: 15 }, 5);
  const white = color("white", { r: 250, g: 250, b: 250 }, 98);
  const size = 8;
  const oneEdgeSubject = Array(size * size).fill(skin);
  for (let x = 1; x < size - 1; x += 1) oneEdgeSubject[x] = black;
  for (let x = 0; x < size; x += 1) oneEdgeSubject[(size - 1) * size + x] = white;
  for (let y = 0; y < size; y += 1) oneEdgeSubject[y * size] = white;
  const detected = context.detectEdgeBackgroundColors(oneEdgeSubject, size).map((item) => item.code);
  assert.ok(detected.includes("white"));
  assert.ok(!detected.includes("black"));

  const darkBackground = Array(size * size).fill(black);
  assert.ok(context.detectEdgeBackgroundColors(darkBackground, size).some((item) => item.code === "black"));
});
