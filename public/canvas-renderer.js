(function initializeCanvasRenderer(global) {
  "use strict";

  function fullBounds(plot) {
    return { minX: 0, minY: 0, maxX: plot.widthCells - 1, maxY: plot.heightCells - 1 };
  }

  function drawSquareBead(ctx, x, y, cell, item) {
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

  function drawPatternCells(ctx, options) {
    const {
      pattern,
      stride,
      plot,
      bounds = fullBounds(plot),
      viewMode = "pixel",
      detail = "full",
    } = options;
    const cell = plot.cell;

    if (detail === "coarse" && viewMode !== "bead") {
      for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
        let runStart = bounds.minX;
        let runColor = null;
        for (let x = bounds.minX; x <= bounds.maxX + 1; x += 1) {
          const item = x <= bounds.maxX ? pattern[y * stride + x] : null;
          const nextColor = item ? (item.empty ? "#fff" : item.hex) : null;
          if (nextColor === runColor) continue;
          if (runColor) {
            ctx.fillStyle = runColor;
            ctx.fillRect(plot.gridX + runStart * cell, plot.gridY + y * cell, (x - runStart) * cell, cell);
          }
          runStart = x;
          runColor = nextColor;
        }
      }
      return;
    }

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const item = pattern[y * stride + x];
        const cellX = plot.gridX + x * cell;
        const cellY = plot.gridY + y * cell;
        if (item.empty) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(cellX, cellY, cell, cell);
        } else if (viewMode === "bead") {
          drawSquareBead(ctx, cellX, cellY, cell, item);
        } else if (viewMode === "clean") {
          ctx.fillStyle = item.hex;
          ctx.fillRect(cellX, cellY, cell, cell);
        } else {
          ctx.fillStyle = item.hex;
          ctx.fillRect(cellX + 0.7, cellY + 0.7, Math.max(1, cell - 1.4), Math.max(1, cell - 1.4));
        }
      }
    }
  }

  function drawCellCode(ctx, item, x, y, cell, options = {}) {
    const isGridEditor = options.editorView === "grid";
    if (cell < (isGridEditor ? 8 : 7.5)) return;
    ctx.save();
    ctx.font = `900 ${Math.max(isGridEditor ? 6 : 5, cell * (isGridEditor ? 0.42 : 0.34))}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = options.contrastColor(item.rgb);
    ctx.fillText(item.code, x + cell / 2, y + cell / 2);
    ctx.restore();
  }

  function drawPatternCellCodes(ctx, options) {
    const {
      pattern,
      stride,
      plot,
      bounds = fullBounds(plot),
      editorView,
      contrastColor,
    } = options;
    const cell = plot.cell;
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const item = pattern[y * stride + x];
        if (!item || item.empty) continue;
        drawCellCode(ctx, item, plot.gridX + x * cell, plot.gridY + y * cell, cell, {
          editorView,
          contrastColor,
        });
      }
    }
  }

  function drawGridLines(ctx, options) {
    const {
      plot,
      bounds = fullBounds(plot),
      detail,
      guide,
      pathCache,
      pathCacheKey = "",
      Path2DClass,
      partial = false,
    } = options;
    const cell = plot.cell;

    ctx.save();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(plot.gridX, plot.gridY, plot.gridWidth, plot.gridHeight);

    if (!partial && typeof Path2DClass === "function") {
      const signature = [
        pathCacheKey,
        plot.gridX,
        plot.gridY,
        plot.gridWidth,
        plot.gridHeight,
        plot.widthCells,
        plot.heightCells,
        cell,
        detail,
        guide,
      ].join(":");
      if (pathCache.signature !== signature) {
        const minor = new Path2DClass();
        const guideLines = new Path2DClass();
        for (let index = 0; index <= plot.widthCells; index += 1) {
          if (detail === "coarse" && index % guide !== 0) continue;
          const path = index % guide === 0 ? guideLines : minor;
          const vertical = plot.gridX + index * cell;
          path.moveTo(vertical, plot.gridY);
          path.lineTo(vertical, plot.gridY + plot.gridHeight);
        }
        for (let index = 0; index <= plot.heightCells; index += 1) {
          if (detail === "coarse" && index % guide !== 0) continue;
          const path = index % guide === 0 ? guideLines : minor;
          const horizontal = plot.gridY + index * cell;
          path.moveTo(plot.gridX, horizontal);
          path.lineTo(plot.gridX + plot.gridWidth, horizontal);
        }
        pathCache.signature = signature;
        pathCache.minor = minor;
        pathCache.guide = guideLines;
      }
      ctx.strokeStyle = "rgba(216,216,216,0.9)";
      ctx.lineWidth = 0.75;
      ctx.stroke(pathCache.minor);
      ctx.strokeStyle = "#a8a2e5";
      ctx.lineWidth = 1.6;
      ctx.stroke(pathCache.guide);
      ctx.restore();
      return;
    }

    for (let index = bounds.minX; index <= bounds.maxX + 1; index += 1) {
      if (detail === "coarse" && index % guide !== 0) continue;
      const vertical = plot.gridX + index * cell;
      ctx.beginPath();
      ctx.strokeStyle = index % guide === 0 ? "#a8a2e5" : "rgba(216,216,216,0.9)";
      ctx.lineWidth = index % guide === 0 ? 1.6 : 0.75;
      ctx.moveTo(vertical, plot.gridY);
      ctx.lineTo(vertical, plot.gridY + plot.gridHeight);
      ctx.stroke();
    }

    for (let index = bounds.minY; index <= bounds.maxY + 1; index += 1) {
      if (detail === "coarse" && index % guide !== 0) continue;
      const horizontal = plot.gridY + index * cell;
      ctx.beginPath();
      ctx.strokeStyle = index % guide === 0 ? "#a8a2e5" : "rgba(216,216,216,0.9)";
      ctx.lineWidth = index % guide === 0 ? 1.6 : 0.75;
      ctx.moveTo(plot.gridX, horizontal);
      ctx.lineTo(plot.gridX + plot.gridWidth, horizontal);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoordinateLabels(ctx, options) {
    const { plot, detail, editorView } = options;
    if (detail === "coarse") return;
    const cell = plot.cell;
    const isGridEditor = editorView === "grid";
    ctx.save();
    ctx.fillStyle = "#9b9b9b";
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

  function drawReferenceLayer(ctx, options) {
    const {
      image,
      geometry,
      opacity,
      adjustMode,
      locked,
      lockedLabel,
      movableLabel,
    } = options;
    if (!image || !geometry) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      geometry.left,
      geometry.top,
      geometry.width,
      geometry.height,
    );
    ctx.restore();

    if (!adjustMode) return;
    ctx.save();
    ctx.strokeStyle = locked ? "#111" : "#e82f63";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(geometry.left, geometry.top, geometry.width, geometry.height);
    ctx.setLineDash([]);
    ctx.fillStyle = locked ? "#111" : "#e82f63";
    ctx.font = "900 22px Microsoft YaHei, sans-serif";
    ctx.fillText(locked ? lockedLabel : movableLabel, geometry.left + 10, Math.max(28, geometry.top - 10));
    ctx.restore();
  }

  function drawSelectedCell(ctx, options) {
    const { selectedCell, plot } = options;
    if (!selectedCell) return;
    const cell = plot.cell;
    const x = plot.gridX + selectedCell.x * cell;
    const y = plot.gridY + selectedCell.y * cell;
    ctx.save();
    ctx.strokeStyle = "#ff4d5d";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.restore();
  }

  function drawSelectionOverlay(ctx, options) {
    const {
      selection,
      penPoints,
      stride,
      plot,
      bounds,
      isActiveCell,
    } = options;
    const cell = plot.cell;

    ctx.save();
    ctx.fillStyle = "rgba(232, 59, 100, 0.22)";
    ctx.strokeStyle = "#e83b64";
    ctx.lineWidth = Math.max(1, cell * 0.12);
    for (const index of selection) {
      const x = index % stride;
      const y = Math.floor(index / stride);
      if (!isActiveCell(x, y)) continue;
      if (bounds && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY)) continue;
      ctx.fillRect(plot.gridX + x * cell + 1, plot.gridY + y * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2));
    }

    if (penPoints.length) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.beginPath();
      penPoints.forEach((point, index) => {
        const px = plot.gridX + (point.x + 0.5) * cell;
        const py = plot.gridY + (point.y + 0.5) * cell;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      for (const point of penPoints) {
        ctx.fillStyle = "#e83b64";
        ctx.fillRect(plot.gridX + (point.x + 0.25) * cell, plot.gridY + (point.y + 0.25) * cell, cell * 0.5, cell * 0.5);
      }
    }
    ctx.restore();
  }

  global.XiaomaiCanvasRenderer = Object.freeze({
    drawCellCode,
    drawCoordinateLabels,
    drawGridLines,
    drawPatternCellCodes,
    drawPatternCells,
    drawReferenceLayer,
    drawSelectedCell,
    drawSelectionOverlay,
    drawSquareBead,
  });
})(window);
