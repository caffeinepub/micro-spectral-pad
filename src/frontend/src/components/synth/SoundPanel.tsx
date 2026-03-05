import { randomizePhases } from "../../engines/audioEngine";
import { syncParamsToAudio } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  dataOcid?: string;
  displayFn?: (v: number) => string;
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
}: SliderRowProps) {
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

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
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

interface Props {
  onClose: () => void;
}

export default function SoundPanel({ onClose }: Props) {
  const state = useSynthStore();
  const {
    soundMode,
    masterVolume,
    setMasterVolume,
    attack,
    setAttack,
    decay,
    setDecay,
    release,
    setRelease,
    softSaturation,
    setSoftSaturation,
    stereoSpreadAmount,
    setStereoSpreadAmount,
    blurEnabled,
    setBlurEnabled,
    lowCpuMode,
    setLowCpuMode,
    harmonicTilt,
    setHarmonicTilt,
    noiseColor,
    setNoiseColor,
    resonance,
    setResonance,
    frameInterpolation,
    setFrameInterpolation,
    morphSpeed,
    setMorphSpeed,
    material,
    setMaterial,
    damping,
    setDamping,
    hybridBalance,
    setHybridBalance,
    subHarmonicEnabled,
    setSubHarmonicEnabled,
  } = state;

  return (
    <div className="slide-panel" style={{ padding: "12px" }}>
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
          marginBottom: "10px",
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
          SOUND CONTROLS
        </span>
        <button
          className="synth-btn"
          onClick={onClose}
          style={{ padding: "3px 8px" }}
        >
          ✕
        </button>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">MASTER</div>
        <SliderRow
          label="VOLUME"
          value={masterVolume}
          min={0}
          max={1}
          onChange={setMasterVolume}
          dataOcid="sound.volume_slider"
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <ToggleRow
          label="Soft Saturation"
          value={softSaturation}
          onChange={setSoftSaturation}
        />
        <ToggleRow
          label="Blur Smoothing"
          value={blurEnabled}
          onChange={setBlurEnabled}
        />
        <ToggleRow
          label="Low CPU Mode"
          value={lowCpuMode}
          onChange={setLowCpuMode}
        />
      </div>

      <div className="panel-section">
        <div className="panel-section-title">GLOBAL ENVELOPE</div>
        <SliderRow
          label="ATTACK"
          value={attack}
          min={0.001}
          max={2}
          onChange={setAttack}
          dataOcid="sound.attack_slider"
          displayFn={(v) => `${v.toFixed(3)}s`}
        />
        <SliderRow
          label="DECAY"
          value={decay}
          min={0.001}
          max={2}
          onChange={setDecay}
          dataOcid="sound.decay_slider"
          displayFn={(v) => `${v.toFixed(3)}s`}
        />
        <SliderRow
          label="RELEASE"
          value={release}
          min={0.001}
          max={3}
          onChange={setRelease}
          dataOcid="sound.release_slider"
          displayFn={(v) => `${v.toFixed(3)}s`}
        />
      </div>

      <div className="panel-section">
        <div className="panel-section-title">STEREO</div>
        <SliderRow
          label="SPREAD"
          value={stereoSpreadAmount}
          min={0}
          max={1}
          onChange={setStereoSpreadAmount}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      {/* Engine-Specific Panel */}
      <div className="panel-section">
        <div
          className="panel-section-title"
          style={{ color: "var(--synth-active)" }}
        >
          ENGINE: {soundMode.toUpperCase()}
        </div>

        {soundMode === "additive" && (
          <>
            <SliderRow
              label="HRM TILT"
              value={harmonicTilt}
              min={-100}
              max={100}
              step={1}
              onChange={setHarmonicTilt}
              displayFn={(v) => `${v > 0 ? "+" : ""}${Math.round(v)}`}
            />
            <SliderRow
              label="HYB BAL"
              value={hybridBalance}
              min={0}
              max={1}
              onChange={setHybridBalance}
              displayFn={(v) => `${Math.round(v * 100)}%`}
            />
            <ToggleRow
              label="Sub Harmonic"
              value={subHarmonicEnabled}
              onChange={setSubHarmonicEnabled}
            />
            <button
              className="synth-btn"
              onClick={() => {
                randomizePhases();
              }}
              style={{ width: "100%", marginTop: "4px" }}
            >
              RANDOM PHASE
            </button>
          </>
        )}

        {soundMode === "noise" && (
          <>
            <div className="panel-section-title" style={{ marginTop: "4px" }}>
              NOISE COLOR
            </div>
            <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
              <button
                className={`synth-btn${noiseColor === "white" ? " active" : ""}`}
                onClick={() => {
                  setNoiseColor("white");
                  syncParamsToAudio();
                }}
                style={{ flex: 1 }}
              >
                WHITE
              </button>
              <button
                className={`synth-btn${noiseColor === "pink" ? " active" : ""}`}
                onClick={() => {
                  setNoiseColor("pink");
                  syncParamsToAudio();
                }}
                style={{ flex: 1 }}
              >
                PINK
              </button>
            </div>
            <SliderRow
              label="RESONANCE"
              value={resonance}
              min={0}
              max={1}
              onChange={setResonance}
              displayFn={(v) => v.toFixed(2)}
            />
          </>
        )}

        {soundMode === "wavetable" && (
          <>
            <SliderRow
              label="INTERP"
              value={frameInterpolation}
              min={0}
              max={1}
              onChange={setFrameInterpolation}
              displayFn={(v) => v.toFixed(2)}
            />
            <SliderRow
              label="MORPH SPD"
              value={morphSpeed}
              min={0.1}
              max={4}
              onChange={setMorphSpeed}
              displayFn={(v) => `${v.toFixed(2)}x`}
            />
          </>
        )}

        {soundMode === "resonator" && (
          <>
            <div className="panel-section-title" style={{ marginTop: "4px" }}>
              MATERIAL
            </div>
            <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
              {(["glass", "metal", "string"] as const).map((m) => (
                <button
                  key={m}
                  className={`synth-btn${material === m ? " active" : ""}`}
                  onClick={() => {
                    setMaterial(m);
                    syncParamsToAudio();
                  }}
                  style={{ flex: 1, fontSize: "9px" }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <SliderRow
              label="DAMPING"
              value={damping}
              min={0}
              max={1}
              onChange={setDamping}
              displayFn={(v) => v.toFixed(2)}
            />
          </>
        )}
      </div>
    </div>
  );
}
