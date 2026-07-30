(function initializeBackgroundUtils(global) {
  "use strict";

  const colorUtils = global.XiaomaiColorUtils;
  const gridUtils = global.XiaomaiGridUtils;
  if (!colorUtils || !gridUtils) {
    throw new Error("颜色或网格模块加载失败，无法初始化背景处理。");
  }

  const { colorDistance } = colorUtils;
  const {
    countNeighborColors,
    getEightNeighbors,
    getFourNeighbors,
    isBorderIndex,
  } = gridUtils;

  function isLikelyBackgroundColor(color) {
    if (!color || color.empty) return true;
    const { r, g, b } = color.rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    return (r >= 228 && g >= 228 && b >= 220 && saturation < 34) || (color.lab.l > 88 && saturation < 42);
  }

  function detectEdgeBackgroundColors(pattern, size) {
    const entries = new Map();
    const add = (color, side) => {
      if (!color || color.empty) return;
      const key = color.code || color.hex;
      const entry = entries.get(key) || { color, count: 0, sides: new Set() };
      entry.count += 1;
      entry.sides.add(side);
      entries.set(key, entry);
    };
    for (let i = 0; i < size; i += 1) {
      add(pattern[i], "top");
      add(pattern[(size - 1) * size + i], "bottom");
      add(pattern[i * size], "left");
      add(pattern[i * size + size - 1], "right");
    }
    const borderCellCount = Math.max(1, size * 4 - 4);
    return [...entries.values()]
      .filter((entry) => {
        if (isLikelyBackgroundColor(entry.color)) {
          return (
            (entry.sides.size >= 3 && entry.count >= Math.max(8, size * 0.12)) ||
            entry.count >= Math.max(10, size * 0.55)
          );
        }
        const broadCoverage = entry.sides.size >= 3 && entry.count >= Math.max(6, borderCellCount * 0.035);
        const dominantCoverage = entry.sides.size >= 2 && entry.count >= Math.max(10, borderCellCount * 0.08);
        return broadCoverage || dominantCoverage;
      })
      .sort((a, b) => b.sides.size - a.sides.size || b.count - a.count)
      .slice(0, 4)
      .map((entry) => entry.color);
  }

  function buildBackgroundProtectionMask(pattern, size) {
    const mask = new Uint8Array(pattern.length);
    for (let index = 0; index < pattern.length; index += 1) {
      const color = pattern[index];
      if (!color || color.empty || !color.lab) continue;
      const x = index % size;
      const y = Math.floor(index / size);
      const neighbors = getEightNeighbors(x, y, size)
        .map((neighbor) => pattern[neighbor])
        .filter((item) => item && !item.empty && item.lab);
      if (neighbors.length < 2) continue;
      const maxContrast = Math.max(...neighbors.map((neighbor) => colorDistance(color, neighbor)));
      const similarNeighbors = neighbors.filter((neighbor) => colorDistance(color, neighbor) <= 12).length;
      const saturation = Math.max(color.rgb.r, color.rgb.g, color.rgb.b) - Math.min(color.rgb.r, color.rgb.g, color.rgb.b);
      const darkStructure = color.lab.l < 54 && maxContrast >= 24 && similarNeighbors >= 1;
      const accentStructure = saturation >= 72 && maxContrast >= 32 && similarNeighbors >= 2;
      const lightStructure =
        color.lab.l >= 76 &&
        maxContrast >= 20 &&
        similarNeighbors >= 2 &&
        neighbors.some((neighbor) => neighbor.lab.l <= color.lab.l - 16);
      if (darkStructure || accentStructure || lightStructure) mask[index] = 1;
    }

    const protectedWithClosedGaps = new Uint8Array(mask);
    const directions = [
      [-1, 0, 1, 0],
      [0, -1, 0, 1],
      [-1, -1, 1, 1],
      [1, -1, -1, 1],
    ];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = y * size + x;
        if (mask[index]) continue;
        const closesGap = directions.some(([ax, ay, bx, by]) => {
          const x1 = x + ax;
          const y1 = y + ay;
          const x2 = x + bx;
          const y2 = y + by;
          if (x1 < 0 || y1 < 0 || x1 >= size || y1 >= size || x2 < 0 || y2 < 0 || x2 >= size || y2 >= size) return false;
          return Boolean(mask[y1 * size + x1] && mask[y2 * size + x2]);
        });
        if (closesGap) protectedWithClosedGaps[index] = 1;
      }
    }
    return protectedWithClosedGaps;
  }

  function computeBackgroundMask(pattern, pixels, size, options = {}) {
    if (!options.force && !options.emptyBackground) return new Uint8Array(pattern.length);
    const edgeBackgroundColors = detectEdgeBackgroundColors(pattern, size);
    const protectionMask = buildBackgroundProtectionMask(pattern, size);
    const visited = new Uint8Array(pattern.length);
    const queue = [];
    const pushIfBackground = (index) => {
      if (visited[index] || protectionMask[index]) return;
      const sample = pixels[index];
      const color = pattern[index];
      const backgroundLike =
        sample?.empty ||
        sample?.background ||
        color.empty ||
        edgeBackgroundColors.some((edgeColor) => colorDistance(color, edgeColor) <= 10);
      if (!backgroundLike) return;
      visited[index] = 1;
      queue.push(index);
    };

    for (let i = 0; i < size; i += 1) {
      pushIfBackground(i);
      pushIfBackground((size - 1) * size + i);
      pushIfBackground(i * size);
      pushIfBackground(i * size + size - 1);
    }

    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      const x = index % size;
      const y = Math.floor(index / size);
      for (const nextIndex of getFourNeighbors(x, y, size)) {
        pushIfBackground(nextIndex);
      }
    }

    return visited;
  }

  function applyBackgroundModeToGrid(pattern, mask, options = {}) {
    if (!mask || !mask.length) return [...pattern];
    const fill = options.mode === "white" ? options.whiteColor : options.emptyCell;
    return pattern.map((color, index) => (mask[index] ? fill : color));
  }

  function detectBackgroundColor(pattern, size, fallbackColor) {
    const borderColors = [];
    for (let i = 0; i < size; i += 1) {
      borderColors.push(pattern[i], pattern[(size - 1) * size + i], pattern[i * size], pattern[i * size + size - 1]);
    }
    const counted = countNeighborColors(borderColors);
    counted.sort((a, b) => b.count - a.count);
    return counted[0]?.color || fallbackColor;
  }

  function countBackgroundNoise(pattern, size, emptyBackground) {
    if (!emptyBackground) return 0;
    let noise = 0;
    for (let index = 0; index < pattern.length; index += 1) {
      const item = pattern[index];
      if (item.empty) continue;
      if (isBorderIndex(index, size) || isLikelyBackgroundColor(item)) noise += 1;
    }
    return noise;
  }

  function checkBackgroundModeConsistency(pattern, mode) {
    if (mode === "white") return pattern.some((item) => !item.empty) ? 1 : 0;
    return pattern.some((item) => item.empty) ? 1 : 0;
  }

  global.XiaomaiBackgroundUtils = Object.freeze({
    applyBackgroundModeToGrid,
    buildBackgroundProtectionMask,
    checkBackgroundModeConsistency,
    computeBackgroundMask,
    countBackgroundNoise,
    detectBackgroundColor,
    detectEdgeBackgroundColors,
    isLikelyBackgroundColor,
  });
})(window);
