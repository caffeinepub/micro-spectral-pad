/**
 * Canvas Engine - visual grid rendering
 * Only redraws dirty cells and playhead line
 * Capped at 30 FPS
 */

import { COLS, ROWS, cellData } from "../store/synthStore";

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const LEFT_MARGIN = 40;
const TOP_MARGIN = 18;
const BOTTOM_MARGIN = 18;

// Dirty cell tracking - use bit array for memory efficiency
const dirtyCells = new Uint8Array(COLS * ROWS);

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let lastFrameTime = 0;
let rafId = 0;
let prevPlayheadX = -1;
let isRunning = false;

// Grid geometry (computed on resize)
let cellWidth = 0;
let cellHeight = 0;
let gridWidth = 0;
let gridHeight = 0;
let canvasWidth = 0;
let canvasHeight = 0;

// Precomputed grid colors for background
let gridInitialized = false;

export function initCanvas(canvasEl: HTMLCanvasElement) {
  canvas = canvasEl;
  ctx = canvasEl.getContext("2d", { alpha: false });
  if (!ctx) return;

  computeGeometry();
  drawGridBackground();
  drawFrequencyLabels();
  drawTimeMarkers();
  gridInitialized = true;
}

export function computeGeometry() {
  if (!canvas) return;
  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  gridWidth = canvasWidth - LEFT_MARGIN;
  gridHeight = canvasHeight - TOP_MARGIN - BOTTOM_MARGIN;
  cellWidth = gridWidth / COLS;
  cellHeight = gridHeight / ROWS;
}

export function markCellDirty(col: number, row: number) {
  if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
    dirtyCells[col * ROWS + row] = 1;
  }
}

export function markAllDirty() {
  dirtyCells.fill(1);
}

export function markColumnDirty(col: number) {
  if (col >= 0 && col < COLS) {
    for (let row = 0; row < ROWS; row++) {
      dirtyCells[col * ROWS + row] = 1;
    }
  }
}

function getCellColor(
  amplitude: number,
  hueNorm: number,
  saturation: number,
): string {
  if (amplitude < 0.005) return "#080810";
  const h = Math.round(hueNorm * 360);
  const s = Math.round(saturation * 70);
  const l = Math.round(amplitude * 50);
  return `hsl(${h},${s}%,${l}%)`;
}

function drawCell(col: number, row: number) {
  if (!ctx) return;

  const cellIndex = (col * ROWS + row) * 3;
  const amplitude = cellData[cellIndex];
  const hueNorm = cellData[cellIndex + 1];
  const saturation = cellData[cellIndex + 2];

  const x = LEFT_MARGIN + col * cellWidth;
  const y = TOP_MARGIN + (ROWS - 1 - row) * cellHeight; // flip Y: row 0 = low freq = bottom

  ctx.fillStyle = getCellColor(amplitude, hueNorm, saturation);
  ctx.fillRect(x + 0.5, y + 0.5, cellWidth - 0.5, cellHeight - 0.5);
}

function drawGridBackground() {
  if (!ctx || !canvas) return;

  // Dark background
  ctx.fillStyle = "#060608";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Grid area background
  ctx.fillStyle = "#080810";
  ctx.fillRect(LEFT_MARGIN, TOP_MARGIN, gridWidth, gridHeight);

  // Grid lines
  ctx.strokeStyle = "#1a1a24";
  ctx.lineWidth = 0.5;

  // Vertical lines (time columns) - every 8 columns
  for (let col = 0; col <= COLS; col += 8) {
    const x = LEFT_MARGIN + col * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, TOP_MARGIN);
    ctx.lineTo(x, TOP_MARGIN + gridHeight);
    ctx.stroke();
  }

  // Horizontal lines (frequency rows) - every 6 rows
  for (let row = 0; row <= ROWS; row += 6) {
    const y = TOP_MARGIN + row * cellHeight;
    ctx.beginPath();
    ctx.moveTo(LEFT_MARGIN, y);
    ctx.lineTo(LEFT_MARGIN + gridWidth, y);
    ctx.stroke();
  }
}

// Frequency labels: log-spaced markers
const FREQ_LABELS = [
  { hz: 50, label: "50" },
  { hz: 100, label: "100" },
  { hz: 200, label: "200" },
  { hz: 500, label: "500" },
  { hz: 1000, label: "1k" },
  { hz: 2000, label: "2k" },
  { hz: 5000, label: "5k" },
  { hz: 8000, label: "8k" },
];

export function freqToRow(hz: number): number {
  const logMin = Math.log(40);
  const logMax = Math.log(8000);
  return ((Math.log(hz) - logMin) / (logMax - logMin)) * (ROWS - 1);
}

function drawFrequencyLabels() {
  if (!ctx) return;

  ctx.fillStyle = "#060608";
  ctx.fillRect(0, TOP_MARGIN, LEFT_MARGIN - 1, gridHeight);

  ctx.font = '8px "Geist Mono", monospace';
  ctx.fillStyle = "#607080";
  ctx.textAlign = "right";

  for (const { hz, label } of FREQ_LABELS) {
    const row = freqToRow(hz);
    const y = TOP_MARGIN + (ROWS - 1 - row) * cellHeight + cellHeight / 2 + 3;
    if (y >= TOP_MARGIN && y <= TOP_MARGIN + gridHeight) {
      ctx.fillText(label, LEFT_MARGIN - 3, y);
    }
  }
}

function drawTimeMarkers() {
  if (!ctx) return;

  ctx.fillStyle = "#060608";
  ctx.fillRect(LEFT_MARGIN, TOP_MARGIN + gridHeight, gridWidth, BOTTOM_MARGIN);

  ctx.font = '8px "Geist Mono", monospace';
  ctx.fillStyle = "#607080";
  ctx.textAlign = "center";

  const markers = [
    { time: 0, label: "0s" },
    { time: 0.25, label: "0.5s" },
    { time: 0.5, label: "1s" },
    { time: 0.75, label: "1.5s" },
    { time: 1.0, label: "2s" },
  ];

  for (const { time, label } of markers) {
    const x = LEFT_MARGIN + time * gridWidth;
    ctx.fillText(label, x, TOP_MARGIN + gridHeight + 12);
  }
}

// Draw or erase playhead line
function drawPlayhead(col: number, erase: boolean) {
  if (!ctx) return;

  const x = LEFT_MARGIN + col * cellWidth;

  if (erase) {
    // Redraw cells behind old playhead
    const oldCol = Math.round(prevPlayheadX);
    if (oldCol >= 0 && oldCol < COLS) {
      for (let row = 0; row < ROWS; row++) {
        const cellIndex = (oldCol * ROWS + row) * 3;
        const y = TOP_MARGIN + (ROWS - 1 - row) * cellHeight;
        ctx.fillStyle = getCellColor(
          cellData[cellIndex],
          cellData[cellIndex + 1],
          cellData[cellIndex + 2],
        );
        ctx.fillRect(
          LEFT_MARGIN + oldCol * cellWidth + 0.5,
          y + 0.5,
          cellWidth - 0.5,
          cellHeight - 0.5,
        );
      }
    }
  }

  if (!erase) {
    // Draw bright playhead
    ctx.fillStyle = "rgba(0, 229, 204, 0.8)";
    ctx.fillRect(x, TOP_MARGIN, 2, gridHeight);
  }
}

// Main render loop
function render(timestamp: number) {
  if (!isRunning) return;

  rafId = requestAnimationFrame(render);

  const elapsed = timestamp - lastFrameTime;
  if (elapsed < FRAME_INTERVAL) return;
  lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

  if (!ctx || !canvas) return;

  // Redraw dirty cells
  let hasDirty = false;
  for (let i = 0; i < COLS * ROWS; i++) {
    if (dirtyCells[i]) {
      const col = Math.floor(i / ROWS);
      const row = i % ROWS;
      drawCell(col, row);
      dirtyCells[i] = 0;
      hasDirty = true;
    }
  }

  // Update playhead (always redraw)
  void hasDirty;
}

// Called from outside to update playhead position
export function setPlayheadPosition(colFraction: number, isPlaying: boolean) {
  if (!ctx) return;

  const col = colFraction * COLS;

  if (prevPlayheadX >= 0 && Math.abs(col - prevPlayheadX) > 0.1) {
    drawPlayhead(prevPlayheadX, true);
  }

  if (isPlaying) {
    drawPlayhead(col, false);
  }

  prevPlayheadX = col;
}

export function startRenderLoop() {
  if (isRunning) return;
  isRunning = true;
  lastFrameTime = 0;
  rafId = requestAnimationFrame(render);
}

export function stopRenderLoop() {
  isRunning = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

export function resizeCanvas(width: number, height: number) {
  if (!canvas || !ctx) return;
  canvas.width = width;
  canvas.height = height;
  computeGeometry();
  drawGridBackground();
  drawFrequencyLabels();
  drawTimeMarkers();
  markAllDirty();
  gridInitialized = true;
  prevPlayheadX = -1;
}

export function redrawAll() {
  if (!ctx || !canvas) return;
  drawGridBackground();
  drawFrequencyLabels();
  drawTimeMarkers();

  // Draw all cells
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      drawCell(col, row);
    }
  }
  prevPlayheadX = -1;
  gridInitialized = true;
}

export function getCellGeometry() {
  return {
    cellWidth,
    cellHeight,
    LEFT_MARGIN,
    TOP_MARGIN,
    gridWidth,
    gridHeight,
  };
}

export function canvasToCellCoords(
  canvasX: number,
  canvasY: number,
): { col: number; row: number } | null {
  const col = Math.floor((canvasX - LEFT_MARGIN) / cellWidth);
  const rowFromTop = Math.floor((canvasY - TOP_MARGIN) / cellHeight);
  const row = ROWS - 1 - rowFromTop; // flip: top = high freq

  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}

export { gridInitialized };
