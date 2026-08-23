/* 小麦拼豆 — 07-boot.js
 * 重置与启动
 */
function resetApp() {
  state.autosaveSessionVersion += 1;
  invalidateImageProcessingState();
  state.autosaveQueued = false;
  cropState.image = null;
  cropState.file = null;
  cropState.dragging = false;
  cropState.pointerId = null;
  if (elements.cropModal) elements.cropModal.hidden = true;
  state.image = null;
  state.sourceImageState = null;
  state.fileName = "";
  Object.assign(state, DEFAULT_GENERATION_SETTINGS);
  state.localPreprocessSettings = { ...DEFAULT_LOCAL_PREPROCESS_SETTINGS };
  state.pattern = [];
  clearPreviewState();
  state.backgroundMask = null;
  state.hasConfirmedGrid = false;
  state.editGridVersion = 0;
  state.previewGridVersion = 0;
  state.manualEditCount = 0;
  state.manualEditedCells = new Set();
  state.protectedCells = new Set();
  state.colorReviewItems = [];
  state.colorReviewGridVersion = -1;
  state.projectDirty = false;
  state.projectSavedAt = null;
  state.projectCreatedAt = null;
  state.libraryProjectId = null;
  state.patternSize = state.gridSize;
  state.counts = new Map();
  state.projectPalette = [];
  state.recentColorCodes = [];
  state.selectedCell = null;
  state.symmetryMode = "none";
  state.referenceImage = null;
  state.referenceImageUrl = "";
  state.referenceName = "";
  state.referenceVisible = false;
  state.referenceAbove = false;
  state.referenceOpacity = 0.35;
  state.referenceLocked = false;
  state.traceReference = {
    ...state.traceReference,
    enabled: false,
    visible: false,
    opacity: 0,
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
  elements.referenceVisibleToggle.checked = false;
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
  syncControlsFromState();
  updateProtectionUi();
  updateBackgroundHint();
  updateProjectSaveStatus("未保存");
  renderPattern();
  renderStats();
  clearAutosaveProject().catch((error) => console.warn("清理自动恢复点失败", error));
  renderProjectLibrary();
}

function init() {
  setupMobileLayout();
  organizeWorkbenchSidebar();
  elevateToolboxLayer();
  setupWorkbenchLayout();
  setupWorkbenchModes();
  moveQuickTogglesToToolbar();
  setupEvents();
  syncControlsFromState();
  updateSelectedColorUi();
  updateHistoryButtons();
  updateProtectionUi();
  updatePreviewButtons();
  updateGridLockUi();
  updateToolboxLockUi();
  updateReferenceMenuState();
  syncTraceReferenceControls();
  syncDiagnosticControls();
  renderConstraintPalette();
  setZoom(1);
  if (isMobileLayout()) window.setTimeout(() => fitCanvasToScreen(), 80);
  renderPattern();
  renderStats();
  updateProjectSaveStatus("未保存");
  renderProjectLibrary();
  window.clearTimeout(autosaveRecoveryTimer);
  autosaveRecoveryTimer = window.setTimeout(() => {
    autosaveRecoveryTimer = null;
    checkAutosaveRecovery();
  }, 350);
  if (window.lucide) {
    window.lucide.createIcons();
  } else {
    window.addEventListener("load", () => window.lucide?.createIcons());
  }
}

if (!window.__xiaomaiPindouBooted) {
  window.__xiaomaiPindouBooted = true;
  init();
}
