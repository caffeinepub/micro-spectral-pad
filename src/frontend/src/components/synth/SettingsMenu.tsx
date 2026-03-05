import { useCallback, useState } from "react";
import { audioParams, exportWav } from "../../engines/audioEngine";
import { clearGrid } from "../../engines/brushEngine";
import { syncParamsImmediately } from "../../engines/moduleEngine";
import { useActor } from "../../hooks/useActor";
import {
  CELL_FLOATS,
  COLS,
  ROWS,
  cellData,
  useSynthStore,
} from "../../store/synthStore";

interface Props {
  onClose: () => void;
}

export default function SettingsMenu({ onClose }: Props) {
  const [presetName, setPresetName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [presets, setPresets] = useState<
    { name: string; gridData: Uint8Array; settings: string }[]
  >([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const state = useSynthStore();
  const { actor } = useActor();

  const loadPresets = useCallback(async () => {
    if (!actor || presetsLoaded) return;
    try {
      const list = await actor.listPresets();
      setPresets(list);
      setPresetsLoaded(true);
    } catch (e) {
      console.error("Failed to load presets:", e);
    }
  }, [actor, presetsLoaded]);

  const handleSavePreset = useCallback(async () => {
    if (!actor || !presetName.trim()) {
      setStatusMsg("Enter a preset name");
      return;
    }
    setIsSaving(true);
    try {
      // Convert cellData to Uint8Array for storage
      const gridDataCompact = new Uint8Array(COLS * ROWS * 3);
      for (let i = 0; i < COLS * ROWS * CELL_FLOATS; i++) {
        gridDataCompact[i] = Math.round(cellData[i] * 255);
      }
      const settings = JSON.stringify({
        masterVolume: state.masterVolume,
        soundMode: state.soundMode,
        bpm: state.bpm,
      });
      await actor.savePreset(presetName.trim(), gridDataCompact, settings);
      setStatusMsg("Preset saved!");
      setPresetsLoaded(false); // refresh list
    } catch (e) {
      setStatusMsg("Save failed");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }, [actor, presetName, state.masterVolume, state.soundMode, state.bpm]);

  const handleLoadPreset = useCallback(
    async (name: string) => {
      if (!actor) return;
      try {
        const preset = await actor.loadPreset(name);
        const gridDataCompact = preset.gridData;
        for (
          let i = 0;
          i < Math.min(COLS * ROWS * CELL_FLOATS, gridDataCompact.length);
          i++
        ) {
          cellData[i] = gridDataCompact[i] / 255;
        }
        setStatusMsg(`Loaded: ${name}`);
        syncParamsImmediately();
      } catch (e) {
        setStatusMsg("Load failed");
        console.error(e);
      }
    },
    [actor],
  );

  const handleDeletePreset = useCallback(
    async (name: string) => {
      if (!actor) return;
      try {
        await actor.deletePreset(name);
        setPresets((prev) => prev.filter((p) => p.name !== name));
        setStatusMsg(`Deleted: ${name}`);
      } catch (e) {
        setStatusMsg("Delete failed");
        console.error(e);
      }
    },
    [actor],
  );

  const handleExportWav = useCallback(async () => {
    setIsExporting(true);
    try {
      const snapshot = new Float32Array(cellData);
      const blob = await exportWav(snapshot, audioParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "micro-spectral-pad.wav";
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg("WAV exported!");
    } catch (e) {
      setStatusMsg("Export failed");
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleResetAll = useCallback(() => {
    clearGrid();
    state.setMasterVolume(0.7);
    state.setSoundMode("additive");
    state.setBpm(120);
    state.setDriftEnabled(false);
    state.setSeqEnabled(false);
    syncParamsImmediately();
    setStatusMsg("Reset complete");
  }, [state]);

  return (
    <div className="slide-panel" style={{ padding: "12px" }}>
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
          SETTINGS
        </span>
        <button
          className="synth-btn"
          onClick={onClose}
          style={{ padding: "3px 8px" }}
        >
          ✕
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: "6px",
            background:
              "color-mix(in oklch, var(--synth-active) 15%, var(--synth-control))",
            borderRadius: "3px",
            marginBottom: "8px",
            fontSize: "10px",
            color: "var(--synth-active)",
            textAlign: "center",
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Tempo Sync */}
      <div className="panel-section">
        <div className="panel-section-title">GLOBAL</div>
        <div className="toggle-row">
          <label>Tempo Sync (scan speed follows BPM)</label>
          <div
            className={`synth-toggle${state.tempoSyncEnabled ? " on" : ""}`}
            onClick={() => state.setTempoSyncEnabled(!state.tempoSyncEnabled)}
          />
        </div>
      </div>

      {/* Export WAV */}
      <div className="panel-section">
        <div className="panel-section-title">EXPORT</div>
        <button
          data-ocid="settings.export_button"
          className="synth-btn"
          onClick={handleExportWav}
          disabled={isExporting}
          style={{ width: "100%", opacity: isExporting ? 0.5 : 1 }}
        >
          {isExporting ? "RENDERING..." : "⬇ EXPORT WAV (HQ OFFLINE)"}
        </button>
      </div>

      {/* Presets */}
      <div className="panel-section">
        <div className="panel-section-title">PRESETS</div>
        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            style={{
              flex: 1,
              background: "var(--synth-control)",
              border: "1px solid var(--synth-border)",
              color: "var(--synth-text)",
              padding: "4px 8px",
              borderRadius: "2px",
              fontSize: "10px",
              fontFamily: "inherit",
            }}
          />
          <button
            data-ocid="settings.save_preset_button"
            className="synth-btn"
            onClick={handleSavePreset}
            disabled={isSaving}
            style={{ padding: "4px 10px" }}
          >
            {isSaving ? "..." : "SAVE"}
          </button>
        </div>

        <button
          className="synth-btn"
          onClick={loadPresets}
          style={{ width: "100%", marginBottom: "4px" }}
        >
          LOAD PRESETS LIST
        </button>

        {presets.length > 0 && (
          <div style={{ maxHeight: "120px", overflowY: "auto" }}>
            {presets.map((preset) => (
              <div
                key={preset.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "2px",
                  background: "var(--synth-control)",
                  borderRadius: "2px",
                  padding: "4px 6px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: "10px",
                    color: "var(--synth-text)",
                  }}
                >
                  {preset.name}
                </span>
                <button
                  className="synth-btn"
                  style={{ padding: "2px 6px", fontSize: "9px" }}
                  onClick={() => handleLoadPreset(preset.name)}
                >
                  LOAD
                </button>
                <button
                  className="synth-btn danger"
                  style={{ padding: "2px 6px", fontSize: "9px" }}
                  onClick={() => handleDeletePreset(preset.name)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {presetsLoaded && presets.length === 0 && (
          <div
            style={{
              fontSize: "10px",
              color: "var(--synth-text-dim)",
              textAlign: "center",
              padding: "8px",
            }}
          >
            No presets saved yet
          </div>
        )}
      </div>

      {/* Reset All */}
      <div className="panel-section">
        <button
          data-ocid="settings.reset_button"
          className="synth-btn danger"
          onClick={handleResetAll}
          style={{ width: "100%" }}
        >
          ⚠ RESET ALL
        </button>
      </div>

      {/* About */}
      <div className="panel-section">
        <div className="panel-section-title">ABOUT</div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--synth-text-dim)",
            lineHeight: "1.5",
          }}
        >
          <strong style={{ color: "var(--synth-active)" }}>
            Micro Spectral Pad
          </strong>
          <br />
          Per-cell color engine (V2) with 7 brush types,
          <br />
          mutation mode, 12 DSP modules + chord mode.
          <br />
          64×48 quantized spectral grid, 2s loop.
          <br />
          Additive light synthesis engine, no FFT.
        </div>
      </div>
    </div>
  );
}
