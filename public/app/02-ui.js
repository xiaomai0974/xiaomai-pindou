/* 小麦拼豆 — 02-ui.js
 * 工作台布局、事件绑定与控件同步
 */
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
  elements.colorLimit.addEventListener("change", flushColorLimitPreview);
  elements.colorLimitNumber?.addEventListener("input", handleColorLimitNumberInput);
  elements.colorLimitNumber?.addEventListener("change", commitColorLimitNumber);
  elements.colorLimitNumber?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitColorLimitNumber();
  });
  elements.applyCustomSizeButton.addEventListener("click", applyCustomSize);
  elements.applyUploadSizeButton?.addEventListener("click", applyUploadSize);
  elements.customSizeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyCustomSize();
  });
  elements.customHeightInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyCustomSize();
  });
  for (const input of [elements.uploadWidthInput, elements.uploadHeightInput].filter(Boolean)) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") applyUploadSize();
    });
  }
  elements.pixelModeOptions.forEach((button) => {
    button.addEventListener("click", () => setPatternMode(button.dataset.patternMode));
  });
  elements.processingProfileOptions.forEach((button) => {
    button.addEventListener("click", () => setProcessingProfile(button.dataset.processingProfile));
  });
  document.querySelectorAll(".color-preset").forEach((button) => {
    button.addEventListener("click", () => setColorLimit(button.dataset.colors === "all" ? palette.length : Number(button.dataset.colors)));
  });
  elements.appModeOptions.forEach((button) => {
    button.addEventListener("click", () => setAppMode(button.dataset.appMode));
  });
  elements.newBlankCanvasButton.addEventListener("click", createBlankCanvasFromUpload);
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
  elements.mirrorHorizontalButton.addEventListener("click", () => mirrorSelectionOrPattern("horizontal"));
  elements.mirrorVerticalButton.addEventListener("click", () => mirrorSelectionOrPattern("vertical"));
  elements.rotateSelectionLeftButton.addEventListener("click", () => rotateSelectedRegion("counterclockwise"));
  elements.rotateSelectionRightButton.addEventListener("click", () => rotateSelectedRegion("clockwise"));
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
    if (state.lineBoost && state.outlineMode === "off") {
      state.outlineMode = "light";
      elements.outlineModeSelect.value = state.outlineMode;
    }
    requestPreviewUpdate();
  });
  elements.accurateMatchToggle.addEventListener("change", () => {
    state.accurateMatch = elements.accurateMatchToggle.checked;
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
    const nextAnimeMode = elements.animeModeToggle.checked;
    if (nextAnimeMode && !state.animeMode) {
      state.minRegionSizeBeforeAnime = state.minRegionSize;
      const animeDefault = state.processingProfile === "photoColor" ? 2 : 6;
      const shouldAdjust = state.processingProfile === "photoColor"
        ? state.minRegionSize > 3
        : state.minRegionSize < animeDefault;
      if (shouldAdjust) {
        state.minRegionSize = animeDefault;
        state.animeAdjustedMinRegionSize = animeDefault;
      }
    } else if (!nextAnimeMode && state.animeMode) {
      if (
        state.animeAdjustedMinRegionSize !== null &&
        state.minRegionSize === state.animeAdjustedMinRegionSize &&
        state.minRegionSizeBeforeAnime !== null
      ) {
        state.minRegionSize = state.minRegionSizeBeforeAnime;
      }
      state.minRegionSizeBeforeAnime = null;
      state.animeAdjustedMinRegionSize = null;
    }
    state.animeMode = nextAnimeMode;
    elements.minRegionSize.value = state.minRegionSize;
    elements.minRegionLabel.textContent = `${state.minRegionSize} 颗`;
    requestPreviewUpdate();
  });
  elements.minRegionSize.addEventListener("input", () => {
    state.minRegionSize = Number(elements.minRegionSize.value);
    if (state.animeMode) state.animeAdjustedMinRegionSize = null;
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
    requestPatternRender();
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
      setMobileCanvasPanMode(false);
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
    requestPatternRender();
  });
  elements.mobileTraceReferenceOpacity?.addEventListener("input", () => {
    state.traceReference.opacity = Number(elements.mobileTraceReferenceOpacity.value) / 100;
    syncTraceReferenceControls();
    requestPatternRender();
    markProjectDirty();
  });
  elements.traceReferenceZoomOutButton.addEventListener("click", () => setTraceReferenceScale(state.traceReference.scale / 1.12));
  elements.traceReferenceZoomInButton.addEventListener("click", () => setTraceReferenceScale(state.traceReference.scale * 1.12));
  elements.traceReferenceFitButton.addEventListener("click", () => {
    fitTraceReferenceToCanvas();
    renderPattern();
    markProjectDirty();
  });
  elements.mobileReferenceCloseButton?.addEventListener("click", () => {
    document.body.classList.remove("mobile-reference-controls-open");
    syncMobileCanvasControls();
  });
  elements.traceReferenceCenterButton.addEventListener("click", () => {
    centerTraceReference();
    renderPattern();
    markProjectDirty();
  });
  elements.traceReferenceClearButton.addEventListener("click", clearReferenceImage);
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
  elements.paletteSearchInput.addEventListener("input", () => {
    state.paletteSearch = elements.paletteSearchInput.value.trim().toLowerCase();
    schedulePalettePanelRender();
  });
  elements.toolColorSearchInput?.addEventListener("input", () => {
    state.toolPaletteSearch = elements.toolColorSearchInput.value.trim().toLowerCase();
    scheduleToolPaletteRender();
  });
  elements.toolColorSearchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !["brush", "paintColor"].includes(elements.editToolPanel?.dataset.mobileMenu)) return;
    event.preventDefault();
    const code = elements.toolColorSearchInput.value.trim().toUpperCase();
    const color = paletteColorByCode(code);
    if (!color) {
      elements.cellInfo.textContent = code ? `没有找到颜色 ${code}。` : "请输入色号，例如 F3、B12。";
      return;
    }
    activatePaintColor(color, { addToAllowed: state.colorMode === "fixedPalette" });
    setActiveTool("brush");
    elements.editToolPanel?.classList.remove("is-properties-open");
    document.querySelector("#toolPropertiesButton")?.setAttribute("aria-expanded", "false");
    resetMobileToolMenu();
  });
  elements.toolPaletteAllButton?.addEventListener("click", () => {
    state.toolPaletteShowAll = !state.toolPaletteShowAll;
    renderToolColorPalette();
  });
  elements.showSelectedColorsButton.addEventListener("click", () => {
    state.showSelectedColorsOnly = !state.showSelectedColorsOnly;
    elements.showSelectedColorsButton.classList.toggle("is-active", state.showSelectedColorsOnly);
    elements.showSelectedColorsButton.textContent = state.showSelectedColorsOnly ? "显示全部" : "只看使用";
    renderConstraintPalette();
  });
  elements.unlockAllColorsButton?.addEventListener("click", unlockAllConstraintColors);
  elements.exportButton.addEventListener("click", exportPattern);
  elements.exportWatermarkToggle.addEventListener("change", () => {
    state.exportWatermarkEnabled = elements.exportWatermarkToggle.checked;
    markProjectDirty();
  });
  elements.resetButton.addEventListener("click", () => {
    if (confirmReplaceCurrentProject("重置")) resetApp();
  });
  elements.copyListButton.addEventListener("click", copyBeadList);
  elements.zoomInButton.addEventListener("click", () => setZoom(state.zoom + state.zoomState.step));
  elements.zoomOutButton.addEventListener("click", () => setZoom(state.zoom - state.zoomState.step));
  elements.zoomResetButton.addEventListener("click", () => setZoom(1, { center: true }));
  elements.fitButton.addEventListener("click", fitCanvasToScreen);
  elements.mobileReferenceControlsButton?.addEventListener("click", toggleMobileReferenceControls);
  elements.mobileCanvasPanButton?.addEventListener("click", () => {
    setMobileCanvasPanMode(!state.mobileCanvasPanMode);
  });
  elements.mobileToolPanButton?.addEventListener("click", () => {
    setMobileCanvasPanMode(!state.mobileCanvasPanMode);
  });
  elements.editToggle.addEventListener("click", toggleEditing);
  elements.lockGridButton.addEventListener("click", toggleGridLock);
  setupCropEvents();
  elements.toolboxLockButton.addEventListener("click", toggleToolboxLock);
  elements.undoButton.addEventListener("click", undoEdit);
  elements.redoButton.addEventListener("click", redoEdit);
  elements.fillSelectionButton.addEventListener("click", fillSelectionWithCurrentColor);
  elements.finishPenButton.addEventListener("click", finishPenSelection);
  elements.mobileConfirmSelectionButton?.addEventListener("click", confirmMobileSelection);
  elements.copySelectionButton.addEventListener("click", copySelectionPixels);
  elements.pasteSelectionButton.addEventListener("click", pasteSelectionPixels);
  elements.clearSelectionButton.addEventListener("click", clearSelection);
  document.querySelectorAll(".canvas-tool").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.mobileCanvasPanMode) setMobileCanvasPanMode(false);
      setActiveTool(button.dataset.tool);
    });
    button.addEventListener("dblclick", () => handleCanvasToolDoubleClick(button.dataset.tool));
    setupMobileDoubleTap(button, () => handleCanvasToolDoubleClick(button.dataset.tool));
  });
  elements.currentColorControl?.addEventListener("dblclick", openMobilePaintColorMenu);
  if (elements.currentColorControl) setupMobileDoubleTap(elements.currentColorControl, openMobilePaintColorMenu);
  elements.patternCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
  elements.patternCanvas.addEventListener("pointermove", handleCanvasPointerMove);
  elements.patternCanvas.addEventListener("pointerup", handleCanvasPointerUp);
  elements.patternCanvas.addEventListener("pointercancel", handleCanvasPointerUp);
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
  elements.mobileReplaceColorButton?.addEventListener("click", applyMobileColorReplacement);
  elements.mobileColorLockButton?.addEventListener("click", toggleMobileColorLock);
  document.querySelectorAll(".protection-mode-button").forEach((button) => {
    button.addEventListener("click", () => setProtectionMode(button.dataset.protectionMode));
  });
  elements.protectSelectionButton?.addEventListener("click", () => setSelectionProtection(true));
  elements.unprotectSelectionButton?.addEventListener("click", () => setSelectionProtection(false));
  elements.previewSelectionOptimizeButton?.addEventListener("click", previewSelectionOptimization);
  elements.reviewSuspectColorsButton?.addEventListener("click", reviewSuspectColors);
  elements.colorReviewList?.addEventListener("click", handleColorReviewAction);
  elements.mobileReplaceColorInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyMobileColorReplacement();
  });
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
      state.protectedCells = new Set();
      state.colorReviewItems = [];
      state.colorReviewGridVersion = -1;
      updateProtectionUi();
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

  if (autosaveIntervalId === null) {
    autosaveIntervalId = window.setInterval(() => {
      if (state.projectDirty) scheduleProjectAutoSave(0);
    }, 30000);
  }
}

function setupProjectDirtyTracking() {
  const selectors = [
    "#colorLimit",
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

  if (drawerPanels.has("size")) {
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
    resetMobileToolMenu();
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
const mobileLayoutMedia = window.matchMedia("(max-width: 768px)");

function isMobileLayout() {
  return mobileLayoutMedia.matches;
}

function syncMobileLayout(options = {}) {
  const mobile = isMobileLayout();
  mobileCanvasGestureController?.reset?.();
  state.isPanningCanvas = false;
  state.panPointerId = null;
  document.body.classList.toggle("is-mobile-layout", mobile);
  if (mobile) {
    elements.editToolPanel?.classList.remove("is-properties-open");
    document.querySelector("#toolPropertiesButton")?.setAttribute("aria-expanded", "false");
    resetMobileToolMenu();
  } else {
    state.mobileCanvasPanMode = false;
    document.body.classList.remove("mobile-reference-controls-open");
  }
  syncMobileCanvasControls();
  updateCanvasCursor();
  if (options.fit !== false) {
    window.setTimeout(() => fitCanvasToScreen(), 80);
  }
}

function setupMobileLayout() {
  syncMobileLayout({ fit: false });
  mobileLayoutMedia.addEventListener?.("change", () => syncMobileLayout());
}

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
  syncConstraintPalettePlacement(mode);
  document.querySelectorAll(".workbench-mode-button").forEach((button) => {
    const active = button.dataset.workbenchMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const propertiesButton = document.querySelector("#toolPropertiesButton");
  if (mode === "edit" && !isMobileLayout()) {
    elements.editToolPanel?.classList.add("is-properties-open");
    propertiesButton?.setAttribute("aria-expanded", "true");
  } else {
    elements.editToolPanel?.classList.remove("is-properties-open");
    propertiesButton?.setAttribute("aria-expanded", "false");
    resetMobileToolMenu();
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
  setColorLimit(Number(elements.colorLimit.value), false);
  scheduleColorLimitPreview();
}

function handleColorLimitNumberInput() {
  const rawValue = elements.colorLimitNumber?.value.trim();
  if (!rawValue) return;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return;
  setColorLimit(value, false);
  scheduleColorLimitPreview();
}

function commitColorLimitNumber() {
  const value = Number(elements.colorLimitNumber?.value);
  if (!Number.isFinite(value)) {
    syncColorLimitControls();
    return;
  }
  setColorLimit(value, false);
  flushColorLimitPreview();
}

function scheduleColorLimitPreview() {
  window.clearTimeout(colorLimitPreviewTimer);
  colorLimitPreviewTimer = window.setTimeout(() => {
    colorLimitPreviewTimer = null;
    requestPreviewUpdate("颜色数量预览已更新，请确认应用。");
  }, 140);
}

function flushColorLimitPreview() {
  window.clearTimeout(colorLimitPreviewTimer);
  colorLimitPreviewTimer = null;
  requestPreviewUpdate("颜色数量预览已更新，请确认应用。");
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
  state.protectedCells = new Set();
  state.colorReviewItems = [];
  state.colorReviewGridVersion = -1;
  updateProtectionUi();
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
  elements.colorLimit.min = 1;
  elements.colorLimit.max = max;
  elements.colorLimit.value = state.colorLimit;
  elements.colorLimit.disabled = false;
  elements.colorLimit.title = state.processingProfile === "photoColor"
    ? "照片原色先精准匹配，再按此数量收敛；锁定颜色优先保留。"
    : "";
  if (elements.colorLimitNumber) {
    elements.colorLimitNumber.min = 1;
    elements.colorLimitNumber.max = max;
    elements.colorLimitNumber.value = state.colorLimit;
  }
  elements.colorLabel.textContent = `${state.colorLimit} / ${max} 色`;
  document.querySelectorAll(".color-preset").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.colors) === state.colorLimit);
    button.disabled = false;
    button.title = "";
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
    state.minRegionSizeBeforeAnime = null;
    state.animeAdjustedMinRegionSize = null;
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
    state.traceReference.enabled = false;
    state.traceReference.visible = false;
    document.querySelectorAll(".color-mode-option").forEach((option) => option.classList.toggle("is-active", option.dataset.colorMode === state.colorMode));
    elements.colorModeLabel.textContent = "自动颜色";
    setActiveTool("brush");
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
  state.recentColorCodes = [];
  clearColorDiagnostics();
  state.backgroundMask = new Uint8Array(state.pattern.length);
  clearPreviewState();
  state.hasConfirmedGrid = true;
  state.manualEditedCells = new Set();
  state.protectedCells = new Set();
  state.colorReviewItems = [];
  state.colorReviewGridVersion = -1;
  state.manualEditCount = 0;
  state.fileName = state.fileName || "手绘图纸";
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.editGridVersion += 1;
  updateHistoryButtons();
  updateProtectionUi();
  updateSelectedColorUi();
  renderPattern();
  renderStats();
  elements.projectName.textContent = state.fileName;
  elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / 空白画布`;
  elements.cellInfo.textContent = `已新建 ${gridDimensionsLabel()} 空白画布，背景为 ${fill.empty ? "空背景" : fill.code}。`;
  markProjectDirty();
}

function createBlankCanvasFromUpload() {
  if (state.pattern.length && !window.confirm("新建空白画布会覆盖当前正式图纸，确定继续吗？")) return;
  state.autosaveSessionVersion += 1;
  invalidateImageProcessingState();
  state.image = null;
  state.sourceImageState = null;
  state.appMode = "draw";
  state.referenceImage = null;
  state.referenceImageUrl = "";
  state.referenceName = "";
  state.referenceVisible = false;
  state.traceReference.enabled = false;
  state.traceReference.visible = false;
  state.traceReference.adjustMode = false;
  createBlankCanvas({ confirmReplace: false, resetLibraryIdentity: true });
  syncControlsFromState();
  setWorkbenchMode("edit");
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
  return size <= 54 ? "compact48" : "detail64";
}

function setProcessingProfile(profile, options = {}) {
  const { regenerate = true } = options;
  const previousProfile = state.processingProfile;
  state.processingProfile = ["compact48", "detail64", "photoColor"].includes(profile) ? profile : "compact48";
  if (state.processingProfile === "photoColor" && previousProfile !== "photoColor") {
    state.colorLimit = palette.length;
  }
  syncProcessingProfileControls();
  syncControlsFromState();
  if (regenerate && state.image) {
    const label = state.processingProfile === "compact48" ? "48/54 精简版" : state.processingProfile === "detail64" ? "64+ 细节版" : "照片原色";
    requestPreviewUpdate(`已切换到${label}并更新预览，请确认应用。`);
  }
}

function syncProcessingProfileControls() {
  const detail = state.processingProfile === "detail64";
  const photo = state.processingProfile === "photoColor";
  if (elements.processingProfileLabel) elements.processingProfileLabel.textContent = photo ? "照片原色" : detail ? "64+ 细节版" : "48/54 精简版";
  if (elements.processingProfileHint) {
    elements.processingProfileHint.textContent = photo
      ? "先用完整色板高保真匹配，再按颜色上限收敛；锁定色会作为优先保留的目标色。"
      : detail
      ? "轻度清理，保留更多明暗层次、小装饰和结构细节。"
      : "适用于 48/54 小画布，收敛杂色并保留高对比细节。";
  }
  elements.processingProfileOptions.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.processingProfile === state.processingProfile);
  });
}

function applyPixelSizeDefaults(updateColor = true) {
  if (state.processingProfile !== "photoColor") state.processingProfile = recommendedProcessingProfile();
  if (state.processingProfile === "photoColor") {
    state.minRegionSize = 2;
    return;
  }
  state.minRegionSize = state.gridSize <= 34 ? 1 : state.gridSize <= 54 ? 3 : 2;
  if (updateColor) {
    setColorLimit(state.gridSize <= 34 ? 12 : state.gridSize <= 54 ? 16 : state.gridSize <= 64 ? 24 : 28, false);
  }
}

function applySizePresetDefaults(updateColor = true) {
  if (state.processingProfile !== "photoColor") state.processingProfile = recommendedProcessingProfile();
  if (state.processingProfile === "photoColor") {
    state.minRegionSize = 2;
    return;
  }
  if (state.gridSize <= 54) {
    state.minRegionSize = 3;
    if (updateColor) setColorLimit(16, false);
  } else if (state.gridSize <= 64) {
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
  syncUploadSizeControls();
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
  elements.transparentToggle.checked = state.removeTransparent;
  elements.lineBoostToggle.checked = state.lineBoost;
  elements.outlineModeSelect.value = state.outlineMode;
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

function syncMobileCanvasControls() {
  const referenceOpen = document.body.classList.contains("mobile-reference-controls-open");
  if (!state.referenceImage && referenceOpen) {
    document.body.classList.remove("mobile-reference-controls-open");
  }
  elements.mobileReferenceControlsButton?.classList.toggle(
    "is-active",
    Boolean(state.referenceImage && document.body.classList.contains("mobile-reference-controls-open")),
  );
  elements.mobileReferenceControlsButton?.setAttribute(
    "aria-expanded",
    String(Boolean(state.referenceImage && document.body.classList.contains("mobile-reference-controls-open"))),
  );
  elements.mobileCanvasPanButton?.classList.toggle("is-active", state.mobileCanvasPanMode);
  elements.mobileCanvasPanButton?.setAttribute("aria-pressed", String(state.mobileCanvasPanMode));
  elements.mobileToolPanButton?.classList.toggle("is-active", state.mobileCanvasPanMode);
  elements.mobileToolPanButton?.setAttribute("aria-pressed", String(state.mobileCanvasPanMode));
}

function toggleMobileReferenceControls() {
  if (!isMobileLayout()) return;
  if (!state.referenceImage) {
    elements.referenceInput?.click();
    return;
  }
  setMobileCanvasPanMode(false);
  document.body.classList.toggle("mobile-reference-controls-open");
  syncMobileCanvasControls();
}

function setMobileCanvasPanMode(enabled) {
  state.mobileCanvasPanMode = Boolean(enabled);
  if (state.mobileCanvasPanMode) {
    document.body.classList.remove("mobile-reference-controls-open");
    state.traceReference.adjustMode = false;
    mobileCanvasGestureController?.reset?.();
  }
  syncMobileCanvasControls();
  updateCanvasCursor();
  elements.cellInfo.textContent = state.mobileCanvasPanMode
    ? isMobileLayout()
      ? "移动画布已开启：单指拖动查看放大后的区域；关闭后可继续编辑和双指缩放。"
      : "移动画布已开启：按住鼠标左键拖动画布；也可以继续使用空格临时拖动。"
    : "移动画布已关闭，可以继续编辑格子。";
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
  if (elements.mobileTraceReferenceOpacity) {
    elements.mobileTraceReferenceOpacity.value = traceVisibility;
    elements.mobileTraceReferenceOpacity.disabled = !hasReference;
  }
  if (elements.mobileTraceReferenceOpacityLabel) {
    elements.mobileTraceReferenceOpacityLabel.textContent = `${traceVisibility}%`;
  }
  elements.traceReferenceZoomOutButton.disabled = !canAdjust || trace.locked;
  elements.traceReferenceZoomInButton.disabled = !canAdjust || trace.locked;
  elements.traceReferenceFitButton.disabled = !hasReference;
  elements.traceReferenceCenterButton.disabled = !hasReference;
  syncMobileCanvasControls();
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

function invalidateImageProcessingState() {
  imageProcessingRevision += 1;
  activePreviewRequestSignature = "";
  pendingPreviewRequestSignature = "";
  previewUpdateVersion += 1;
  cancelPendingPaletteWorkerRequests();
  state.isProcessingPattern = false;
  updatePreviewButtons();
  cancelScheduledUiWork();
  clearReferenceSampler();
  nearestColorCache.clear();
  nearestCandidateCache.clear();
  clearColorDiagnostics();
  invalidateOptimizedBaseImage();
}

function invalidateOptimizedBaseImage() {
  releaseCanvasMemory(state.optimizedBaseImage);
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
  const profileIncludesAccurateMatch = state.processingProfile === "photoColor";
  elements.accurateMatchToggle.checked = profileIncludesAccurateMatch || state.accurateMatch;
  elements.accurateMatchToggle.disabled = profileIncludesAccurateMatch;
  elements.accurateMatchToggle.closest(".mini-check")?.classList.toggle("is-disabled", profileIncludesAccurateMatch);
  elements.accurateMatchToggle.title = profileIncludesAccurateMatch ? "照片原色已内置精准匹配" : "";
  elements.colorDebugToggle.checked = state.colorDebugEnabled;
  elements.colorDebugInfo.textContent =
    profileIncludesAccurateMatch
      ? `照片原色已内置原图 + ${PALETTE_NAME} LAB/DeltaE 精准匹配；其余设置仍会更新当前预览。`
      : state.accurateMatch
      ? `当前以原图 + ${PALETTE_NAME} LAB/DeltaE 精准匹配为基础；所有设置更新同一张预览。`
      : "当前使用兼容匹配；所有设置更新同一张预览。";
}

