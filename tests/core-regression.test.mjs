import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const appSourceUrl = new URL("../public/app.js", import.meta.url);
const historyUtilsSourceUrl = new URL("../public/history-utils.js", import.meta.url);

async function appSource() {
  return readFile(appSourceUrl, "utf8");
}

async function historyUtilsContext() {
  const source = await readFile(historyUtilsSourceUrl, "utf8");
  const window = {};
  const context = {
    window,
    Set,
    Map,
    Array,
    ArrayBuffer,
    Number,
    Object,
    Uint8Array,
    Uint16Array,
  };
  vm.runInNewContext(source, context);
  return window.XiaomaiHistoryUtils;
}

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing source marker: ${startMarker}`);
  assert.ok(end > start, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("history snapshots compare grid content and editor state", async () => {
  const historyUtils = await historyUtilsContext();

  const baseline = {
    size: 64,
    width: 64,
    height: 64,
    codes: ["H7", "F1", "__EMPTY__"],
    manualEditedCells: [1, 7],
    lockedColorCodes: ["B12", "H7"],
    allowedColorCodes: ["H7", "F1"],
    disabledColorCodes: [],
    selectedColorCode: "H7",
    projectPaletteCodes: ["H7", "F1", "B12"],
  };
  const reorderedSets = {
    ...baseline,
    manualEditedCells: [7, 1],
    lockedColorCodes: ["H7", "B12"],
  };

  assert.equal(historyUtils.historySnapshotsEqual(baseline, reorderedSets), true);
  assert.equal(
    historyUtils.historySnapshotsEqual(baseline, {
      ...baseline,
      codes: ["H7", "B12", "__EMPTY__"],
    }),
    false,
  );
  assert.equal(
    historyUtils.historySnapshotsEqual(baseline, {
      ...baseline,
      selectedColorCode: "B12",
    }),
    false,
  );

  const { codes: baselineCodes, ...historyMeta } = baseline;
  const packedPattern = baselineCodes.map((code) => ({
    code,
    empty: code === "__EMPTY__",
  }));
  const packedBaseline = {
    ...historyMeta,
    ...historyUtils.createHistoryPatternPayload(packedPattern),
  };
  const packedCopy = {
    ...historyMeta,
    ...historyUtils.createHistoryPatternPayload(packedPattern),
  };
  assert.equal(historyUtils.historySnapshotsEqual(packedBaseline, packedCopy), true);
  packedCopy.codeIndices[1] = packedCopy.codeIndices[0];
  assert.equal(historyUtils.historySnapshotsEqual(packedBaseline, packedCopy), false);
});

test("history pattern payload round-trips exactly with compact indices", async () => {
  const historyUtils = await historyUtilsContext();

  const pattern = Array.from({ length: 64 * 64 }, (_, index) => {
    if (index % 11 === 0) return { empty: true };
    return { code: ["H7", "F1", "B12", "A6"][index % 4], empty: false };
  });
  const payload = historyUtils.createHistoryPatternPayload(pattern);
  const restoredCodes = historyUtils.historySnapshotCodes(payload);
  const expectedCodes = pattern.map((item) => (item.empty ? "__EMPTY__" : item.code));

  assert.deepEqual(Array.from(restoredCodes), expectedCodes);
  assert.equal(payload.codeIndices instanceof Uint8Array, true);
  assert.equal(payload.codeIndices.byteLength, pattern.length);
  const estimatedLegacyReferenceBytes = pattern.length * 8;
  assert.ok(payload.codeIndices.byteLength <= estimatedLegacyReferenceBytes * 0.25);
});

test("history payload supports more than 256 unique color identifiers", async () => {
  const historyUtils = await historyUtilsContext();

  const pattern = Array.from({ length: 300 }, (_, index) => ({ code: `C${index}`, empty: false }));
  const payload = historyUtils.createHistoryPatternPayload(pattern);

  assert.equal(payload.codeIndices instanceof Uint16Array, true);
  assert.equal(payload.codebook.length, 300);
  assert.deepEqual(Array.from(historyUtils.historySnapshotCodes(payload)), pattern.map((item) => item.code));
});

test("exports the visible preview without mutating the saved edit grid", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function currentExportSnapshot", "function renderPatternNow");
  const editGrid = [{ code: "H7" }, { code: "F1" }];
  const previewGrid = [{ code: "B12" }, { code: "B12" }];
  const state = {
    isPreviewDirty: true,
    previewPattern: previewGrid,
    pattern: editGrid,
  };
  const buildCounts = (pattern) => {
    const counts = new Map();
    for (const item of pattern) {
      const current = counts.get(item.code) || { ...item, count: 0 };
      current.count += 1;
      counts.set(item.code, current);
    }
    return counts;
  };
  const context = { state, buildCounts, Map, Array };
  vm.runInNewContext(helperSource, context);

  const previewSnapshot = context.currentExportSnapshot();
  assert.deepEqual(
    Array.from(previewSnapshot.pattern, (item) => item.code),
    ["B12", "B12"],
  );
  assert.notEqual(previewSnapshot.pattern, previewGrid);
  assert.deepEqual(
    Array.from(editGrid, (item) => item.code),
    ["H7", "F1"],
  );

  state.isPreviewDirty = false;
  const editSnapshot = context.currentExportSnapshot();
  assert.deepEqual(
    Array.from(editSnapshot.pattern, (item) => item.code),
    ["H7", "F1"],
  );
});

test("palette rows keep active, locked, used, and allowed priority", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function paletteRowRank", "function currentPaletteRows");
  const context = {};
  vm.runInNewContext(helperSource, context);

  assert.equal(context.paletteRowRank({ isActive: true }), 0);
  assert.equal(context.paletteRowRank({ isLocked: true }), 1);
  assert.equal(context.paletteRowRank({ isUsed: true }), 2);
  assert.equal(context.paletteRowRank({ isAllowed: true }), 3);
  assert.equal(context.paletteRowRank({ isSearchResult: true }), 4);
  assert.equal(context.paletteRowRank({}), 5);
});

test("live color limit preview remains wired to input and confirmation", async () => {
  const source = await appSource();
  assert.match(source, /elements\.colorLimit\.addEventListener\("input", handleColorLimitChange\)/);
  assert.match(source, /elements\.colorLimit\.addEventListener\("change", flushColorLimitPreview\)/);
  assert.match(
    source,
    /function handleColorLimitChange\(\) \{\s*setColorLimit\(Number\(elements\.colorLimit\.value\), false\);\s*scheduleColorLimitPreview\(\);/,
  );
  assert.match(source, /function scheduleColorLimitPreview\(\)[\s\S]*?}, 140\);/);
});

test("raw color matching view takes priority over a pending final preview", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function displayPattern", "function displayQualityMetrics");
  const rawMappedGrid = [{ code: "RAW" }];
  const previewPattern = [{ code: "PREVIEW" }];
  const confirmedPattern = [{ code: "FINAL" }];
  const state = {
    diagnosticViewMode: "raw",
    rawMappedGrid,
    isPreviewDirty: true,
    previewPattern,
    previewCounts: new Map([["PREVIEW", { code: "PREVIEW", count: 1 }]]),
    pattern: confirmedPattern,
    counts: new Map([["FINAL", { code: "FINAL", count: 1 }]]),
  };
  const buildCounts = (pattern) => new Map([[pattern[0].code, { ...pattern[0], count: 1 }]]);
  const context = { state, buildCounts, Map };
  vm.runInNewContext(helperSource, context);

  assert.equal(context.displayPattern(), rawMappedGrid);
  assert.deepEqual(Array.from(context.displayCounts().keys()), ["RAW"]);

  state.diagnosticViewMode = "final";
  assert.equal(context.displayPattern(), previewPattern);
  assert.deepEqual(Array.from(context.displayCounts().keys()), ["PREVIEW"]);
});
