import { useCallback, useState } from "react";
import { syncParamsToAudio } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";
import { seqStepsData } from "../../store/synthStore";
import type {
  DistortionClip,
  DriftMode,
  NoiseAffect,
  PartialApplyMode,
  SeqDivision,
  SeqMode,
  SpreadCurve,
  StepCount,
  TuningScale,
} from "../../store/synthStore";

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
  displayFn,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
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
        onChange={(e) => {
          onChange(Number(e.target.value));
          syncParamsToAudio();
        }}
        style={{ flex: 1 }}
      />
      <span className="val">
        {displayFn ? displayFn(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <label>{label}</label>
      <div
        className={`synth-toggle${value ? " on" : ""}`}
        onClick={() => {
          onChange(!value);
          syncParamsToAudio();
        }}
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="synth-slider-row">
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          syncParamsToAudio();
        }}
        style={{ flex: 1 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CollapsibleProps {
  title: string;
  enabled?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Collapsible({
  title,
  enabled,
  onToggle,
  children,
  defaultOpen = false,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "4px" }}>
      <div
        className={`collapsible-header${enabled ? " enabled" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onToggle && (
            <div
              className={`synth-toggle${enabled ? " on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
                syncParamsToAudio();
              }}
            />
          )}
          <span style={{ fontSize: "10px", color: "var(--synth-text-dim)" }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </div>
      {open && (
        <div
          style={{
            padding: "8px",
            background: "var(--synth-panel)",
            border: "1px solid var(--synth-border)",
            borderTop: "none",
            borderRadius: "0 0 3px 3px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Step Sequencer Grid
function StepSequencerGrid({ stepCount }: { stepCount: number }) {
  const [steps, setSteps] = useState<number[]>(() =>
    Array.from({ length: stepCount }, (_, i) => seqStepsData[i]),
  );

  const handleTap = useCallback(
    (idx: number, clientY: number, rect: DOMRect) => {
      const relY = (rect.bottom - clientY) / rect.height;
      const val = relY * 2 - 1; // -1 to 1
      const newSteps = [...steps];
      newSteps[idx] = Math.max(-1, Math.min(1, val));
      seqStepsData[idx] = newSteps[idx];
      setSteps(newSteps);
    },
    [steps],
  );

  return (
    <div
      style={{
        display: "flex",
        gap: "2px",
        height: "48px",
        marginBottom: "6px",
      }}
    >
      {Array.from({ length: Math.min(stepCount, 32) }, (_, i) => {
        const val = steps[i] ?? 0;
        const height = Math.abs(val);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              background: "var(--synth-control)",
              border: "1px solid var(--synth-border)",
              borderRadius: "2px",
              position: "relative",
              cursor: "pointer",
              minWidth: "6px",
            }}
            onMouseDown={(e) =>
              handleTap(i, e.clientY, e.currentTarget.getBoundingClientRect())
            }
            onTouchStart={(e) =>
              handleTap(
                i,
                e.touches[0].clientY,
                e.currentTarget.getBoundingClientRect(),
              )
            }
          >
            <div
              style={{
                position: "absolute",
                bottom: val > 0 ? "50%" : `${50 - height * 50}%`,
                left: "0",
                right: "0",
                height: `${height * 50}%`,
                background:
                  val > 0 ? "var(--synth-active)" : "var(--synth-danger)",
                opacity: 0.8,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ModulesPanel({ onClose }: Props) {
  const state = useSynthStore();

  return (
    <div className="slide-panel" style={{ padding: "12px", maxHeight: "88vh" }}>
      <div
        style={{
          width: 40,
          height: 3,
          background: "var(--synth-border)",
          borderRadius: 2,
          margin: "0 auto 8px",
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
          DSP MODULES
        </span>
        <button
          className="synth-btn"
          onClick={onClose}
          style={{ padding: "3px 8px" }}
        >
          ✕
        </button>
      </div>

      {/* Module 1: Harmonic Drift */}
      <Collapsible
        title="1 · HARMONIC DRIFT"
        enabled={state.driftEnabled}
        onToggle={() => state.setDriftEnabled(!state.driftEnabled)}
      >
        <SliderRow
          label="AMOUNT"
          value={state.driftAmount}
          min={0}
          max={1}
          onChange={state.setDriftAmount}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="SPEED"
          value={state.driftSpeed}
          min={0.01}
          max={5}
          onChange={state.setDriftSpeed}
          displayFn={(v) => `${v.toFixed(2)}Hz`}
        />
        <SelectRow
          label="MODE"
          value={state.driftMode}
          onChange={(v) => state.setDriftMode(v as DriftMode)}
          options={[
            { value: "sine", label: "Sine LFO" },
            { value: "random", label: "Random Walk" },
            { value: "chaos", label: "Chaos" },
          ]}
        />
        <SliderRow
          label="HI EMPH"
          value={state.highHarmonicEmphasis}
          min={0}
          max={1}
          onChange={state.setHighHarmonicEmphasis}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
      </Collapsible>

      {/* Module 2: Step Sequencer */}
      <Collapsible
        title="2 · PARTIAL STEP SEQUENCER"
        enabled={state.seqEnabled}
        onToggle={() => state.setSeqEnabled(!state.seqEnabled)}
      >
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            {([8, 16, 32] as StepCount[]).map((n) => (
              <button
                key={n}
                className={`synth-btn${state.seqStepCount === n ? " active" : ""}`}
                onClick={() => state.setSeqStepCount(n)}
                style={{ padding: "3px 6px" }}
              >
                {n}
              </button>
            ))}
          </div>
          <select
            value={state.seqTempoDivision}
            onChange={(e) =>
              state.setSeqTempoDivision(e.target.value as SeqDivision)
            }
            style={{ flex: 1 }}
          >
            {["1/4", "1/8", "1/16", "1/32"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={state.seqMode}
            onChange={(e) => state.setSeqMode(e.target.value as SeqMode)}
            style={{ flex: 1 }}
          >
            <option value="amplitude">Amplitude</option>
            <option value="pitch">Pitch Offset</option>
            <option value="pan">Pan</option>
          </select>
        </div>
        <ToggleRow
          label="Limit First 32 Harmonics"
          value={state.seqLimitHarmonics}
          onChange={state.setSeqLimitHarmonics}
        />
        <StepSequencerGrid stepCount={state.seqStepCount} />
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            marginBottom: "6px",
          }}
        >
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              seqStepsData.fill(0);
            }}
          >
            CLEAR
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              for (let i = 0; i < state.seqStepCount; i++)
                seqStepsData[i] = Math.random() * 2 - 1;
            }}
          >
            RAND
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              const last = seqStepsData[state.seqStepCount - 1];
              for (let i = state.seqStepCount - 1; i > 0; i--)
                seqStepsData[i] = seqStepsData[i - 1];
              seqStepsData[0] = last;
            }}
          >
            ◀
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              const first = seqStepsData[0];
              for (let i = 0; i < state.seqStepCount - 1; i++)
                seqStepsData[i] = seqStepsData[i + 1];
              seqStepsData[state.seqStepCount - 1] = first;
            }}
          >
            ▶
          </button>
        </div>
        <SliderRow
          label="SMOOTH"
          value={state.seqSmoothing}
          min={0}
          max={50}
          step={1}
          onChange={state.setSeqSmoothing}
          displayFn={(v) => `${Math.round(v)}ms`}
        />
      </Collapsible>

      {/* Module 3: Spectral Tilt */}
      <Collapsible title="3 · SPECTRAL TILT">
        <SliderRow
          label="TILT"
          value={state.spectralTilt}
          min={-100}
          max={100}
          step={1}
          onChange={state.setSpectralTilt}
          displayFn={(v) =>
            v > 0
              ? `+${Math.round(v)} Bright`
              : v < 0
                ? `${Math.round(v)} Dark`
                : "Flat"
          }
        />
        <button
          className="synth-btn"
          style={{ width: "100%", marginTop: "4px" }}
          onClick={() => {
            state.setSpectralTilt(0);
            syncParamsToAudio();
          }}
        >
          RESET TILT
        </button>
      </Collapsible>

      {/* Module 4: Center Shift */}
      <Collapsible
        title="4 · SPECTRAL CENTER SHIFT"
        enabled={state.centerShiftEnabled}
        onToggle={() => state.setCenterShiftEnabled(!state.centerShiftEnabled)}
      >
        <SliderRow
          label="SHIFT"
          value={state.centerShiftAmount}
          min={-24}
          max={24}
          step={1}
          onChange={state.setCenterShiftAmount}
          displayFn={(v) => `${v > 0 ? "+" : ""}${Math.round(v)}st`}
        />
        <ToggleRow
          label="Interpolation"
          value={state.centerShiftInterpolation}
          onChange={state.setCenterShiftInterpolation}
        />
        <button
          className="synth-btn"
          style={{ width: "100%", marginTop: "4px" }}
          onClick={() => {
            state.setCenterShiftAmount(0);
            syncParamsToAudio();
          }}
        >
          RESET
        </button>
      </Collapsible>

      {/* Module 5: Partial Envelope */}
      <Collapsible
        title="5 · PARTIAL ENVELOPE SHAPER"
        enabled={state.partialEnvEnabled}
        onToggle={() => state.setPartialEnvEnabled(!state.partialEnvEnabled)}
      >
        <SliderRow
          label="ATTACK"
          value={state.partialAttack}
          min={0}
          max={5}
          onChange={state.setPartialAttack}
          displayFn={(v) => `${v.toFixed(2)}s`}
        />
        <SliderRow
          label="DECAY"
          value={state.partialDecay}
          min={0}
          max={5}
          onChange={state.setPartialDecay}
          displayFn={(v) => `${v.toFixed(2)}s`}
        />
        <SliderRow
          label="SUSTAIN"
          value={state.partialSustain}
          min={0}
          max={1}
          onChange={state.setPartialSustain}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="RELEASE"
          value={state.partialRelease}
          min={0}
          max={5}
          onChange={state.setPartialRelease}
          displayFn={(v) => `${v.toFixed(2)}s`}
        />
        <SelectRow
          label="APPLY"
          value={state.partialApplyMode}
          onChange={(v) => state.setPartialApplyMode(v as PartialApplyMode)}
          options={[
            { value: "global", label: "Global" },
            { value: "odd", label: "Odd Harmonics" },
            { value: "even", label: "Even Harmonics" },
            { value: "high", label: "High Band Only" },
          ]}
        />
        <button
          className="synth-btn"
          style={{ width: "100%", marginTop: "4px" }}
          onClick={() => {
            state.setPartialAttack(0.1);
            state.setPartialDecay(0.3);
            state.setPartialSustain(0.8);
            state.setPartialRelease(0.5);
            syncParamsToAudio();
          }}
        >
          RESET
        </button>
      </Collapsible>

      {/* Module 6: Stereo Spread */}
      <Collapsible
        title="6 · STEREO SPECTRAL SPREAD"
        enabled={state.stereoSpreadEnabled}
        onToggle={() =>
          state.setStereoSpreadEnabled(!state.stereoSpreadEnabled)
        }
      >
        <SliderRow
          label="SPREAD"
          value={state.stereoSpreadModAmount}
          min={0}
          max={1}
          onChange={state.setStereoSpreadModAmount}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SelectRow
          label="CURVE"
          value={state.stereoSpreadCurve}
          onChange={(v) => state.setStereoSpreadCurve(v as SpreadCurve)}
          options={[
            { value: "linear", label: "Linear" },
            { value: "exponential", label: "Exponential" },
          ]}
        />
        <SliderRow
          label="DRIFT W"
          value={state.stereoSpreadDriftWidth}
          min={0}
          max={2}
          onChange={state.setStereoSpreadDriftWidth}
          displayFn={(v) => `${v.toFixed(2)}Hz`}
        />
        <button
          className="synth-btn"
          style={{ width: "100%", marginTop: "4px" }}
          onClick={() => {
            state.setStereoSpreadModAmount(0);
            syncParamsToAudio();
          }}
        >
          MONO COLLAPSE
        </button>
      </Collapsible>

      {/* Module 7: Partial Distortion */}
      <Collapsible
        title="7 · PARTIAL DISTORTION ZONE"
        enabled={state.distortionEnabled}
        onToggle={() => state.setDistortionEnabled(!state.distortionEnabled)}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          <div style={{ flex: 1 }}>
            <SliderRow
              label="HRM START"
              value={state.distortionStart}
              min={1}
              max={48}
              step={1}
              onChange={state.setDistortionStart}
              displayFn={(v) => `${Math.round(v)}`}
            />
          </div>
        </div>
        <SliderRow
          label="HRM END"
          value={state.distortionEnd}
          min={1}
          max={48}
          step={1}
          onChange={state.setDistortionEnd}
          displayFn={(v) => `${Math.round(v)}`}
        />
        <SliderRow
          label="DRIVE"
          value={state.distortionDrive}
          min={0}
          max={2}
          onChange={state.setDistortionDrive}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SelectRow
          label="CLIP"
          value={state.distortionClipMode}
          onChange={(v) => state.setDistortionClipMode(v as DistortionClip)}
          options={[
            { value: "soft", label: "Soft Clip" },
            { value: "hard", label: "Hard Clip" },
          ]}
        />
        <button
          className="synth-btn"
          style={{ width: "100%", marginTop: "4px" }}
          onClick={() => {}}
        >
          SOLO DIST BAND
        </button>
      </Collapsible>

      {/* Module 8: Noise Layer */}
      <Collapsible
        title="8 · SPECTRAL NOISE LAYER"
        enabled={state.noiseLayerEnabled}
        onToggle={() => state.setNoiseLayerEnabled(!state.noiseLayerEnabled)}
      >
        <SliderRow
          label="AMOUNT"
          value={state.noiseLayerAmount}
          min={0}
          max={1}
          onChange={state.setNoiseLayerAmount}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SelectRow
          label="AFFECT"
          value={state.noiseLayerAffect}
          onChange={(v) => state.setNoiseLayerAffect(v as NoiseAffect)}
          options={[
            { value: "amplitude", label: "Amplitude" },
            { value: "pitch", label: "Pitch" },
            { value: "both", label: "Both" },
          ]}
        />
        <ToggleRow
          label="Lock Fundamental"
          value={state.noiseLayerLockFundamental}
          onChange={state.setNoiseLayerLockFundamental}
        />
        <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              state.setNoiseLayerSeed(Math.floor(Math.random() * 99999));
            }}
          >
            RAND SEED
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              state.setNoiseLayerSeed(state.noiseLayerSeed);
            }}
          >
            SAVE
          </button>
          <button className="synth-btn" style={{ flex: 1 }} onClick={() => {}}>
            RECALL
          </button>
        </div>
      </Collapsible>

      {/* Module 10: Harmonic Cluster */}
      <Collapsible
        title="10 · HARMONIC CLUSTER MODE"
        enabled={state.clusterEnabled}
        onToggle={() => state.setClusterEnabled(!state.clusterEnabled)}
      >
        <SliderRow
          label="SIZE"
          value={state.clusterSize}
          min={1}
          max={16}
          step={1}
          onChange={state.setClusterSize}
          displayFn={(v) => `${Math.round(v)}`}
        />
        <SliderRow
          label="SPACING"
          value={state.clusterSpacing}
          min={0}
          max={1}
          onChange={state.setClusterSpacing}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="RESONANCE"
          value={state.clusterResonance}
          min={0}
          max={2}
          onChange={state.setClusterResonance}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
          <button className="synth-btn" style={{ flex: 1 }} onClick={() => {}}>
            RANDOMIZE
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              state.setClusterSize(4);
              state.setClusterSpacing(0.5);
              state.setClusterResonance(1.0);
              syncParamsToAudio();
            }}
          >
            RESET
          </button>
        </div>
      </Collapsible>

      {/* Module 11: Micro Tuning */}
      <Collapsible
        title="11 · MICRO TUNING MODE"
        enabled={state.microTuningEnabled}
        onToggle={() => state.setMicroTuningEnabled(!state.microTuningEnabled)}
      >
        <SelectRow
          label="SCALE"
          value={state.microTuningScale}
          onChange={(v) => state.setMicroTuningScale(v as TuningScale)}
          options={[
            { value: "equal", label: "Equal Temperament" },
            { value: "just", label: "Just Intonation" },
            { value: "custom", label: "Custom Ratios" },
          ]}
        />
        {state.microTuningScale === "custom" && (
          <div style={{ marginTop: "8px" }}>
            <div className="panel-section-title">CUSTOM RATIOS (12)</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "4px",
              }}
            >
              {state.customRatios.map((ratio, i) => (
                <input
                  key={i}
                  type="number"
                  step="0.001"
                  value={ratio.toFixed(4)}
                  onChange={(e) => {
                    const newRatios = [...state.customRatios];
                    newRatios[i] = Number.parseFloat(e.target.value) || 1;
                    state.setCustomRatios(newRatios);
                  }}
                  style={{
                    background: "var(--synth-control)",
                    border: "1px solid var(--synth-border)",
                    color: "var(--synth-active)",
                    padding: "3px 4px",
                    fontSize: "9px",
                    textAlign: "center",
                    fontFamily: "inherit",
                    borderRadius: "2px",
                    width: "100%",
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <button
          className="synth-btn"
          style={{ width: "100%", marginTop: "6px" }}
          onClick={() => {
            state.setCustomRatios([
              1,
              16 / 15,
              9 / 8,
              6 / 5,
              5 / 4,
              4 / 3,
              45 / 32,
              3 / 2,
              8 / 5,
              5 / 3,
              16 / 9,
              15 / 8,
            ]);
            syncParamsToAudio();
          }}
        >
          RESET SCALE
        </button>
      </Collapsible>

      {/* Bottom padding */}
      <div style={{ height: "20px" }} />
    </div>
  );
}
