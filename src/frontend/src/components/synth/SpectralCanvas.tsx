import { useCallback, useEffect, useRef } from "react";
import { scheduleRebuild } from "../../engines/audioEngine";
import {
  applyBrush,
  applyMutation,
  clearGrid,
  saveUndo,
} from "../../engines/brushEngine";
import {
  canvasToCellCoords,
  initCanvas,
  redrawAll,
  resizeCanvas,
  setPlayheadPosition,
  startRenderLoop,
  stopRenderLoop,
} from "../../engines/canvasEngine";
import { freqToRow } from "../../engines/canvasEngine";
import { COLS, ROWS, useSynthStore } from "../../store/synthStore";

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

export default function SpectralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaintingRef = useRef(false);
  const lastCellRef = useRef<{ col: number; row: number } | null>(null);
  const lastPlayheadRef = useRef(0);
  const playheadRafRef = useRef<number>(0);
  const undoSavedThisStroke = useRef(false);

  const {
    isPlaying,
    brushType,
    brushSize,
    brushIntensity,
    brushHueNorm,
    brushSaturation,
    formantWidth,
    mutateMode,
    mutationType,
    mutateStrength,
    previewMode,
  } = useSynthStore();

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      resizeCanvas(w, h);
    };

    resize();
    initCanvas(canvas);
    redrawAll();
    startRenderLoop();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      stopRenderLoop();
      observer.disconnect();
    };
  }, []);

  // Playhead animation
  useEffect(() => {
    const { getPlayheadFraction } = require("../../engines/audioEngine");

    const animatePlayhead = () => {
      playheadRafRef.current = requestAnimationFrame(animatePlayhead);
      const fraction = getPlayheadFraction();

      if (Math.abs(fraction - lastPlayheadRef.current) > 0.001 || isPlaying) {
        setPlayheadPosition(fraction, isPlaying);
        lastPlayheadRef.current = fraction;
      }
    };

    playheadRafRef.current = requestAnimationFrame(animatePlayhead);
    return () => {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
    };
  }, [isPlaying]);

  const getCanvasCoords = useCallback(
    (e: TouchEvent | MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handlePaint = useCallback(
    (x: number, y: number, isMutateEnd = false) => {
      const coords = canvasToCellCoords(x, y);
      if (!coords) return;
      const { col, row } = coords;

      // Skip if same cell (avoid redundant writes during slow drag)
      if (
        !isMutateEnd &&
        lastCellRef.current?.col === col &&
        lastCellRef.current?.row === row
      )
        return;
      lastCellRef.current = { col, row };

      if (mutateMode) {
        if (isMutateEnd) {
          applyMutation(col, row, brushSize, mutationType, mutateStrength);
          scheduleRebuild();
        }
        return;
      }

      applyBrush(
        col,
        row,
        brushType,
        brushSize,
        brushIntensity,
        brushHueNorm,
        brushSaturation,
        formantWidth,
      );
      scheduleRebuild();
    },
    [
      brushType,
      brushSize,
      brushIntensity,
      brushHueNorm,
      brushSaturation,
      formantWidth,
      mutateMode,
      mutationType,
      mutateStrength,
    ],
  );

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      isPaintingRef.current = true;
      lastCellRef.current = null;
      undoSavedThisStroke.current = false;

      if (!mutateMode && !undoSavedThisStroke.current) {
        saveUndo();
        undoSavedThisStroke.current = true;
      }

      handlePaint(x, y);
    },
    [handlePaint, mutateMode],
  );

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      if (!isPaintingRef.current) return;
      handlePaint(x, y);
    },
    [handlePaint],
  );

  const handlePointerEnd = useCallback(
    (x: number, y: number) => {
      if (!isPaintingRef.current) return;
      isPaintingRef.current = false;

      if (mutateMode) {
        handlePaint(x, y, true);
      }

      scheduleRebuild();
      lastCellRef.current = null;
    },
    [handlePaint, mutateMode],
  );

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const coords = getCanvasCoords(e.nativeEvent);
      if (coords) handlePointerStart(coords.x, coords.y);
    },
    [getCanvasCoords, handlePointerStart],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const coords = getCanvasCoords(e.nativeEvent);
      if (coords) handlePointerMove(coords.x, coords.y);
    },
    [getCanvasCoords, handlePointerMove],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const coords = getCanvasCoords(e.nativeEvent);
      if (coords) handlePointerEnd(coords.x, coords.y);
    },
    [getCanvasCoords, handlePointerEnd],
  );

  // Mouse handlers (fallback)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      handlePointerStart(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY,
      );
    },
    [handlePointerStart],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPaintingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      handlePointerMove(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY,
      );
    },
    [handlePointerMove],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      handlePointerEnd(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY,
      );
    },
    [handlePointerEnd],
  );

  void previewMode;
  void clearGrid;
  void COLS;
  void ROWS;
  void freqToRow;
  void FREQ_LABELS;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        data-ocid="canvas.canvas_target"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: "crosshair",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  );
}
