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
    const dl = lab.l - candidate.l;
    const da = lab.a - candidate.a;
    const db = lab.b - candidate.b;
    const distance = dl * dl + da * da + db * db;
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
