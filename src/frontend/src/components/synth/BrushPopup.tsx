import { useSynthStore } from "../../store/synthStore";
import type { BrushType, MutationType } from "../../store/synthStore";

const BRUSH_NAMES = ["FLAT", "SOFT", "HARM", "INHR", "SMEAR", "FORM", "ERASE"];
const BRUSH_FULL_NAMES = [
  "Flat Write",
  "Soft Average",
  "Harmonic Ladder",
  "Inharmonic Scatter",
  "Time Smear",
  "Formant Band",
  "Erase",
];

const MUTATION_NAMES = [
  "Hue Shift",
  "Hrm Intens",
  "Hrm Soften",
  "Spec Drift",
  "Time Smear",
  "Micro Rand",
  "Decay",
];

interface Props {
  onClose: () => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  dataOcid,
  displayFn,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  dataOcid?: string;
  displayFn?: (v: number) => string;
}) {
  return (
    <div className="synth-slider-row">
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-ocid={dataOcid}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span className="val">
        {displayFn ? displayFn(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

export default function BrushPopup({ onClose }: Props) {
  const {
    brushType,
    setBrushType,
    brushSize,
    setBrushSize,
    brushIntensity,
    setBrushIntensity,
    brushHueNorm,
    setBrushHueNorm,
    brushSaturation,
    setBrushSaturation,
    formantWidth,
    setFormantWidth,
    mutateMode,
    mutationType,
    setMutationType,
    mutateStrength,
    setMutateStrength,
  } = useSynthStore();

  const hue = Math.round(brushHueNorm * 360);
  const sat = Math.round(brushSaturation * 100);
  const previewColor = `hsl(${hue}, ${sat}%, ${Math.round(brushIntensity * 50)}%)`;

  return (
    <div className="slide-panel" style={{ padding: "12px", maxHeight: "75vh" }}>
      {/* Handle */}
      <div
        style={{
          width: 40,
          height: 3,
          background: "var(--synth-border)",
          borderRadius: 2,
          margin: "0 auto 10px",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--synth-active)",
          }}
        >
          {mutateMode ? "MUTATE BRUSH" : "BRUSH SELECT"}
        </span>
        <button
          data-ocid="brush.close_button"
          className="synth-btn"
          onClick={onClose}
          style={{ padding: "3px 8px", fontSize: "10px" }}
        >
          ✕
        </button>
      </div>

      {mutateMode ? (
        /* Mutation Brush UI */
        <div>
          <div style={{ marginBottom: "8px" }}>
            <div className="panel-section-title">MUTATION TYPE</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                marginBottom: "8px",
              }}
            >
              {MUTATION_NAMES.map((name, i) => (
                <button
                  key={i}
                  className={`synth-btn${mutationType === i ? " active" : ""}`}
                  onClick={() => setMutationType(i as MutationType)}
                  style={{
                    padding: "4px 6px",
                    fontSize: "9px",
                    flex: "1 1 calc(33% - 4px)",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <SliderRow
            label="STRENGTH"
            value={mutateStrength}
            min={0}
            max={1}
            onChange={setMutateStrength}
          />
        </div>
      ) : (
        /* Normal Brush UI */
        <div>
          {/* Brush Type Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "4px",
              marginBottom: "8px",
            }}
          >
            {BRUSH_NAMES.map((name, i) => (
              <button
                key={i}
                data-ocid={`brush.type_button.${i + 1}`}
                className={`synth-btn${brushType === i ? " active" : ""}`}
                onClick={() => setBrushType(i as BrushType)}
                style={{ padding: "5px 4px", fontSize: "9px" }}
                title={BRUSH_FULL_NAMES[i]}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Brush Size */}
          <div style={{ marginBottom: "8px" }}>
            <div className="panel-section-title">BRUSH SIZE</div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  data-ocid={`brush.size_button.${s}`}
                  className={`synth-btn${brushSize === s ? " active" : ""}`}
                  onClick={() => setBrushSize(s as 1 | 2 | 3)}
                  style={{ flex: 1, padding: "5px" }}
                >
                  {s}x{s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "3px",
                background: previewColor,
                border: "1px solid var(--synth-border)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <SliderRow
                label="HUE"
                value={brushHueNorm}
                min={0}
                max={1}
                onChange={setBrushHueNorm}
                displayFn={(v) => `${Math.round(v * 360)}°`}
              />
              <SliderRow
                label="SAT"
                value={brushSaturation}
                min={0}
                max={1}
                onChange={setBrushSaturation}
                displayFn={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
          </div>

          {/* Hue Gradient Selector */}
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                height: "20px",
                borderRadius: "3px",
                background:
                  "linear-gradient(to right, hsl(0,70%,30%), hsl(60,70%,30%), hsl(120,70%,30%), hsl(180,70%,30%), hsl(240,70%,30%), hsl(300,70%,30%), hsl(360,70%,30%))",
                cursor: "pointer",
                border: "1px solid var(--synth-border)",
                position: "relative",
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                setBrushHueNorm(Math.max(0, Math.min(1, x)));
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -2,
                  bottom: -2,
                  left: `${brushHueNorm * 100}%`,
                  width: "3px",
                  background: "white",
                  borderRadius: "1px",
                  transform: "translateX(-50%)",
                }}
              />
            </div>
          </div>

          {/* Intensity */}
          <SliderRow
            label="INTENSITY"
            value={brushIntensity}
            min={0}
            max={1}
            onChange={setBrushIntensity}
            dataOcid="brush.intensity_slider"
            displayFn={(v) => v.toFixed(2)}
          />

          {/* Formant Width (visible when Formant Band selected) */}
          {brushType === 5 && (
            <SliderRow
              label="FMT WIDTH"
              value={formantWidth}
              min={3}
              max={7}
              step={1}
              onChange={setFormantWidth}
              displayFn={(v) => `${Math.round(v)} bands`}
            />
          )}
        </div>
      )}
    </div>
  );
}
