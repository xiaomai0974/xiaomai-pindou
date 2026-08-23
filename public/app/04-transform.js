/* 小麦拼豆 — 04-transform.js
 * 上传、裁剪、转图预览与后处理
 */
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
    elements.projectMeta.textContent = `图片已读取：${image.width} x ${image.height}，请先裁剪后适配 ${gridDimensionsLabel()} 画布`;
    elements.cellInfo.textContent = "请先调整裁剪范围，确认后再生成图纸。";
    URL.revokeObjectURL(image.src);
    state.libraryProjectId = null;
    state.projectCreatedAt = null;
    openCropper(image, file);
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
    state.autosaveSessionVersion += 1;
    invalidateImageProcessingState();
    state.appMode = "auto";
    elements.projectMeta.textContent = `图片已读取：${image.width} x ${image.height}，正在生成图纸...`;
    state.image = image;
    state.referenceImage = image;
    state.referenceImageUrl = "";
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
    const nextReferenceOpacity = Number(state.traceReference.opacity) > 0
      ? clampRange(Number(state.traceReference.opacity), 0.05, 1)
      : 0.35;
    state.referenceOpacity = nextReferenceOpacity;
    state.traceReference.enabled = true;
    state.traceReference.visible = true;
    state.traceReference.opacity = nextReferenceOpacity;
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
    state.protectedCells = new Set();
    state.colorReviewItems = [];
    state.colorReviewGridVersion = -1;
    state.backgroundMask = null;
    state.hasConfirmedGrid = false;
    state.editGridVersion = 0;
    state.previewGridVersion = 0;
    state.manualEditCount = 0;
    state.manualEditedCells = new Set();
    state.counts = new Map();
    state.projectPalette = [];
    state.recentColorCodes = [];
    clearHistory();
    state.suspendHistory = true;
    elements.projectName.textContent = state.fileName || "小麦拼豆";
    updateBackgroundHint();
    elements.referenceVisibleToggle.checked = true;
    elements.referenceStatus.textContent = state.referenceName;
    fitTraceReferenceToCanvas();
    syncControlsFromState();
    updateProtectionUi();
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
  cropState.image = image;
  cropState.file = file;
  elements.cropModal.hidden = false;
  resetCropperView();
}

function setupCropEvents() {
  if (!elements.cropCanvas) return;
  elements.confirmCropButton.addEventListener("click", confirmCrop);
  elements.mobileConfirmCropButton?.addEventListener("click", confirmCrop);
  elements.skipCropButton.addEventListener("click", skipCrop);
  elements.cropZoom.addEventListener("input", () => {
    zoomCropper(Number(elements.cropZoom.value), elements.cropCanvas.width / 2, elements.cropCanvas.height / 2);
  });
  elements.mobileCropZoom?.addEventListener("input", () => {
    zoomCropper(Number(elements.mobileCropZoom.value), elements.cropCanvas.width / 2, elements.cropCanvas.height / 2);
  });
  elements.cropZoomOutButton?.addEventListener("click", () => {
    zoomCropper(cropState.zoom - 0.12, elements.cropCanvas.width / 2, elements.cropCanvas.height / 2);
  });
  elements.cropZoomInButton?.addEventListener("click", () => {
    zoomCropper(cropState.zoom + 0.12, elements.cropCanvas.width / 2, elements.cropCanvas.height / 2);
  });
  for (const button of [elements.cropResetButton, elements.desktopCropResetButton].filter(Boolean)) {
    button.addEventListener("click", resetCropperView);
  }
  for (const button of [elements.cropMirrorButton, elements.desktopCropMirrorButton].filter(Boolean)) {
    button.addEventListener("click", toggleCropMirror);
  }
  elements.cropCloseButton?.addEventListener("click", cancelCrop);
  elements.cropReplaceButton?.addEventListener("click", () => elements.imageInput.click());
  document.querySelectorAll(".crop-ratio-option").forEach((button) => {
    button.addEventListener("click", () => setCropRatio(button.dataset.cropRatio));
  });
  elements.cropCanvas.addEventListener("pointerdown", handleCropPointerDown);
  elements.cropCanvas.addEventListener("pointermove", handleCropPointerMove);
  elements.cropCanvas.addEventListener("pointerup", endCropDrag);
  elements.cropCanvas.addEventListener("pointercancel", endCropDrag);
  elements.cropCanvas.addEventListener("wheel", handleCropWheel, { passive: false });
}

function resetCropperView() {
  if (!cropState.image) return;
  const canvas = elements.cropCanvas;
  const image = cropState.image;
  const fitScale = Math.min((canvas.width * 0.86) / image.width, (canvas.height * 0.86) / image.height);
  cropState.zoom = 1;
  cropState.baseScale = Math.max(0.05, fitScale);
  const drawW = image.width * cropState.baseScale;
  const drawH = image.height * cropState.baseScale;
  cropState.offsetX = (canvas.width - drawW) / 2;
  cropState.offsetY = (canvas.height - drawH) / 2;
  cropState.ratio = null;
  cropState.mirrored = false;
  cropState.crop = cropRectForRatio(activeGridWidth() / Math.max(1, activeGridHeight()));
  cropState.dragMode = null;
  cropState.pointerId = null;
  syncCropControlState();
  drawCropper();
}

function cropRectForRatio(ratio, center = null) {
  const canvas = elements.cropCanvas;
  const safeRatio = clampRange(Number(ratio) || 1, 0.25, 4);
  const maxWidth = canvas.width * 0.76;
  const maxHeight = canvas.height * 0.72;
  let width = maxWidth;
  let height = width / safeRatio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * safeRatio;
  }
  const centerX = center?.x ?? canvas.width / 2;
  const centerY = center?.y ?? canvas.height / 2;
  return {
    x: clampRange(centerX - width / 2, 0, canvas.width - width),
    y: clampRange(centerY - height / 2, 0, canvas.height - height),
    width,
    height,
  };
}

function syncCropControlState() {
  const zoom = String(cropState.zoom);
  if (elements.cropZoom) elements.cropZoom.value = zoom;
  if (elements.mobileCropZoom) elements.mobileCropZoom.value = zoom;
  elements.cropMirrorButton?.classList.toggle("is-active", cropState.mirrored);
  elements.desktopCropMirrorButton?.classList.toggle("is-active", cropState.mirrored);
  document.querySelectorAll(".crop-ratio-option").forEach((button) => {
    const value = button.dataset.cropRatio === "free" ? null : Number(button.dataset.cropRatio);
    button.classList.toggle("is-active", value === cropState.ratio);
  });
}

function toggleCropMirror() {
  cropState.mirrored = !cropState.mirrored;
  syncCropControlState();
  drawCropper();
}

function setCropRatio(value) {
  const nextRatio = value === "free" ? null : clampRange(Number(value), 0.25, 4);
  const center = {
    x: cropState.crop.x + cropState.crop.width / 2,
    y: cropState.crop.y + cropState.crop.height / 2,
  };
  cropState.ratio = nextRatio;
  if (nextRatio) cropState.crop = cropRectForRatio(nextRatio, center);
  syncCropControlState();
  drawCropper();
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
  const drawWidth = cropState.image.width * scale;
  const drawHeight = cropState.image.height * scale;
  cropCtx.save();
  if (cropState.mirrored) {
    cropCtx.translate(cropState.offsetX + drawWidth, cropState.offsetY);
    cropCtx.scale(-1, 1);
    cropCtx.drawImage(cropState.image, 0, 0, drawWidth, drawHeight);
  } else {
    cropCtx.drawImage(cropState.image, cropState.offsetX, cropState.offsetY, drawWidth, drawHeight);
  }
  cropCtx.restore();

  const { x, y, width, height } = cropState.crop;
  cropCtx.save();
  cropCtx.fillStyle = "rgba(0, 0, 0, 0.48)";
  cropCtx.beginPath();
  cropCtx.rect(0, 0, canvas.width, canvas.height);
  cropCtx.rect(x, y, width, height);
  cropCtx.fill("evenodd");
  cropCtx.restore();

  cropCtx.strokeStyle = "#e83b64";
  cropCtx.lineWidth = 3;
  cropCtx.strokeRect(x, y, width, height);
  cropCtx.strokeStyle = "rgba(255,255,255,0.78)";
  cropCtx.lineWidth = 1;
  for (let i = 1; i < 3; i += 1) {
    const pos = x + (width / 3) * i;
    cropCtx.beginPath();
    cropCtx.moveTo(pos, y);
    cropCtx.lineTo(pos, y + height);
    cropCtx.stroke();
    const row = y + (height / 3) * i;
    cropCtx.beginPath();
    cropCtx.moveTo(x, row);
    cropCtx.lineTo(x + width, row);
    cropCtx.stroke();
  }

  cropCtx.fillStyle = "#ffd966";
  cropCtx.strokeStyle = "#7b4f2c";
  cropCtx.lineWidth = 3;
  for (const [hx, hy] of [
    [x, y],
    [x + width, y],
    [x, y + height],
    [x + width, y + height],
  ]) {
    cropCtx.beginPath();
    cropCtx.arc(hx, hy, 10, 0, Math.PI * 2);
    cropCtx.fill();
    cropCtx.stroke();
  }
}

function applyUploadSize() {
  if (!elements.uploadWidthInput || !elements.uploadHeightInput) return;
  elements.customSizeInput.value = elements.uploadWidthInput.value;
  elements.customHeightInput.value = elements.uploadHeightInput.value;
  applyCustomSize();
  syncUploadSizeControls();
}

function syncUploadSizeControls() {
  if (elements.uploadWidthInput) elements.uploadWidthInput.value = activeGridWidth();
  if (elements.uploadHeightInput) elements.uploadHeightInput.value = activeGridHeight();
  if (elements.uploadSizeLabel) elements.uploadSizeLabel.textContent = gridDimensionsLabel();
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
  event.preventDefault();
  const point = cropPointerPosition(event);
  const crop = cropState.crop;
  const corner = cropCornerAtPoint(point);
  const insideCrop =
    point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height;
  cropState.dragMode = corner ? `resize-${corner}` : insideCrop ? "crop" : "image";
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
  event.preventDefault();
  const point = cropPointerPosition(event);
  const dx = point.x - cropState.startX;
  const dy = point.y - cropState.startY;
  if (cropState.dragMode === "image") {
    cropState.offsetX = cropState.startOffsetX + dx;
    cropState.offsetY = cropState.startOffsetY + dy;
  } else if (cropState.dragMode === "crop") {
    const { width, height } = cropState.startCrop;
    cropState.crop.x = clampRange(cropState.startCrop.x + dx, 0, elements.cropCanvas.width - width);
    cropState.crop.y = clampRange(cropState.startCrop.y + dy, 0, elements.cropCanvas.height - height);
  } else if (cropState.dragMode.startsWith("resize-")) {
    resizeCropFromCorner(cropState.dragMode.slice(7), point);
  }
  drawCropper();
}

function cropCornerAtPoint(point) {
  const { x, y, width, height } = cropState.crop;
  const corners = {
    nw: { x, y },
    ne: { x: x + width, y },
    sw: { x, y: y + height },
    se: { x: x + width, y: y + height },
  };
  const radius = 26;
  return Object.entries(corners).find(([, corner]) => Math.hypot(point.x - corner.x, point.y - corner.y) <= radius)?.[0] || null;
}

function resizeCropFromCorner(corner, point) {
  const start = cropState.startCrop;
  const fromLeft = corner.includes("w");
  const fromTop = corner.includes("n");
  const anchorX = fromLeft ? start.x + start.width : start.x;
  const anchorY = fromTop ? start.y + start.height : start.y;
  const directionX = fromLeft ? -1 : 1;
  const directionY = fromTop ? -1 : 1;
  const maxWidth = directionX < 0 ? anchorX : elements.cropCanvas.width - anchorX;
  const maxHeight = directionY < 0 ? anchorY : elements.cropCanvas.height - anchorY;
  const minSize = 54;
  let width = clampRange(Math.abs(point.x - anchorX), minSize, maxWidth);
  let height = clampRange(Math.abs(point.y - anchorY), minSize, maxHeight);
  if (cropState.ratio) {
    width = Math.max(width, height * cropState.ratio);
    width = clampRange(width, minSize, Math.min(maxWidth, maxHeight * cropState.ratio));
    height = width / cropState.ratio;
  }
  cropState.crop = {
    x: directionX < 0 ? anchorX - width : anchorX,
    y: directionY < 0 ? anchorY - height : anchorY,
    width,
    height,
  };
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
  syncCropControlState();
  drawCropper();
}

function selectedCropInImageSpace() {
  const scale = cropScale();
  const image = cropState.image;
  const requestedX = cropState.mirrored
    ? image.width - (cropState.crop.x + cropState.crop.width - cropState.offsetX) / scale
    : (cropState.crop.x - cropState.offsetX) / scale;
  const requestedY = (cropState.crop.y - cropState.offsetY) / scale;
  const width = clampRange(cropState.crop.width / scale, 1, image.width);
  const height = clampRange(cropState.crop.height / scale, 1, image.height);
  const x = clampRange(requestedX, 0, Math.max(0, image.width - width));
  const y = clampRange(requestedY, 0, Math.max(0, image.height - height));
  return { x, y, width, height, mirrored: cropState.mirrored };
}

function confirmCrop() {
  if (!cropState.image || !cropState.file) return;
  const source = selectedCropInImageSpace();
  const sourceLongSide = Math.max(source.width, source.height);
  const outputLongSide = Math.round(clampRange(sourceLongSide, 512, 1600));
  const outputWidth = Math.max(1, Math.round((source.width / sourceLongSide) * outputLongSide));
  const outputHeight = Math.max(1, Math.round((source.height / sourceLongSide) * outputLongSide));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const canvasCtx = canvas.getContext("2d");
  canvasCtx.imageSmoothingEnabled = true;
  if (source.mirrored) {
    canvasCtx.translate(outputWidth, 0);
    canvasCtx.scale(-1, 1);
  }
  canvasCtx.drawImage(
    cropState.image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );
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
  const croppedDataUrl = canvas.toDataURL("image/png");
  releaseCanvasMemory(canvas);
  croppedImage.src = croppedDataUrl;
}

function cancelCrop() {
  if (elements.cropModal) elements.cropModal.hidden = true;
  cropState.image = null;
  cropState.file = null;
  cropState.dragMode = null;
  cropState.pointerId = null;
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
  if (!REFERENCE_FEATURE_ENABLED) {
    event.target.value = "";
    return;
  }
  const [file] = event.target.files;
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  const image = new Image();
  image.onload = () => {
    state.referenceImage = image;
    state.referenceImageUrl = image.src;
    state.referenceName = file.name.replace(/\.[^.]+$/, "");
    state.referenceVisible = true;
    const nextReferenceOpacity = Number(state.traceReference.opacity) > 0
      ? clampRange(Number(state.traceReference.opacity), 0.05, 1)
      : 0.35;
    state.referenceOpacity = nextReferenceOpacity;
    state.traceReference.enabled = true;
    state.traceReference.visible = true;
    state.traceReference.opacity = nextReferenceOpacity;
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
  const dataUrl = canvas.toDataURL("image/png");
  releaseCanvasMemory(canvas);
  return dataUrl;
}

function releaseCanvasMemory(canvas) {
  if (!canvas || canvas === elements.patternCanvas || canvas === elements.cropCanvas) return;
  canvas.width = 1;
  canvas.height = 1;
}

function clearReferenceSampler() {
  releaseCanvasMemory(state.referenceSampler?.canvas);
  state.referenceSampler = {
    image: null,
    canvas: null,
    context: null,
  };
}

function toggleReferenceMenu() {
  if (!REFERENCE_FEATURE_ENABLED) return;
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
  clearReferenceSampler();
  state.referenceImage = null;
  state.referenceImageUrl = "";
  state.referenceName = "";
  state.referenceVisible = false;
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
  if (!REFERENCE_FEATURE_ENABLED) return;
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
      return false;
    }
    return await requestPreviewUpdate("图片已生成预览，请确认应用后再进入编辑或导出。");
  } finally {
    recordPerformance("pipeline.generateTotal", performanceNow() - startedAt);
  }
}

async function buildPatternResultFromImage() {
  if (!state.image) return null;
  const size = state.gridSize;
  const directPalette = state.colorMode === "fixedPalette" ? effectiveAllowedPalette() : palette;
  const rawDiagnostic = await buildRawDiagnosticReference(size, directPalette);
  const sourceImage = conversionSourceImage();
  const pixels = buildPixelSamples(sourceImage, size);
  const limitedPalette = state.accurateMatch || state.processingProfile === "photoColor" ? directPalette : adaptivePaletteForPixels(pixels);
  const pattern = await mapSamplesToPaletteAsync(
    pixels,
    size,
    limitedPalette,
    true,
  );

  if (state.processingProfile === "photoColor") {
    const photoResult = finalizePhotoColorMatch(pattern, pixels, size);
    return {
      pattern: photoResult.pattern,
      backgroundMask: photoResult.backgroundMask,
      size,
      diagnostics: { ...rawDiagnostic, changedBy: "photoColorMatch" },
    };
  }

  if (state.accurateMatch) {
    const accurateResult = finalizeAccurateMatch(pattern, pixels, size, limitedPalette);
    return {
      pattern: accurateResult.pattern,
      backgroundMask: accurateResult.backgroundMask,
      size,
      diagnostics: { ...rawDiagnostic, changedBy: "accurateMatchCleanup" },
    };
  }

  const backgroundMask = computeBackgroundMask(pattern, pixels, size, true);
  const maskedPattern = applyBackgroundModeToGrid(pattern, backgroundMask, state.pixelBackground);
  let processed = postProcessPattern(maskedPattern, size);
  if (totalBeadCount(processed) === 0 && totalBeadCount(pattern) > 0) {
    processed = postProcessPattern(pattern, size);
  }
  return {
    pattern: validateColorConstraints(processed),
    backgroundMask,
    size,
    diagnostics: { ...rawDiagnostic, changedBy: "postProcess" },
  };
}

function finalizeAccurateMatch(pattern, pixels, size, sourcePalette = effectiveAllowedPalette()) {
  const backgroundMask = computeBackgroundMask(pattern, pixels, size, true);
  const maskedPattern = applyBackgroundModeToGrid(pattern, backgroundMask, state.pixelBackground);
  const refinedPattern = refineAccuratePaletteMatches(maskedPattern, pixels, size, sourcePalette, backgroundMask);
  let processed = postProcessPattern(refinedPattern, size);
  if (totalBeadCount(processed) === 0 && totalBeadCount(pattern) > 0) {
    processed = postProcessPattern(refineAccuratePaletteMatches(pattern, pixels, size, sourcePalette), size);
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
  const photoMergeDistance = state.mergeSimilarColors
    ? Math.min(5.2, 4.2 + (state.mergeBoost || 0))
    : 2.4;
  processed = mergeSimilarUsedColors(processed, size, photoMergeDistance);
  processed = cleanPhotoLowContrastIsolated(processed, size, backgroundMask);
  if (state.cleanSmallRegions) {
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
  processed = forceMaxColors(processed, size, targetColorLimit(), lockedColorConvergenceOptions());
  return {
    pattern: validateColorConstraints(processed),
    backgroundMask,
  };
}

function cleanPhotoLowContrastIsolated(pattern, size, backgroundMask = null) {
  const output = [...pattern];
  const protectedIndexes = buildProtectedIndexSet(pattern, size);
  const backgroundCodes = backgroundColorCodes();
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (color.empty || protectedIndexes.has(index) || state.manualEditedCells.has(index) || isColorLocked(color)) continue;
    const x = index % size;
    const y = Math.floor(index / size);
    const neighbors = getFourNeighbors(x, y, size).map((next) => pattern[next]).filter((item) => !item.empty);
    if (neighbors.length < 2 || neighbors.some((item) => item.code === color.code)) continue;
    const winner = countNeighborColors(neighbors)
      .filter((candidate) => backgroundMask?.[index] || !backgroundCodes.has(candidate.color.code))
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

function rawDiagnosticCacheSignature(size, sourcePalette) {
  return JSON.stringify({
    size,
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    imageWidth: state.image?.width || 0,
    imageHeight: state.image?.height || 0,
    fileName: state.sourceImageState?.fileName || state.fileName || "",
    patternMode: state.patternMode,
    processingProfile: state.processingProfile,
    fitMode: state.fitMode,
    dominantSampling: state.dominantSampling,
    animeMode: state.animeMode,
    lineBoost: state.lineBoost,
    outlineMode: state.outlineMode,
    removeTransparent: state.removeTransparent,
    palette: paletteSignature(sourcePalette),
  });
}

async function buildRawDiagnosticReference(size, sourcePalette) {
  const signature = rawDiagnosticCacheSignature(size, sourcePalette);
  if (
    state.rawDiagnosticSignature === signature &&
    state.rawSampleData.length === size * size &&
    state.rawMappedGrid.length === size * size
  ) {
    return {
      pixels: state.rawSampleData,
      pattern: state.rawMappedGrid,
      signature,
    };
  }

  // 保留一份裁剪后原图的直配基准，用于颜色诊断与质量比较。
  // 用户画布始终显示当前设置生成的单一预览，不再切换诊断图层。
  const pixels = buildPixelSamples(state.image, size);
  const pattern = await mapSamplesToPaletteAsync(pixels, size, sourcePalette, false);
  return { pixels, pattern, signature };
}

function applyColorDiagnostics(diagnostics, finalPattern, changedBy) {
  if (!diagnostics?.pixels?.length || !diagnostics?.pattern?.length) return;
  recordColorDiagnostics(diagnostics.pixels, diagnostics.pattern, finalPattern, changedBy);
  state.rawDiagnosticSignature = diagnostics.signature || "";
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
  const preprocessOptions = {
    pixelBackground: state.pixelBackground,
    fillColor: whiteBeadColor().rgb,
    processingProfile: state.processingProfile,
    gridSize: state.gridSize,
  };

  if (state.localPreprocessSettings.backgroundCleanup) {
    imageData = cleanupBaseImageBackground(imageData, outlineMask, preprocessOptions);
  }
  if (state.localPreprocessSettings.antiAliasCleanup) {
    imageData = cleanupAntiAliasPixels(imageData, outlineMask, preprocessOptions);
  }
  const detailProfile = state.processingProfile === "detail64";
  if (state.localPreprocessSettings.materialTextureCleanup) {
    imageData = cleanupMaterialTexture(imageData, outlineMask, {
      ...preprocessOptions,
      strength: detailProfile ? "light" : "standard",
    });
  }
  if (state.localPreprocessSettings.noiseReduction && !detailProfile) {
    imageData = reduceBaseImageNoise(imageData, outlineMask);
  }
  if (state.localPreprocessSettings.flatColorSimplification && !detailProfile) {
    imageData = simplifyBaseImageFlatColors(imageData, outlineMask, preprocessOptions);
  }
  if (state.localPreprocessSettings.regionColorStabilization && !detailProfile) {
    imageData = stabilizeBaseImageRegions(imageData, outlineMask, preprocessOptions);
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

function refineAccuratePaletteMatches(pattern, pixels, size, sourcePalette, backgroundMask = null) {
  if (!pattern.length || pattern.length !== pixels.length || !sourcePalette?.length) return [...pattern];
  const sourceLabs = pixels.map((pixel) => (pixel?.empty ? null : pixel.lab || rgbToLab(pixel)));
  const candidateLimit = size <= 48 ? 3 : size <= 64 ? 4 : 3;
  const passes = size <= 64 ? 2 : 1;
  const regionThreshold = size <= 48 ? 11 : size <= 64 ? 9 : 8;
  const baseCoherenceWeight = size <= 48 ? 0.24 : size <= 64 ? 0.17 : 0.11;
  const maxSourceLoss = size <= 48 ? 2.8 : size <= 64 ? 1.9 : 1.2;
  let refined = [...pattern];

  for (let pass = 0; pass < passes; pass += 1) {
    const next = [...refined];
    for (let index = 0; index < refined.length; index += 1) {
      const current = refined[index];
      const source = pixels[index];
      if (!current || current.empty || !source || source.empty || backgroundMask?.[index] || isColorLocked(current)) continue;
      const x = index % size;
      const y = Math.floor(index / size);
      const sourceLab = sourceLabs[index];
      const neighbors = getEightNeighbors(x, y, size).filter((neighbor) => {
        if (backgroundMask?.[neighbor] || refined[neighbor]?.empty || !sourceLabs[neighbor]) return false;
        return deltaE2000(sourceLab, sourceLabs[neighbor]) <= regionThreshold;
      });
      if (neighbors.length < 2) continue;

      const allSourceNeighbors = getFourNeighbors(x, y, size).filter((neighbor) => sourceLabs[neighbor]);
      const localContrast = allSourceNeighbors.length
        ? Math.max(...allSourceNeighbors.map((neighbor) => deltaE2000(sourceLab, sourceLabs[neighbor])))
        : 0;
      const edgeFactor = clampRange(localContrast / 24, 0, 1);
      const coherenceWeight = baseCoherenceWeight * (1 - edgeFactor * 0.78);
      const candidates = [...nearestPaletteCandidates({ ...source, lab: sourceLab }, sourcePalette, candidateLimit)];
      if (!candidates.some((candidate) => candidate.code === current.code)) {
        candidates.push({ ...current, deltaE: deltaE2000(sourceLab, current.lab) });
      }

      const scored = candidates.map((candidate) => {
        const sourceError = candidate.deltaE ?? deltaE2000(sourceLab, candidate.lab);
        const neighborCost = neighbors.reduce(
          (sum, neighbor) => sum + Math.min(22, paletteMatchDistance(candidate, refined[neighbor])),
          0,
        ) / neighbors.length;
        const exactSupport = neighbors.filter((neighbor) => refined[neighbor].code === candidate.code).length;
        return {
          color: paletteColorByCode(candidate.code) || candidate,
          sourceError,
          score: sourceError + neighborCost * coherenceWeight - exactSupport * (size <= 48 ? 0.42 : 0.3),
        };
      }).sort((a, b) => a.score - b.score || a.sourceError - b.sourceError);

      const currentResult = scored.find((item) => item.color.code === current.code);
      const best = scored[0];
      if (!best || !currentResult || best.color.code === current.code) continue;
      const allowedLoss = maxSourceLoss * (1 - edgeFactor * 0.7);
      if (best.sourceError > currentResult.sourceError + allowedLoss) continue;
      if (best.score > currentResult.score - 0.28) continue;
      next[index] = best.color;
    }
    refined = next;
  }

  return refined;
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

function syncConstraintPalettePlacement(mode = document.body.dataset.workbenchMode) {
  const panel = document.querySelector(".stats-color-panel");
  const transformMount = document.querySelector("#transformColorPanelMount");
  const statsMount = document.querySelector("#statsColorPanelMount");
  const target = mode === "transform" ? transformMount : statsMount;
  if (!panel || !target) return;
  if (panel.parentElement !== target) target.appendChild(panel);
  panel.classList.toggle("is-transform-color-panel", mode === "transform");
}

function currentConversionPreviewSignature() {
  const sortedCodes = (codes) => [...codes].sort();
  return JSON.stringify({
    imageProcessingRevision,
    gridSize: state.gridSize,
    gridWidth: activeGridWidth(),
    gridHeight: activeGridHeight(),
    patternMode: state.patternMode,
    processingProfile: state.processingProfile,
    colorLimit: state.colorLimit,
    colorMode: state.colorMode,
    allowedColorCodes: sortedCodes(state.allowedColorCodes),
    lockedColorCodes: sortedCodes(state.lockedColorCodes),
    disabledColorCodes: sortedCodes(state.disabledColorCodes),
    pixelBackground: state.pixelBackground,
    fitMode: state.fitMode,
    dither: state.dither,
    removeTransparent: state.removeTransparent,
    lineBoost: state.lineBoost,
    outlineMode: state.outlineMode,
    dominantSampling: state.dominantSampling,
    mergeSimilarColors: state.mergeSimilarColors,
    cleanSmallRegions: state.cleanSmallRegions,
    animeMode: state.animeMode,
    minRegionSize: state.minRegionSize,
    mergeBoost: state.mergeBoost,
    accurateMatch: state.accurateMatch,
    localPreprocessSettings: state.localPreprocessSettings,
    editGridVersion: state.editGridVersion,
  });
}

function clearPreviewState(options = {}) {
  if (options.restoreCanvas) restorePreviewCanvasSnapshot();
  else state.previewCanvasSnapshot = null;
  state.previewPattern = [];
  state.previewCounts = new Map();
  state.previewQualityMetrics = null;
  state.previewBackgroundMask = null;
  state.previewPreservesManualEdits = false;
  state.previewKind = "conversion";
  state.previewChangedIndexes = [];
  state.isPreviewDirty = false;
  pendingPreviewRequestSignature = "";
  if (options.syncControls !== false) updatePreviewButtons();
}

function setPendingPreview(pattern, options = {}) {
  const sourcePreview = Array.isArray(pattern) ? pattern : [];
  const shouldKeepProtectedCells =
    options.kind !== "selectionOptimize" &&
    state.protectedCells.size > 0 &&
    state.pattern.length === sourcePreview.length;
  const preview = shouldKeepProtectedCells
    ? sourcePreview.map((color, index) => state.protectedCells.has(index) ? state.pattern[index] : color)
    : sourcePreview;
  const size = Number(options.size) || state.gridSize;
  state.previewPattern = preview;
  state.previewCounts = options.counts || buildCounts(preview);
  state.previewQualityMetrics = options.qualityMetrics || calculateQualityMetrics(preview, size);
  state.previewBackgroundMask = Object.prototype.hasOwnProperty.call(options, "backgroundMask")
    ? options.backgroundMask
    : state.backgroundMask;
  state.previewPreservesManualEdits = Boolean(options.preservesManualEdits);
  state.previewKind = options.kind === "selectionOptimize" ? "selectionOptimize" : "conversion";
  state.previewChangedIndexes = Array.isArray(options.changedIndexes) ? [...new Set(options.changedIndexes)] : [];
  state.previewGridVersion += 1;
  state.isPreviewDirty = preview.length > 0;
  pendingPreviewRequestSignature = options.signature || "";
  state.patternSize = size;
  updatePreviewButtons();
  return preview;
}

function renderPendingPreview() {
  renderPattern();
  renderStats();
}

async function requestPreviewUpdate(message = "参数预览已更新，请确认应用后再编辑或导出。", options = {}) {
  const hadScheduledColorLimitPreview = colorLimitPreviewTimer !== null;
  if (hadScheduledColorLimitPreview) {
    window.clearTimeout(colorLimitPreviewTimer);
    colorLimitPreviewTimer = null;
  }
  const requestSignature = currentConversionPreviewSignature();
  if (state.isProcessingPattern && activePreviewRequestSignature === requestSignature) return true;
  if (state.isPreviewDirty && state.previewPattern.length && pendingPreviewRequestSignature === requestSignature) {
    showQualityHint(message);
    return true;
  }
  const hadProcessingRequest = state.isProcessingPattern;
  const requestVersion = ++previewUpdateVersion;
  activePreviewRequestSignature = requestSignature;
  cancelPendingPaletteWorkerRequests();
  setPatternProcessingBusy(true);
  try {
    let result = null;
    const hasPendingBase = state.isPreviewDirty && state.previewPattern.length;
    const backgroundBase = hasPendingBase ? state.previewPattern : state.pattern;
    const canReuseBackgroundBase =
      options.backgroundOnly &&
      backgroundBase.length &&
      !hadProcessingRequest &&
      !hadScheduledColorLimitPreview;
    if (canReuseBackgroundBase) {
      const existingMask = hasPendingBase ? state.previewBackgroundMask : state.backgroundMask;
      const mask = existingMask || computeBackgroundMask(backgroundBase, backgroundBase, state.gridSize, true);
      result = {
        pattern: validateColorConstraints(applyBackgroundModeToGrid(backgroundBase, mask, state.pixelBackground)),
        backgroundMask: mask,
        size: state.gridSize,
        preservesManualEdits: hasPendingBase ? state.previewPreservesManualEdits : true,
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

    if (result.diagnostics) {
      applyColorDiagnostics(result.diagnostics, result.pattern, result.diagnostics.changedBy);
    }
    setPendingPreview(result.pattern, {
      backgroundMask: result.backgroundMask,
      preservesManualEdits: result.preservesManualEdits,
      size: result.size,
      signature: requestSignature,
    });
    renderPendingPreview();
    elements.projectMeta.textContent = `预览 / ${gridDimensionsLabel()} / ${totalBeadCount(result.pattern)} 颗 / ${state.previewCounts.size} 色`;
    showQualityHint(state.manualEditCount ? "当前已有手动编辑；确认应用新预览时会询问是否覆盖。" : message);
    markProjectDirty();
    return true;
  } catch (error) {
    if (requestVersion !== previewUpdateVersion) return false;
    console.error("生成预览失败", error);
    clearPreviewState({ restoreCanvas: true });
    elements.cellInfo.textContent = `生成预览失败：${error.message || error}`;
    return false;
  } finally {
    if (requestVersion === previewUpdateVersion) {
      activePreviewRequestSignature = "";
      setPatternProcessingBusy(false);
    }
  }
}

function applyPreviewToEditGrid() {
  if (!state.previewPattern.length) {
    elements.cellInfo.textContent = "当前没有可应用的预览。";
    return false;
  }
  const previewKind = state.previewKind;
  const previewChangedIndexes = [...state.previewChangedIndexes];
  if (state.pattern.length) pushHistory();
  // Preview generation already applies the active constraints. Commit the
  // exact pixels the user reviewed so switching to Edit cannot change them.
  state.pattern = [...state.previewPattern];
  if (!state.previewPreservesManualEdits) {
    state.manualEditedCells = new Set();
    state.manualEditCount = 0;
  }
  if (previewKind === "selectionOptimize") {
    previewChangedIndexes.forEach((index) => state.manualEditedCells.add(index));
    state.manualEditCount = state.manualEditedCells.size;
  }
  state.patternSize = state.gridSize;
  state.counts = buildCounts(state.pattern);
  state.projectPalette = [...state.counts.values()].sort((a, b) => b.count - a.count);
  state.qualityMetrics = calculateQualityMetrics(state.pattern, state.gridSize);
  state.usedBounds = calculateUsedBounds(state.pattern, state.gridSize);
  state.backgroundMask = state.previewBackgroundMask;
  refreshDiagnosticsFromCurrentPattern("applyPreview");
  clearPreviewState();
  state.hasConfirmedGrid = true;
  state.suspendHistory = false;
  state.editGridVersion += 1;
  renderPattern();
  renderStats();
  updateProtectionUi();
  updateHistoryButtons();
  elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 所需最小行列 ${state.usedBounds.width} x ${state.usedBounds.height}`;
  if (previewKind === "selectionOptimize") {
    showQualityHint(`局部优化已应用，共整理 ${previewChangedIndexes.length} 格；可随时撤回。`);
  } else {
    showQualityHint("预览已确认应用，现在可以进入编辑或导出。");
  }
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
  const previewKind = state.previewKind;
  clearPreviewState({ restoreCanvas: true });
  state.suspendHistory = false;
  refreshDiagnosticsFromCurrentPattern("discardPreview");
  renderPendingPreview();
  if (state.pattern.length) {
    const bounds = state.usedBounds || calculateUsedBounds(state.pattern, state.gridSize);
    elements.projectMeta.textContent = `${gridDimensionsLabel()} / ${totalBeadCount()} 颗 / ${state.counts.size} 色 / 所需最小行列 ${bounds.width} x ${bounds.height}`;
    elements.cellInfo.textContent = previewKind === "selectionOptimize"
      ? "已取消局部优化预览，正式图纸没有变化。"
      : "已放弃本次参数预览，保留当前已确认图纸。";
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
    if (label) {
      label.textContent = state.isProcessingPattern
        ? "正在生成参数预览…"
        : state.previewKind === "selectionOptimize"
          ? `局部优化预览：${state.previewChangedIndexes.length} 格待确认`
          : "参数已调整，当前是预览";
    }
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

  releaseCanvasMemory(sourceCanvas);
  return pixels;
}

function sampleCell(data, sampleSize, cellX, cellY, sampleScale) {
  const options = {
    patternMode: state.patternMode,
    processingProfile: state.processingProfile,
    animeMode: state.animeMode,
    removeTransparent: state.removeTransparent,
    lineBoost: state.lineBoost,
    outlineStrength: outlineStrengthForSize(),
    gridSize: state.gridSize,
    usesEmptyBackground: usesEmptyBackground(),
    pixelBackground: state.pixelBackground,
    whiteColor: whiteBeadColor().rgb,
    emptyCell: EMPTY_CELL,
  };
  if (!state.dominantSampling && (state.patternMode !== "pixelPattern" || state.processingProfile === "photoColor")) {
    return averagePixelSample(data, sampleSize, cellX, cellY, sampleScale, options);
  }
  return dominantSampleCell(data, sampleSize, cellX, cellY, sampleScale, options);
}

function usesEmptyBackground() {
  return state.pixelBackground !== "white";
}

function eraserFillColor() {
  return usesEmptyBackground() ? EMPTY_CELL : detectBackgroundColor(state.pattern, state.gridSize);
}

function computeBackgroundMask(pattern, pixels, size, force = false) {
  return computeGridBackgroundMask(pattern, pixels, size, {
    force,
    emptyBackground: usesEmptyBackground(),
  });
}

function applyBackgroundModeToGrid(pattern, mask, mode = state.pixelBackground) {
  return applyGridBackgroundMode(pattern, mask, {
    mode,
    whiteColor: whiteBeadColor(),
    emptyCell: EMPTY_CELL,
  });
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
  let processed = validateColorConstraints(pattern);
  const detailProfile = state.processingProfile === "detail64";
  const compactProfile = state.processingProfile === "compact48" && size <= 54;

  if (state.mergeSimilarColors) {
    const mergeLimit = detailProfile ? (size <= 64 ? 5.5 : 6) : compactProfile ? 8.5 : size <= 64 ? 7 : 8;
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

  if (compactProfile) {
    processed = capRegionPalettes(processed, size, "balanced");
  }
  processed = mergeLowUsageColors(processed, size, { strength: compactProfile ? "compact" : detailProfile ? "detail" : "light" });
  processed = forceMaxColors(processed, size, targetColorLimit(), lockedColorConvergenceOptions());
  const outlineStrength = outlineStrengthForSize();
  const needsStructuralPostprocess = outlineStrength >= 2;
  if (state.patternMode === "pixelPattern" && needsStructuralPostprocess) {
    processed = hardEdgePostProcess(processed, size);
  }
  processed = repairOutlines(processed, size, outlineStrength);
  if (needsStructuralPostprocess) {
    processed = forceMaxColors(processed, size, targetColorLimit(), lockedColorConvergenceOptions());
  }

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

function nearestColorFromList(color, candidates) {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => colorDistance(color, a) - colorDistance(color, b) || b.count - a.count)[0];
}

function capRegionPalettes(pattern, size, strength = "balanced") {
  const compactProfile = state.processingProfile === "compact48" && size <= 54;
  const maxColorsPerRegion = size <= 48
    ? strength === "strong" ? 3 : 4
    : compactProfile
      ? strength === "strong" ? 4 : 5
      : size <= 64
        ? strength === "strong" ? 5 : strength === "light" ? 7 : 6
        : 8;
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
  const protectedIndexes = new Set([...state.manualEditedCells, ...state.protectedCells]);
  for (let index = 0; index < pattern.length; index += 1) {
    const color = pattern[index];
    if (mask[index] || isColorLocked(color)) protectedIndexes.add(index);
  }
  return protectedIndexes;
}

function setProtectionMode(mode) {
  state.protectionMode = mode === "remove" ? "remove" : "add";
  updateProtectionUi();
  elements.cellInfo.textContent = state.protectionMode === "add"
    ? "保护画笔：划过的格子不会被局部清理或自动减色。"
    : "取消保护：划过的格子将恢复参与自动优化。";
}

function updateProtectionUi() {
  if (elements.protectedCellCount) elements.protectedCellCount.textContent = String(state.protectedCells.size);
  document.querySelectorAll(".protection-mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.protectionMode === state.protectionMode);
  });
}

function setSelectionProtection(protectedState) {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "请先确认或取消当前预览，再调整保护区域。";
    return false;
  }
  if (!state.selection.size) {
    elements.cellInfo.textContent = "请先用框选或钢笔选择需要保护的区域。";
    return false;
  }
  const targets = [...state.selection].filter((index) =>
    protectedState ? !state.protectedCells.has(index) : state.protectedCells.has(index),
  );
  if (!targets.length) {
    elements.cellInfo.textContent = protectedState ? "当前选区已经全部受保护。" : "当前选区没有保护格。";
    return false;
  }
  pushHistory();
  targets.forEach((index) => {
    if (protectedState) state.protectedCells.add(index);
    else state.protectedCells.delete(index);
  });
  updateProtectionUi();
  renderPattern();
  markProjectDirty();
  elements.cellInfo.textContent = `${protectedState ? "已保护" : "已取消保护"}选区中的 ${targets.length} 格。`;
  return true;
}

function updateProtectionAtCell(cell) {
  const cells = state.lastBrushCell ? interpolateCells(state.lastBrushCell, cell) : [cell];
  const dirtyCells = [];
  for (const point of cells) {
    for (const brushCell of brushCellsForPoint(point, activeEditorGeometryOptions())) {
      const index = brushCell.y * state.gridSize + brushCell.x;
      if (state.strokeVisited.has(index)) continue;
      if (state.pattern[index]?.empty) continue;
      state.strokeVisited.add(index);
      const wasProtected = state.protectedCells.has(index);
      if (state.protectionMode === "add") state.protectedCells.add(index);
      else state.protectedCells.delete(index);
      if (wasProtected === state.protectedCells.has(index)) continue;
      state.strokeChanged = true;
      dirtyCells.push(brushCell);
    }
  }
  state.lastBrushCell = cell;
  state.selectedCell = cell;
  if (dirtyCells.length) {
    updateProtectionUi();
    requestPatternRender(dirtyCells);
  }
}

function previewSelectionOptimization() {
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "请先确认或取消当前预览。";
    return false;
  }
  if (!state.pattern.length || !state.selection.size) {
    elements.cellInfo.textContent = "请先框选需要整理的小区域。";
    return false;
  }
  const protectedIndexes = buildProtectedIndexSet(state.pattern, state.gridSize);
  const result = optimizeSelection(state.pattern, state.selection, {
    stride: state.gridSize,
    width: activeGridWidth(),
    height: activeGridHeight(),
    protectedIndexes,
    minRegionSize: Math.max(2, Math.min(4, state.minRegionSize || 3)),
    maxDeltaE: state.gridSize <= 48 ? 10 : 12,
    colorDistance,
    isLocked: isColorLocked,
  });
  if (!result.changedIndexes.length) {
    elements.cellInfo.textContent = "当前选区没有适合安全合并的碎色，图纸保持不变。";
    return false;
  }
  setPendingPreview(result.pattern, {
    kind: "selectionOptimize",
    changedIndexes: result.changedIndexes,
    preservesManualEdits: true,
    backgroundMask: state.backgroundMask,
    size: state.gridSize,
  });
  renderPendingPreview();
  elements.projectMeta.textContent = `局部预览 / ${gridDimensionsLabel()} / 整理 ${result.changedIndexes.length} 格`;
  elements.cellInfo.textContent = `已整理 ${result.mergedRegions} 个小色块、共 ${result.changedIndexes.length} 格；请在顶部确认或放弃。`;
  return true;
}

function reviewSuspectColors() {
  if (!state.pattern.length) {
    elements.cellInfo.textContent = "当前还没有可检查的正式图纸。";
    return;
  }
  if (state.isPreviewDirty) {
    elements.cellInfo.textContent = "请先确认或取消当前预览，再检查疑似错色。";
    return;
  }
  if (state.rawSampleData.length !== state.pattern.length) {
    elements.cellInfo.textContent = "当前项目没有原图采样数据，无法判断疑似错色。";
    return;
  }
  const protectedIndexes = buildProtectedIndexSet(state.pattern, state.gridSize);
  if (state.backgroundMask?.length === state.pattern.length) {
    state.backgroundMask.forEach((isBackground, index) => {
      if (isBackground) protectedIndexes.add(index);
    });
  }
  state.colorReviewItems = buildSuspectColorReview(state.pattern, state.rawSampleData, effectiveAllowedPalette(), {
    protectedIndexes,
    isLocked: isColorLocked,
    getCandidates: nearestPaletteCandidates,
    getDistance: paletteMatchDistance,
    limit: 12,
    minimumError: 5,
    minimumImprovement: 2,
  });
  state.colorReviewGridVersion = state.editGridVersion;
  renderColorReviewPanel();
  elements.cellInfo.textContent = state.colorReviewItems.length
    ? `发现 ${state.colorReviewItems.length} 个建议复核的位置；只会在你点候选色后修改。`
    : "没有发现明显疑似错色，当前颜色匹配较稳定。";
}

function renderColorReviewPanel() {
  if (!elements.colorReviewPanel || !elements.colorReviewList) return;
  elements.colorReviewPanel.hidden = false;
  elements.colorReviewPanel.closest("details")?.setAttribute("open", "");
  if (elements.colorReviewSummary) elements.colorReviewSummary.textContent = `${state.colorReviewItems.length} 处`;
  if (!state.colorReviewItems.length) {
    elements.colorReviewList.innerHTML = '<p class="color-review-empty">暂未发现明显错色。</p>';
    return;
  }
  elements.colorReviewList.innerHTML = state.colorReviewItems.map((item, reviewIndex) => {
    const x = item.index % state.gridSize;
    const y = Math.floor(item.index / state.gridSize);
    const candidateButtons = item.candidates.filter((candidate) => candidate.code !== item.current.code).slice(0, 3).map((candidate) => `
      <button class="color-review-candidate" type="button" data-review-index="${reviewIndex}" data-color-code="${candidate.code}" title="替换为 ${candidate.code}">
        <span style="--review-color:${candidate.hex}"></span>${candidate.code}
      </button>
    `).join("");
    return `
      <article class="color-review-item">
        <button class="color-review-locate" type="button" data-review-index="${reviewIndex}" title="定位到画布">${x + 1},${y + 1}</button>
        <div><strong>${item.current.code}</strong><small>当前误差 ${item.currentError.toFixed(1)}</small></div>
        <div class="color-review-candidates">${candidateButtons}</div>
      </article>
    `;
  }).join("");
}

function handleColorReviewAction(event) {
  const button = event.target.closest("button[data-review-index]");
  if (!button) return;
  const reviewIndex = Number(button.dataset.reviewIndex);
  const item = state.colorReviewItems[reviewIndex];
  if (!item) return;
  if (state.colorReviewGridVersion !== state.editGridVersion || state.pattern[item.index]?.code !== item.current.code) {
    reviewSuspectColors();
    elements.cellInfo.textContent = "图纸已经变化，疑似错色列表已重新检查，请再选择一次。";
    return;
  }
  focusCanvasCell(item.index);
  const colorCode = button.dataset.colorCode;
  if (!colorCode) return;
  const color = paletteColorByCode(colorCode);
  if (!color || !applyColorToIndices([item.index], color)) return;
  elements.cellInfo.textContent = `已把 ${item.index % state.gridSize + 1},${Math.floor(item.index / state.gridSize) + 1} 从 ${item.current.code} 改为 ${color.code}，可撤回。`;
  reviewSuspectColors();
  markProjectDirty();
}

function focusCanvasCell(index) {
  const x = index % state.gridSize;
  const y = Math.floor(index / state.gridSize);
  state.selectedCell = { x, y };
  state.selection = new Set([index]);
  updateSelectionLabel();
  renderPattern();
  const plot = activePlotMetrics();
  const scaleX = elements.patternCanvas.clientWidth / Math.max(1, elements.patternCanvas.width);
  const scaleY = elements.patternCanvas.clientHeight / Math.max(1, elements.patternCanvas.height);
  const targetX = (plot.gridX + (x + 0.5) * plot.cell) * scaleX;
  const targetY = (plot.gridY + (y + 0.5) * plot.cell) * scaleY;
  elements.canvasWrap.scrollTo({
    left: Math.max(0, targetX - elements.canvasWrap.clientWidth / 2),
    top: Math.max(0, targetY - elements.canvasWrap.clientHeight / 2),
    behavior: "smooth",
  });
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

function detectBackgroundColor(pattern, size) {
  return detectGridBackgroundColor(pattern, size, whiteBeadColor());
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
  return countGridBackgroundNoise(pattern, size, usesEmptyBackground());
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

function checkBackgroundModeConsistency(pattern) {
  return checkGridBackgroundModeConsistency(pattern, state.pixelBackground);
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
  return calculateOutlineConnectivity(pattern, size, mask);
}

function countLowUsageColors(pattern) {
  const total = totalBeadCount(pattern);
  const base = state.gridSize === 48 ? 0.006 : state.gridSize === 64 ? 0.004 : 0.005;
  const threshold = Math.max(8, Math.min(24, Math.ceil(total * base)));
  return [...buildCounts(pattern).values()].filter((item) => item.count < threshold && !isColorLocked(item)).length;
}

function showQualityHint(prefix = "") {
  const metrics = displayQualityMetrics();
  if (!metrics) {
    if (prefix) elements.cellInfo.textContent = prefix;
    return "";
  }
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
    const match = state.colorMatchMetrics;
    elements.cellInfo.textContent = match
      ? `颜色匹配评分 ${match.colorMatchScore}%（平均 ΔE00 ${match.averageDeltaE}），拼豆友好度 ${metrics.beadFriendlinessScore}/10。`
      : `拼豆友好度 ${metrics.beadFriendlinessScore}/10，适合继续手动修边。`;
  }
  const hint = elements.cellInfo.textContent;
  if (prefix) elements.cellInfo.textContent = `${prefix} ${hint}`;
  return hint;
}

