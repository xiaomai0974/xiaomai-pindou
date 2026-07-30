(function initializeQualityUtils(global) {
  "use strict";

  const colorUtils = global.XiaomaiColorUtils;
  const gridUtils = global.XiaomaiGridUtils;
  if (!colorUtils || !gridUtils) {
    throw new Error("质量分析模块依赖加载失败。");
  }
  const { colorDistance } = colorUtils;
  const { getEightNeighbors, getFourNeighbors } = gridUtils;

  function colorFamily(color) {
    if (color.lab.l < 24) return "black-gray-white";
    if (color.lab.l > 88 && Math.abs(color.lab.a) < 6 && Math.abs(color.lab.b) < 10) return "black-gray-white";
    const { r, g, b } = color.rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 18) return "black-gray-white";
    if (r > 165 && g > 120 && b > 90 && Math.abs(r - g) < 78 && r >= b) return "skin-beige";
    if (r >= g && r >= b) {
      if (r > 170 && g > 130 && b < 95) return "yellow";
      if (g > b + 42) return "orange-brown";
      return "red-pink";
    }
    if (g >= r && g >= b) return "green";
    if (b >= r && b >= g) return r > g + 18 ? "purple" : "blue";
    return "other";
  }

  function calculateColorJumpScore(pattern, size) {
    let jumps = 0;
    let edges = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = pattern[y * size + x];
        if (color.empty) continue;
        for (const nextIndex of getFourNeighbors(x, y, size)) {
          const neighbor = pattern[nextIndex];
          if (neighbor.empty) continue;
          edges += 1;
          if (colorDistance(color, neighbor) > 22) jumps += 1;
        }
      }
    }
    return Math.round((jumps / Math.max(1, edges)) * 100);
  }

  function calculateRegionColorChaosScore(pattern, size) {
    const visited = new Uint8Array(pattern.length);
    let chaoticRegions = 0;
    let totalRegions = 0;
    const limit = size <= 48 ? 4 : size <= 64 ? 6 : 8;
    for (let start = 0; start < pattern.length; start += 1) {
      if (visited[start] || pattern[start].empty) continue;
      const family = colorFamily(pattern[start]);
      const queue = [start];
      const colors = new Set();
      visited[start] = 1;
      for (let head = 0; head < queue.length; head += 1) {
        const index = queue[head];
        colors.add(pattern[index].code);
        const x = index % size;
        const y = Math.floor(index / size);
        for (const nextIndex of getFourNeighbors(x, y, size)) {
          if (visited[nextIndex] || pattern[nextIndex].empty) continue;
          if (colorFamily(pattern[nextIndex]) !== family) continue;
          if (colorDistance(pattern[index], pattern[nextIndex]) > 30) continue;
          visited[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }
      totalRegions += 1;
      if (colors.size > limit) chaoticRegions += 1;
    }
    return Math.round((chaoticRegions / Math.max(1, totalRegions)) * 100);
  }

  function calculateOutlineConnectivity(pattern, size, mask) {
    let outlineCount = 0;
    let breaks = 0;
    let noise = 0;
    let boundaryCells = 0;
    let coveredBoundary = 0;
    for (let index = 0; index < pattern.length; index += 1) {
      const item = pattern[index];
      if (item.empty) continue;
      const x = index % size;
      const y = Math.floor(index / size);
      const neighbors = getEightNeighbors(x, y, size);
      const touchesBackground = neighbors.some((neighbor) => pattern[neighbor].empty);
      if (touchesBackground) {
        boundaryCells += 1;
        if (mask[index]) coveredBoundary += 1;
      }
      if (!mask[index]) continue;
      outlineCount += 1;
      const outlineNeighbors = neighbors.filter((neighbor) => mask[neighbor]).length;
      if (outlineNeighbors <= 1) {
        noise += 1;
        if (touchesBackground) breaks += 1;
      }
    }
    const continuity = outlineCount ? Math.max(0, 10 - (breaks / outlineCount) * 50 - (noise / outlineCount) * 20) : 10;
    return {
      outlineBreakCount: breaks,
      outlineContinuityScore: Math.round(continuity * 10) / 10,
      outlineNoiseCount: noise,
      outlineCoverageRatio: Math.round((coveredBoundary / Math.max(1, boundaryCells)) * 1000) / 1000,
    };
  }

  function countEdgeBreaks(pattern, size) {
    let breaks = 0;
    for (let index = 0; index < pattern.length; index += 1) {
      const x = index % size;
      const y = Math.floor(index / size);
      const color = pattern[index];
      if (color.lab.l >= 34) continue;
      const neighbors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
      const same = neighbors.filter((neighbor) => neighbor.code === color.code).length;
      const highContrast = neighbors.some((neighbor) => colorDistance(color, neighbor) > 24);
      if (highContrast && same === 0) breaks += 1;
    }
    return breaks;
  }

  function countIsolatedPixels(pattern, size) {
    let count = 0;
    for (let index = 0; index < pattern.length; index += 1) {
      const x = index % size;
      const y = Math.floor(index / size);
      const color = pattern[index];
      if (color.empty) continue;
      const hasSameNeighbor = getFourNeighbors(x, y, size).some(
        (neighborIndex) => pattern[neighborIndex].code === color.code,
      );
      if (!hasSameNeighbor) count += 1;
    }
    return count;
  }

  global.XiaomaiQualityUtils = Object.freeze({
    calculateColorJumpScore,
    calculateOutlineConnectivity,
    calculateRegionColorChaosScore,
    colorFamily,
    countEdgeBreaks,
    countIsolatedPixels,
  });
})(window);
