(function initializePaletteSelection(global) {
  "use strict";

  function rgbOf(color) {
    return color?.rgb || color || { r: 255, g: 255, b: 255 };
  }

  function rgbDistance(left, right) {
    const a = rgbOf(left);
    const b = rgbOf(right);
    return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  }

  function sampleImportance(pixels, index, size, emptyBackground) {
    const pixel = pixels[index];
    if (!pixel || pixel.empty) return 0;
    const rgb = rgbOf(pixel);
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const nearWhite = min >= 238 && max - min <= 22;
    let weight = pixel.background ? 0.03 : emptyBackground && nearWhite ? 0.1 : 1;
    const x = index % size;
    const y = Math.floor(index / size);
    let maxContrast = 0;
    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x + 1 < size) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - size);
    if (y + 1 < size) neighbors.push(index + size);
    for (const neighborIndex of neighbors) {
      const neighbor = pixels[neighborIndex];
      if (!neighbor || neighbor.empty) continue;
      maxContrast = Math.max(maxContrast, rgbDistance(pixel, neighbor));
    }
    if (maxContrast >= 18) weight *= 1 + Math.min(1.8, maxContrast / 70);
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    if (luminance < 72) weight *= 1.28;
    return weight;
  }

  function buildWeightedCandidates(pixels, size, sourcePalette, options) {
    const bins = new Map();
    const bucketStep = 12;
    for (let index = 0; index < pixels.length; index += 1) {
      const weight = sampleImportance(pixels, index, size, options.emptyBackground);
      if (weight <= 0) continue;
      const rgb = rgbOf(pixels[index]);
      const key = `${Math.round(rgb.r / bucketStep)},${Math.round(rgb.g / bucketStep)},${Math.round(rgb.b / bucketStep)}`;
      const bin = bins.get(key) || { r: 0, g: 0, b: 0, weight: 0 };
      bin.r += rgb.r * weight;
      bin.g += rgb.g * weight;
      bin.b += rgb.b * weight;
      bin.weight += weight;
      bins.set(key, bin);
    }

    const candidatesByCode = new Map();
    for (const bin of bins.values()) {
      const sample = {
        r: bin.r / bin.weight,
        g: bin.g / bin.weight,
        b: bin.b / bin.weight,
      };
      const color = options.nearestColor(sample, sourcePalette);
      if (!color) continue;
      const candidate = candidatesByCode.get(color.code) || { color, weight: 0 };
      candidate.weight += bin.weight;
      candidatesByCode.set(color.code, candidate);
    }

    for (const color of sourcePalette) {
      if (!options.lockedColorCodes.has(color.code)) continue;
      if (!candidatesByCode.has(color.code)) candidatesByCode.set(color.code, { color, weight: 0 });
    }
    return [...candidatesByCode.values()];
  }

  function selectRepresentativePalette(pixels, sourcePalette, options = {}) {
    if (!Array.isArray(sourcePalette) || !sourcePalette.length) return [];
    const target = Math.max(1, Math.min(sourcePalette.length, Math.round(Number(options.target)) || sourcePalette.length));
    if (sourcePalette.length <= target) return [...sourcePalette];
    const size = Math.max(1, Math.round(Number(options.size)) || Math.round(Math.sqrt(pixels.length)));
    const lockedColorCodes = options.lockedColorCodes instanceof Set
      ? options.lockedColorCodes
      : new Set(options.lockedColorCodes || []);
    const nearestColor = typeof options.nearestColor === "function" ? options.nearestColor : null;
    const colorDistance = typeof options.colorDistance === "function" ? options.colorDistance : rgbDistance;
    const colorFamily = typeof options.colorFamily === "function" ? options.colorFamily : () => "other";
    if (!nearestColor) return sourcePalette.slice(0, target);

    const candidates = buildWeightedCandidates(pixels, size, sourcePalette, {
      emptyBackground: options.emptyBackground !== false,
      lockedColorCodes,
      nearestColor,
    });
    if (!candidates.length) return sourcePalette.slice(0, target);
    if (candidates.length <= target && !options.strictFamilyCaps) {
      return candidates.map((entry) => entry.color);
    }

    const count = candidates.length;
    const distances = Array.from({ length: count }, () => new Float32Array(count));
    for (let left = 0; left < count; left += 1) {
      for (let right = left + 1; right < count; right += 1) {
        const distance = colorDistance(candidates[left].color, candidates[right].color);
        distances[left][right] = distance;
        distances[right][left] = distance;
      }
    }

    const selected = [];
    const selectedIndexes = new Set();
    const nearestDistances = new Float32Array(count);
    nearestDistances.fill(Infinity);
    const familyCounts = new Map();
    const familyWeights = new Map();
    let totalWeight = 0;
    candidates.forEach((candidate) => {
      const family = colorFamily(candidate.color);
      familyWeights.set(family, (familyWeights.get(family) || 0) + candidate.weight);
      totalWeight += candidate.weight;
    });

    const addCandidate = (index) => {
      if (selectedIndexes.has(index) || selected.length >= target) return;
      selectedIndexes.add(index);
      selected.push(candidates[index].color);
      const family = colorFamily(candidates[index].color);
      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
      for (let candidateIndex = 0; candidateIndex < count; candidateIndex += 1) {
        nearestDistances[candidateIndex] = Math.min(nearestDistances[candidateIndex], distances[candidateIndex][index]);
      }
    };

    candidates.forEach((candidate, index) => {
      if (lockedColorCodes.has(candidate.color.code)) addCandidate(index);
    });

    const significantFamilyShare = target >= 18 ? 0.006 : target >= 12 ? 0.01 : 0.015;
    const significantFamilies = [...familyWeights.entries()]
      .filter(([, weight]) => weight >= totalWeight * significantFamilyShare)
      .sort((left, right) => right[1] - left[1]);
    for (const [family] of significantFamilies) {
      if (selected.length >= target || (familyCounts.get(family) || 0) > 0) continue;
      const familyCandidate = candidates
        .map((candidate, index) => ({ candidate, index }))
        .filter((entry) => colorFamily(entry.candidate.color) === family && !selectedIndexes.has(entry.index))
        .sort((left, right) => right.candidate.weight - left.candidate.weight)[0];
      if (familyCandidate) addCandidate(familyCandidate.index);
    }

    if (!selected.length) {
      const first = candidates
        .map((candidate, index) => ({ candidate, index }))
        .sort((left, right) => right.candidate.weight - left.candidate.weight)[0];
      addCandidate(first.index);
    }

    const familyCaps = options.familyCaps || {};
    while (selected.length < target && selected.length < count) {
      let bestIndex = -1;
      let bestScore = -Infinity;
      for (let candidateIndex = 0; candidateIndex < count; candidateIndex += 1) {
        if (selectedIndexes.has(candidateIndex)) continue;
        let gain = 0;
        for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
          const currentDistance = nearestDistances[sampleIndex];
          const nextDistance = Math.min(currentDistance, distances[sampleIndex][candidateIndex]);
          gain += candidates[sampleIndex].weight * Math.max(0, currentDistance ** 2 - nextDistance ** 2);
        }
        const family = colorFamily(candidates[candidateIndex].color);
        const familyCount = familyCounts.get(family) || 0;
        const familyCap = familyCaps[family] || familyCaps.other || target;
        if (options.strictFamilyCaps && familyCount >= familyCap) continue;
        if (familyCount >= familyCap) gain /= 1 + (familyCount - familyCap + 1) * 0.8;
        if (familyCount === 0 && (familyWeights.get(family) || 0) >= totalWeight * 0.01) gain *= 1.2;
        if (gain > bestScore || (gain === bestScore && candidates[candidateIndex].weight > (candidates[bestIndex]?.weight || 0))) {
          bestIndex = candidateIndex;
          bestScore = gain;
        }
      }
      if (bestIndex < 0) break;
      addCandidate(bestIndex);
    }

    return selected;
  }

  global.XiaomaiPaletteSelection = Object.freeze({
    selectRepresentativePalette,
  });
})(window);
