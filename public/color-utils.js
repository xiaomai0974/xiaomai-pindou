(function initializeColorUtils(global) {
  "use strict";

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
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

  function deltaE(a, b) {
    const dl = a.l - b.l;
    const da = a.a - b.a;
    const db = a.b - b.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  function colorDistance(a, b) {
    return deltaE(a.lab || rgbToLab(a), b.lab || rgbToLab(b));
  }

  // Source-to-bead matching uses CIEDE2000. Grid cleanup keeps the original
  // LAB distance because its thresholds were tuned for that scale.
  function paletteMatchDistance(a, b) {
    return deltaE2000(a.lab || rgbToLab(a), b.lab || rgbToLab(b));
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
    if (c1Prime * c2Prime === 0) {
      averageHPrime = h1Prime + h2Prime;
    } else if (Math.abs(h1Prime - h2Prime) <= 180) {
      averageHPrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      averageHPrime = (h1Prime + h2Prime + 360) / 2;
    } else {
      averageHPrime = (h1Prime + h2Prime - 360) / 2;
    }

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

  function contrastColor(rgb) {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.58 ? "#111111" : "#ffffff";
  }

  global.XiaomaiColorUtils = Object.freeze({
    clamp,
    colorDistance,
    contrastColor,
    deltaE,
    deltaE2000,
    hexToRgb,
    paletteMatchDistance,
    rgbToLab,
  });
})(window);
