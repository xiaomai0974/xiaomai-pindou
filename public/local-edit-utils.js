(function initializeLocalEditUtils(global) {
  "use strict";

  function normalizedIndexSet(indexes, limit) {
    const result = new Set();
    for (const value of indexes || []) {
      const index = Number(value);
      if (Number.isInteger(index) && index >= 0 && index < limit) result.add(index);
    }
    return result;
  }

  function fourNeighbors(index, stride, width, height) {
    const x = index % stride;
    const y = Math.floor(index / stride);
    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x + 1 < width) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - stride);
    if (y + 1 < height) neighbors.push(index + stride);
    return neighbors;
  }

  function componentFrom(pattern, startIndex, visited, stride, width, height) {
    const code = pattern[startIndex]?.code;
    const queue = [startIndex];
    const component = [];
    visited.add(startIndex);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      component.push(index);
      for (const neighbor of fourNeighbors(index, stride, width, height)) {
        if (visited.has(neighbor) || pattern[neighbor]?.code !== code) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    return component;
  }

  function chooseBoundaryColor(pattern, component, options) {
    const {
      stride,
      width,
      height,
      colorDistance,
      maxDeltaE,
    } = options;
    const componentSet = new Set(component);
    const sourceColor = pattern[component[0]];
    const candidates = new Map();
    for (const index of component) {
      for (const neighbor of fourNeighbors(index, stride, width, height)) {
        if (componentSet.has(neighbor)) continue;
        const color = pattern[neighbor];
        if (!color || color.empty || color.code === sourceColor.code) continue;
        const entry = candidates.get(color.code) || { color, touches: 0, indexes: new Set() };
        entry.touches += 1;
        entry.indexes.add(neighbor);
        candidates.set(color.code, entry);
      }
    }
    const ranked = [...candidates.values()]
      .map((entry) => ({
        ...entry,
        regionSupport: entry.indexes.size,
        deltaE: colorDistance(sourceColor, entry.color),
      }))
      .filter((entry) => Number.isFinite(entry.deltaE) && entry.deltaE <= maxDeltaE)
      .sort((left, right) =>
        right.touches - left.touches ||
        right.regionSupport - left.regionSupport ||
        left.deltaE - right.deltaE,
      );
    if (!ranked.length) return null;
    const best = ranked[0];
    if (best.touches === 1 && best.deltaE > Math.min(8, maxDeltaE)) return null;
    return best.color;
  }

  function optimizeSelection(pattern, selectedIndexes, options = {}) {
    const output = Array.isArray(pattern) ? [...pattern] : [];
    const stride = Math.max(1, Number(options.stride) || Number(options.width) || 1);
    const width = Math.max(1, Math.min(stride, Number(options.width) || stride));
    const height = Math.max(1, Number(options.height) || Math.ceil(output.length / stride));
    const selection = normalizedIndexSet(selectedIndexes, output.length);
    const protectedIndexes = normalizedIndexSet(options.protectedIndexes, output.length);
    const minRegionSize = Math.max(2, Math.min(6, Number(options.minRegionSize) || 3));
    const maxDeltaE = Math.max(4, Number(options.maxDeltaE) || 12);
    const colorDistance = typeof options.colorDistance === "function" ? options.colorDistance : () => Infinity;
    const isLocked = typeof options.isLocked === "function" ? options.isLocked : () => false;
    const changedIndexes = new Set();
    let mergedRegions = 0;

    for (let pass = 0; pass < 2; pass += 1) {
      const visited = new Set();
      let passChanged = false;
      for (const startIndex of selection) {
        if (visited.has(startIndex)) continue;
        const sourceColor = output[startIndex];
        if (!sourceColor || sourceColor.empty) {
          visited.add(startIndex);
          continue;
        }
        const component = componentFrom(output, startIndex, visited, stride, width, height);
        if (component.length >= minRegionSize) continue;
        if (component.some((index) => !selection.has(index))) continue;
        if (component.some((index) => protectedIndexes.has(index) || isLocked(output[index]))) continue;

        const replacement = chooseBoundaryColor(output, component, {
          stride,
          width,
          height,
          colorDistance,
          maxDeltaE: component.length === 1 ? maxDeltaE + 3 : maxDeltaE,
        });
        if (!replacement || replacement.code === sourceColor.code) continue;
        for (const index of component) {
          output[index] = replacement;
          changedIndexes.add(index);
        }
        mergedRegions += 1;
        passChanged = true;
      }
      if (!passChanged) break;
    }

    return {
      pattern: output,
      changedIndexes: [...changedIndexes],
      mergedRegions,
    };
  }

  function buildSuspectColorReview(pattern, samples, palette, options = {}) {
    if (!Array.isArray(pattern) || !Array.isArray(samples) || !Array.isArray(palette)) return [];
    const protectedIndexes = normalizedIndexSet(options.protectedIndexes, pattern.length);
    const isLocked = typeof options.isLocked === "function" ? options.isLocked : () => false;
    const getCandidates = typeof options.getCandidates === "function" ? options.getCandidates : () => [];
    const getDistance = typeof options.getDistance === "function" ? options.getDistance : () => Infinity;
    const limit = Math.max(1, Math.min(30, Number(options.limit) || 12));
    const minimumError = Math.max(0, Number(options.minimumError) || 5);
    const minimumImprovement = Math.max(0, Number(options.minimumImprovement) || 2);
    const items = [];

    for (let index = 0; index < pattern.length; index += 1) {
      const current = pattern[index];
      const sample = samples[index];
      if (!current || current.empty || !sample || protectedIndexes.has(index) || isLocked(current)) continue;
      const candidates = getCandidates(sample, palette, 4).filter((candidate) => candidate && !candidate.empty);
      const best = candidates[0];
      if (!best || best.code === current.code) continue;
      const currentError = getDistance(sample, current);
      const bestError = Number.isFinite(best.deltaE) ? best.deltaE : getDistance(sample, best);
      const improvement = currentError - bestError;
      if (!Number.isFinite(currentError) || currentError < minimumError || improvement < minimumImprovement) continue;
      const secondError = candidates[1]
        ? Number.isFinite(candidates[1].deltaE)
          ? candidates[1].deltaE
          : getDistance(sample, candidates[1])
        : bestError;
      items.push({
        index,
        current,
        currentError,
        improvement,
        confidenceGap: Math.max(0, secondError - bestError),
        candidates,
        score: improvement * 2 + currentError * 0.25 + Math.max(0, secondError - bestError) * 0.35,
      });
    }

    return items.sort((left, right) => right.score - left.score || left.index - right.index).slice(0, limit);
  }

  global.XiaomaiLocalEditUtils = Object.freeze({
    buildSuspectColorReview,
    optimizeSelection,
  });
})(window);
