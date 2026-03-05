import { useCallback } from "react";
import { clearGrid, restoreUndo } from "../../engines/brushEngine";
import { syncParamsImmediately } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";
import type { SoundMode } from "../../store/synthStore";

const SOUND_MODES: SoundMode[] = [
  "additive",
  "noise",
  "wavetable",
  "resonator",
];
const SOUND_MODE_LABELS: Record<SoundMode, string> = {
  additive: "ADD",
  noise: "NOISE",
  wavetable: "WT",
  resonator: "RES",
};

export default function BottomToolbar() {
  const {
    soundMode,
    setSoundMode,
    previewMode,
    setPreviewMode,
    stereoMode,
    setStereoMode,
    mutateMode,
    setMutateMode,
    hasUndo,
    setHasUndo,
    activePanel,
    setActivePanel,
  } = useSynthStore();

  const handleSoundModeClick = useCallback(() => {
    const idx = SOUND_MODES.indexOf(soundMode);
    const next = SOUND_MODES[(idx + 1) % SOUND_MODES.length];
    setSoundMode(next);
    syncParamsImmediately();
  }, [soundMode, setSoundMode]);

  const handleClear = useCallback(() => {
    clearGrid();
    setHasUndo(true);
  }, [setHasUndo]);

  const handleUndo = useCallback(() => {
    if (restoreUndo()) {
      setHasUndo(false);
    }
  }, [setHasUndo]);

  const handlePreviewToggle = useCallback(() => {
    setPreviewMode(!previewMode);
    syncParamsImmediately();
  }, [previewMode, setPreviewMode]);

  const handleStereoToggle = useCallback(() => {
    setStereoMode(!stereoMode);
    syncParamsImmediately();
  }, [stereoMode, setStereoMode]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 6px",
        background: "var(--synth-panel)",
        borderTop: "1px solid var(--synth-border)",
        height: "48px",
        flexShrink: 0,
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {/* Sound Mode */}
      <button
        data-ocid="toolbar.sound_mode_button"
        className="synth-btn active"
        onClick={handleSoundModeClick}
        style={{ minWidth: "48px", padding: "4px 6px" }}
        title="Sound Mode"
      >
        {SOUND_MODE_LABELS[soundMode]}
      </button>

      {/* Brush */}
      <button
        data-ocid="toolbar.brush_button"
        className={`synth-btn${activePanel === "brush" ? " active" : ""}`}
        onClick={() => setActivePanel(activePanel === "brush" ? null : "brush")}
        style={{ minWidth: "44px", padding: "4px 6px" }}
        title="Brush Settings"
      >
        🖌
      </button>

      {/* Sound Panel */}
      <button
        data-ocid="toolbar.sound_button"
        className={`synth-btn${activePanel === "sound" ? " active" : ""}`}
        onClick={() => setActivePanel(activePanel === "sound" ? null : "sound")}
        style={{ minWidth: "44px", padding: "4px 6px" }}
        title="Sound Controls"
      >
        SND
      </button>

      {/* Modules Panel */}
      <button
        data-ocid="toolbar.modules_button"
        className={`synth-btn${activePanel === "modules" ? " active" : ""}`}
        onClick={() =>
          setActivePanel(activePanel === "modules" ? null : "modules")
        }
        style={{ minWidth: "44px", padding: "4px 6px" }}
        title="DSP Modules"
      >
        MOD
      </button>

      {/* Chord Panel */}
      <button
        data-ocid="toolbar.chord_button"
        className={`synth-btn${activePanel === "chord" ? " active" : ""}`}
        onClick={() => setActivePanel(activePanel === "chord" ? null : "chord")}
        style={{ minWidth: "44px", padding: "4px 6px" }}
        title="Chord Mode"
      >
        CHD
      </button>

      <div style={{ flex: 1, minWidth: "4px" }} />

      {/* Clear */}
      <button
        data-ocid="toolbar.clear_button"
        className="synth-btn danger"
        onClick={handleClear}
        style={{ minWidth: "40px", padding: "4px 6px" }}
        title="Clear Grid"
      >
        CLR
      </button>

      {/* Undo */}
      <button
        data-ocid="toolbar.undo_button"
        className="synth-btn"
        onClick={handleUndo}
        style={{
          minWidth: "40px",
          padding: "4px 6px",
          opacity: hasUndo ? 1 : 0.4,
        }}
        title="Undo"
        disabled={!hasUndo}
      >
        ↩
      </button>

      {/* Preview/HQ */}
      <button
        data-ocid="toolbar.preview_toggle"
        className={`synth-btn${previewMode ? " active" : ""}`}
        onClick={handlePreviewToggle}
        style={{ minWidth: "40px", padding: "4px 6px", fontSize: "9px" }}
        title={previewMode ? "Preview Mode (32x24)" : "HQ Mode (64x48)"}
      >
        {previewMode ? "PRV" : "HQ"}
      </button>

      {/* Mono/Stereo */}
      <button
        data-ocid="toolbar.mono_stereo_toggle"
        className={`synth-btn${stereoMode ? " active" : ""}`}
        onClick={handleStereoToggle}
        style={{ minWidth: "40px", padding: "4px 6px", fontSize: "9px" }}
        title={stereoMode ? "Stereo" : "Mono"}
      >
        {stereoMode ? "ST" : "MN"}
      </button>

      {/* Mutate Mode */}
      <button
        data-ocid="toolbar.mutate_toggle"
        className={`synth-btn${mutateMode ? " active" : ""}`}
        onClick={() => setMutateMode(!mutateMode)}
        style={{
          minWidth: "44px",
          padding: "4px 6px",
          fontSize: "9px",
          borderColor: mutateMode ? "#e0a020" : undefined,
          color: mutateMode ? "#e0a020" : undefined,
          background: mutateMode ? "rgba(224,160,32,0.15)" : undefined,
        }}
        title="Mutate Mode"
      >
        MUT
      </button>
    </div>
  );
}
