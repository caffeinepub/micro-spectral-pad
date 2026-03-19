import { useCallback, useEffect, useRef } from "react";
import BottomToolbar from "./components/synth/BottomToolbar";
import BrushPopup from "./components/synth/BrushPopup";
import ChordPanel from "./components/synth/ChordPanel";
import LushPanel from "./components/synth/LushPanel";
import MacroPanel from "./components/synth/MacroPanel";
import ModulesPanel from "./components/synth/ModulesPanel";
import SettingsMenu from "./components/synth/SettingsMenu";
import SoundPanel from "./components/synth/SoundPanel";
import SpectralCanvas from "./components/synth/SpectralCanvas";
import TopBar from "./components/synth/TopBar";
import { initAudio, resumeAudio, updateDriftLFO } from "./engines/audioEngine";
import {
  initModuleEngine,
  syncParamsImmediately,
} from "./engines/moduleEngine";
import { useSynthStore } from "./store/synthStore";

let audioInited = false;
let lastDriftTime = performance.now();

export default function App() {
  const { activePanel, setActivePanel, lushModeEnabled } = useSynthStore();
  const rafRef = useRef<number>(0);

  const handleFirstTouch = useCallback(async () => {
    if (audioInited) return;
    audioInited = true;
    await initAudio();
    await resumeAudio();
    initModuleEngine();
    syncParamsImmediately();
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const delta = now - lastTime;
      lastTime = now;
      updateDriftLFO(delta);
      lastDriftTime = now;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, [setActivePanel]);

  return (
    <div
      className="app-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--synth-bg)",
        overflow: "hidden",
        touchAction: "none",
      }}
      onTouchStart={handleFirstTouch}
      onClick={handleFirstTouch}
      onKeyDown={handleFirstTouch}
    >
      <TopBar />

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Lush Engine Active indicator */}
        {lushModeEnabled && (
          <div
            style={{
              position: "absolute",
              top: "4px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              pointerEvents: "none",
              background: "#a855f722",
              border: "1px solid #a855f755",
              borderRadius: "3px",
              padding: "2px 8px",
              fontSize: "8px",
              letterSpacing: "0.1em",
              color: "#a855f7",
              fontWeight: "bold",
            }}
          >
            LUSH ENGINE ACTIVE
          </div>
        )}
        <SpectralCanvas />
      </div>

      <MacroPanel />
      <BottomToolbar />

      {/* Overlays */}
      {activePanel === "brush" && (
        <>
          <div
            className="overlay-backdrop"
            onClick={closePanel}
            onKeyDown={closePanel}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <BrushPopup onClose={closePanel} />
        </>
      )}
      {activePanel === "sound" && (
        <>
          <div
            className="overlay-backdrop"
            onClick={closePanel}
            onKeyDown={closePanel}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <SoundPanel onClose={closePanel} />
        </>
      )}
      {activePanel === "modules" && (
        <>
          <div
            className="overlay-backdrop"
            onClick={closePanel}
            onKeyDown={closePanel}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <ModulesPanel onClose={closePanel} />
        </>
      )}
      {activePanel === "chord" && (
        <>
          <div
            className="overlay-backdrop"
            onClick={closePanel}
            onKeyDown={closePanel}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <ChordPanel onClose={closePanel} />
        </>
      )}
      {activePanel === "settings" && (
        <>
          <div
            className="overlay-backdrop"
            onClick={closePanel}
            onKeyDown={closePanel}
            role="button"
            tabIndex={0}
            aria-label="Close panel"
          />
          <SettingsMenu onClose={closePanel} />
        </>
      )}
      {activePanel === "lush" && <LushPanel onClose={closePanel} />}

      <div
        style={{
          textAlign: "center",
          fontSize: "8px",
          color: "var(--synth-text-dim)",
          padding: "2px",
          flexShrink: 0,
          background: "var(--synth-bg)",
        }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          style={{
            color: "var(--synth-text-dim)",
            textDecoration: "underline",
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}

void lastDriftTime;
