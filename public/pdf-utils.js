(function initializePdfUtils(global) {
  "use strict";

  function roundPdf(value) {
    return Number(value).toFixed(3).replace(/\.?0+$/, "");
  }

  function pdfColor(rgb) {
    return `${roundPdf(rgb.r / 255)} ${roundPdf(rgb.g / 255)} ${roundPdf(rgb.b / 255)}`;
  }

  function pdfEscape(value) {
    return value.replace(/[^\x20-\x7e]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function pdfTextWidth(value, size) {
    return Array.from(String(value)).reduce((sum, char) => sum + (/[\x20-\x7e]/.test(char) ? 0.5 : 0.9), 0) * size;
  }

  function pdfUtf16BeHex(value) {
    let hex = "";
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      hex += code.toString(16).padStart(4, "0").toUpperCase();
    }
    return hex;
  }

  function pdfTextToken(value) {
    return /[^\x20-\x7e]/.test(value) ? `<${pdfUtf16BeHex(value)}>` : `(${pdfEscape(value)})`;
  }

  function createPdf(width, height, stream) {
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${roundPdf(width)} ${roundPdf(height)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [7 0 R] >>",
      "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> /FontDescriptor 8 0 R >>",
      "<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Uint8Array([...pdf].map((char) => char.charCodeAt(0)));
  }

  global.XiaomaiPdfUtils = Object.freeze({
    createPdf,
    pdfColor,
    pdfEscape,
    pdfTextToken,
    pdfTextWidth,
    pdfUtf16BeHex,
    roundPdf,
  });
})(window);
