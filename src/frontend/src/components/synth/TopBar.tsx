import { useCallback, useRef } from "react";
import {
  audioParams,
  hqAudioParams,
  panicReset,
  pause,
  play,
  resumeAudio,
  setHqAudioParams,
  stop,
} from "../../engines/audioEngine";
import { syncParamsImmediately } from "../../engines/moduleEngine";
import { useSynthStore } from "../../store/synthStore";
import HQPanel from "./HQPanel";

export default function TopBar() {
  const {
    isPlaying,
    setIsPlaying,
    bpm,
    setBpm,
    masterBypass,
    setMasterBypass,
    performanceSafeMode,
    setPerformanceSafeMode,
    cpuUsage,
    activePanel,
    setActivePanel,
    hqModeEnabled,
    setHqModeEnabled,
    lushModeEnabled,
    setLushModeEnabled,
  } = useSynthStore();

  const tapTimesRef = useRef<number[]>([]);

  const handlePlayPause = useCallback(async () => {
    await resumeAudio();
    if (isPlaying) {
      pause();
      setIsPlaying(false);
    } else {
      audioParams.isPlaying = true;
      play();
      setIsPlaying(true);
    }
    syncParamsImmediately();
  }, [isPlaying, setIsPlaying]);

  const handleStop = useCallback(() => {
    stop();
    setIsPlaying(false);
    syncParamsImmediately();
  }, [setIsPlaying]);

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);
    if (taps.length > 4) taps.shift();
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++)
        intervals.push(taps[i] - taps[i - 1]);
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      if (newBpm >= 20 && newBpm <= 300) {
        setBpm(newBpm);
        audioParams.bpm = newBpm;
      }
    }
  }, [setBpm]);

  const handlePanic = useCallback(() => {
    panicReset();
    stop();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const handleSettings = useCallback(() => {
    setActivePanel(activePanel === "settings" ? null : "settings");
  }, [activePanel, setActivePanel]);

  const handleHqToggle = useCallback(() => {
    const newVal = !hqModeEnabled;
    setHqModeEnabled(newVal);
    setHqAudioParams({ hqModeEnabled: newVal });
    hqAudioParams.hqModeEnabled = newVal;
  }, [hqModeEnabled, setHqModeEnabled]);

  const handleLushToggle = useCallback(() => {
    const newVal = !lushModeEnabled;
    setLushModeEnabled(newVal);
    // Panel toggle
    setActivePanel(
      newVal ? "lush" : activePanel === "lush" ? null : activePanel,
    );
    syncParamsImmediately();
  }, [lushModeEnabled, setLushModeEnabled, activePanel, setActivePanel]);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          background: "var(--synth-panel)",
          borderBottom: hqModeEnabled
            ? "1px solid #f0a50044"
            : lushModeEnabled
              ? "1px solid #a855f744"
              : "1px solid var(--synth-border)",
          height: "44px",
          flexShrink: 0,
        }}
      >
        {/* Play/Pause */}
        <button
          type="button"
          data-ocid="topbar.play_toggle"
          className={`synth-btn${isPlaying ? " active" : ""}`}
          onClick={handlePlayPause}
          style={{ minWidth: "36px", padding: "6px 8px" }}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "\u23f8" : "\u25b6"}
        </button>

        {/* Stop */}
        <button
          type="button"
          data-ocid="topbar.stop_button"
          className="synth-btn"
          onClick={handleStop}
          style={{ minWidth: "36px", padding: "6px 8px" }}
          title="Stop"
        >
          &#9632;
        </button>

        {/* Loop indicator */}
        <div
          style={{
            fontSize: "8px",
            color: "#00e5cc",
            border: "1px solid #00a896",
            borderRadius: "2px",
            padding: "1px 4px",
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          LOOP
        </div>

        {/* BPM + Tap */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "9px", color: "var(--synth-text-dim)" }}>
            BPM
          </span>
          <input
            type="number"
            value={bpm}
            min={20}
            max={300}
            onChange={(e) => setBpm(Number(e.target.value))}
            style={{
              background: "var(--synth-control)",
              border: "1px solid var(--synth-border)",
              borderRadius: "2px",
              color: "var(--synth-active)",
              fontSize: "11px",
              width: "42px",
              padding: "2px 4px",
              textAlign: "center",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            data-ocid="topbar.tap_tempo_button"
            className="synth-btn"
            onClick={handleTapTempo}
            style={{ padding: "4px 6px", fontSize: "9px" }}
            title="Tap Tempo"
          >
            TAP
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* CPU Meter */}
        <div
          style={{
            fontSize: "9px",
            color:
              cpuUsage > 60 ? "var(--synth-danger)" : "var(--synth-text-dim)",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          CPU:{Math.round(cpuUsage)}%
        </div>

        {/* LUSH MODE */}
        <button
          type="button"
          data-ocid="topbar.lush_mode_toggle"
          className={`synth-btn${lushModeEnabled ? " active" : ""}`}
          onClick={handleLushToggle}
          style={{
            padding: "4px 6px",
            fontSize: "9px",
            borderColor: lushModeEnabled ? "#a855f7" : undefined,
            color: lushModeEnabled ? "#a855f7" : undefined,
            fontWeight: lushModeEnabled ? "bold" : undefined,
          }}
          title="Lush Sound Engine - thick pad, piano & ensemble synthesis"
        >
          LUSH
        </button>

        {/* HQ Mode Toggle */}
        <button
          type="button"
          data-ocid="topbar.hq_mode_toggle"
          className={`synth-btn${hqModeEnabled ? " active" : ""}`}
          onClick={handleHqToggle}
          style={{
            padding: "4px 6px",
            fontSize: "9px",
            borderColor: hqModeEnabled ? "#f0a500" : undefined,
            color: hqModeEnabled ? "#f0a500" : undefined,
            fontWeight: hqModeEnabled ? "bold" : undefined,
          }}
          title="High Quality spectral rendering"
        >
          HQ
        </button>

        {/* Safe Mode */}
        <button
          type="button"
          data-ocid="topbar.safe_mode_toggle"
          className={`synth-btn${performanceSafeMode ? " active" : ""}`}
          onClick={() => setPerformanceSafeMode(!performanceSafeMode)}
          style={{ padding: "4px 6px", fontSize: "9px" }}
          title="Performance Safe Mode"
        >
          SAFE
        </button>

        {/* Master Bypass */}
        <button
          type="button"
          data-ocid="topbar.bypass_toggle"
          className={`synth-btn${masterBypass ? " active" : ""}`}
          onClick={() => setMasterBypass(!masterBypass)}
          style={{
            padding: "4px 6px",
            fontSize: "9px",
            borderColor: masterBypass ? "var(--synth-warn)" : undefined,
            color: masterBypass ? "var(--synth-warn)" : undefined,
          }}
          title="Master Bypass"
        >
          BYP
        </button>

        {/* Panic */}
        <button
          type="button"
          data-ocid="topbar.panic_button"
          className="synth-btn danger"
          onClick={handlePanic}
          style={{ padding: "4px 6px", fontSize: "9px" }}
          title="Panic - Reset All"
        >
          !
        </button>

        {/* Settings */}
        <button
          type="button"
          data-ocid="topbar.settings_button"
          className={`synth-btn${activePanel === "settings" ? " active" : ""}`}
          onClick={handleSettings}
          style={{ padding: "4px 8px", fontSize: "12px" }}
          title="Settings"
        >
          &#9881;
        </button>
      </div>

      {hqModeEnabled && <HQPanel />}
    </>
  );
}
