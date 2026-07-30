(function initializePreprocessUtils(global) {
  "use strict";

  const imageUtils = global.XiaomaiImageUtils;
  if (!imageUtils) {
    throw new Error("图片工具模块加载失败，无法初始化底图预处理。");
  }

  const {
    averagePreprocessPixels,
    buildConnectedBaseBackgroundMask,
    colorDistanceData,
    colorDistanceRgb,
    estimatePreprocessEdgeBackground,
    isPreprocessNearBackground,
    preprocessFourNeighbors,
    preprocessLuminance,
    preprocessSaturation,
    quantizeChannel,
  } = imageUtils;

  function cloneImageData(imageData) {
    return new global.ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height,
    );
  }

  function cleanupBaseImageBackground(imageData, outlineMask, options = {}) {
    const { data, width, height } = imageData;
    const output = cloneImageData(imageData);
    const out = output.data;
    const edge = estimatePreprocessEdgeBackground(data, width, height);
    const fill = options.fillColor || { r: 255, g: 255, b: 255 };
    const connectedBackground = buildConnectedBaseBackgroundMask(data, width, height, edge, outlineMask);
    for (let index = 0; index < connectedBackground.length; index += 1) {
      if (!connectedBackground[index]) continue;
      const offset = index * 4;
      if (options.pixelBackground === "white") {
        out[offset] = fill.r;
        out[offset + 1] = fill.g;
        out[offset + 2] = fill.b;
        out[offset + 3] = 255;
      } else {
        out[offset + 3] = 0;
      }
    }
    return output;
  }

  function cleanupAntiAliasPixels(imageData, outlineMask, options = {}) {
    const { data, width, height } = imageData;
    const output = cloneImageData(imageData);
    const out = output.data;
    const fill = options.fillColor || { r: 255, g: 255, b: 255 };
    const edge = estimatePreprocessEdgeBackground(data, width, height);
    const connectedBackground = buildConnectedBaseBackgroundMask(data, width, height, edge, outlineMask);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (outlineMask[index]) continue;
        const offset = index * 4;
        const alpha = data[offset + 3];
        const lum = preprocessLuminance(data[offset], data[offset + 1], data[offset + 2]);
        const saturation = preprocessSaturation(data[offset], data[offset + 1], data[offset + 2]);
        const neighbors = preprocessFourNeighbors(x, y, width, height);
        const hasSolidNeighbor = neighbors.some((next) => data[next * 4 + 3] > 230);
        const touchesTransparent = neighbors.some((next) => data[next * 4 + 3] < 48);
        const isConnectedBackground = Boolean(connectedBackground[index]);
        const shouldCleanPartialEdge = alpha > 35 && alpha < 210 && hasSolidNeighbor && (isConnectedBackground || touchesTransparent);
        const shouldCleanLightBackground = lum > 218 && saturation < 28 && isConnectedBackground;
        if (shouldCleanPartialEdge || shouldCleanLightBackground) {
          if (options.pixelBackground === "white") {
            out[offset] = fill.r;
            out[offset + 1] = fill.g;
            out[offset + 2] = fill.b;
            out[offset + 3] = 255;
          } else {
            out[offset + 3] = 0;
          }
        }
      }
    }
    return output;
  }

  function cleanupMaterialTexture(imageData, outlineMask, options = {}) {
    const { data, width, height } = imageData;
    const output = cloneImageData(imageData);
    const out = output.data;
    const bins = new Uint32Array(width * height);
    const strength = options.strength || "standard";
    const radius = strength === "light" || options.processingProfile === "photoColor"
      ? 1
      : options.gridSize <= 64
        ? 2
        : 1;

    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      if (data[offset + 3] < 48) continue;
      bins[index] = 1 + (Math.floor(data[offset] / 24) << 8) + (Math.floor(data[offset + 1] / 24) << 4) + Math.floor(data[offset + 2] / 24);
    }

    for (let y = radius; y < height - radius; y += 1) {
      for (let x = radius; x < width - radius; x += 1) {
        const index = y * width + x;
        if (outlineMask[index]) continue;
        const offset = index * 4;
        if (data[offset + 3] < 48) continue;

        const keys = [];
        const counts = [];
        const samples = [];
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const next = (y + dy) * width + (x + dx);
            if (!bins[next] || outlineMask[next]) continue;
            const key = bins[next];
            let slot = keys.indexOf(key);
            if (slot < 0) {
              slot = keys.length;
              keys.push(key);
              counts.push(0);
              samples.push([]);
            }
            counts[slot] += 1;
            samples[slot].push(next);
          }
        }
        if (!counts.length) continue;
        let winner = 0;
        for (let slot = 1; slot < counts.length; slot += 1) {
          if (counts[slot] > counts[winner]) winner = slot;
        }
        const minimumShare = strength === "light" ? 0.42 : radius === 2 ? 0.28 : 0.34;
        const sampleCount = counts.reduce((sum, count) => sum + count, 0);
        if (counts[winner] < Math.ceil(sampleCount * minimumShare)) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        for (const sample of samples[winner]) {
          const sampleOffset = sample * 4;
          r += data[sampleOffset];
          g += data[sampleOffset + 1];
          b += data[sampleOffset + 2];
        }
        r /= samples[winner].length;
        g /= samples[winner].length;
        b /= samples[winner].length;
        let representative = samples[winner][0];
        let bestDistance = Infinity;
        for (const sample of samples[winner]) {
          const sampleOffset = sample * 4;
          const distance = colorDistanceRgb(data[sampleOffset], data[sampleOffset + 1], data[sampleOffset + 2], r, g, b);
          if (distance < bestDistance) {
            bestDistance = distance;
            representative = sample;
          }
        }
        const representativeOffset = representative * 4;
        const replacementDistance = colorDistanceRgb(
          data[offset],
          data[offset + 1],
          data[offset + 2],
          data[representativeOffset],
          data[representativeOffset + 1],
          data[representativeOffset + 2],
        );
        const maximumReplacementDistance = strength === "light" ? 28 : 46;
        if (replacementDistance < 7 || replacementDistance > maximumReplacementDistance) continue;
        out[offset] = data[representativeOffset];
        out[offset + 1] = data[representativeOffset + 1];
        out[offset + 2] = data[representativeOffset + 2];
      }
    }
    return output;
  }

  function reduceBaseImageNoise(imageData, outlineMask) {
    const { data, width, height } = imageData;
    const output = cloneImageData(imageData);
    const out = output.data;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (outlineMask[index]) continue;
        const offset = index * 4;
        if (data[offset + 3] < 32) continue;
        const neighbors = preprocessFourNeighbors(x, y, width, height);
        const similar = neighbors.filter((next) => colorDistanceData(data, offset, next * 4) < 22).length;
        if (similar > 0) continue;
        const replacement = averagePreprocessPixels(data, neighbors);
        out[offset] = replacement.r;
        out[offset + 1] = replacement.g;
        out[offset + 2] = replacement.b;
        out[offset + 3] = replacement.a;
      }
    }
    return output;
  }

  function simplifyBaseImageFlatColors(imageData, outlineMask, options = {}) {
    const { data, width, height } = imageData;
    const output = cloneImageData(imageData);
    const out = output.data;
    const step = options.processingProfile === "photoColor"
      ? 10
      : options.gridSize <= 48
        ? 22
        : options.gridSize <= 64
          ? 18
          : 14;
    for (let index = 0; index < width * height; index += 1) {
      if (outlineMask[index]) continue;
      const offset = index * 4;
      if (data[offset + 3] < 32) continue;
      if (isPreprocessNearBackground(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) continue;
      out[offset] = quantizeChannel(data[offset], step);
      out[offset + 1] = quantizeChannel(data[offset + 1], step);
      out[offset + 2] = quantizeChannel(data[offset + 2], step);
    }
    return output;
  }

  function stabilizeBaseImageRegions(imageData, outlineMask, options = {}) {
    const { data, width, height } = imageData;
    const output = cloneImageData(imageData);
    const out = output.data;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (outlineMask[index]) continue;
        const offset = index * 4;
        if (data[offset + 3] < 32) continue;
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const next = (y + dy) * width + (x + dx);
            if (!outlineMask[next]) neighbors.push(next);
          }
        }
        const avg = averagePreprocessPixels(data, neighbors);
        const photoProfile = options.processingProfile === "photoColor";
        const stabilizationDistance = photoProfile ? 18 : 32;
        const sourceWeight = photoProfile ? 0.75 : 0.55;
        if (colorDistanceRgb(data[offset], data[offset + 1], data[offset + 2], avg.r, avg.g, avg.b) < stabilizationDistance) {
          out[offset] = Math.round(data[offset] * sourceWeight + avg.r * (1 - sourceWeight));
          out[offset + 1] = Math.round(data[offset + 1] * sourceWeight + avg.g * (1 - sourceWeight));
          out[offset + 2] = Math.round(data[offset + 2] * sourceWeight + avg.b * (1 - sourceWeight));
        }
      }
    }
    return output;
  }

  global.XiaomaiPreprocessUtils = Object.freeze({
    cleanupAntiAliasPixels,
    cleanupBaseImageBackground,
    cleanupMaterialTexture,
    reduceBaseImageNoise,
    simplifyBaseImageFlatColors,
    stabilizeBaseImageRegions,
  });
})(window);
