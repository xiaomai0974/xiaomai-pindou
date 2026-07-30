(function initializeSamplingUtils(global) {
  "use strict";

  function isBackgroundLikePixel(r, g, b, alpha = 1, removeTransparent = false) {
    if (removeTransparent && alpha < 0.08) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    return r > 242 && g > 242 && b > 242 && saturation < 12;
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
    const outlineStrength = Number(options.outlineStrength) || 0;
    const removeTransparent = Boolean(options.removeTransparent);
    const buckets = new Map();
    const bucketStep = patternMode === "pixelPattern" ? 16 : options.animeMode ? 24 : 18;
    let darkWeight = 0;
    let darkBucketKey = "";
    let backgroundPixels = 0;

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
        const isDarkLine = options.lineBoost && luminance < (outlineStrength >= 3 ? 90 : outlineStrength >= 2 ? 82 : 74);
        const outlineWeight =
          outlineStrength >= 3 ? (options.gridSize <= 48 ? 2.2 : 1.9) : outlineStrength >= 2 ? 1.55 : 1.18;
        const weight = transparent ? 0 : isDarkLine ? outlineWeight : nearWhite ? 0.72 : 1;
        if (weight <= 0) {
          backgroundPixels += 1;
          continue;
        }
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
          darkBucketKey = key;
        }
      }
    }

    if (options.usesEmptyBackground && backgroundPixels / Math.max(1, sampleScale * sampleScale) > 0.72) {
      if (options.pixelBackground === "white") return options.whiteColor;
      return { ...options.emptyCell, background: true };
    }

    const minimumLineShare = outlineStrength >= 3 ? 0.2 : outlineStrength >= 2 ? 0.24 : 0.32;
    let winner = null;
    if (darkWeight >= sampleScale * sampleScale * minimumLineShare && buckets.has(darkBucketKey)) {
      winner = buckets.get(darkBucketKey);
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
    dominantSampleCell,
    isBackgroundLikePixel,
  });
})(window);
