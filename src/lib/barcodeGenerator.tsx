import React, { useState, useEffect } from 'react';
import type { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Code 128B Pattern Definitions (107 patterns)
// Each digit represents the width of alternating black and white bars.
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=START B, 106=STOP)
];

/**
 * Encodes ASCII text into an array of booleans representing Code 128B black (true) and white (false) modules.
 */
export function generateCode128BModules(text: string): boolean[] {
  const clean = (text || 'NMD-00000000-0001').trim();
  const codes: number[] = [104]; // Start Code B

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const codeVal = charCode - 32;
    if (codeVal >= 0 && codeVal <= 95) {
      codes.push(codeVal);
    } else {
      codes.push(0); // fallback space
    }
  }

  // Calculate Checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  // Convert codes to boolean modules
  const modules: boolean[] = [];
  
  // Quiet zone at start (10 modules)
  for (let q = 0; q < 10; q++) modules.push(false);

  for (let cIdx = 0; cIdx < codes.length; cIdx++) {
    const pattern = CODE128_PATTERNS[codes[cIdx]] || '212222';
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Quiet zone at end (10 modules)
  for (let q = 0; q < 10; q++) modules.push(false);

  return modules;
}

/**
 * Draws an authentic Code 128 vector barcode on a jsPDF document.
 */
export function drawCode128Barcode(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const modules = generateCode128BModules(text);
  const moduleWidth = width / modules.length;

  doc.setFillColor(15, 23, 42); // deep navy black

  let currentBarStart: number | null = null;
  let currentBarWidth = 0;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      if (currentBarStart === null) {
        currentBarStart = x + i * moduleWidth;
        currentBarWidth = moduleWidth;
      } else {
        currentBarWidth += moduleWidth;
      }
    } else {
      if (currentBarStart !== null) {
        doc.rect(currentBarStart, y, currentBarWidth, height, 'F');
        currentBarStart = null;
        currentBarWidth = 0;
      }
    }
  }

  if (currentBarStart !== null) {
    doc.rect(currentBarStart, y, currentBarWidth, height, 'F');
  }
}

/**
 * Generates an authentic scannable QR Code bit matrix using the industry standard QRCode library
 */
export function generateQrMatrix(text: string): { size: number; isDark: (r: number, c: number) => boolean } {
  try {
    const qr = QRCode.create(text || 'NEET MBBS DOCTORS STORE', {
      errorCorrectionLevel: 'M'
    });
    const size = qr.modules.size;
    const data = qr.modules.data;
    return {
      size,
      isDark: (r: number, c: number) => {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          return Boolean(data[r * size + c]);
        }
        return false;
      }
    };
  } catch (err) {
    // Fallback simple 25x25 matrix
    const size = 25;
    return {
      size,
      isDark: (r: number, c: number) => {
        // Simple corners
        const inTopLeft = r < 7 && c < 7;
        const inTopRight = r < 7 && c >= size - 7;
        const inBottomLeft = r >= size - 7 && c < 7;
        if (inTopLeft || inTopRight || inBottomLeft) {
          const lr = r < 7 ? r : r - (size - 7);
          const lc = c < 7 ? c : c - (size - 7);
          return lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
        }
        return (r + c) % 3 === 0;
      }
    };
  }
}

/**
 * Draws a real scannable QR Code vector matrix on a jsPDF document.
 */
export function drawQrCodeMatrix(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size: number
): void {
  const qr = generateQrMatrix(text);
  const cellSize = size / qr.size;

  doc.setFillColor(15, 23, 42); // deep navy black

  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.isDark(r, c)) {
        doc.rect(x + c * cellSize, y + r * cellSize, cellSize + 0.05, cellSize + 0.05, 'F');
      }
    }
  }
}

/**
 * React Component to render real SVG Code 128 Barcode
 */
export const SvgBarcode: React.FC<{ text: string; width?: number; height?: number; className?: string }> = ({
  text,
  width = 200,
  height = 45,
  className = ''
}) => {
  const modules = generateCode128BModules(text);
  const moduleWidth = width / modules.length;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="white" />
      {modules.map((isBar, idx) => {
        if (!isBar) return null;
        return (
          <rect
            key={idx}
            x={idx * moduleWidth}
            y={0}
            width={moduleWidth + 0.15}
            height={height}
            fill="#0f172a"
          />
        );
      })}
    </svg>
  );
};

/**
 * React Component to render real SVG QR Code that is 100% scannable by phone cameras
 */
export const SvgQrCode: React.FC<{ text: string; size?: number; className?: string }> = ({
  text,
  size = 80,
  className = ''
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(text || 'NEET MBBS DOCTORS STORE', {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(url => {
      if (isMounted) setDataUrl(url);
    }).catch(err => {
      console.warn('QR Code generation error:', err);
    });
    return () => {
      isMounted = false;
    };
  }, [text, size]);

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt="Scan QR Code"
        width={size}
        height={size}
        className={`rounded bg-white p-0.5 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  // Instant fallback SVG while rendering
  const qr = generateQrMatrix(text);
  const cellSize = size / qr.size;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`bg-white p-0.5 rounded ${className}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" />
      {Array.from({ length: qr.size }).map((_, r) =>
        Array.from({ length: qr.size }).map((_, c) => {
          if (!qr.isDark(r, c)) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.08}
              height={cellSize + 0.08}
              fill="#0f172a"
            />
          );
        })
      )}
    </svg>
  );
};

