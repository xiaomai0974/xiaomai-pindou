(function initializeHistoryUtils(global) {
  "use strict";

  function createHistoryPatternPayload(pattern) {
    const codebook = [];
    const codeToIndex = new Map();
    const wideIndices = new Uint16Array(pattern.length);

    pattern.forEach((item, index) => {
      const code = item.empty ? "__EMPTY__" : item.code;
      let codeIndex = codeToIndex.get(code);
      if (codeIndex === undefined) {
        codeIndex = codebook.length;
        codebook.push(code);
        codeToIndex.set(code, codeIndex);
      }
      wideIndices[index] = codeIndex;
    });

    return {
      codebook,
      codeIndices: codebook.length <= 256 ? Uint8Array.from(wideIndices) : wideIndices,
    };
  }

  function historySnapshotCodes(snapshot) {
    if (Array.isArray(snapshot)) return snapshot;
    if (Array.isArray(snapshot?.codes)) return snapshot.codes;
    if (!Array.isArray(snapshot?.codebook) || !ArrayBuffer.isView(snapshot?.codeIndices)) return [];
    return Array.from(snapshot.codeIndices, (index) => snapshot.codebook[index] || "__EMPTY__");
  }

  function sameHistoryList(left = [], right = []) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function sameHistorySet(left = [], right = []) {
    if (left.length !== right.length) return false;
    const values = new Set(left);
    return right.every((value) => values.has(value));
  }

  function sameHistoryPatternData(left, right) {
    const leftPacked = Array.isArray(left?.codebook) && ArrayBuffer.isView(left?.codeIndices);
    const rightPacked = Array.isArray(right?.codebook) && ArrayBuffer.isView(right?.codeIndices);
    if (!leftPacked || !rightPacked) {
      return sameHistoryList(historySnapshotCodes(left), historySnapshotCodes(right));
    }
    return (
      sameHistoryList(left.codebook, right.codebook) &&
      left.codeIndices.length === right.codeIndices.length &&
      left.codeIndices.every((value, index) => value === right.codeIndices[index])
    );
  }

  function historySnapshotsEqual(left, right) {
    if (!left || !right) return false;
    const a = Array.isArray(left) ? { codes: left } : left;
    const b = Array.isArray(right) ? { codes: right } : right;
    return (
      Number(a.size || 0) === Number(b.size || 0) &&
      Number(a.width || 0) === Number(b.width || 0) &&
      Number(a.height || 0) === Number(b.height || 0) &&
      a.selectedColorCode === b.selectedColorCode &&
      sameHistoryPatternData(a, b) &&
      sameHistorySet(a.manualEditedCells || [], b.manualEditedCells || []) &&
      sameHistorySet(a.lockedColorCodes || [], b.lockedColorCodes || []) &&
      sameHistorySet(a.allowedColorCodes || [], b.allowedColorCodes || []) &&
      sameHistorySet(a.disabledColorCodes || [], b.disabledColorCodes || []) &&
      sameHistorySet(a.projectPaletteCodes || [], b.projectPaletteCodes || [])
    );
  }

  global.XiaomaiHistoryUtils = Object.freeze({
    createHistoryPatternPayload,
    historySnapshotCodes,
    historySnapshotsEqual,
  });
})(window);
