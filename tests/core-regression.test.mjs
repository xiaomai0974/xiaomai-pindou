import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const appSourceUrl = new URL("../public/app.js", import.meta.url);
const colorUtilsSourceUrl = new URL("../public/color-utils.js", import.meta.url);
const gridUtilsSourceUrl = new URL("../public/grid-utils.js", import.meta.url);
const historyUtilsSourceUrl = new URL("../public/history-utils.js", import.meta.url);
const imageUtilsSourceUrl = new URL("../public/image-utils.js", import.meta.url);
const pdfUtilsSourceUrl = new URL("../public/pdf-utils.js", import.meta.url);
const projectCodecSourceUrl = new URL("../public/project-codec.js", import.meta.url);
const projectStoreSourceUrl = new URL("../public/project-store.js", import.meta.url);
const qualityUtilsSourceUrl = new URL("../public/quality-utils.js", import.meta.url);
const samplingUtilsSourceUrl = new URL("../public/sampling-utils.js", import.meta.url);

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

async function browserUtilityContext(sourceUrl, exportName, globals = {}) {
  const source = await readFile(sourceUrl, "utf8");
  const window = {};
  const context = {
    window,
    Array,
    Math,
    Number,
    Object,
    Uint8Array,
    parseInt,
    ...globals,
  };
  vm.runInNewContext(source, context);
  return window[exportName];
}

function createMemoryIndexedDb() {
  const databases = new Map();
  return {
    open(name) {
      const request = {};
      queueMicrotask(() => {
        let database = databases.get(name);
        const isNew = !database;
        if (!database) {
          const stores = new Map();
          const keyPaths = new Map();
          const storeNames = {
            contains(storeName) {
              return stores.has(storeName);
            },
          };
          const storeFacade = (storeName, transaction = null) => ({
            indexNames: { contains: () => false },
            createIndex() {},
            put(value, explicitKey) {
              const key = explicitKey ?? value?.[keyPaths.get(storeName)];
              return transaction?.run(() => stores.get(storeName).set(key, value));
            },
            get(key) {
              return transaction.run(() => stores.get(storeName).get(key));
            },
            getAll() {
              return transaction.run(() => [...stores.get(storeName).values()]);
            },
            delete(key) {
              return transaction.run(() => stores.get(storeName).delete(key));
            },
          });
          database = {
            objectStoreNames: storeNames,
            createObjectStore(storeName, options = {}) {
              stores.set(storeName, new Map());
              keyPaths.set(storeName, options.keyPath);
              return storeFacade(storeName);
            },
            transaction(storeNamesInput) {
              const transaction = {
                pending: 0,
                completionScheduled: false,
                run(action) {
                  transaction.pending += 1;
                  const operation = {};
                  queueMicrotask(() => {
                    try {
                      operation.result = action();
                      operation.onsuccess?.();
                    } catch (error) {
                      operation.error = error;
                      operation.onerror?.();
                      transaction.error = error;
                      transaction.onerror?.();
                    } finally {
                      transaction.pending -= 1;
                      transaction.scheduleCompletion();
                    }
                  });
                  return operation;
                },
                scheduleCompletion() {
                  if (transaction.pending || transaction.completionScheduled) return;
                  transaction.completionScheduled = true;
                  setTimeout(() => transaction.oncomplete?.(), 0);
                },
                objectStore(storeName) {
                  return storeFacade(storeName, transaction);
                },
              };
              const names = Array.isArray(storeNamesInput) ? storeNamesInput : [storeNamesInput];
              for (const storeName of names) {
                if (!stores.has(storeName)) throw new Error(`Missing store: ${storeName}`);
              }
              return transaction;
            },
            close() {},
          };
          databases.set(name, database);
        }
        request.result = database;
        request.transaction = {
          objectStore(storeName) {
            return database.createObjectStore(storeName);
          },
        };
        if (isNew) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing source marker: ${startMarker}`);
  assert.ok(end > start, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("color utilities preserve LAB matching behavior after extraction", async () => {
  const colorUtils = await browserUtilityContext(colorUtilsSourceUrl, "XiaomaiColorUtils");
  assert.deepEqual({ ...colorUtils.hexToRgb("#ffffff") }, { r: 255, g: 255, b: 255 });
  assert.equal(colorUtils.contrastColor({ r: 250, g: 250, b: 250 }), "#111111");
  assert.equal(colorUtils.contrastColor({ r: 12, g: 12, b: 12 }), "#ffffff");
  const referenceDeltaE = colorUtils.deltaE2000(
    { l: 50, a: 2.6772, b: -79.7751 },
    { l: 50, a: 0, b: -82.7485 },
  );
  assert.ok(Math.abs(referenceDeltaE - 2.0425) < 0.0002);
});

test("grid utilities preserve counts, bounds, lines, and selections after extraction", async () => {
  const gridUtils = await browserUtilityContext(gridUtilsSourceUrl, "XiaomaiGridUtils", { Map });
  const red = { code: "A1", hex: "#f00", empty: false };
  const blue = { code: "B1", hex: "#00f", empty: false };
  const empty = { code: "__EMPTY__", empty: true };
  const before = [red, red, blue, empty];
  const after = [blue, red, empty, blue];
  const counts = gridUtils.buildCounts(before);

  gridUtils.applyCountChanges(counts, [
    { before: red, after: blue },
    { before: blue, after: empty },
    { before: empty, after: blue },
  ]);
  const expected = gridUtils.buildCounts(after);
  assert.deepEqual(
    [...counts.entries()].map(([code, item]) => [code, item.count]).sort(),
    [...expected.entries()].map(([code, item]) => [code, item.count]).sort(),
  );
  assert.equal(gridUtils.totalBeadCount(after), 3);
  assert.deepEqual(
    { ...gridUtils.calculateUsedBounds([empty, red, empty, empty], 2) },
    { minX: 1, minY: 0, maxX: 1, maxY: 0, width: 1, height: 1 },
  );
  assert.deepEqual(
    Array.from(gridUtils.interpolateCells({ x: 0, y: 0 }, { x: 2, y: 2 }), (cell) => ({ ...cell })),
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
  );
  assert.equal(
    gridUtils.pointInPolygon(1, 1, [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]),
    true,
  );
});

test("image utilities preserve outline and edge-connected background behavior", async () => {
  const imageUtils = await browserUtilityContext(imageUtilsSourceUrl, "XiaomaiImageUtils");
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
      setPixel(x, y, x === 2 && y === 2 ? 252 : 185, x === 2 && y === 2 ? 252 : 52, x === 2 && y === 2 ? 249 : 78);
    }
  }
  const mask = imageUtils.buildConnectedBaseBackgroundMask(
    pixels,
    width,
    height,
    { r: 248, g: 246, b: 240 },
  );
  assert.equal(mask[0], 1);
  assert.equal(mask[2 * width + 2], 0);
  assert.equal(mask[1 * width + 1], 0);
  assert.deepEqual(Array.from(imageUtils.preprocessFourNeighbors(2, 2, width, height)), [11, 13, 7, 17]);
});

test("sampling utilities preserve average, dominant, and transparent-cell behavior", async () => {
  const samplingUtils = await browserUtilityContext(samplingUtilsSourceUrl, "XiaomaiSamplingUtils", { Map });
  const solidRed = new Uint8ClampedArray([
    240, 20, 30, 255,
    240, 20, 30, 255,
    240, 20, 30, 255,
    240, 20, 30, 255,
  ]);
  const average = samplingUtils.averageSampleCell(solidRed, 2, 0, 0, 2, {
    removeTransparent: false,
    outlineStrength: 0,
  });
  assert.deepEqual(
    { r: average.r, g: average.g, b: average.b, background: average.background },
    { r: 240, g: 20, b: 30, background: false },
  );

  const dominant = samplingUtils.dominantSampleCell(solidRed, 2, 0, 0, 2, {
    patternMode: "illustration",
    removeTransparent: false,
    outlineStrength: 0,
    gridSize: 64,
    pixelBackground: "empty",
    emptyCell: { code: "", empty: true },
    whiteColor: { r: 247, g: 242, b: 232 },
  });
  assert.ok(dominant.r > 230 && dominant.g < 30 && dominant.b < 40);

  const transparent = new Uint8ClampedArray(16);
  const empty = samplingUtils.dominantSampleCell(transparent, 2, 0, 0, 2, {
    patternMode: "illustration",
    removeTransparent: true,
    outlineStrength: 0,
    gridSize: 64,
    usesEmptyBackground: true,
    pixelBackground: "empty",
    emptyCell: { code: "", empty: true },
    whiteColor: { r: 247, g: 242, b: 232 },
  });
  assert.equal(empty.empty, true);
  assert.equal(empty.background, true);
});

test("quality utilities preserve color-family and structural metrics", async () => {
  const colorUtils = await browserUtilityContext(colorUtilsSourceUrl, "XiaomaiColorUtils");
  const gridUtils = await browserUtilityContext(gridUtilsSourceUrl, "XiaomaiGridUtils", { Map });
  const source = await readFile(qualityUtilsSourceUrl, "utf8");
  const window = { XiaomaiColorUtils: colorUtils, XiaomaiGridUtils: gridUtils };
  vm.runInNewContext(source, { window, Math, Set, Uint8Array });
  const qualityUtils = window.XiaomaiQualityUtils;
  const color = (code, rgb) => ({ code, rgb, lab: colorUtils.rgbToLab(rgb), empty: false });
  const black = color("H7", { r: 10, g: 10, b: 10 });
  const white = color("F1", { r: 247, g: 242, b: 232 });
  const pattern = [black, white, white, white];

  assert.equal(qualityUtils.colorFamily(black), "black-gray-white");
  assert.equal(qualityUtils.countIsolatedPixels(pattern, 2), 1);
  assert.equal(qualityUtils.countEdgeBreaks(pattern, 2), 1);
  assert.equal(qualityUtils.calculateColorJumpScore(pattern, 2), 50);
  const outline = qualityUtils.calculateOutlineConnectivity(pattern, 2, new Uint8Array([1, 0, 0, 0]));
  assert.equal(outline.outlineNoiseCount, 1);
});

test("PDF utilities preserve text encoding and create a valid document", async () => {
  const pdfUtils = await browserUtilityContext(pdfUtilsSourceUrl, "XiaomaiPdfUtils");
  assert.equal(pdfUtils.roundPdf(0.5), "0.5");
  assert.equal(pdfUtils.pdfColor({ r: 255, g: 0, b: 128 }), "1 0 0.502");
  assert.equal(pdfUtils.pdfTextToken("H7"), "(H7)");
  assert.equal(pdfUtils.pdfTextToken("小麦"), "<5C0F9EA6>");
  const bytes = pdfUtils.createPdf(100, 80, "BT /F1 12 Tf (H7) Tj ET");
  const header = String.fromCharCode(...Array.from(bytes.slice(0, 8)));
  assert.equal(header, "%PDF-1.4");
  assert.ok(bytes.length > 500);
});

test("project codec preserves grid codes and binary masks after extraction", async () => {
  const codec = await browserUtilityContext(projectCodecSourceUrl, "XiaomaiProjectCodec");
  const emptyCell = Object.freeze({ code: "__EMPTY__", empty: true });
  const palette = new Map([
    ["H7", { code: "H7", empty: false }],
    ["F1", { code: "F1", empty: false }],
  ]);
  const serialized = codec.serializeGrid([palette.get("H7"), emptyCell, palette.get("F1")]);
  assert.deepEqual(Array.from(serialized), ["H7", "__EMPTY__", "F1"]);

  const restored = codec.deserializeGrid(serialized, {
    expectedLength: 4,
    emptyCell,
    resolveColor: (code) => palette.get(code),
    fallbackColor: palette.get("F1"),
  });
  assert.deepEqual(
    Array.from(restored, (item) => item.code),
    ["H7", "__EMPTY__", "F1", "__EMPTY__"],
  );

  const mask = codec.arrayToMask([1, 0, 7, 0], 4);
  assert.deepEqual(Array.from(mask), [1, 0, 1, 0]);
  assert.deepEqual(Array.from(codec.maskToArray(mask)), [1, 0, 1, 0]);
});

test("project store persists autosaves and library projects after extraction", async () => {
  const projectStoreApi = await browserUtilityContext(projectStoreSourceUrl, "XiaomaiProjectStore");
  const store = projectStoreApi.createProjectStore({
    indexedDB: createMemoryIndexedDb(),
    dbName: "test-projects",
    dbVersion: 2,
    autosaveStoreName: "autosave",
    autosaveKey: "latest",
    libraryMetaStoreName: "libraryMeta",
    libraryDataStoreName: "libraryData",
  });
  const autosave = { schemaVersion: 2, payload: { fileName: "自动保存" } };
  await store.writeAutosave(autosave);
  assert.deepEqual({ ...(await store.readAutosave()) }, autosave);

  await store.saveLibraryProject(
    { id: "older", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "older", payload: { fileName: "旧图纸" } },
  );
  await store.saveLibraryProject(
    { id: "newer", updatedAt: "2026-02-01T00:00:00.000Z" },
    { id: "newer", payload: { fileName: "新图纸" } },
  );
  assert.deepEqual(
    Array.from(await store.listLibraryProjectMeta(), (item) => item.id),
    ["newer", "older"],
  );
  assert.equal((await store.readLibraryProject("newer")).fileName, "新图纸");
  await store.removeLibraryProject("newer");
  assert.equal(await store.readLibraryProject("newer"), null);
  await store.clearAutosave();
  assert.equal(await store.readAutosave(), null);
});

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

test("history stacks retain newest edits within entry and memory limits", async () => {
  const historyUtils = await historyUtilsContext();
  const makeSnapshot = (code, length = 64) => ({
    size: 64,
    width: 64,
    height: 64,
    ...historyUtils.createHistoryPatternPayload(Array.from({ length }, () => ({ code, empty: false }))),
    manualEditedCells: [],
    lockedColorCodes: [],
    allowedColorCodes: [],
    disabledColorCodes: [],
    projectPaletteCodes: [code],
  });

  const entryLimited = [makeSnapshot("A"), makeSnapshot("B"), makeSnapshot("C")];
  historyUtils.trimHistoryStack(entryLimited, { maxEntries: 2, maxBytes: 1024 * 1024 });
  assert.equal(entryLimited.length, 2);
  assert.deepEqual(historyUtils.historySnapshotCodes(entryLimited[0]), Array(64).fill("B"));
  assert.deepEqual(historyUtils.historySnapshotCodes(entryLimited[1]), Array(64).fill("C"));

  const largeA = makeSnapshot("A", 4096);
  const largeB = makeSnapshot("B", 4096);
  const newestOnly = [largeA, largeB];
  historyUtils.trimHistoryStack(newestOnly, {
    maxEntries: 10,
    maxBytes: historyUtils.estimateHistorySnapshotBytes(largeB) + 16,
  });
  assert.equal(newestOnly.length, 1);
  assert.deepEqual(historyUtils.historySnapshotCodes(newestOnly[0]), Array(4096).fill("B"));
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

test("autosave coalesces overlapping edits and skips unchanged revisions", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function scheduleProjectAutoSave", "async function writeAutosaveProject");
  const writes = [];
  let releaseFirstWrite;
  const state = {
    projectRestoring: false,
    autosaveTimer: null,
    autosaveStatusTimer: null,
    autosaveInFlight: false,
    autosaveQueued: false,
    projectRevision: 1,
    lastAutosavedRevision: -1,
    projectDirty: true,
  };
  const context = {
    state,
    window: {
      clearTimeout,
      setTimeout(callback) {
        queueMicrotask(callback);
        return 1;
      },
    },
    hasMeaningfulProject: () => true,
    updateProjectSaveStatus() {},
    buildProjectData: () => ({ revision: state.projectRevision }),
    async writeAutosaveProject(data) {
      writes.push(data.revision);
      if (writes.length === 1) {
        await new Promise((resolve) => {
          releaseFirstWrite = resolve;
        });
      }
    },
    console,
  };
  vm.runInNewContext(helperSource, context);

  const firstSave = context.autoSaveProject();
  await Promise.resolve();
  state.projectRevision = 2;
  await context.autoSaveProject();
  assert.equal(state.autosaveQueued, true);
  releaseFirstWrite();
  await firstSave;
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(writes, [1, 2]);
  assert.equal(state.lastAutosavedRevision, 2);
  await context.autoSaveProject();
  assert.deepEqual(writes, [1, 2]);
});

test("a completed save does not clear edits made while saving", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function markProjectSaved", "function scheduleProjectAutoSave");
  const statuses = [];
  const scheduledDelays = [];
  const state = {
    projectRevision: 4,
    projectDirty: true,
    lastAutosavedRevision: -1,
    projectSavedAt: null,
  };
  const context = {
    state,
    Date,
    updateProjectSaveStatus: (status) => statuses.push(status),
    scheduleProjectAutoSave: (delay) => scheduledDelays.push(delay),
  };
  vm.runInNewContext(helperSource, context);

  context.markProjectSaved("已保存", 3);
  assert.equal(state.projectDirty, true);
  assert.equal(state.lastAutosavedRevision, 3);
  assert.deepEqual(scheduledDelays, [250]);
  assert.match(statuses.at(-1), /仍有新修改/);

  context.markProjectSaved("已保存", 4);
  assert.equal(state.projectDirty, false);
  assert.equal(state.lastAutosavedRevision, 4);
  assert.equal(statuses.at(-1), "已保存");
});

test("autosave from an older project session cannot update the new session", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function scheduleProjectAutoSave", "async function writeAutosaveProject");
  let releaseWrite;
  const state = {
    projectRestoring: false,
    autosaveTimer: null,
    autosaveStatusTimer: null,
    autosaveInFlight: false,
    autosaveQueued: false,
    autosaveSessionVersion: 1,
    projectRevision: 1,
    lastAutosavedRevision: -1,
    projectDirty: false,
  };
  const context = {
    state,
    window: {
      clearTimeout,
      setTimeout,
    },
    hasMeaningfulProject: () => true,
    updateProjectSaveStatus() {},
    buildProjectData: () => ({ revision: state.projectRevision }),
    async writeAutosaveProject() {
      await new Promise((resolve) => {
        releaseWrite = resolve;
      });
    },
    console,
  };
  vm.runInNewContext(helperSource, context);

  const save = context.autoSaveProject();
  await Promise.resolve();
  state.autosaveSessionVersion = 2;
  releaseWrite();
  await save;

  assert.equal(state.lastAutosavedRevision, -1);
  assert.equal(state.autosaveInFlight, false);
});

test("bounded caches evict the least recently used entry", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function boundedCacheGet", "function schedulePalettePanelRender");
  const context = { Map };
  vm.runInNewContext(helperSource, context);
  const cache = new Map();

  context.boundedCacheSet(cache, "A", 1, 2);
  context.boundedCacheSet(cache, "B", 2, 2);
  assert.equal(context.boundedCacheGet(cache, "A"), 1);
  context.boundedCacheSet(cache, "C", 3, 2);

  assert.deepEqual([...cache.keys()], ["A", "C"]);
  assert.equal(context.boundedCacheGet(cache, "B"), undefined);
});

test("stale palette worker requests are aborted before a new preview", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(
    source,
    "function cancelPendingPaletteWorkerRequests",
    "function mapSamplesToPaletteNow",
  );
  let terminated = false;
  let clearedTimeout = null;
  let rejection = null;
  const pendingPaletteWorkerRequests = new Map([
    [1, { timeoutId: 7, reject: (error) => { rejection = error; } }],
  ]);
  const context = {
    pendingPaletteWorkerRequests,
    paletteWorker: { terminate() { terminated = true; } },
    window: { clearTimeout(timeoutId) { clearedTimeout = timeoutId; } },
    Error,
  };
  vm.runInNewContext(helperSource, context);
  context.cancelPendingPaletteWorkerRequests();

  assert.equal(terminated, true);
  assert.equal(clearedTimeout, 7);
  assert.equal(pendingPaletteWorkerRequests.size, 0);
  assert.equal(rejection?.name, "AbortError");
  assert.equal(context.paletteWorker, null);
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

test("single conversion canvas shows pending settings preview before the confirmed grid", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function displayPattern", "function displayQualityMetrics");
  const previewPattern = [{ code: "PREVIEW" }];
  const confirmedPattern = [{ code: "CONFIRMED" }];
  const state = {
    isPreviewDirty: true,
    previewPattern,
    previewCounts: new Map([["PREVIEW", { code: "PREVIEW", count: 1 }]]),
    pattern: confirmedPattern,
    counts: new Map([["CONFIRMED", { code: "CONFIRMED", count: 1 }]]),
  };
  const context = { state, Map };
  vm.runInNewContext(helperSource, context);

  assert.equal(context.displayPattern(), previewPattern);
  assert.deepEqual(Array.from(context.displayCounts().keys()), ["PREVIEW"]);

  state.isPreviewDirty = false;
  assert.equal(context.displayPattern(), confirmedPattern);
  assert.deepEqual(Array.from(context.displayCounts().keys()), ["CONFIRMED"]);
});

test("conversion settings use one preview flow without diagnostic view switching", async () => {
  const source = await appSource();
  const previewUpdater = sourceBetween(source, "async function requestPreviewUpdate", "function applyPreviewToEditGrid");

  assert.doesNotMatch(source, /setDiagnosticViewMode/);
  assert.doesNotMatch(source, /diagnosticViewMode/);
  assert.match(previewUpdater, /setPendingPreview\(result\.pattern/);
});

test("image upload and preview confirmation share one exact commit path", async () => {
  const source = await appSource();
  const generator = sourceBetween(source, "async function generatePattern()", "async function buildPatternResultFromImage");
  const applyPreview = sourceBetween(source, "function applyPreviewToEditGrid", "function confirmPendingPreview");

  assert.match(generator, /requestPreviewUpdate\(/);
  assert.doesNotMatch(generator, /state\.pattern\s*=/);
  assert.match(applyPreview, /state\.pattern = \[\.\.\.state\.previewPattern\]/);
  assert.doesNotMatch(applyPreview, /validateColorConstraints/);
});

test("conversion strategies do not overwrite user generation-detail switches", async () => {
  const source = await appSource();
  const profileSetter = sourceBetween(source, "function setProcessingProfile", "function syncProcessingProfileControls");
  const sizeDefaults = sourceBetween(source, "function applySizePresetDefaults", "function syncControlsFromState");
  const protectedSettings = [
    "dominantSampling",
    "mergeSimilarColors",
    "cleanSmallRegions",
    "animeMode",
    "lineBoost",
  ];

  for (const setting of protectedSettings) {
    assert.doesNotMatch(profileSetter, new RegExp(`state\\.${setting}\\s*=`));
    assert.doesNotMatch(sizeDefaults, new RegExp(`state\\.${setting}\\s*=`));
  }
  assert.doesNotMatch(profileSetter, /localPreprocessSettings\.[a-zA-Z]+\s*=/);
  assert.doesNotMatch(profileSetter, /setColorLimit\(/);
});

test("runtime diagnostics stay out of saved projects and duplicate grid state is removed", async () => {
  const source = await appSource();
  const serializer = sourceBetween(source, "function buildProjectData", "function downloadBlob");

  assert.doesNotMatch(source, /\bfinalGrid\b/);
  assert.doesNotMatch(source, /\bbaselineGrid\b/);
  assert.doesNotMatch(source, /\boptimizedGrid\b/);
  assert.doesNotMatch(source, /\bcompareMetrics\b/);
  assert.doesNotMatch(serializer, /rawMappedGrid\s*:/);
  assert.doesNotMatch(serializer, /finalGrid\s*:/);
  assert.match(serializer, /state\.sourceImageState\.croppedImageData = sourceImageData/);
  assert.match(serializer, /const originalImageData = storedOriginalImageData === croppedImageData \? "" : storedOriginalImageData/);
  assert.match(serializer, /const usedColors = \[\.\.\.state\.counts\.values\(\)\]/);
  assert.match(serializer, /canvasReferenceLayerState:\s*{\s*imageData: ""/);
});

test("photo-color strategy can use the full palette without changing the color-limit control", async () => {
  const source = await appSource();
  const targetLimit = sourceBetween(source, "function targetColorLimit", "function isColorLocked");

  assert.match(targetLimit, /state\.processingProfile === "photoColor"\) return palette\.length/);
});

test("restored projects stay on the simplified automatic standard-pattern flow", async () => {
  const source = await appSource();
  assert.match(source, /state\.patternMode = "illustration";/);
  assert.match(source, /state\.appMode = "auto";/);
  assert.doesNotMatch(source, /state\.patternMode = settings\.patternMode/);
  assert.doesNotMatch(source, /state\.appMode = draw\.appMode/);
});

test("raw diagnostics sample the original source instead of the optimized base image", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "async function buildRawDiagnosticReference", "function applyColorDiagnostics");

  assert.match(helperSource, /buildPixelSamples\(state\.image,\s*size\)/);
  assert.doesNotMatch(helperSource, /conversionSourceImage\(\)/);
  assert.doesNotMatch(helperSource, /optimizedBaseImage\(\)/);
});

test("light high-contrast structures are protected from connected background removal", async () => {
  const source = await appSource();
  const helperSource = sourceBetween(source, "function buildBackgroundProtectionMask", "function applyBackgroundModeToGrid");
  const light = { code: "F1", rgb: { r: 247, g: 242, b: 232 }, lab: { l: 94 } };
  const dark = { code: "H7", rgb: { r: 20, g: 20, b: 20 }, lab: { l: 8 } };
  const pattern = Array(9).fill(light);
  pattern[1] = dark;
  const context = {
    Uint8Array,
    colorDistance: (a, b) => Math.abs(a.lab.l - b.lab.l),
    getEightNeighbors: (x, y, size) => {
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size) neighbors.push(ny * size + nx);
        }
      }
      return neighbors;
    },
  };
  vm.runInNewContext(helperSource, context);

  const mask = context.buildBackgroundProtectionMask(pattern, 3);
  assert.equal(mask[4], 1);
});
