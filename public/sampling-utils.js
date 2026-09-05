(function initializeSamplingUtils(global) {
  "use strict";

  function isBackgroundLikePixel(r, g, b, alpha = 1, removeTransparent = false) {
    if (removeTransparent && alpha < 0.08) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    return r > 242 && g > 242 && b > 242 && saturation < 12;
  }

  function detectFlatIllustration(data, width, height) {
    if (!data?.length || width < 2 || height < 2) return false;
    const step = Math.max(1, Math.floor(Math.max(width, height) / 180));
    const bucketStep = 24;
    const bins = new Map();
    let samples = 0;
    let smoothPairs = 0;
    let hardEdgePairs = 0;
    let pairs = 0;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        if (data[index + 3] < 32) continue;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const key = `${Math.round(r / bucketStep)},${Math.round(g / bucketStep)},${Math.round(b / bucketStep)}`;
        bins.set(key, (bins.get(key) || 0) + 1);
        samples += 1;

        if (x < step) continue;
        const previous = index - step * 4;
        if (data[previous + 3] < 32) continue;
        const distance = Math.hypot(
          r - data[previous],
          g - data[previous + 1],
          b - data[previous + 2],
        );
        pairs += 1;
        if (distance < 10) smoothPairs += 1;
        if (distance > 42) hardEdgePairs += 1;
      }
    }

    if (samples < 64 || pairs < 32) return false;
    const topCoverage = [...bins.values()]
      .sort((left, right) => right - left)
      .slice(0, 24)
      .reduce((sum, count) => sum + count, 0) / samples;
    const smoothShare = smoothPairs / pairs;
    const hardEdgeShare = hardEdgePairs / pairs;
    return topCoverage >= 0.82 && smoothShare >= 0.62 && hardEdgeShare >= 0.018;
  }

  function hasContinuousDarkStroke(mask, size) {
    const visited = new Uint8Array(mask.length);
    const minimumComponent = Math.max(3, Math.ceil(mask.length * 0.12));
    const solidComponent = Math.ceil(mask.length * 0.5);
    const centerMin = Math.floor((size - 1) / 2);
    const centerMax = Math.ceil((size - 1) / 2);

    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = 1;
      let count = 0;
      let touchesLeft = false;
      let touchesRight = false;
      let touchesTop = false;
      let touchesBottom = false;
      let crossesCenter = false;
      for (let head = 0; head < queue.length; head += 1) {
        const index = queue[head];
        const x = index % size;
        const y = Math.floor(index / size);
        count += 1;
        touchesLeft ||= x === 0;
        touchesRight ||= x === size - 1;
        touchesTop ||= y === 0;
        touchesBottom ||= y === size - 1;
        crossesCenter ||= x >= centerMin && x <= centerMax && y >= centerMin && y <= centerMax;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const neighbor = ny * size + nx;
            if (!mask[neighbor] || visited[neighbor]) continue;
            visited[neighbor] = 1;
            queue.push(neighbor);
          }
        }
      }
      const crossesCell = (touchesLeft && touchesRight) || (touchesTop && touchesBottom);
      if (count >= minimumComponent && ((crossesCell && crossesCenter) || count >= solidComponent)) return true;
    }
    return false;
  }

  function dominantIllustrationBucket(buckets) {
    const tones = [...buckets.values()].map((bucket) => ({
      bucket,
      r: bucket.r / bucket.weight,
      g: bucket.g / bucket.weight,
      b: bucket.b / bucket.weight,
    }));
    let winner = null;
    // Count nearby shades together so a split light region does not lose to a small dark patch.
    for (const tone of tones) {
      const group = { r: 0, g: 0, b: 0, weight: 0 };
      for (const neighbor of tones) {
        const distanceSquared = (tone.r - neighbor.r) ** 2 +
          (tone.g - neighbor.g) ** 2 + (tone.b - neighbor.b) ** 2;
        if (distanceSquared > 28 ** 2) continue;
        group.r += neighbor.bucket.r;
        group.g += neighbor.bucket.g;
        group.b += neighbor.bucket.b;
        group.weight += neighbor.bucket.weight;
      }
      if (!winner || group.weight > winner.weight) winner = group;
    }
    return winner;
  }

  function averageSampleCell(data, sampleSize, cellX, cellY, sampleScale, options = {}) {
    const removeTransparent = Boolean(options.removeTransparent);
    const outlineStrength = Number(options.outlineStrength) || 0;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    let darkR = 0;
    let darkG = 0;
    let darkB = 0;
    let darkCount = 0;
    let transparentPixels = 0;

    for (let yy = 0; yy < sampleScale; yy += 1) {
      for (let xx = 0; xx < sampleScale; xx += 1) {
        const px = cellX * sampleScale + xx;
        const py = cellY * sampleScale + yy;
        const index = (py * sampleSize + px) * 4;
        const alpha = data[index + 3] / 255;
        const pr = Math.round(data[index] * alpha + 255 * (1 - alpha));
        const pg = Math.round(data[index + 1] * alpha + 255 * (1 - alpha));
        const pb = Math.round(data[index + 2] * alpha + 255 * (1 - alpha));
        const luminance = 0.299 * pr + 0.587 * pg + 0.114 * pb;
        const transparent = removeTransparent && alpha < 0.08;
        const nearWhite = !transparent && isBackgroundLikePixel(pr, pg, pb, 1, removeTransparent);
        const weight = transparent ? 0.15 : nearWhite ? 0.72 : 1;
        if (transparent) transparentPixels += 1;

        r += pr * weight;
        g += pg * weight;
        b += pb * weight;
        count += weight;

        if (outlineStrength >= 2 && luminance < (outlineStrength >= 3 ? 86 : 76)) {
          darkR += pr;
          darkG += pg;
          darkB += pb;
          darkCount += 1;
        }
      }
    }

    if (outlineStrength >= 2 && darkCount >= Math.max(2, count * 0.22)) {
      return {
        r: darkR / darkCount,
        g: darkG / darkCount,
        b: darkB / darkCount,
      };
    }

    return {
      r: r / count,
      g: g / count,
      b: b / count,
      background: transparentPixels / Math.max(1, sampleScale * sampleScale) > 0.72,
    };
  }

  function dominantSampleCell(data, sampleSize, cellX, cellY, sampleScale, options = {}) {
    const patternMode = options.patternMode || "illustration";
    const illustrationMode = Boolean(options.illustrationMode || options.animeMode);
    const outlineStrength = Number(options.outlineStrength) || 0;
    const removeTransparent = Boolean(options.removeTransparent);
    const buckets = new Map();
    const bucketStep = patternMode === "pixelPattern" ? 16 : illustrationMode ? 24 : 18;
    let darkWeight = 0;
    const darkBucketWeights = new Map();
    const darkMask = new Uint8Array(sampleScale * sampleScale);
    let backgroundPixels = 0;
    let minLuminance = Infinity;
    let maxLuminance = -Infinity;
    const effectiveOutlineStrength = illustrationMode ? Math.max(2, outlineStrength) : outlineStrength;
    const outlineWeight = effectiveOutlineStrength >= 3
      ? (options.gridSize <= 48 ? 2.2 : 1.9)
      : effectiveOutlineStrength >= 2 ? 1.55 : 1.18;

    for (let yy = 0; yy < sampleScale; yy += 1) {
      for (let xx = 0; xx < sampleScale; xx += 1) {
        const px = cellX * sampleScale + xx;
        const py = cellY * sampleScale + yy;
        const index = (py * sampleSize + px) * 4;
        const alpha = data[index + 3] / 255;
        const pr = Math.round(data[index] * alpha + 255 * (1 - alpha));
        const pg = Math.round(data[index + 1] * alpha + 255 * (1 - alpha));
        const pb = Math.round(data[index + 2] * alpha + 255 * (1 - alpha));
        const luminance = 0.299 * pr + 0.587 * pg + 0.114 * pb;
        const transparent = removeTransparent && alpha < 0.08;
        const nearWhite = !transparent && isBackgroundLikePixel(pr, pg, pb, 1, removeTransparent);
        const isDarkLine = (options.lineBoost || illustrationMode) &&
          luminance < (effectiveOutlineStrength >= 3 ? 90 : effectiveOutlineStrength >= 2 ? 82 : 74);
        const weight = transparent ? 0 : illustrationMode ? 1 : isDarkLine ? outlineWeight : nearWhite ? 0.72 : 1;
        if (weight <= 0) {
          backgroundPixels += 1;
          continue;
        }
        minLuminance = Math.min(minLuminance, luminance);
        maxLuminance = Math.max(maxLuminance, luminance);
        const key = `${Math.round(pr / bucketStep)},${Math.round(pg / bucketStep)},${Math.round(pb / bucketStep)}`;
        const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, weight: 0, backgroundWeight: 0 };

        bucket.r += pr * weight;
        bucket.g += pg * weight;
        bucket.b += pb * weight;
        bucket.weight += weight;
        if (nearWhite) bucket.backgroundWeight += weight;
        buckets.set(key, bucket);

        if (isDarkLine) {
          darkWeight += weight;
          darkBucketWeights.set(key, (darkBucketWeights.get(key) || 0) + weight);
          darkMask[yy * sampleScale + xx] = 1;
        }
      }
    }

    if (options.usesEmptyBackground && backgroundPixels / Math.max(1, sampleScale * sampleScale) > 0.72) {
      if (options.pixelBackground === "white") return options.whiteColor;
      return { ...options.emptyCell, background: true };
    }

    const minimumLineShare = effectiveOutlineStrength >= 3 ? 0.2 : effectiveOutlineStrength >= 2 ? 0.24 : 0.32;
    const darkBucketKey = [...darkBucketWeights.entries()]
      .sort((left, right) => right[1] - left[1])[0]?.[0] || "";
    let winner = null;
    const keepIllustrationStroke = illustrationMode && maxLuminance - minLuminance >= 48 &&
      hasContinuousDarkStroke(darkMask, sampleScale);
    const keepStandardStroke = !illustrationMode && darkWeight >= sampleScale * sampleScale * minimumLineShare;
    if ((keepIllustrationStroke || keepStandardStroke) && buckets.has(darkBucketKey)) {
      winner = buckets.get(darkBucketKey);
    } else if (illustrationMode) {
      winner = dominantIllustrationBucket(buckets);
    } else {
      for (const bucket of buckets.values()) {
        if (!winner || bucket.weight > winner.weight) winner = bucket;
      }
    }

    if (!winner) {
      if (options.pixelBackground === "white") return options.whiteColor;
      return { ...options.emptyCell, background: true };
    }

    return {
      r: winner.r / winner.weight,
      g: winner.g / winner.weight,
      b: winner.b / winner.weight,
      background: false,
    };
  }

  global.XiaomaiSamplingUtils = Object.freeze({
    averageSampleCell,
    detectFlatIllustration,
    dominantSampleCell,
    isBackgroundLikePixel,
  });
})(window);
