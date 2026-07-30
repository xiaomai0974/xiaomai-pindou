(function initializeImageUtils(global) {
  "use strict";

  function preprocessLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function preprocessSaturation(r, g, b) {
    return Math.max(r, g, b) - Math.min(r, g, b);
  }

  function preprocessFourNeighbors(x, y, width, height) {
    const neighbors = [];
    if (x > 0) neighbors.push(y * width + x - 1);
    if (x < width - 1) neighbors.push(y * width + x + 1);
    if (y > 0) neighbors.push((y - 1) * width + x);
    if (y < height - 1) neighbors.push((y + 1) * width + x);
    return neighbors;
  }

  function averagePreprocessPixels(data, indexes) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let count = 0;
    for (const index of indexes) {
      const offset = index * 4;
      if (data[offset + 3] < 16) continue;
      r += data[offset];
      g += data[offset + 1];
      b += data[offset + 2];
      a += data[offset + 3];
      count += 1;
    }
    return count
      ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), a: Math.round(a / count) }
      : { r: 255, g: 255, b: 255, a: 0 };
  }

  function quantizeChannel(value, step) {
    return Math.max(0, Math.min(255, Math.round(value / step) * step));
  }

  function colorDistanceRgb(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function colorDistanceData(data, offsetA, offsetB) {
    return colorDistanceRgb(data[offsetA], data[offsetA + 1], data[offsetA + 2], data[offsetB], data[offsetB + 1], data[offsetB + 2]);
  }

  function isPreprocessNearBackground(r, g, b, alpha) {
    if (alpha < 48) return true;
    const saturation = preprocessSaturation(r, g, b);
    return (r > 232 && g > 232 && b > 224 && saturation < 36) || (Math.max(r, g, b) > 238 && saturation < 22);
  }

  function removeTinyPreprocessMaskParts(mask, width, height) {
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
        const x = current % width;
        const y = Math.floor(current / width);
        for (const next of preprocessFourNeighbors(x, y, width, height)) {
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
      if (cells.length < 3) {
        for (const cell of cells) cleaned[cell] = 0;
      }
    }
    return cleaned;
  }

  function buildPreprocessOutlineMask(data, width, height) {
    const mask = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        const offset = index * 4;
        const alpha = data[offset + 3];
        if (alpha < 48) continue;
        const lum = preprocessLuminance(data[offset], data[offset + 1], data[offset + 2]);
        if (lum > 98) continue;
        let maxContrast = 0;
        let darkSimilar = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const neighborOffset = ((y + dy) * width + (x + dx)) * 4;
            if (data[neighborOffset + 3] < 48) continue;
            const neighborLum = preprocessLuminance(
              data[neighborOffset],
              data[neighborOffset + 1],
              data[neighborOffset + 2],
            );
            maxContrast = Math.max(maxContrast, Math.abs(neighborLum - lum));
            if (neighborLum < 110 && Math.abs(neighborLum - lum) < 24) darkSimilar += 1;
          }
        }
        if (maxContrast >= 34 && (darkSimilar >= 1 || lum < 56)) {
          mask[index] = 1;
        }
      }
    }
    return removeTinyPreprocessMaskParts(mask, width, height);
  }

  function hasStrongLocalImageBoundary(data, index, width, height) {
    const x = index % width;
    const y = Math.floor(index / width);
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x < width - 1) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - width);
    if (y < height - 1) neighbors.push(index + width);
    return neighbors.some((next) => {
      const neighborOffset = next * 4;
      if (data[neighborOffset + 3] < 96) return false;
      const maxChannelDelta = Math.max(
        Math.abs(r - data[neighborOffset]),
        Math.abs(g - data[neighborOffset + 1]),
        Math.abs(b - data[neighborOffset + 2]),
      );
      return maxChannelDelta >= 30;
    });
  }

  function buildConnectedBaseBackgroundMask(data, width, height, edge, outlineMask = null) {
    const mask = new Uint8Array(width * height);
    const queue = [];
    const edgeSaturation = Math.max(edge.r, edge.g, edge.b) - Math.min(edge.r, edge.g, edge.b);
    const edgeLuminance = preprocessLuminance(edge.r, edge.g, edge.b);
    const distanceLimit = edgeLuminance >= 215 && edgeSaturation <= 42 ? 34 : 24;
    const isCandidate = (index) => {
      if (outlineMask?.[index]) return false;
      const offset = index * 4;
      const alpha = data[offset + 3];
      if (alpha < 48) return true;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const distance = colorDistanceRgb(r, g, b, edge.r, edge.g, edge.b);
      const x = index % width;
      const y = Math.floor(index / width);
      const isOuterEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (!isOuterEdge && alpha >= 180 && hasStrongLocalImageBoundary(data, index, width, height)) return false;
      if (distance <= distanceLimit) return true;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const lightNeutral = r > 226 && g > 226 && b > 216 && saturation < 42;
      return lightNeutral && distance <= distanceLimit + 10;
    };
    const push = (index) => {
      if (mask[index] || !isCandidate(index)) return;
      mask[index] = 1;
      queue.push(index);
    };

    for (let x = 0; x < width; x += 1) {
      push(x);
      push((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      push(y * width);
      push(y * width + width - 1);
    }

    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) push(index - 1);
      if (x < width - 1) push(index + 1);
      if (y > 0) push(index - width);
      if (y < height - 1) push(index + width);
    }
    return mask;
  }

  function restorePreprocessOutlines(original, target, outlineMask) {
    for (let index = 0; index < outlineMask.length; index += 1) {
      if (!outlineMask[index]) continue;
      const offset = index * 4;
      target.data[offset] = original.data[offset];
      target.data[offset + 1] = original.data[offset + 1];
      target.data[offset + 2] = original.data[offset + 2];
      target.data[offset + 3] = original.data[offset + 3];
    }
  }

  function estimatePreprocessEdgeBackground(data, width, height) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    const add = (x, y) => {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3] / 255;
      r += data[offset] * alpha + 255 * (1 - alpha);
      g += data[offset + 1] * alpha + 255 * (1 - alpha);
      b += data[offset + 2] * alpha + 255 * (1 - alpha);
      count += 1;
    };
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 80))) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 80))) {
      add(0, y);
      add(width - 1, y);
    }
    return { r: r / count, g: g / count, b: b / count };
  }

  global.XiaomaiImageUtils = Object.freeze({
    averagePreprocessPixels,
    buildConnectedBaseBackgroundMask,
    buildPreprocessOutlineMask,
    colorDistanceData,
    colorDistanceRgb,
    estimatePreprocessEdgeBackground,
    hasStrongLocalImageBoundary,
    isPreprocessNearBackground,
    preprocessFourNeighbors,
    preprocessLuminance,
    preprocessSaturation,
    quantizeChannel,
    removeTinyPreprocessMaskParts,
    restorePreprocessOutlines,
  });
})(window);
