import { useCallback } from "react";
import { syncParamsImmediately } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";

type Props = { onClose: () => void };

function Row({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "4px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          color: "var(--synth-text-dim)",
          minWidth: "90px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px" }}
      >
        {children}
      </div>
    </div>
  );
}

function SSlider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  display,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#a855f7", height: "3px" }}
      />
      <span
        style={{
          fontSize: "9px",
          color: "var(--synth-active)",
          minWidth: "32px",
          textAlign: "right",
        }}
      >
        {display ?? value}
      </span>
    </>
  );
}

function SToggle({
  value,
  onChange,
  label,
}: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`synth-btn${value ? " active" : ""}`}
      onClick={() => onChange(!value)}
      style={{
        padding: "2px 8px",
        fontSize: "9px",
        borderColor: value ? "#a855f7" : undefined,
        color: value ? "#a855f7" : undefined,
        fontWeight: value ? "bold" : undefined,
      }}
    >
      {label}
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "8px",
        letterSpacing: "0.12em",
        color: "#a855f7",
        borderBottom: "1px solid #a855f722",
        marginBottom: "4px",
        paddingBottom: "2px",
        marginTop: "6px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export default function LushPanel({ onClose }: Props) {
  const s = useSynthStore();

  const sync = useCallback(() => {
    syncParamsImmediately();
  }, []);

  const applyPadPreset = useCallback(() => {
    s.setAttack(0.4);
    s.setRelease(1.2);
    s.setLushChorusEnabled(true);
    s.setLushChorusMix(55);
    s.setLushStereoSpread(90);
    s.setLushUnisonVoices(4);
    s.setLushDetuneAmount(6);
    s.setLushFilterEnabled(true);
    s.setLushFilterCutoff(4000);
    s.setLushFilterLfoEnabled(true);
    s.setLushFilterLfoRate(0.08);
    s.setLushFilterLfoDepth(1200);
    s.setLushSatEnabled(false);
    s.setLushBodyResEnabled(false);
    syncParamsImmediately();
  }, [s]);

  const applyPianoPreset = useCallback(() => {
    s.setAttack(0.005);
    s.setRelease(0.4);
    s.setLushBodyResEnabled(true);
    s.setLushBodyResGain(40);
    s.setLushSatEnabled(true);
    s.setLushSatDrive(1.8);
    s.setLushSatMix(30);
    s.setLushUnisonVoices(2);
    s.setLushDetuneAmount(2);
    s.setLushStereoSpread(40);
    s.setLushFilterEnabled(false);
    s.setLushChorusEnabled(false);
    syncParamsImmediately();
  }, [s]);

  const applyStringPreset = useCallback(() => {
    s.setLushUnisonVoices(4);
    s.setLushDetuneAmount(5);
    s.setLushStereoSpread(75);
    s.setLushFilterEnabled(true);
    s.setLushFilterCutoff(5000);
    s.setLushFilterLfoEnabled(true);
    s.setLushFilterLfoRate(0.04);
    s.setLushFilterLfoDepth(800);
    s.setLushChorusEnabled(true);
    s.setLushChorusMix(25);
    s.setLushSatEnabled(true);
    s.setLushSatDrive(1.3);
    s.setLushSatMix(20);
    s.setLushBodyResEnabled(false);
    syncParamsImmediately();
  }, [s]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "40px",
        right: "4px",
        width: "280px",
        maxHeight: "70vh",
        background: "var(--synth-panel)",
        border: "1px solid #a855f744",
        borderRadius: "4px",
        zIndex: 100,
        overflowY: "auto",
        boxShadow: "0 4px 24px #a855f722",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          borderBottom: "1px solid #a855f733",
          background: "#a855f711",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: "#a855f7",
            letterSpacing: "0.1em",
          }}
        >
          LUSH SOUND PANEL
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <SToggle
            value={s.lushModeEnabled}
            onChange={(v) => {
              s.setLushModeEnabled(v);
              syncParamsImmediately();
            }}
            label={s.lushModeEnabled ? "LUSH ON" : "LUSH OFF"}
          />
          <button
            type="button"
            className="synth-btn"
            onClick={onClose}
            style={{ padding: "2px 6px", fontSize: "10px" }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 10px" }}>
        {/* UNISON */}
        <SectionHeader>Unison</SectionHeader>
        <Row label="UNISON VOICES">
          <SSlider
            value={s.lushUnisonVoices}
            min={1}
            max={4}
            step={1}
            onChange={(v) => {
              s.setLushUnisonVoices(v);
              sync();
            }}
            display={String(s.lushUnisonVoices)}
          />
        </Row>
        <Row label="DETUNE AMOUNT">
          <SSlider
            value={s.lushDetuneAmount}
            min={0}
            max={8}
            step={0.1}
            onChange={(v) => {
              s.setLushDetuneAmount(v);
              sync();
            }}
            display={`${s.lushDetuneAmount.toFixed(1)}c`}
          />
        </Row>
        <Row label="STEREO SPREAD">
          <SSlider
            value={s.lushStereoSpread}
            min={0}
            max={100}
            step={1}
            onChange={(v) => {
              s.setLushStereoSpread(v);
              sync();
            }}
            display={`${s.lushStereoSpread}%`}
          />
        </Row>
        <Row label="ANALOG DRIFT">
          <SSlider
            value={s.lushAnalogDriftAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => {
              s.setLushAnalogDriftAmount(v);
              sync();
            }}
            display={`${s.lushAnalogDriftAmount.toFixed(2)}c`}
          />
        </Row>
        <Row label="DRIFT SPEED">
          <SSlider
            value={s.lushDriftSpeed}
            min={0.1}
            max={2}
            step={0.05}
            onChange={(v) => {
              s.setLushDriftSpeed(v);
              sync();
            }}
            display={`${s.lushDriftSpeed.toFixed(2)}Hz`}
          />
        </Row>

        {/* SUB OSCILLATOR */}
        <SectionHeader>Sub Oscillator</SectionHeader>
        <Row label="SUB OSCILLATOR">
          <SToggle
            value={s.lushSubEnabled}
            onChange={(v) => {
              s.setLushSubEnabled(v);
              sync();
            }}
            label="SUB"
          />
        </Row>
        <Row label="SUB LEVEL">
          <SSlider
            value={s.lushSubLevel}
            min={0}
            max={50}
            step={1}
            onChange={(v) => {
              s.setLushSubLevel(v);
              sync();
            }}
            display={`${s.lushSubLevel}%`}
          />
        </Row>
        <Row label="SUB CUTOFF LIM">
          <SSlider
            value={s.lushSubCutoffLimit}
            min={50}
            max={300}
            step={5}
            onChange={(v) => {
              s.setLushSubCutoffLimit(v);
              sync();
            }}
            display={`${s.lushSubCutoffLimit}Hz`}
          />
        </Row>

        {/* SATURATION */}
        <SectionHeader>Soft Saturation</SectionHeader>
        <Row label="SATURATION">
          <SToggle
            value={s.lushSatEnabled}
            onChange={(v) => {
              s.setLushSatEnabled(v);
              sync();
            }}
            label="SAT"
          />
        </Row>
        <Row label="SAT DRIVE">
          <SSlider
            value={s.lushSatDrive}
            min={1.0}
            max={3.0}
            step={0.05}
            onChange={(v) => {
              s.setLushSatDrive(v);
              sync();
            }}
            display={s.lushSatDrive.toFixed(2)}
          />
        </Row>
        <Row label="SAT MIX">
          <SSlider
            value={s.lushSatMix}
            min={0}
            max={100}
            step={1}
            onChange={(v) => {
              s.setLushSatMix(v);
              sync();
            }}
            display={`${s.lushSatMix}%`}
          />
        </Row>

        {/* GLOBAL FILTER */}
        <SectionHeader>Global Filter</SectionHeader>
        <Row label="FILTER">
          <SToggle
            value={s.lushFilterEnabled}
            onChange={(v) => {
              s.setLushFilterEnabled(v);
              sync();
            }}
            label="FILTER"
          />
        </Row>
        <Row label="FILTER TYPE">
          <select
            value={s.lushFilterType}
            onChange={(e) => {
              s.setLushFilterType(
                e.target.value as "lowpass" | "softlowpass" | "bandpass",
              );
              sync();
            }}
            style={{
              background: "var(--synth-control)",
              border: "1px solid var(--synth-border)",
              borderRadius: "2px",
              color: "var(--synth-active)",
              fontSize: "9px",
              padding: "2px 4px",
              fontFamily: "inherit",
            }}
          >
            <option value="lowpass">LOWPASS</option>
            <option value="softlowpass">SOFT LOWPASS</option>
            <option value="bandpass">BANDPASS</option>
          </select>
        </Row>
        <Row label="FILTER CUTOFF">
          <SSlider
            value={s.lushFilterCutoff}
            min={200}
            max={12000}
            step={50}
            onChange={(v) => {
              s.setLushFilterCutoff(v);
              sync();
            }}
            display={`${s.lushFilterCutoff}Hz`}
          />
        </Row>
        <Row label="FILTER RES">
          <SSlider
            value={s.lushFilterResonance}
            min={0}
            max={0.8}
            step={0.01}
            onChange={(v) => {
              s.setLushFilterResonance(v);
              sync();
            }}
            display={s.lushFilterResonance.toFixed(2)}
          />
        </Row>

        {/* FILTER LFO */}
        <SectionHeader>Filter LFO</SectionHeader>
        <Row label="FILTER LFO">
          <SToggle
            value={s.lushFilterLfoEnabled}
            onChange={(v) => {
              s.setLushFilterLfoEnabled(v);
              sync();
            }}
            label="LFO"
          />
        </Row>
        <Row label="LFO RATE">
          <SSlider
            value={s.lushFilterLfoRate}
            min={0.01}
            max={1}
            step={0.01}
            onChange={(v) => {
              s.setLushFilterLfoRate(v);
              sync();
            }}
            display={`${s.lushFilterLfoRate.toFixed(2)}Hz`}
          />
        </Row>
        <Row label="LFO DEPTH">
          <SSlider
            value={s.lushFilterLfoDepth}
            min={0}
            max={2000}
            step={50}
            onChange={(v) => {
              s.setLushFilterLfoDepth(v);
              sync();
            }}
            display={`${s.lushFilterLfoDepth}Hz`}
          />
        </Row>

        {/* CHORUS */}
        <SectionHeader>Chorus</SectionHeader>
        <Row label="CHORUS">
          <SToggle
            value={s.lushChorusEnabled}
            onChange={(v) => {
              s.setLushChorusEnabled(v);
              sync();
            }}
            label="CHORUS"
          />
        </Row>
        <Row label="CHORUS DELAY">
          <SSlider
            value={s.lushChorusDelay}
            min={10}
            max={30}
            step={0.5}
            onChange={(v) => {
              s.setLushChorusDelay(v);
              sync();
            }}
            display={`${s.lushChorusDelay.toFixed(1)}ms`}
          />
        </Row>
        <Row label="MOD DEPTH">
          <SSlider
            value={s.lushChorusModDepth}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => {
              s.setLushChorusModDepth(v);
              sync();
            }}
            display={`${s.lushChorusModDepth.toFixed(1)}ms`}
          />
        </Row>
        <Row label="CHORUS RATE">
          <SSlider
            value={s.lushChorusRate}
            min={0.05}
            max={1}
            step={0.01}
            onChange={(v) => {
              s.setLushChorusRate(v);
              sync();
            }}
            display={`${s.lushChorusRate.toFixed(2)}Hz`}
          />
        </Row>
        <Row label="CHORUS MIX">
          <SSlider
            value={s.lushChorusMix}
            min={0}
            max={100}
            step={1}
            onChange={(v) => {
              s.setLushChorusMix(v);
              sync();
            }}
            display={`${s.lushChorusMix}%`}
          />
        </Row>

        {/* BODY RESONANCE */}
        <SectionHeader>Piano Body Resonance</SectionHeader>
        <Row label="BODY RESONANCE">
          <SToggle
            value={s.lushBodyResEnabled}
            onChange={(v) => {
              s.setLushBodyResEnabled(v);
              sync();
            }}
            label="BODY"
          />
          <span style={{ fontSize: "8px", color: "var(--synth-text-dim)" }}>
            110/440/2.2kHz
          </span>
        </Row>
        <Row label="BODY GAIN">
          <SSlider
            value={s.lushBodyResGain}
            min={0}
            max={100}
            step={1}
            onChange={(v) => {
              s.setLushBodyResGain(v);
              sync();
            }}
            display={`${s.lushBodyResGain}%`}
          />
        </Row>

        {/* PRESETS */}
        <SectionHeader>Presets</SectionHeader>
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginTop: "4px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="synth-btn"
            data-ocid="lush.pad_preset_button"
            onClick={applyPadPreset}
            style={{ padding: "4px 10px", fontSize: "9px", flex: 1 }}
          >
            PAD PRESET
          </button>
          <button
            type="button"
            className="synth-btn"
            data-ocid="lush.piano_preset_button"
            onClick={applyPianoPreset}
            style={{ padding: "4px 10px", fontSize: "9px", flex: 1 }}
          >
            PIANO PRESET
          </button>
          <button
            type="button"
            className="synth-btn"
            data-ocid="lush.string_preset_button"
            onClick={applyStringPreset}
            style={{ padding: "4px 10px", fontSize: "9px", flex: 1 }}
          >
            STRING PRESET
          </button>
        </div>
      </div>
    </div>
  );
}
