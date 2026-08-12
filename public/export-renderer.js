(function initializeExportRenderer(global) {
  "use strict";

  function drawReadableExportWatermark(exportCtx, canvas, startY, endY, text = "小麦拼豆") {
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
        exportCtx.fillText(text, x + rowOffset, y);
      }
    }
    exportCtx.restore();
  }

  function drawReadableCells(exportCtx, options) {
    const {
      startX,
      startY,
      cellSize,
      pattern,
      widthCells,
      heightCells,
      stride,
      contrastColor,
    } = options;
    const plotWidth = widthCells * cellSize;
    const plotHeight = heightCells * cellSize;

    exportCtx.fillStyle = "#fff";
    exportCtx.fillRect(startX, startY, plotWidth, plotHeight);

    for (let y = 0; y < heightCells; y += 1) {
      for (let x = 0; x < widthCells; x += 1) {
        const item = pattern[y * stride + x];
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
    exportCtx.font = `${Math.max(10, Math.round(cellSize * 0.38))}px Arial, sans-serif`;
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

  function drawReadableLegend(exportCtx, options) {
    const {
      startX,
      startY,
      maxWidth,
      rows,
      contrastColor,
    } = options;
    const chipWidth = 148;
    const chipHeight = 50;
    const gap = 14;
    const columns = Math.max(1, Math.floor(maxWidth / (chipWidth + gap)));

    exportCtx.fillStyle = "#111";
    exportCtx.font = "900 25px Microsoft YaHei, sans-serif";
    exportCtx.textAlign = "left";
    exportCtx.fillText("色卡", startX, startY - 30);

    rows.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (chipWidth + gap);
      const y = startY + row * (chipHeight + gap);
      exportCtx.fillStyle = item.hex;
      exportCtx.fillRect(x, y, 40, 40);
      exportCtx.strokeStyle = "#111";
      exportCtx.lineWidth = 2;
      exportCtx.strokeRect(x, y, 40, 40);
      exportCtx.fillStyle = contrastColor(item.rgb);
      exportCtx.font = "900 14px Arial, sans-serif";
      exportCtx.textAlign = "center";
      exportCtx.textBaseline = "middle";
      exportCtx.fillText(item.code, x + 20, y + 20);
      exportCtx.textAlign = "left";
      exportCtx.fillStyle = "#111";
      exportCtx.font = "800 18px Arial, Microsoft YaHei, sans-serif";
      exportCtx.fillText(`x${item.count}`, x + 50, y + 25);
    });
  }

  function renderReadableExportCanvas(options) {
    const {
      document,
      pattern,
      counts,
      rows,
      widthCells,
      heightCells,
      stride,
      fileName,
      dimensionsLabel,
      totalBeads,
      contrastColor,
      includeWatermark = true,
      watermarkText = "小麦拼豆",
    } = options;
    const largestSide = Math.max(widthCells, heightCells);
    const cellSize = largestSide >= 120 ? 20 : largestSide >= 100 ? 24 : largestSide >= 64 ? 30 : 34;
    const margin = Math.max(72, Math.round(cellSize * 2.5));
    const top = Math.max(132, Math.round(cellSize * 3.5));
    const plotWidth = widthCells * cellSize;
    const plotHeight = heightCells * cellSize;
    const legendRows = Math.ceil(rows.length / Math.max(1, Math.floor(plotWidth / 162)));
    const legendHeight = Math.max(220, 76 + legendRows * 68);
    const canvas = document.createElement("canvas");
    canvas.width = margin * 2 + plotWidth;
    canvas.height = top + plotHeight + legendHeight;
    const exportCtx = canvas.getContext("2d");
    exportCtx.imageSmoothingEnabled = false;

    exportCtx.fillStyle = "#fffdf8";
    exportCtx.fillRect(0, 0, canvas.width, canvas.height);
    exportCtx.fillStyle = "#111";
    exportCtx.font = `900 ${Math.max(42, Math.round(cellSize * 1.25))}px Microsoft YaHei, sans-serif`;
    exportCtx.fillText(includeWatermark ? watermarkText : "拼豆图纸", margin, 60);
    exportCtx.font = `500 ${Math.max(24, Math.round(cellSize * 0.8))}px Arial, Microsoft YaHei, sans-serif`;
    exportCtx.textAlign = "right";
    exportCtx.fillText(`${fileName || "pattern"}   ${dimensionsLabel} / ${totalBeads}颗 / ${counts.size}色`, canvas.width - margin, 60);
    exportCtx.textAlign = "left";

    drawReadableCells(exportCtx, {
      startX: margin,
      startY: top,
      cellSize,
      pattern,
      widthCells,
      heightCells,
      stride,
      contrastColor,
    });
    drawReadableLegend(exportCtx, {
      startX: margin,
      startY: top + plotHeight + 66,
      maxWidth: canvas.width - margin * 2,
      rows,
      contrastColor,
    });
    if (includeWatermark) {
      drawReadableExportWatermark(exportCtx, canvas, top, top + plotHeight, watermarkText);
    }
    return canvas;
  }

  function buildVectorPdf(options) {
    const {
      pattern,
      counts,
      rows: colorRows,
      widthCells,
      heightCells,
      stride,
      guideEvery,
      fileName,
      dimensionsLabel,
      totalBeads,
      paletteSize,
      contrastColor,
      hexToRgb,
      pdfColor,
      pdfTextToken,
      pdfTextWidth,
      roundPdf,
      createPdf,
      includeWatermark = true,
      watermarkText = "小麦拼豆",
    } = options;
    const page = { width: 842, height: 595 };
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
    text(includeWatermark ? watermarkText : "拼豆图纸", margin, titleY, 16);
    text(`${dimensionsLabel} / ${totalBeads} beads / ${counts.size} colors / MARD ${paletteSize}`, page.width - margin, titleY, 10, "right");
    text(fileName || "pattern", margin, titleY + 18, 9);

    rect(startX, startY, plotWidth, plotHeight, "#ffffff");
    for (let y = 0; y < heightCells; y += 1) {
      for (let x = 0; x < widthCells; x += 1) {
        const item = pattern[y * stride + x];
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

    for (let index = 0; index <= widthCells; index += 1) {
      const pos = startX + index * cell;
      const guide = index % guideEvery === 0;
      strokeLine(pos, startY, pos, startY + plotHeight, guide ? "#8f88da" : "#d9d9d9", guide ? 0.7 : 0.25);
    }
    for (let index = 0; index <= heightCells; index += 1) {
      const guide = index % guideEvery === 0;
      const row = startY + index * cell;
      strokeLine(startX, row, startX + plotWidth, row, guide ? "#8f88da" : "#d9d9d9", guide ? 0.7 : 0.25);
    }
    strokeLine(startX, startY, startX + plotWidth, startY, "#111111", 1.1);
    strokeLine(startX, startY + plotHeight, startX + plotWidth, startY + plotHeight, "#111111", 1.1);
    strokeLine(startX, startY, startX, startY + plotHeight, "#111111", 1.1);
    strokeLine(startX + plotWidth, startY, startX + plotWidth, startY + plotHeight, "#111111", 1.1);

    const coordStep = Math.max(widthCells, heightCells) <= 64 ? 5 : 10;
    for (let index = 1; index <= widthCells; index += 1) {
      if (index === 1 || index % coordStep === 0 || index === widthCells) {
        const center = startX + (index - 0.5) * cell;
        text(index, center, startY - 7, 5, "center");
      }
    }
    for (let index = 1; index <= heightCells; index += 1) {
      if (index === 1 || index % coordStep === 0 || index === heightCells) {
        const rowCenter = startY + (index - 0.5) * cell;
        text(index, startX - 10, rowCenter + 1.5, 5, "right");
      }
    }

    text("Color List", legendX, 74, 13);
    const maxLegendRows = 45;
    const columns = Math.max(1, Math.ceil(colorRows.length / maxLegendRows));
    const rowsPerColumn = Math.max(1, Math.ceil(colorRows.length / columns));
    const columnWidth = legendWidth / columns;
    const rowH = Math.min(16, (page.height - 112) / rowsPerColumn);
    colorRows.forEach((item, index) => {
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
          text(watermarkText, x, y, 15, "center", "#f5e8ed");
        }
      }
    }
    return createPdf(page.width, page.height, commands.join("\n"));
  }

  global.XiaomaiExportRenderer = Object.freeze({
    buildVectorPdf,
    drawReadableCells,
    drawReadableExportWatermark,
    drawReadableLegend,
    renderReadableExportCanvas,
  });
})(window);
