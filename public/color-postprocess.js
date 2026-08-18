(function initializeColorPostprocess(global) {
  "use strict";

  function createColorPostprocessor(deps) {
    const {
      backgroundColorCodes,
      buildCounts,
      buildProtectedIndexSet,
      colorDistance,
      colorFamily,
      countNeighborColors,
      detectBackgroundColor,
      getAccurateMatch,
      getFourNeighbors,
      getLockedColorCodes,
      getProcessingProfile,
      isBorderIndex,
      isColorLocked,
      nearestColorFromList,
      outlineColorCodes,
      totalBeadCount,
    } = deps;

    function resolveReplacement(color, replacements) {
      let current = color;
      const seen = new Set();
      while (replacements.has(current.code) && !seen.has(current.code)) {
        seen.add(current.code);
        current = replacements.get(current.code);
      }
      return current;
    }

    function colorLuminance(color) {
      return 0.299 * color.rgb.r + 0.587 * color.rgb.g + 0.114 * color.rgb.b;
    }

    function buildColorAdjacency(pattern, size) {
      const adjacency = new Map();
      const add = (sourceCode, targetCode) => {
        if (sourceCode === targetCode) return;
        const targets = adjacency.get(sourceCode) || new Map();
        targets.set(targetCode, (targets.get(targetCode) || 0) + 1);
        adjacency.set(sourceCode, targets);
      };

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const index = y * size + x;
          const source = pattern[index];
          if (!source || source.empty) continue;
          if (x + 1 < size) {
            const right = pattern[index + 1];
            if (right && !right.empty) {
              add(source.code, right.code);
              add(right.code, source.code);
            }
          }
          if (y + 1 < size) {
            const below = pattern[index + size];
            if (below && !below.empty) {
              add(source.code, below.code);
              add(below.code, source.code);
            }
          }
        }
      }
      return adjacency;
    }

    function mergeColorState(counts, adjacency, replacements, source, target) {
      if (!source || !target || source.code === target.code) return false;
      const sourceEntry = counts.get(source.code);
      if (!sourceEntry) return false;

      const targetEntry = counts.get(target.code) || { ...target, count: 0 };
      counts.set(target.code, {
        ...targetEntry,
        count: (targetEntry.count || 0) + (sourceEntry.count || 0),
      });
      counts.delete(source.code);
      replacements.set(source.code, target);

      const sourceNeighbors = adjacency.get(source.code) || new Map();
      const targetNeighbors = adjacency.get(target.code) || new Map();
      for (const [neighborCode, support] of sourceNeighbors) {
        const neighborTargets = adjacency.get(neighborCode) || new Map();
        neighborTargets.delete(source.code);
        if (neighborCode === target.code) continue;

        targetNeighbors.set(neighborCode, (targetNeighbors.get(neighborCode) || 0) + support);
        neighborTargets.set(target.code, (neighborTargets.get(target.code) || 0) + support);
        adjacency.set(neighborCode, neighborTargets);
      }
      targetNeighbors.delete(source.code);
      targetNeighbors.delete(target.code);
      if (targetNeighbors.size) adjacency.set(target.code, targetNeighbors);
      else adjacency.delete(target.code);
      adjacency.delete(source.code);
      return true;
    }

    function applyColorReplacements(pattern, replacements) {
      if (!replacements.size) return [...pattern];
      return pattern.map((color) => resolveReplacement(color, replacements));
    }

    function remapColorCounts(counts, replacements) {
      const remapped = new Map();
      for (const color of counts.values()) {
        const target = resolveReplacement(color, replacements);
        const current = remapped.get(target.code) || { ...target, count: 0 };
        current.count += color.count || 0;
        remapped.set(target.code, current);
      }
      return remapped;
    }

    function bestMergeCandidate(source, candidates, adjacency = new Map()) {
      if (!candidates.length) return null;
      const sourceFamily = colorFamily(source);
      const supportByCode = adjacency.get(source.code) || new Map();
      const ranked = candidates.map((target) => {
        const distance = colorDistance(source, target);
        const familyPenalty = colorFamily(target) === sourceFamily ? 0 : 3.5;
        const support = supportByCode.get(target.code) || 0;
        const adjacencyBonus = support ? Math.min(4.5, 1.25 + Math.log2(support + 1)) : 0;
        const usageBonus = Math.min(1.2, Math.log2((target.count || 1) + 1) * 0.12);
        return { target, distance, score: distance + familyPenalty - adjacencyBonus - usageBonus };
      });
      ranked.sort((a, b) => a.score - b.score || a.distance - b.distance || b.target.count - a.target.count);
      return ranked[0].target;
    }

    function analyzeColorRegions(pattern, size) {
      const visited = new Uint8Array(pattern.length);
      const regions = [];
      const regionMap = new Int32Array(pattern.length);
      regionMap.fill(-1);
      const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

      for (let start = 0; start < pattern.length; start += 1) {
        if (visited[start]) continue;

        const color = pattern[start];
        const cells = [];
        const queue = [start];
        visited[start] = 1;

        for (let head = 0; head < queue.length; head += 1) {
          const index = queue[head];
          const x = index % size;
          const y = Math.floor(index / size);
          cells.push(index);

          for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const nextIndex = ny * size + nx;
            if (visited[nextIndex] || pattern[nextIndex].code !== color.code) continue;
            visited[nextIndex] = 1;
            queue.push(nextIndex);
          }
        }

        const regionIndex = regions.length;
        for (const cell of cells) {
          regionMap[cell] = regionIndex;
        }
        regions.push({ color, cells, touchesBorder: cells.some((cell) => isBorderIndex(cell, size)) });
      }

      return { regions, regionMap };
    }

    function regionNeighborColors(region, pattern, size) {
      const regionSet = new Set(region.cells);
      const neighbors = new Map();
      for (const index of region.cells) {
        const x = index % size;
        const y = Math.floor(index / size);
        for (const nextIndex of getFourNeighbors(x, y, size)) {
          if (regionSet.has(nextIndex)) continue;
          const color = pattern[nextIndex];
          neighbors.set(color.code, color);
        }
      }
      return [...neighbors.values()];
    }

    function isProtectedRegion(region, pattern, size, background) {
      if (region.color.code === background.code || region.touchesBorder) return false;
      const area = region.cells.length;
      if (area < 2 || area > 30) return false;

      const neighbors = regionNeighborColors(region, pattern, size);
      if (!neighbors.length) return false;
      const nearestNeighborDistance = Math.min(...neighbors.map((color) => colorDistance(region.color, color)));
      const rgb = region.color.rgb;
      const saturation = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
      const connectedToEdge = neighbors.some((color) => colorDistance(region.color, color) > 25);
      return nearestNeighborDistance > 18 || (saturation > 55 && connectedToEdge);
    }

    function findProtectedColorCodes(pattern, size) {
      const analysis = analyzeColorRegions(pattern, size);
      const background = detectBackgroundColor(pattern, size);
      const protectedCodes = new Set();

      for (const region of analysis.regions) {
        if (isProtectedRegion(region, pattern, size, background)) {
          protectedCodes.add(region.color.code);
        }
      }

      return protectedCodes;
    }

    function isProtectedSinglePixel(index, pattern, size, background) {
      if (isBorderIndex(index, size)) return false;
      const color = pattern[index];
      if (color.code === background.code) return false;
      const x = index % size;
      const y = Math.floor(index / size);
      const neighbors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
      if (!neighbors.length) return false;
      const nearestDistance = Math.min(...neighbors.map((neighbor) => colorDistance(color, neighbor)));
      const rgb = color.rgb;
      const saturation = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
      return nearestDistance > 28 && saturation > 45;
    }

    function mergeSimilarUsedColors(pattern, size, mergeDeltaE) {
      const counts = buildCounts(pattern);
      const outlineCodes = outlineColorCodes(pattern, size);
      const backgroundCodes = backgroundColorCodes();
      const colors = [...counts.values()].sort((a, b) => {
        const priorityA = (isColorLocked(a) ? 3 : 0) + (backgroundCodes.has(a.code) ? 2 : 0) + (outlineCodes.has(a.code) ? 1 : 0);
        const priorityB = (isColorLocked(b) ? 3 : 0) + (backgroundCodes.has(b.code) ? 2 : 0) + (outlineCodes.has(b.code) ? 1 : 0);
        return priorityB - priorityA || b.count - a.count;
      });
      const replacements = new Map();

      for (let i = 0; i < colors.length; i += 1) {
        const keep = resolveReplacement(colors[i], replacements);
        for (let j = i + 1; j < colors.length; j += 1) {
          const color = resolveReplacement(colors[j], replacements);
          if (keep.code === color.code || replacements.has(colors[j].code)) continue;
          if (isColorLocked(color) || outlineCodes.has(color.code) || backgroundCodes.has(color.code)) continue;
          if (backgroundCodes.has(keep.code)) continue;
          if (colorDistance(keep, color) <= mergeDeltaE) {
            replacements.set(color.code, keep);
          }
        }
      }

      if (!replacements.size) return [...pattern];
      const remaining = [...remapColorCounts(counts, replacements).values()].sort((a, b) => b.count - a.count);
      const secondPass = new Map();
      for (let i = 0; i < remaining.length; i += 1) {
        for (let j = i + 1; j < remaining.length; j += 1) {
          if (secondPass.has(remaining[j].code)) continue;
          if (isColorLocked(remaining[j]) || outlineCodes.has(remaining[j].code) || backgroundCodes.has(remaining[j].code)) continue;
          if (backgroundCodes.has(remaining[i].code)) continue;
          if (colorDistance(remaining[i], remaining[j]) <= mergeDeltaE * 0.8) {
            secondPass.set(remaining[j].code, remaining[i]);
          }
        }
      }

      return pattern.map((color) => {
        const merged = resolveReplacement(color, replacements);
        return secondPass.get(merged.code) || merged;
      });
    }

    function nearestMergeTarget(source, counts, protectedCodes = new Set(), allowProtectedTarget = true, adjacency = new Map()) {
      if (isColorLocked(source)) return null;
      const backgrounds = backgroundColorCodes();
      const candidates = [...counts.values()].filter((item) => {
        if (item.code === source.code) return false;
        if (backgrounds.has(item.code) && !isColorLocked(item)) return false;
        if (!allowProtectedTarget && protectedCodes.has(item.code) && !isColorLocked(item)) return false;
        return true;
      });
      return bestMergeCandidate(source, candidates, adjacency);
    }

    function mergeLowUsageColors(pattern, size, options = {}) {
      const processed = [...pattern];
      const total = totalBeadCount(processed);
      const strong = options.strength === "strong";
      const compact = options.strength === "compact";
      const detail = options.strength === "detail" || getProcessingProfile() === "detail64";
      const base = size === 48 ? (strong ? 0.008 : 0.005) : size === 64 ? (strong ? 0.005 : 0.003) : 0.005;
      const threshold = getAccurateMatch() && !strong
        ? detail ? (size <= 64 ? 2 : 3) : compact ? (size <= 54 ? 6 : 8) : size <= 48 ? 4 : size <= 64 ? 6 : 8
        : Math.max(8, Math.min(24, Math.ceil(total * base)));
      const outlineCodes = outlineColorCodes(processed, size);
      const protectedCodes = new Set([...findProtectedColorCodes(processed, size), ...outlineCodes]);
      const counts = buildCounts(processed);
      const adjacency = buildColorAdjacency(processed, size);
      const replacements = new Map();
      const lowUsage = [...counts.values()]
        .filter((item) => item.count < threshold && !protectedCodes.has(item.code) && !isColorLocked(item))
        .sort((a, b) => a.count - b.count);

      if (!lowUsage.length) return processed;

      for (const color of lowUsage) {
        const source = counts.get(color.code);
        if (!source) continue;
        const target = nearestMergeTarget(source, counts, protectedCodes, true, adjacency);
        if (!target) continue;
        mergeColorState(counts, adjacency, replacements, source, target);
      }

      return applyColorReplacements(processed, replacements);
    }

    function forceMaxColors(pattern, size, maxColors, options = {}) {
      const processed = [...pattern];
      const counts = buildCounts(processed);
      if (counts.size <= maxColors) return processed;

      const softProtectedCodes = new Set([
        ...findProtectedColorCodes(processed, size),
        ...outlineColorCodes(processed, size),
      ]);
      const hardProtectedCodes = new Set([...backgroundColorCodes(), ...getLockedColorCodes()]);
      const preferredLockedTargets = (Array.isArray(options.preferredLockedTargets) ? options.preferredLockedTargets : [])
        .filter((color) => color && getLockedColorCodes().has(color.code));
      const preferLockedTargets = options.preferLockedTargets === true && preferredLockedTargets.length > 0;
      const detailProfile = getProcessingProfile() === "detail64";
      const adjacency = buildColorAdjacency(processed, size);
      const replacements = new Map();

      function mergeTargetFor(source, colors, adjacency) {
        if (preferLockedTargets) {
          const lockedTarget = nearestColorFromList(
            source,
            preferredLockedTargets.filter((item) => item.code !== source.code),
          );
          if (lockedTarget) return lockedTarget;
        }
        const backgrounds = backgroundColorCodes();
        const available = colors.filter(
          (item) => item.code !== source.code && (!backgrounds.has(item.code) || isColorLocked(item)),
        );
        return bestMergeCandidate(source, available, adjacency);
      }

      let guard = 0;
      while (counts.size > maxColors && guard < 500) {
        guard += 1;
        const colors = [...counts.values()].sort((a, b) => {
          const pa = hardProtectedCodes.has(a.code) ? 2 : softProtectedCodes.has(a.code) ? 1 : 0;
          const pb = hardProtectedCodes.has(b.code) ? 2 : softProtectedCodes.has(b.code) ? 1 : 0;
          return pa - pb || a.count - b.count || colorLuminance(a) - colorLuminance(b);
        });
        let source = null;
        let target = null;
        for (const candidateSource of colors) {
          if (hardProtectedCodes.has(candidateSource.code) || isColorLocked(candidateSource)) continue;
          const candidateTarget = mergeTargetFor(candidateSource, colors, adjacency);
          if (!candidateTarget) continue;
          const mergeDistance = colorDistance(candidateSource, candidateTarget);
          if (!preferLockedTargets && softProtectedCodes.has(candidateSource.code) && mergeDistance > (detailProfile ? 14 : 24)) continue;
          if (
            !preferLockedTargets &&
            detailProfile &&
            colorFamily(candidateTarget) !== colorFamily(candidateSource) &&
            mergeDistance > 18
          ) continue;
          source = candidateSource;
          target = candidateTarget;
          break;
        }
        if (!source || !target || source.code === target.code) break;
        mergeColorState(counts, adjacency, replacements, source, target);
      }

      while (counts.size > maxColors && guard < 1000) {
        guard += 1;
        const colors = [...counts.values()];
        const source = colors
          .filter((item) => !hardProtectedCodes.has(item.code) && !isColorLocked(item))
          .sort((a, b) => {
            const pa = softProtectedCodes.has(a.code) ? 1 : 0;
            const pb = softProtectedCodes.has(b.code) ? 1 : 0;
            return pa - pb || a.count - b.count || colorLuminance(a) - colorLuminance(b);
          })[0];
        if (!source) break;
        const target = mergeTargetFor(source, colors, adjacency);
        if (!target) break;
        mergeColorState(counts, adjacency, replacements, source, target);
      }

      return applyColorReplacements(processed, replacements);
    }

    function cleanIsolatedPixels(pattern, size) {
      const cleaned = [...pattern];
      const background = detectBackgroundColor(pattern, size);
      const protectedIndexes = buildProtectedIndexSet(pattern, size);

      for (let index = 0; index < pattern.length; index += 1) {
        const x = index % size;
        const y = Math.floor(index / size);
        const color = pattern[index];
        if (color.empty) continue;
        if (protectedIndexes.has(index)) continue;
        if (isColorLocked(color)) continue;
        const neighbors = getFourNeighbors(x, y, size).map((neighbor) => pattern[neighbor]);
        const sameNeighborCount = neighbors.filter((neighbor) => neighbor.code === color.code).length;
        if (sameNeighborCount > 0) continue;
        if (isProtectedSinglePixel(index, pattern, size, background)) continue;

        const touchesBackground = neighbors.some((neighbor) => neighbor.code === background.code);
        const candidates = countNeighborColors(neighbors)
          .filter((candidate) => candidate.color.code !== background.code || touchesBackground)
          .filter((candidate) => !isColorLocked(candidate.color))
          .sort((a, b) => b.count - a.count || colorDistance(color, a.color) - colorDistance(color, b.color));

        if (candidates.length) {
          cleaned[index] = candidates[0].color;
        }
      }

      return cleaned;
    }

    function chooseRegionReplacement(pattern, size, region, analysis) {
      const regionSet = new Set(region.cells);
      const neighbors = new Map();
      const background = detectBackgroundColor(pattern, size);

      for (const index of region.cells) {
        const x = index % size;
        const y = Math.floor(index / size);
        for (const nextIndex of getFourNeighbors(x, y, size)) {
          if (regionSet.has(nextIndex)) continue;
          const color = pattern[nextIndex];
          if (color.code === background.code && !region.touchesBorder) continue;
          if (isColorLocked(color)) continue;
          const neighborRegion = analysis.regions[analysis.regionMap[nextIndex]];
          const entry = neighbors.get(color.code) || {
            color,
            count: 0,
            area: 0,
            distance: colorDistance(region.color, color),
          };
          entry.count += 1;
          entry.area = Math.max(entry.area, neighborRegion?.cells.length || 0);
          neighbors.set(color.code, entry);
        }
      }

      if (!neighbors.size) return null;

      const entries = [...neighbors.values()];
      if (region.cells.length === 1) {
        entries.sort((a, b) => b.count - a.count || a.distance - b.distance || b.area - a.area);
      } else {
        entries.sort((a, b) => b.area - a.area || a.distance - b.distance || b.count - a.count);
      }
      return entries[0].color;
    }

    function cleanPatternRegions(pattern, size, minRegionSize) {
      let cleaned = [...pattern];
      const passes = getProcessingProfile() === "detail64" ? 1 : 2;

      for (let pass = 0; pass < passes; pass += 1) {
        const analysis = analyzeColorRegions(cleaned, size);
        const background = detectBackgroundColor(cleaned, size);
        const protectedIndexes = buildProtectedIndexSet(cleaned, size);
        let changed = false;

        for (const region of analysis.regions) {
          if (region.color.empty) continue;
          if (region.cells.length >= minRegionSize) continue;
          if (isColorLocked(region.color)) continue;
          if (region.cells.some((index) => protectedIndexes.has(index))) continue;
          if (isProtectedRegion(region, cleaned, size, background)) continue;
          const replacement = chooseRegionReplacement(cleaned, size, region, analysis);
          if (!replacement) continue;

          for (const index of region.cells) {
            cleaned[index] = replacement;
          }
          changed = true;
        }

        if (!changed) break;
      }

      return cleaned;
    }

    return Object.freeze({
      analyzeColorRegions,
      cleanIsolatedPixels,
      cleanPatternRegions,
      colorLuminance,
      findProtectedColorCodes,
      forceMaxColors,
      isProtectedRegion,
      mergeLowUsageColors,
      mergeSimilarUsedColors,
    });
  }

  global.XiaomaiColorPostprocess = Object.freeze({ createColorPostprocessor });
})(window);
