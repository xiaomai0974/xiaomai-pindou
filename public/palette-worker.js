self.addEventListener("message", (event) => {
  const { type, requestId, pixels, palette, size, dither } = event.data || {};
  if (type !== "mapPalette") return;

  try {
    if (!Array.isArray(pixels) || !Array.isArray(palette) || !palette.length) {
      throw new Error("颜色匹配数据不完整");
    }
    const indices = mapPaletteIndices(pixels, palette, Number(size), Boolean(dither));
    self.postMessage({ type: "mapped", requestId, indices }, [indices.buffer]);
  } catch (error) {
    self.postMessage({ type: "error", requestId, message: error.message || String(error) });
  }
});

function mapPaletteIndices(pixels, palette, size, dither) {
  const expectedLength = size * size;
  if (!Number.isInteger(size) || size <= 0 || pixels.length !== expectedLength) {
    throw new Error("颜色匹配尺寸不正确");
  }

  const preparedPalette = palette.map((color) => ({
    rgb: color.rgb,
    lab: color.lab || rgbToLab(color.rgb),
  }));
  const indices = new Int16Array(expectedLength);
  indices.fill(-1);
  const nearestCache = new Map();

  if (dither) {
    const working = pixels.map((pixel) => ({ ...pixel }));
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = y * size + x;
        const oldPixel = working[index];
        if (oldPixel.empty) continue;
        const matchedIndex = nearestPaletteIndex(oldPixel, preparedPalette, nearestCache);
        const matched = preparedPalette[matchedIndex];
        indices[index] = matchedIndex;
        const error = {
          r: oldPixel.r - matched.rgb.r,
          g: oldPixel.g - matched.rgb.g,
          b: oldPixel.b - matched.rgb.b,
        };
        spreadError(working, size, x + 1, y, error, 7 / 16);
        spreadError(working, size, x - 1, y + 1, error, 3 / 16);
        spreadError(working, size, x, y + 1, error, 5 / 16);
        spreadError(working, size, x + 1, y + 1, error, 1 / 16);
      }
    }
    return indices;
  }

  for (let index = 0; index < pixels.length; index += 1) {
    const pixel = pixels[index];
    if (!pixel.empty) indices[index] = nearestPaletteIndex(pixel, preparedPalette, nearestCache);
  }
  return indices;
}

function nearestPaletteIndex(pixel, palette, cache) {
  const cacheKey = `${Math.round(pixel.r)},${Math.round(pixel.g)},${Math.round(pixel.b)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const lab = rgbToLab(pixel);
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < palette.length; index += 1) {
    const candidate = palette[index].lab;
    const distance = deltaE2000(lab, candidate);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  }
  if (cache.size > 50000) cache.clear();
  cache.set(cacheKey, bestIndex);
  return bestIndex;
}

function spreadError(pixels, size, x, y, error, factor) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const target = pixels[y * size + x];
  if (target.empty) return;
  target.r = clamp(target.r + error.r * factor);
  target.g = clamp(target.g + error.g * factor);
  target.b = clamp(target.b + error.b * factor);
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function rgbToLab(rgb) {
  const linear = [rgb.r, rgb.g, rgb.b].map((value) => {
    const normalized = value / 255;
    return normalized > 0.04045 ? ((normalized + 0.055) / 1.055) ** 2.4 : normalized / 12.92;
  });
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function deltaE2000(a, b) {
  const c1 = Math.hypot(a.a, a.b);
  const c2 = Math.hypot(b.a, b.b);
  const averageC = (c1 + c2) / 2;
  const averageC7 = averageC ** 7;
  const g = 0.5 * (1 - Math.sqrt(averageC7 / (averageC7 + 25 ** 7)));
  const a1Prime = (1 + g) * a.a;
  const a2Prime = (1 + g) * b.a;
  const c1Prime = Math.hypot(a1Prime, a.b);
  const c2Prime = Math.hypot(a2Prime, b.b);
  const h1Prime = labHueDegrees(a.b, a1Prime);
  const h2Prime = labHueDegrees(b.b, a2Prime);
  const deltaLPrime = b.l - a.l;
  const deltaCPrime = c2Prime - c1Prime;
  let deltaHPrime = h2Prime - h1Prime;
  if (c1Prime * c2Prime === 0) deltaHPrime = 0;
  else if (deltaHPrime > 180) deltaHPrime -= 360;
  else if (deltaHPrime < -180) deltaHPrime += 360;

  const deltaBigHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(degreesToRadians(deltaHPrime / 2));
  const averageLPrime = (a.l + b.l) / 2;
  const averageCPrime = (c1Prime + c2Prime) / 2;
  let averageHPrime = h1Prime + h2Prime;
  if (c1Prime * c2Prime === 0) averageHPrime = h1Prime + h2Prime;
  else if (Math.abs(h1Prime - h2Prime) <= 180) averageHPrime = (h1Prime + h2Prime) / 2;
  else if (h1Prime + h2Prime < 360) averageHPrime = (h1Prime + h2Prime + 360) / 2;
  else averageHPrime = (h1Prime + h2Prime - 360) / 2;

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(averageHPrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * averageHPrime)) +
    0.32 * Math.cos(degreesToRadians(3 * averageHPrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * averageHPrime - 63));
  const deltaTheta = 30 * Math.exp(-(((averageHPrime - 275) / 25) ** 2));
  const averageCPrime7 = averageCPrime ** 7;
  const rC = 2 * Math.sqrt(averageCPrime7 / (averageCPrime7 + 25 ** 7));
  const sL = 1 + (0.015 * (averageLPrime - 50) ** 2) / Math.sqrt(20 + (averageLPrime - 50) ** 2);
  const sC = 1 + 0.045 * averageCPrime;
  const sH = 1 + 0.015 * averageCPrime * t;
  const rT = -Math.sin(degreesToRadians(2 * deltaTheta)) * rC;
  const lTerm = deltaLPrime / sL;
  const cTerm = deltaCPrime / sC;
  const hTerm = deltaBigHPrime / sH;
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rT * cTerm * hTerm);
}

function labHueDegrees(y, x) {
  if (x === 0 && y === 0) return 0;
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return degrees >= 0 ? degrees : degrees + 360;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
