/**
 * Brush Engine - all brush operations
 * Writes directly to preallocated cellData array
 * No dynamic memory allocation
 * No full-grid recalculation
 */

import { COLS, ROWS, cellData, undoBufferData } from "../store/synthStore";
import { scheduleRebuild } from "./audioEngine";
import { markCellDirty, markColumnDirty } from "./canvasEngine";

// Precomputed 3x3 smooth kernel weights
const SMOOTH_KERNEL = new Float32Array([
  0.05, 0.1, 0.05, 0.1, 0.4, 0.1, 0.05, 0.1, 0.05,
]);

// Precomputed inharmonic scatter offsets table (deterministic)
const SCATTER_TABLE = new Int8Array(64);
(function initScatterTable() {
  let x = 99991;
  for (let i = 0; i < 64; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    SCATTER_TABLE[i] = ((x % 5) - 2) as -2 | -1 | 0 | 1 | 2; // ±2 range
  }
})();

// Micro-mutation random table (deterministic)
const MICRO_RAND_TABLE = new Float32Array(256);
(function initMicroRandTable() {
  let x = 77777;
  for (let i = 0; i < 256; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    MICRO_RAND_TABLE[i] = (x / 0x7fffffff) * 0.04 - 0.02; // ±0.02
  }
})();

let microRandIndex = 0;

function getCellIndex(col: number, row: number): number {
  return (col * ROWS + row) * 3;
}

function writeCell(
  col: number,
  row: number,
  amplitude: number,
  hueNorm: number,
  saturation: number,
) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const idx = getCellIndex(col, row);
  cellData[idx] = Math.max(0, Math.min(1, amplitude));
  cellData[idx + 1] = Math.max(0, Math.min(1, hueNorm));
  cellData[idx + 2] = Math.max(0, Math.min(1, saturation));
  markCellDirty(col, row);
}

// Save undo buffer before any brush action
let undoSaved = false;
export function saveUndo() {
  undoBufferData.set(cellData);
  undoSaved = true;
}

export function restoreUndo(): boolean {
  if (!undoSaved) return false;
  cellData.set(undoBufferData);
  // Mark all dirty
  for (let col = 0; col < COLS; col++) {
    markColumnDirty(col);
  }
  scheduleRebuild();
  return true;
}

// Apply brush to a range of cells based on brush size
function applyBrushToSize(
  col: number,
  row: number,
  size: number,
  callback: (c: number, r: number) => void,
) {
  const half = Math.floor(size / 2);
  for (let dc = -half; dc <= half; dc++) {
    for (let dr = -half; dr <= half; dr++) {
      const c = col + dc;
      const r = row + dr;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
        callback(c, r);
      }
    }
  }
}

// Brush Type 0: Flat Write
export function applyFlatWrite(
  col: number,
  row: number,
  size: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
) {
  applyBrushToSize(col, row, size, (c, r) => {
    writeCell(c, r, intensity, hueNorm, saturation);
  });
  markColumnDirty(col);
}

// Brush Type 1: Soft Average (3x3 kernel)
export function applySoftAverage(
  col: number,
  row: number,
  size: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
) {
  applyBrushToSize(col, row, size, (cc, rr) => {
    let weightedAmp = 0;
    let totalWeight = 0;

    for (let kc = -1; kc <= 1; kc++) {
      for (let kr = -1; kr <= 1; kr++) {
        const nc = cc + kc;
        const nr = rr + kr;
        const ki = (kc + 1) * 3 + (kr + 1);
        const weight = SMOOTH_KERNEL[ki];

        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
          weightedAmp += cellData[getCellIndex(nc, nr)] * weight;
          totalWeight += weight;
        }
      }
    }

    const avgAmp = totalWeight > 0 ? weightedAmp / totalWeight : 0;
    const newAmp = avgAmp * 0.6 + intensity * 0.4;
    writeCell(cc, rr, newAmp, hueNorm, saturation);
  });
  markColumnDirty(col);
}

// Brush Type 2: Harmonic Ladder
export function applyHarmonicLadder(
  col: number,
  row: number,
  size: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
) {
  applyBrushToSize(col, row, size, (c, r) => {
    writeCell(c, r, intensity, hueNorm, saturation);

    // Write harmonic multiples
    for (let n = 2; n <= 4; n++) {
      const harmRow = Math.round(r * n);
      if (harmRow < ROWS) {
        const harmAmp = intensity / n;
        writeCell(c, harmRow, harmAmp, hueNorm, saturation);
      }
    }
  });
  markColumnDirty(col);
}

// Brush Type 3: Inharmonic Scatter
export function applyInharmonicScatter(
  col: number,
  row: number,
  size: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
) {
  applyBrushToSize(col, row, size, (c, r) => {
    writeCell(c, r, intensity, hueNorm, saturation);

    // Add 1-3 random scatter points using precomputed table
    const count = 1 + (Math.abs(SCATTER_TABLE[microRandIndex % 64]) % 3);
    for (let i = 0; i < count; i++) {
      const offset = SCATTER_TABLE[(microRandIndex + i) % 64];
      const scatterRow = r + offset;
      if (scatterRow >= 0 && scatterRow < ROWS) {
        writeCell(c, scatterRow, intensity * 0.6, hueNorm, saturation);
      }
    }
    microRandIndex = (microRandIndex + count + 1) % 64;
  });
  markColumnDirty(col);
}

// Brush Type 4: Time Smear
export function applyTimeSmear(
  col: number,
  row: number,
  size: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
) {
  applyBrushToSize(col, row, size, (c, r) => {
    writeCell(c, r, intensity, hueNorm, saturation);

    // Write to adjacent columns at reduced amplitude
    if (c > 0) writeCell(c - 1, r, intensity * 0.5, hueNorm, saturation);
    if (c < COLS - 1) writeCell(c + 1, r, intensity * 0.5, hueNorm, saturation);
  });

  if (col > 0) markColumnDirty(col - 1);
  markColumnDirty(col);
  if (col < COLS - 1) markColumnDirty(col + 1);
}

// Brush Type 5: Formant Band
export function applyFormantBand(
  col: number,
  row: number,
  size: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
  formantWidth: number,
) {
  const half = Math.floor(formantWidth / 2);
  applyBrushToSize(col, row, size, (c, r) => {
    for (let dr = -half; dr <= half; dr++) {
      const targetRow = r + dr;
      if (targetRow >= 0 && targetRow < ROWS) {
        writeCell(c, targetRow, intensity, hueNorm, saturation);
      }
    }
  });
  markColumnDirty(col);
}

// Brush Type 6: Erase
export function applyErase(col: number, row: number, size: number) {
  applyBrushToSize(col, row, size, (c, r) => {
    const idx = getCellIndex(c, r);
    cellData[idx] = 0;
    cellData[idx + 1] = 0;
    cellData[idx + 2] = 0;
    markCellDirty(c, r);
  });
  markColumnDirty(col);
}

// Master brush dispatch
export function applyBrush(
  col: number,
  row: number,
  brushType: number,
  brushSize: number,
  intensity: number,
  hueNorm: number,
  saturation: number,
  formantWidth: number,
) {
  switch (brushType) {
    case 0:
      applyFlatWrite(col, row, brushSize, intensity, hueNorm, saturation);
      break;
    case 1:
      applySoftAverage(col, row, brushSize, intensity, hueNorm, saturation);
      break;
    case 2:
      applyHarmonicLadder(col, row, brushSize, intensity, hueNorm, saturation);
      break;
    case 3:
      applyInharmonicScatter(
        col,
        row,
        brushSize,
        intensity,
        hueNorm,
        saturation,
      );
      break;
    case 4:
      applyTimeSmear(col, row, brushSize, intensity, hueNorm, saturation);
      break;
    case 5:
      applyFormantBand(
        col,
        row,
        brushSize,
        intensity,
        hueNorm,
        saturation,
        formantWidth,
      );
      break;
    case 6:
      applyErase(col, row, brushSize);
      break;
  }
}

// === MUTATION BRUSHES ===
// All mutations operate on existing cell data in-place
// Applied at pointer-up, not during drag

export function applyMutation(
  col: number,
  row: number,
  brushSize: number,
  mutationType: number,
  strength: number,
) {
  const half = Math.floor(brushSize / 2);

  for (let dc = -half - 1; dc <= half + 1; dc++) {
    for (let dr = -half - 1; dr <= half + 1; dr++) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;

      // Falloff based on distance
      const dist = Math.sqrt(dc * dc + dr * dr);
      const maxDist = half + 1;
      const falloff = Math.max(0, 1 - dist / maxDist);
      const scaledStrength = strength * falloff;

      if (scaledStrength < 0.001) continue;

      const idx = getCellIndex(c, r);
      const amp = cellData[idx];
      const hue = cellData[idx + 1];
      const sat = cellData[idx + 2];

      switch (mutationType) {
        case 0: // Hue Shift
          cellData[idx + 1] = (hue + scaledStrength * 0.2) % 1;
          break;
        case 1: // Harmonic Intensify
          cellData[idx + 2] = Math.min(1, sat + scaledStrength * 0.3);
          break;
        case 2: // Harmonic Soften
          cellData[idx + 2] = Math.max(0, sat - scaledStrength * 0.3);
          break;
        case 3: // Spectral Drift - shift amplitude to adjacent row
          if (r + 1 < ROWS) {
            const targetIdx = getCellIndex(c, r + 1);
            const targetAmp = cellData[targetIdx];
            cellData[idx] = amp * (1 - scaledStrength);
            cellData[targetIdx] = Math.min(1, targetAmp + amp * scaledStrength);
            markCellDirty(c, r + 1);
          }
          break;
        case 4: // Time Smear - copy to next column
          if (c + 1 < COLS) {
            const targetIdx = getCellIndex(c + 1, r);
            cellData[targetIdx] = Math.min(
              1,
              cellData[targetIdx] + amp * 0.6 * scaledStrength,
            );
            markCellDirty(c + 1, r);
          }
          break;
        case 5: // Random Micro Mutate
          {
            const ri = microRandIndex % 256;
            cellData[idx + 1] = Math.max(
              0,
              Math.min(1, hue + MICRO_RAND_TABLE[ri] * scaledStrength * 2),
            );
            cellData[idx + 2] = Math.max(
              0,
              Math.min(
                1,
                sat + MICRO_RAND_TABLE[(ri + 128) % 256] * scaledStrength * 2,
              ),
            );
            microRandIndex = (microRandIndex + 1) % 256;
          }
          break;
        case 6: // Decay Brush
          cellData[idx] = amp * (1 - 0.15 * scaledStrength);
          break;
      }

      markCellDirty(c, r);
    }
  }

  markColumnDirty(col);
  scheduleRebuild();
}

// Clear entire grid
export function clearGrid() {
  saveUndo();
  cellData.fill(0);
  for (let col = 0; col < COLS; col++) {
    markColumnDirty(col);
  }
  scheduleRebuild();
}

// Apply blur smoothing (precomputed kernel, toggleable)
export function applyBlur() {
  const tempAmp = new Float32Array(COLS * ROWS);

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      let sum = 0;
      let weight = 0;

      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const nc = Math.max(0, Math.min(COLS - 1, col + dc));
          const nr = Math.max(0, Math.min(ROWS - 1, row + dr));
          const ki = (dc + 1) * 3 + (dr + 1);
          const w = SMOOTH_KERNEL[ki];
          sum += cellData[getCellIndex(nc, nr)] * w;
          weight += w;
        }
      }

      tempAmp[col * ROWS + row] = sum / weight;
    }
  }

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const idx = getCellIndex(col, row);
      cellData[idx] = tempAmp[col * ROWS + row];
      markCellDirty(col, row);
    }
  }

  scheduleRebuild();
}
