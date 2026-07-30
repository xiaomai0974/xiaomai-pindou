(function initializeProjectCodec(global) {
  "use strict";

  function serializeGrid(pattern) {
    return Array.isArray(pattern) ? pattern.map((item) => (item?.empty ? "__EMPTY__" : item?.code || "__EMPTY__")) : [];
  }

  function deserializeGrid(codes, options = {}) {
    if (!Array.isArray(codes)) return [];
    const expectedLength = Math.max(0, Number(options.expectedLength) || 0);
    const safeLength = expectedLength > 0 ? Math.min(codes.length, expectedLength) : codes.length;
    const emptyCell = options.emptyCell;
    const resolveColor = typeof options.resolveColor === "function" ? options.resolveColor : () => null;
    const fallbackColor = options.fallbackColor;
    const grid = codes
      .slice(0, safeLength)
      .map((code) => (code === "__EMPTY__" || !code ? emptyCell : resolveColor(code) || fallbackColor));
    if (expectedLength > 0 && grid.length) {
      while (grid.length < expectedLength) grid.push(emptyCell);
    }
    return grid;
  }

  function maskToArray(mask) {
    if (!mask) return [];
    return Array.from(mask);
  }

  function arrayToMask(values, length) {
    if (!Array.isArray(values)) return null;
    const mask = new Uint8Array(length || values.length);
    values.slice(0, mask.length).forEach((value, index) => {
      mask[index] = Number(value) ? 1 : 0;
    });
    return mask;
  }

  global.XiaomaiProjectCodec = Object.freeze({
    arrayToMask,
    deserializeGrid,
    maskToArray,
    serializeGrid,
  });
})(window);
