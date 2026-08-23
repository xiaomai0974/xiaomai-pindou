/* 小麦拼豆 — 03-project.js
 * 项目保存、图纸库与自动恢复
 */
function deserializeGrid(codes, expectedLength = 0) {
  return deserializeProjectGrid(codes, {
    expectedLength,
    emptyCell: EMPTY_CELL,
    resolveColor: paletteColorByCode,
    fallbackColor: fallbackPaletteColor(),
  });
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
  const storedSourceImageData =
    state.sourceImageState?.croppedImageData || state.sourceImageState?.originalImageData || "";
  const sourceImageData = storedSourceImageData || (state.image ? imageToDataUrl(state.image, 2200) : "");
  if (sourceImageData && state.sourceImageState && !storedSourceImageData) {
    state.sourceImageState.croppedImageData = sourceImageData;
  }
  const croppedImageData = state.sourceImageState?.croppedImageData || sourceImageData;
  const storedOriginalImageData = state.sourceImageState?.originalImageData || "";
  const originalImageData = storedOriginalImageData === croppedImageData ? "" : storedOriginalImageData;
  const referenceUsesSourceImage = Boolean(state.referenceImage && state.referenceImage === state.image);
  const referenceImageData = referenceUsesSourceImage
    ? ""
    : state.referenceImageUrl || (state.referenceImage ? imageToDataUrl(state.referenceImage, 2200) : "");
  if (referenceImageData && !state.referenceImageUrl) state.referenceImageUrl = referenceImageData;
  const usedColors = [...state.counts.values()].map((item) => ({
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
      originalImageData,
      croppedImageData,
      useCroppedImage: Boolean(sourceImageData),
    },
    gridState: {
      editGrid: serializeGrid(state.pattern),
      previewGrid: serializeGrid(state.previewPattern),
      backgroundMask: maskToArray(state.backgroundMask),
      previewBackgroundMask: maskToArray(state.previewBackgroundMask),
      isPreviewDirty: state.isPreviewDirty,
      previewKind: state.previewKind,
      previewChangedIndexes: [...state.previewChangedIndexes],
      manualEditedCells: [...state.manualEditedCells],
      protectedCells: [...state.protectedCells],
    },
    paletteState: {
      paletteName: PALETTE_NAME,
      usedColors,
      allowedPalette: [...state.allowedColorCodes],
      lockedColors: [...state.lockedColorCodes],
      disabledColors: [...state.disabledColorCodes],
      activePaintColor: state.selectedColor?.code || "",
      recentColors: [...state.recentColorCodes],
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
      usesSourceImage: referenceUsesSourceImage,
      name: state.referenceName,
      visible: state.referenceVisible,
      above: state.referenceAbove,
      opacity: state.referenceOpacity,
      locked: state.referenceLocked,
      panel: serializableReferencePanel(),
    },
    canvasReferenceLayerState: {
      imageData: "",
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
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
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
    const savedRevision = state.projectRevision;
    const projectData = buildProjectData();
    await saveLibraryProject(projectData);
    await writeAutosaveProject(projectData, { dirty: false });
    await requestPersistentStorage();
    downloadProjectData(projectData);
    markProjectSaved("已下载并保存到图纸库", savedRevision);
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
    state.autosaveSessionVersion += 1;
    invalidateImageProcessingState();
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
    state.backgroundMask = arrayToMask(gridState.backgroundMask, state.pattern.length);
    state.previewBackgroundMask = arrayToMask(gridState.previewBackgroundMask, state.previewPattern.length);
    state.isPreviewDirty = Boolean(gridState.isPreviewDirty && state.previewPattern.length);
    state.previewKind = gridState.previewKind === "selectionOptimize" ? "selectionOptimize" : "conversion";
    state.previewChangedIndexes = (Array.isArray(gridState.previewChangedIndexes) ? gridState.previewChangedIndexes : [])
      .filter((index) => Number.isInteger(index) && index >= 0 && index < expectedGridLength);
    state.manualEditedCells = new Set(
      (Array.isArray(gridState.manualEditedCells) ? gridState.manualEditedCells : []).filter(
        (index) => Number.isInteger(index) && index >= 0 && index < expectedGridLength,
      ),
    );
    state.protectedCells = new Set(
      (Array.isArray(gridState.protectedCells) ? gridState.protectedCells : []).filter(
        (index) => Number.isInteger(index) && index >= 0 && index < expectedGridLength,
      ),
    );
    state.colorReviewItems = [];
    state.colorReviewGridVersion = -1;
    state.manualEditCount = state.manualEditedCells.size;

    state.colorLimit = clampColorLimit(paletteState.maxColors || state.colorLimit);
    state.colorMode = paletteState.colorConstraintMode === "fixedPalette" ? "fixedPalette" : "max";
    state.allowedColorCodes = new Set(paletteState.allowedPalette || []);
    state.lockedColorCodes = new Set(paletteState.lockedColors || []);
    state.disabledColorCodes = new Set(paletteState.disabledColors || []);
    state.lockedColorCodes.forEach((code) => state.allowedColorCodes.add(code));
    state.selectedColor = paletteColorByCode(paletteState.activePaintColor) || state.selectedColor || fallbackPaletteColor();
    state.recentColorCodes = Array.isArray(paletteState.recentColors)
      ? paletteState.recentColors.filter((code) => paletteColorByCode(code)).slice(0, 8)
      : [];
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
    state.minRegionSizeBeforeAnime = null;
    state.animeAdjustedMinRegionSize = null;
    state.dither = Boolean(settings.ditherEnabled);
    state.removeTransparent = settings.removeTransparent !== false;
    state.fitMode = settings.fitMode || "subject";
    if (state.fitMode === "contain") state.fitMode = "subject";
    // The simplified UI uses one automatic conversion flow and the standard
    // pattern algorithm. Saved edit grids still load unchanged.
    state.patternMode = "illustration";
    state.processingProfile = settings.processingProfile || recommendedProcessingProfile(state.gridSize);
    state.minRegionSize = Number(settings.minRegionSize || state.minRegionSize || 4);
    if (state.processingProfile === "photoColor" && state.minRegionSize > 3) state.minRegionSize = 2;
    state.accurateMatch = Boolean(settings.accurateMatch);
    state.showCellCodes = Number(display.codeVisibilityVersion || 0) >= 2 ? display.showColorCode !== false : true;
    state.showCoordinates = display.showCoordinates !== false;
    state.guideEvery = Number(display.guideEvery || (display.showFiveGridLines === false ? 10 : 5));
    state.showGrid = display.showGrid !== false;
    state.viewMode = display.viewMode || "pixel";
    state.editorView = display.editorView || "grid";
    state.zoom = Number(display.zoom || 1);
    state.exportWatermarkEnabled = exportSettings.watermarkEnabled !== false;
    elements.exportWatermarkToggle.checked = state.exportWatermarkEnabled;

    const useSourceAsReference = Boolean(reference.usesSourceImage || (!referenceData && state.image));
    state.referenceImage = useSourceAsReference ? state.image : await loadImageFromDataUrl(referenceData);
    state.referenceImageUrl = useSourceAsReference ? "" : referenceData;
    state.referenceName = reference.name || (state.referenceImage ? state.fileName : "");
    state.referenceVisible = Boolean(state.referenceImage && (useSourceAsReference || reference.visible !== false));
    state.referenceAbove = Boolean(reference.above);
    state.referenceOpacity = Number(reference.opacity ?? trace.opacity ?? 0.35);
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
      enabled: Boolean(state.referenceImage && (useSourceAsReference || trace.enabled !== false)),
      visible: Boolean(state.referenceImage && (useSourceAsReference || trace.visible !== false)),
      opacity: Number(trace.opacity ?? reference.opacity ?? 0.35),
      zMode: "aboveGrid",
      scale: Number(trace.scale || 1),
      locked: trace.locked !== false,
      snapToGrid: false,
      adjustMode: false,
    };

    state.appMode = "auto";
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
    updateProtectionUi();
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
  state.projectRevision += 1;
  state.projectDirty = true;
  updateProjectSaveStatus(status);
  scheduleProjectAutoSave();
}

function markProjectSaved(status = "已保存", savedRevision = state.projectRevision) {
  state.lastAutosavedRevision = savedRevision;
  state.projectSavedAt = new Date().toISOString();
  if (state.projectRevision === savedRevision) {
    state.projectDirty = false;
    updateProjectSaveStatus(status);
    return;
  }
  state.projectDirty = true;
  updateProjectSaveStatus(`${status} / 仍有新修改`);
  scheduleProjectAutoSave(250);
}

function scheduleProjectAutoSave(delay = 2000) {
  if (state.projectRestoring) return;
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(() => {
    state.autosaveTimer = null;
    autoSaveProject();
  }, delay);
}

async function autoSaveProject() {
  if (state.projectRestoring) return;
  if (!hasMeaningfulProject()) return;
  if (state.autosaveInFlight) {
    state.autosaveQueued = true;
    return;
  }
  if (state.lastAutosavedRevision === state.projectRevision) return;
  const revision = state.projectRevision;
  const sessionVersion = state.autosaveSessionVersion || 0;
  let saved = false;
  state.autosaveInFlight = true;
  state.autosaveQueued = false;
  try {
    updateProjectSaveStatus("自动保存中");
    const projectData = buildProjectData();
    await writeAutosaveProject(projectData, { dirty: state.projectDirty });
    if ((state.autosaveSessionVersion || 0) !== sessionVersion) return;
    state.lastAutosavedRevision = revision;
    saved = true;
    updateProjectSaveStatus(state.projectDirty ? "自动保存成功 / 未保存" : "已保存");
    window.clearTimeout(state.autosaveStatusTimer);
    state.autosaveStatusTimer = window.setTimeout(() => {
      updateProjectSaveStatus(state.projectDirty ? "未保存" : "已保存");
    }, 1800);
  } catch (error) {
    console.error("自动保存失败", error);
    updateProjectSaveStatus("自动保存失败");
  } finally {
    state.autosaveInFlight = false;
    if ((state.autosaveSessionVersion || 0) !== sessionVersion) {
      if (state.autosaveQueued || state.projectDirty) {
        state.autosaveQueued = false;
        scheduleProjectAutoSave(250);
      }
      return;
    }
    if (state.autosaveQueued || state.projectRevision !== revision) {
      state.autosaveQueued = false;
      scheduleProjectAutoSave(saved ? 250 : 2000);
    }
  }
}

async function writeAutosaveProject(data, options = {}) {
  await projectStore.writeAutosave({
    schemaVersion: 2,
    dirty: options.dirty ?? state.projectDirty,
    projectId: state.libraryProjectId,
    updatedAt: data.updatedAt || new Date().toISOString(),
    payload: data,
  });
}

async function readAutosaveProject() {
  const raw = await projectStore.readAutosave();
  if (!raw) return null;
  if (raw.payload) return raw;
  return {
    schemaVersion: 1,
    dirty: true,
    projectId: raw.libraryState?.id || null,
    updatedAt: raw.updatedAt,
    payload: raw,
  };
}

async function clearAutosaveProject() {
  await projectStore.clearAutosave();
}

function createLibraryProjectId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pattern-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function projectDataHasContent(projectData) {
  return Boolean(
    projectData?.gridState?.editGrid?.length ||
      projectData?.sourceImageState?.croppedImageData ||
      projectData?.sourceImageState?.originalImageData,
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
  const thumbnail = canvas.toDataURL("image/webp", 0.82);
  releaseCanvasMemory(canvas);
  return thumbnail;
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
  try {
    await projectStore.saveLibraryProject(meta, { id, payload });
    return id;
  } catch (error) {
    state.libraryProjectId = previousId;
    throw error;
  }
}

async function listLibraryProjectMeta() {
  return projectStore.listLibraryProjectMeta();
}

async function readLibraryProject(id) {
  return projectStore.readLibraryProject(id);
}

async function removeLibraryProject(id) {
  await projectStore.removeLibraryProject(id);
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
    const savedRevision = state.projectRevision;
    const projectData = buildProjectData();
    await saveLibraryProject(projectData);
    await writeAutosaveProject(projectData, { dirty: false });
    await requestPersistentStorage();
    markProjectSaved("已保存到图纸库", savedRevision);
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

