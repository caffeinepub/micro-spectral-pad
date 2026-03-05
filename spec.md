# Micro Spectral Pad

## Current State
New project. No existing frontend or backend code.

## Requested Changes (Diff)

### Add
- Full mobile touch-based spectral synthesizer app
- 64x48 quantized spectral grid canvas (2 seconds, 48 frequency bands, 40Hz–8kHz log spaced)
- Per-cell Color Engine V2: each cell stores amplitude, hueNorm, saturation; smooth oscillator morphing via hue
- 7 brush types: Flat Write, Soft Average, Harmonic Ladder, Inharmonic Scatter, Time Smear, Formant Band, Erase
- Mutation Mode with 7 mutation brush types and strength slider
- 4 synthesis engines: Additive (classic + detuned cluster), Filtered Noise Bank, Wavetable Frame, Resonator Bank
- Sub Harmonic Support (setup G) and Spectral Pad Hybrid (setup H)
- Top bar: Play/Pause, Stop, Loop indicator, BPM/tap tempo, Settings gear
- Main area: spectral grid canvas with frequency labels (left) and time markers (top), moving playhead
- Bottom toolbar: Brush button, Clear, Undo, Preview/HQ toggle, Mono/Stereo toggle, Mutate Mode toggle
- Brush Selection popup with 7 brushes, size (1x1/2x2/3x3), intensity slider
- Sound Controls slide-up panel: Master Volume, Global Envelope (A/D/R), Soft Saturation, Stereo Spread, Blur toggle, Low CPU Mode
- Engine-specific mini-panels (Additive: Harmonic Tilt + Random Phase; Noise: Noise Color + Resonance; Wavetable: Frame Interpolation + Morph Speed; Resonator: Material + Damping)
- Module 1: Harmonic Drift (toggle, Drift Amount, Drift Speed, Drift Mode dropdown, High Harmonic Emphasis)
- Module 2: Partial Step Sequencer (toggle, Step Count, Tempo Division, Mode dropdown, Limit Harmonics toggle, Step Editor grid, Clear/Randomize/Shift buttons, Step Smoothing)
- Module 3: Spectral Tilt (knob -100 to +100, Reset)
- Module 4: Spectral Center Shift (toggle, Shift Amount slider, Interpolation toggle, Reset)
- Module 5: Partial Envelope Shaper (toggle, A/D/S/R knobs, Apply Mode dropdown, Draw Envelope button, Reset)
- Module 6: Stereo Spectral Spread (toggle, Spread Amount, Spread Curve, Drift Width, Mono Collapse)
- Module 7: Partial Distortion Zone (toggle, Harmonic Start/End range sliders, Drive knob, Clip Mode, Solo Distorted Band)
- Module 8: Spectral Noise Layer (toggle, Noise Amount, Affect dropdown, Lock Fundamental, Save/Recall/Random Seed)
- Module 10: Harmonic Cluster Mode (toggle, Cluster Size, Cluster Spacing, Cluster Resonance, Randomize/Reset)
- Module 11: Micro Tuning Mode (toggle, Scale Select dropdown, Open Scale Editor, Custom Ratio Grid Editor, Reset)
- Module 12: Macro Controls Panel (always visible - Macro Drift, Macro Brightness, Macro Width, Macro Motion knobs, Randomize, Reset)
- Chord Only Mode: toggle, root/scale dropdowns, chord type dropdown (22 types), inversion, spread, voice count, voice stacking; Progression Mode with 9 presets; Timing/Trigger section; mini keyboard display; chord name display
- Global: Panic button, Performance Safe Mode toggle, CPU meter display, Master Bypass button
- Settings menu: Tempo Sync toggle, Export WAV, Reset All, About
- Performance architecture: preallocated Float32Arrays, no audio-loop allocations, 30 FPS cap, 8 updates/sec audio throttle, dirty-column tracking, Preview (32x24) and HQ (64x48) modes

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend: minimal Motoko canister (preset storage, no audio processing)
2. Frontend engine layer:
   - audioEngine.ts: Web Audio API, ScriptProcessor or AudioWorklet, per-cell Color Engine V2, all 4 synthesis modes, preallocated buffers
   - canvasEngine.ts: dirty-cell tracking, 30 FPS RAF loop, playhead rendering
   - brushEngine.ts: all 7 brush types + mutation brushes
   - chordEngine.ts: chord/progression/voice pool logic
   - moduleEngine.ts: Harmonic Drift, Step Sequencer, Spectral Tilt, Center Shift, Envelope Shaper, Stereo Spread, Distortion, Noise Layer, Cluster, Micro Tuning
3. Frontend UI:
   - App.tsx: single-screen layout
   - TopBar.tsx: transport + BPM
   - SpectralCanvas.tsx: touch drawing + playhead
   - BottomToolbar.tsx: mode/brush/clear/undo/preview/mono
   - BrushPopup.tsx: brush type + size + intensity
   - SoundPanel.tsx: slide-up sound controls + engine mini-panels
   - ModulesPanel.tsx: all 12 modules in collapsible containers
   - ChordPanel.tsx: full Chord Only Mode
   - MacroPanel.tsx: always-visible macro knobs
   - SettingsMenu.tsx: utility menu
