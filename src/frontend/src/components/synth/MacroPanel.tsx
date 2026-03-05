import { useCallback, useRef } from "react";
import { syncParamsToAudio } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  dataOcid?: string;
  color?: string;
}

function Knob({
  label,
  value,
  min,
  max,
  onChange,
  dataOcid,
  color = "#00e5cc",
}: KnobProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270;
  const r = 16;
  const cx = 20;
  const cy = 20;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const endX = cx + r * Math.cos(toRad(angle - 90));
  const endY = cy + r * Math.sin(toRad(angle - 90));

  const handleDragStart = useCallback(
    (clientY: number) => {
      dragRef.current = { startY: clientY, startVal: value };
    },
    [value],
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.startY - clientY) / 100;
      const range = max - min;
      const newVal = Math.max(
        min,
        Math.min(max, dragRef.current.startVal + delta * range),
      );
      onChange(newVal);
      syncParamsToAudio();
    },
    [min, max, onChange],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div className="knob-container" data-ocid={dataOcid} style={{ flex: 1 }}>
      <svg
        className="knob-svg"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        onMouseDown={(e) => {
          handleDragStart(e.clientY);
          e.preventDefault();
        }}
        onMouseMove={(e) => {
          if (dragRef.current) {
            handleDragMove(e.clientY);
            e.preventDefault();
          }
        }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => {
          handleDragStart(e.touches[0].clientY);
          e.preventDefault();
        }}
        onTouchMove={(e) => {
          if (dragRef.current) {
            handleDragMove(e.touches[0].clientY);
            e.preventDefault();
          }
        }}
        onTouchEnd={handleDragEnd}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1a1a24"
          strokeWidth="3"
        />
        {/* Arc - simplified circle indicator */}
        <circle
          cx={cx}
          cy={cy}
          r={r - 1}
          fill="#14141c"
          stroke="#1e1e2a"
          strokeWidth="1"
        />
        {/* Pointer */}
        <line
          x1={cx}
          y1={cy}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill={color} opacity="0.5" />
      </svg>
      <span
        style={{
          fontSize: "8px",
          color: "var(--synth-text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "9px", color, textAlign: "center" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export default function MacroPanel() {
  const {
    macroDrift,
    setMacroDrift,
    macroBrightness,
    setMacroBrightness,
    macroWidth,
    setMacroWidth,
    macroMotion,
    setMacroMotion,
    setDriftAmount,
    setSpectralTilt,
    setStereoSpreadModAmount,
    setDriftSpeed,
  } = useSynthStore();

  const handleRandomize = useCallback(() => {
    setMacroDrift(Math.random());
    setMacroBrightness((Math.random() - 0.5) * 2);
    setMacroWidth(Math.random());
    setMacroMotion(Math.random());
    syncParamsToAudio();
  }, [setMacroDrift, setMacroBrightness, setMacroWidth, setMacroMotion]);

  const handleReset = useCallback(() => {
    setMacroDrift(0.3);
    setMacroBrightness(0);
    setMacroWidth(0.5);
    setMacroMotion(0.3);
    setDriftAmount(0.3);
    setSpectralTilt(0);
    setStereoSpreadModAmount(0.5);
    setDriftSpeed(0.5);
    syncParamsToAudio();
  }, [
    setMacroDrift,
    setMacroBrightness,
    setMacroWidth,
    setMacroMotion,
    setDriftAmount,
    setSpectralTilt,
    setStereoSpreadModAmount,
    setDriftSpeed,
  ]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        background: "var(--synth-panel)",
        borderTop: "1px solid var(--synth-border)",
        height: "76px",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: "8px",
          color: "var(--synth-text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          writingMode: "vertical-rl",
          flexShrink: 0,
        }}
      >
        MACRO
      </span>

      <Knob
        label="DRIFT"
        value={macroDrift}
        min={0}
        max={1}
        onChange={setMacroDrift}
        dataOcid="macro.drift_knob"
        color="#00e5cc"
      />
      <Knob
        label="BRITE"
        value={macroBrightness}
        min={-1}
        max={1}
        onChange={setMacroBrightness}
        dataOcid="macro.brightness_knob"
        color="#e0c840"
      />
      <Knob
        label="WIDTH"
        value={macroWidth}
        min={0}
        max={1}
        onChange={setMacroWidth}
        dataOcid="macro.width_knob"
        color="#c040e0"
      />
      <Knob
        label="MOTION"
        value={macroMotion}
        min={0}
        max={1}
        onChange={setMacroMotion}
        dataOcid="macro.motion_knob"
        color="#40a0e0"
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        <button
          className="synth-btn"
          onClick={handleRandomize}
          style={{ padding: "3px 6px", fontSize: "9px" }}
          title="Randomize Macros"
        >
          RND
        </button>
        <button
          className="synth-btn"
          onClick={handleReset}
          style={{ padding: "3px 6px", fontSize: "9px" }}
          title="Reset Macros"
        >
          RST
        </button>
      </div>
    </div>
  );
}
