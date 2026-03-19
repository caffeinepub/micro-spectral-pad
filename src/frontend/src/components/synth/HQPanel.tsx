import { useCallback } from "react";
import {
  hqAudioParams,
  randomizePhasesWithSpread,
  setHqAudioParams,
} from "../../engines/audioEngine";
import { setHqBrushParams } from "../../engines/brushEngine";
import { useSynthStore } from "../../store/synthStore";

const HQ_COLOR = "#f0a500";
const HQ_DIM = "#8a5e00";

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  ocid: string;
}

function ToggleRow({ label, value, onChange, ocid }: ToggleRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "4px",
      }}
    >
      <button
        type="button"
        data-ocid={ocid}
        className={`synth-btn${value ? " active" : ""}`}
        onClick={() => onChange(!value)}
        style={{
          padding: "2px 6px",
          fontSize: "8px",
          borderColor: value ? HQ_COLOR : undefined,
          color: value ? HQ_COLOR : undefined,
          minWidth: "32px",
        }}
      >
        {value ? "ON" : "OFF"}
      </button>
      <span
        style={{
          fontSize: "9px",
          color: "var(--synth-text-dim)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ocid: string;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  ocid,
}: SliderRowProps) {
  const display = format ? format(value) : value.toFixed(2);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: "4px",
      }}
    >
      <span
        style={{
          fontSize: "8px",
          color: "var(--synth-text-dim)",
          minWidth: "72px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <input
        type="range"
        data-ocid={ocid}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          flex: 1,
          minWidth: "60px",
          accentColor: HQ_COLOR,
          height: "12px",
        }}
      />
      <span
        style={{
          fontSize: "8px",
          color: HQ_COLOR,
          minWidth: "32px",
          textAlign: "right",
        }}
      >
        {display}
      </span>
    </div>
  );
}

const SECTION_STYLE: React.CSSProperties = {
  minWidth: "160px",
  maxWidth: "200px",
  padding: "6px 8px",
  borderRight: `1px solid ${HQ_DIM}`,
  flexShrink: 0,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontSize: "8px",
  color: HQ_COLOR,
  letterSpacing: "0.12em",
  marginBottom: "6px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
};

export default function HQPanel() {
  const store = useSynthStore();

  const sync = useCallback(() => {
    setHqAudioParams({
      hqModeEnabled: hqAudioParams.hqModeEnabled,
      hqSpectralTiltComp: store.hqSpectralTiltComp,
      hqTiltStrength: store.hqTiltStrength,
      hqTemporalEnvSmoothing: store.hqTemporalEnvSmoothing,
      hqEnvelopeAttack: store.hqEnvelopeAttack,
      hqEnvelopeDecay: store.hqEnvelopeDecay,
      hqPhaseSpread: store.hqPhaseSpread,
      hqPeakPartialRendering: store.hqPeakPartialRendering,
      hqPartialThreshold: store.hqPartialThreshold,
      hqFrameInterpolation: store.hqFrameInterpolation,
    });
    setHqBrushParams(
      store.hqModeEnabled && store.hqGaussianSmoothing,
      store.hqBrushSoftness,
    );
  }, [store]);

  return (
    <div
      data-ocid="hq.panel"
      style={{
        display: "flex",
        flexDirection: "row",
        overflowX: "auto",
        overflowY: "hidden",
        height: "120px",
        background: "#0d0a00",
        borderBottom: `1px solid ${HQ_DIM}`,
        borderTop: `1px solid ${HQ_COLOR}44`,
        flexShrink: 0,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* SPECTRAL ENGINE */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>SPECTRAL</div>
        <SliderRow
          label="Res Boost"
          value={store.hqSpectralBoost}
          min={1.0}
          max={1.5}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          ocid="hq.spectral_boost_input"
          onChange={(v) => {
            store.setHqSpectralBoost(v);
            sync();
          }}
        />
        <ToggleRow
          label="Log Freq Scale"
          value={store.hqLogFreqScaling}
          ocid="hq.log_freq_toggle"
          onChange={(v) => {
            store.setHqLogFreqScaling(v);
            sync();
          }}
        />
        <ToggleRow
          label="Harmonic Snap"
          value={store.hqHarmonicSnap}
          ocid="hq.harmonic_snap_toggle"
          onChange={(v) => {
            store.setHqHarmonicSnap(v);
            sync();
          }}
        />
      </div>

      {/* SMOOTHING */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>SMOOTHING</div>
        <ToggleRow
          label="Gaussian Smooth"
          value={store.hqGaussianSmoothing}
          ocid="hq.gaussian_toggle"
          onChange={(v) => {
            store.setHqGaussianSmoothing(v);
            sync();
          }}
        />
        <SliderRow
          label="Brush Softness"
          value={store.hqBrushSoftness}
          min={0}
          max={2}
          step={0.1}
          ocid="hq.brush_softness_input"
          onChange={(v) => {
            store.setHqBrushSoftness(v);
            sync();
          }}
        />
      </div>

      {/* PHASE */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>PHASE</div>
        <ToggleRow
          label="Phase Rand"
          value={store.hqPhaseRandomization}
          ocid="hq.phase_rand_toggle"
          onChange={(v) => {
            store.setHqPhaseRandomization(v);
            sync();
          }}
        />
        <SliderRow
          label="Phase Spread"
          value={store.hqPhaseSpread}
          min={0}
          max={0.2}
          step={0.01}
          format={(v) => `${v.toFixed(2)}r`}
          ocid="hq.phase_spread_input"
          onChange={(v) => {
            store.setHqPhaseSpread(v);
            sync();
          }}
        />
        <button
          type="button"
          data-ocid="hq.reseed_button"
          className="synth-btn"
          style={{
            padding: "2px 8px",
            fontSize: "8px",
            marginTop: "2px",
            borderColor: HQ_COLOR,
            color: HQ_COLOR,
          }}
          onClick={() => randomizePhasesWithSpread(store.hqPhaseSpread)}
        >
          RE-SEED
        </button>
      </div>

      {/* SYNTHESIS */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>SYNTHESIS</div>
        <ToggleRow
          label="Frame Interp"
          value={store.hqFrameInterpolation}
          ocid="hq.frame_interp_toggle"
          onChange={(v) => {
            store.setHqFrameInterpolation(v);
            sync();
          }}
        />
        <ToggleRow
          label="Oversampling"
          value={store.hqAdditiveOversampling}
          ocid="hq.oversampling_toggle"
          onChange={(v) => {
            store.setHqAdditiveOversampling(v);
            sync();
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "4px",
          }}
        >
          <span style={{ fontSize: "8px", color: "var(--synth-text-dim)" }}>
            Rate
          </span>
          <select
            data-ocid="hq.oversample_rate_select"
            value={store.hqOversampleRate}
            onChange={(e) => {
              store.setHqOversampleRate(e.target.value as "1x" | "2x");
              sync();
            }}
            style={{
              background: "var(--synth-control)",
              border: "1px solid var(--synth-border)",
              color: HQ_COLOR,
              fontSize: "8px",
              padding: "1px 3px",
              borderRadius: "2px",
            }}
          >
            <option value="1x">1x</option>
            <option value="2x">2x</option>
          </select>
        </div>
        <ToggleRow
          label="Peak Partials"
          value={store.hqPeakPartialRendering}
          ocid="hq.peak_partial_toggle"
          onChange={(v) => {
            store.setHqPeakPartialRendering(v);
            sync();
          }}
        />
        <SliderRow
          label="Part. Threshold"
          value={store.hqPartialThreshold}
          min={0.01}
          max={0.2}
          step={0.01}
          ocid="hq.partial_threshold_input"
          onChange={(v) => {
            store.setHqPartialThreshold(v);
            sync();
          }}
        />
      </div>

      {/* TILT */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE_STYLE}>TILT COMP</div>
        <ToggleRow
          label="Spectral Tilt"
          value={store.hqSpectralTiltComp}
          ocid="hq.tilt_comp_toggle"
          onChange={(v) => {
            store.setHqSpectralTiltComp(v);
            sync();
          }}
        />
        <SliderRow
          label="Tilt Strength"
          value={store.hqTiltStrength}
          min={-0.6}
          max={0}
          step={0.05}
          ocid="hq.tilt_strength_input"
          onChange={(v) => {
            store.setHqTiltStrength(v);
            sync();
          }}
        />
      </div>

      {/* ENVELOPE */}
      <div style={{ ...SECTION_STYLE, borderRight: "none" }}>
        <div style={SECTION_TITLE_STYLE}>ENV SMOOTH</div>
        <ToggleRow
          label="Temporal Env"
          value={store.hqTemporalEnvSmoothing}
          ocid="hq.temporal_env_toggle"
          onChange={(v) => {
            store.setHqTemporalEnvSmoothing(v);
            sync();
          }}
        />
        <SliderRow
          label="Attack"
          value={Math.round(store.hqEnvelopeAttack * 1000)}
          min={1}
          max={20}
          step={1}
          format={(v) => `${v}ms`}
          ocid="hq.env_attack_input"
          onChange={(v) => {
            store.setHqEnvelopeAttack(v / 1000);
            sync();
          }}
        />
        <SliderRow
          label="Decay"
          value={Math.round(store.hqEnvelopeDecay * 1000)}
          min={10}
          max={200}
          step={5}
          format={(v) => `${v}ms`}
          ocid="hq.env_decay_input"
          onChange={(v) => {
            store.setHqEnvelopeDecay(v / 1000);
            sync();
          }}
        />
      </div>
    </div>
  );
}
