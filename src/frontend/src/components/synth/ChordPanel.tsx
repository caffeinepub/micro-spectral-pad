import { useMemo } from "react";
import {
  CHORD_INTERVALS,
  PROGRESSIONS,
  ROOT_NOTES,
  SCALE_INTERVALS,
  getActiveNoteMidi,
  getChordName,
} from "../../engines/chordEngine";
import { syncParamsToAudio } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";
import type { VoiceStacking } from "../../store/synthStore";

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

// Mini piano keyboard
function MiniKeyboard({ activeNotes }: { activeNotes: number[] }) {
  const activeSet = new Set(activeNotes.map((n) => n % 12));
  const whiteKeys = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]; // C D E F G A B C D E (2 octaves)
  const blackKeyPositions: Record<number, number> = {
    1: 0.5,
    3: 1.5,
    6: 3.5,
    8: 4.5,
    10: 5.5,
  }; // in white-key units

  return (
    <div
      style={{
        height: "40px",
        position: "relative",
        background: "#111",
        borderRadius: "3px",
        overflow: "hidden",
        marginTop: "8px",
        border: "1px solid var(--synth-border)",
      }}
    >
      {/* White keys */}
      {whiteKeys.map((noteOff, i) => {
        const isActive = activeSet.has(noteOff % 12);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i / whiteKeys.length) * 100}%`,
              width: `${(1 / whiteKeys.length) * 100}%`,
              top: 0,
              bottom: 0,
              background: isActive ? "var(--synth-active)" : "#ddd",
              border: "1px solid #333",
              boxSizing: "border-box",
            }}
          />
        );
      })}
      {/* Black keys */}
      {Object.entries(blackKeyPositions).map(([note, pos]) => {
        const noteNum = Number.parseInt(note);
        const isActive = activeSet.has(noteNum) || activeSet.has(noteNum + 12);
        return (
          <div
            key={note}
            style={{
              position: "absolute",
              left: `${(pos / whiteKeys.length) * 100}%`,
              width: `${(0.65 / whiteKeys.length) * 100}%`,
              top: 0,
              height: "60%",
              background: isActive ? "#00a896" : "#111",
              border: "1px solid #000",
              boxSizing: "border-box",
              zIndex: 1,
            }}
          />
        );
      })}
    </div>
  );
}

const ROOT_NOTE_OPTIONS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export default function ChordPanel({ onClose }: Props) {
  const state = useSynthStore();

  const chordName = useMemo(
    () => getChordName(state.chordRoot, state.chordType, state.chordInversion),
    [state.chordRoot, state.chordType, state.chordInversion],
  );

  const activeNotes = useMemo(() => {
    if (!state.chordModeEnabled) return [];
    return getActiveNoteMidi(
      state.chordRoot,
      state.chordOctave,
      state.chordType,
      state.chordInversion,
      state.chordSpread,
      state.chordVoiceCount,
      state.chordVoiceStacking,
    );
  }, [
    state.chordModeEnabled,
    state.chordRoot,
    state.chordOctave,
    state.chordType,
    state.chordInversion,
    state.chordSpread,
    state.chordVoiceCount,
    state.chordVoiceStacking,
  ]);

  const progressionChords = useMemo(() => {
    if (!state.progressionEnabled) return [];
    const prog = PROGRESSIONS[state.progressionPreset] || [0, 3, 4, 0];
    const scale = SCALE_INTERVALS[state.chordScale] || SCALE_INTERVALS.Major;
    const rootMidi = ROOT_NOTES[state.chordRoot] || 60;
    return prog.map((degree) => {
      const semitone = scale[degree % scale.length];
      const noteIndex = (((rootMidi - 60 + semitone) % 12) + 12) % 12;
      return ROOT_NOTE_OPTIONS[noteIndex];
    });
  }, [
    state.progressionEnabled,
    state.progressionPreset,
    state.chordScale,
    state.chordRoot,
  ]);

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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--synth-active)",
            }}
          >
            CHORD MODE
          </span>
          <div
            data-ocid="chord.enable_toggle"
            className={`synth-toggle${state.chordModeEnabled ? " on" : ""}`}
            onClick={() => {
              state.setChordModeEnabled(!state.chordModeEnabled);
              syncParamsToAudio();
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <div
            style={{
              padding: "4px 10px",
              background: "var(--synth-control)",
              border: "1px solid var(--synth-active)",
              borderRadius: "3px",
              color: "var(--synth-active)",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
            }}
          >
            {chordName}
          </div>
          <button
            className="synth-btn danger"
            onClick={() => {}}
            style={{ padding: "4px 8px" }}
          >
            ALL OFF
          </button>
          <button
            className="synth-btn"
            onClick={onClose}
            style={{ padding: "3px 8px" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mini Keyboard */}
      <MiniKeyboard activeNotes={activeNotes} />

      {/* Root & Scale */}
      <div className="panel-section" style={{ marginTop: "8px" }}>
        <div className="panel-section-title">ROOT & SCALE</div>
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            marginBottom: "6px",
          }}
        >
          {ROOT_NOTE_OPTIONS.map((note) => (
            <button
              key={note}
              data-ocid="chord.root_select"
              className={`synth-btn${state.chordRoot === note ? " active" : ""}`}
              onClick={() => {
                if (!state.chordLockRoot) {
                  state.setChordRoot(note);
                  syncParamsToAudio();
                }
              }}
              style={{
                flex: "1 1 calc(16% - 4px)",
                padding: "4px 2px",
                fontSize: "9px",
                minWidth: "28px",
              }}
            >
              {note}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
          <div style={{ flex: 1 }}>
            <div className="panel-section-title">OCTAVE</div>
            <select
              value={state.chordOctave}
              onChange={(e) => {
                state.setChordOctave(Number(e.target.value));
                syncParamsToAudio();
              }}
              style={{ width: "100%" }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <div className="panel-section-title">SCALE</div>
            <select
              data-ocid="chord.scale_select"
              value={state.chordScale}
              onChange={(e) => {
                state.setChordScale(e.target.value);
                syncParamsToAudio();
              }}
              style={{ width: "100%" }}
            >
              {Object.keys(SCALE_INTERVALS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ToggleRow
            label="Lock Root"
            value={state.chordLockRoot}
            onChange={state.setChordLockRoot}
          />
          <button
            className="synth-btn"
            style={{ padding: "3px 8px", fontSize: "9px" }}
            onClick={() => {
              state.setChordRoot("C");
              state.setChordOctave(4);
              syncParamsToAudio();
            }}
          >
            RESET
          </button>
        </div>
      </div>

      {/* Chord Type */}
      <div className="panel-section">
        <div className="panel-section-title">CHORD TYPE</div>
        <select
          data-ocid="chord.type_select"
          value={state.chordType}
          onChange={(e) => {
            state.setChordType(e.target.value);
            syncParamsToAudio();
          }}
          style={{ width: "100%", marginBottom: "6px" }}
        >
          {Object.keys(CHORD_INTERVALS).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "8px",
                color: "var(--synth-text-dim)",
                marginBottom: "3px",
              }}
            >
              INVERSION
            </div>
            <select
              value={state.chordInversion}
              onChange={(e) => {
                state.setChordInversion(e.target.value);
                syncParamsToAudio();
              }}
              style={{ width: "100%" }}
            >
              {["Root", "1st", "2nd", "3rd"].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "8px",
                color: "var(--synth-text-dim)",
                marginBottom: "3px",
              }}
            >
              STACKING
            </div>
            <select
              value={state.chordVoiceStacking}
              onChange={(e) => {
                state.setChordVoiceStacking(e.target.value as VoiceStacking);
                syncParamsToAudio();
              }}
              style={{ width: "100%" }}
            >
              <option value="closed">Closed</option>
              <option value="open">Open</option>
              <option value="drop2">Drop 2</option>
            </select>
          </div>
        </div>
        <ToggleRow
          label="Auto Invert"
          value={state.chordAutoInvert}
          onChange={state.setChordAutoInvert}
        />
        <SliderRow
          label="SPREAD"
          value={state.chordSpread}
          min={0}
          max={24}
          step={1}
          onChange={state.setChordSpread}
          displayFn={(v) => `${Math.round(v)}st`}
        />
        <SliderRow
          label="VOICES"
          value={state.chordVoiceCount}
          min={2}
          max={8}
          step={1}
          onChange={state.setChordVoiceCount}
          displayFn={(v) => `${Math.round(v)}`}
        />
      </div>

      {/* Progression */}
      <div className="panel-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <div className="panel-section-title" style={{ margin: 0 }}>
            PROGRESSION
          </div>
          <div
            className={`synth-toggle${state.progressionEnabled ? " on" : ""}`}
            onClick={() => {
              state.setProgressionEnabled(!state.progressionEnabled);
              syncParamsToAudio();
            }}
          />
        </div>
        <select
          value={state.progressionPreset}
          onChange={(e) => {
            state.setProgressionPreset(e.target.value);
            syncParamsToAudio();
          }}
          style={{ width: "100%", marginBottom: "6px" }}
        >
          {Object.keys(PROGRESSIONS).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Progression steps display */}
        {state.progressionEnabled && progressionChords.length > 0 && (
          <div style={{ display: "flex", gap: "3px", marginBottom: "6px" }}>
            {progressionChords.map((chord, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: "4px 2px",
                  textAlign: "center",
                  background:
                    state.progressionStep === i
                      ? "color-mix(in oklch, var(--synth-active) 25%, var(--synth-control))"
                      : "var(--synth-control)",
                  border:
                    state.progressionStep === i
                      ? "1px solid var(--synth-active)"
                      : "1px solid var(--synth-border)",
                  borderRadius: "2px",
                  fontSize: "9px",
                  color:
                    state.progressionStep === i
                      ? "var(--synth-active)"
                      : "var(--synth-text)",
                }}
              >
                {chord}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
          <select
            value={state.progressionLength}
            onChange={(e) => state.setProgressionLength(Number(e.target.value))}
            style={{ flex: 1 }}
          >
            {[2, 4, 8, 16].map((l) => (
              <option key={l} value={l}>
                {l} Bars
              </option>
            ))}
          </select>
          <select
            value={state.chordDuration}
            onChange={(e) => state.setChordDuration(e.target.value)}
            style={{ flex: 1 }}
          >
            {["1 Bar", "1/2 Bar", "1/4 Bar"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <ToggleRow
          label="Loop Progression"
          value={state.loopProgression}
          onChange={state.setLoopProgression}
        />
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "6px",
            flexWrap: "wrap",
          }}
        >
          <button
            data-ocid="chord.prev_button"
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() =>
              state.setProgressionStep(Math.max(0, state.progressionStep - 1))
            }
          >
            ◀ PREV
          </button>
          <button
            data-ocid="chord.next_button"
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() =>
              state.setProgressionStep(
                (state.progressionStep + 1) % progressionChords.length,
              )
            }
          >
            NEXT ▶
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => {
              state.setProgressionPreset(
                Object.keys(PROGRESSIONS)[
                  Math.floor(Math.random() * Object.keys(PROGRESSIONS).length)
                ],
              );
            }}
          >
            RAND
          </button>
          <button
            className="synth-btn"
            style={{ flex: 1 }}
            onClick={() => state.setProgressionStep(0)}
          >
            CLEAR
          </button>
        </div>
        <div
          style={{
            marginTop: "4px",
            fontSize: "9px",
            color: "var(--synth-text-dim)",
            textAlign: "center",
          }}
        >
          Step: {state.progressionStep + 1} / {progressionChords.length}
        </div>
      </div>

      {/* Timing */}
      <div className="panel-section">
        <div className="panel-section-title">TIMING & TRIGGER</div>
        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
          <div style={{ flex: 1 }}>
            <ToggleRow label="Sync To BPM" value={false} onChange={() => {}} />
          </div>
        </div>
        <select style={{ width: "100%", marginBottom: "6px" }}>
          <option>Auto Advance</option>
          <option>Manual Advance</option>
          <option>MIDI Trigger</option>
        </select>
        <ToggleRow
          label="Retrigger Envelopes On Change"
          value={false}
          onChange={() => {}}
        />
        <SliderRow
          label="STRUM SPD"
          value={state.strumSpeed}
          min={0}
          max={200}
          step={1}
          onChange={state.setStrumSpeed}
          displayFn={(v) => `${Math.round(v)}ms`}
        />
        <select
          value={state.strumDirection}
          onChange={(e) =>
            state.setStrumDirection(
              e.target.value as "up" | "down" | "alternate" | "random",
            )
          }
          style={{ width: "100%", marginBottom: "4px" }}
        >
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="alternate">Alternate</option>
          <option value="random">Random</option>
        </select>
        <SliderRow
          label="HUM TIME"
          value={state.humanizeTiming}
          min={0}
          max={50}
          step={1}
          onChange={state.setHumanizeTiming}
          displayFn={(v) => `${Math.round(v)}ms`}
        />
        <SliderRow
          label="HUM VEL"
          value={state.humanizeVelocity}
          min={0}
          max={20}
          step={1}
          onChange={state.setHumanizeVelocity}
          displayFn={(v) => `${Math.round(v)}%`}
        />
      </div>

      {/* Advanced Options */}
      <div className="panel-section">
        <div className="panel-section-title">ADVANCED</div>
        <ToggleRow
          label="Keep Bass Note Static"
          value={state.keepBassStatic}
          onChange={state.setKeepBassStatic}
        />
        <ToggleRow
          label="Octave Bass Reinforcement"
          value={state.octaveBassReinforcement}
          onChange={state.setOctaveBassReinforcement}
        />
        <ToggleRow
          label="Top Voice Shine"
          value={state.topVoiceShine}
          onChange={state.setTopVoiceShine}
        />
        <SliderRow
          label="BASS LVL"
          value={state.bassLevel}
          min={0}
          max={1.5}
          onChange={state.setBassLevel}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="TOP LVL"
          value={state.topVoiceLevel}
          min={0}
          max={1.5}
          onChange={state.setTopVoiceLevel}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <div style={{ height: "20px" }} />
    </div>
  );
}
