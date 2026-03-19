# Micro Spectral Pad

## Current State
Full spectral synthesizer with 64×48 additive grid, HQ mode, chord mode, brush engine, and modular DSP panels. All DSP preallocated. No dynamic allocation in audio thread.

## Requested Changes (Diff)

### Add
- **LUSH SOUND ENGINE**: Optional post-processing + synthesis layer over existing additive engine
- **LushPanel.tsx**: Full LUSH SOUND PANEL UI (unison, detune, spread, drift, sub osc, saturation, filter, filter LFO, chorus, body resonance, presets)
- **TopBar LUSH button**: Activates lush mode; shows `LUSH ENGINE ACTIVE` indicator above canvas
- **Lush engine buffers in audioEngine.ts**: All preallocated at init, zero allocation in audio callback
- **lushParams object**: Exported, read by audio callback
- **Chord mode brush size fix**: When chord mode is on, brushSize controls how many chord tones are painted (size=1: nearest, size=2: 2 nearest, size=3: 3 nearest)

### Modify
- `audioEngine.ts`: Add lush buffers (unison phases, chorus delay, filter state, body resonance state), processAudio branches on lushParams.enabled for full stereo lush synthesis path
- `synthStore.ts`: Add lushModeEnabled + all lush param state, add "lush" to ActivePanel type
- `TopBar.tsx`: Add LUSH MODE button
- `App.tsx`: Render LushPanel overlay, show LUSH ENGINE ACTIVE badge above canvas when lush on
- `SpectralCanvas.tsx`: Fix chord mode brush size (paint N chord tones per brushSize)
- `moduleEngine.ts`: Sync lush params from store to lushParams in doSyncParams

### Remove
- Nothing removed

## Implementation Plan
1. Update synthStore.ts with lush state fields, "lush" panel type, setters
2. Update audioEngine.ts: add all lush-specific preallocated buffers, lushParams export, biquad helper, body resonance init, processAudio lush path (unison + sub + saturation + filter + chorus + body resonance)
3. Update moduleEngine.ts to sync lush params
4. Create LushPanel.tsx with full panel UI (groups: Unison, Sub Osc, Saturation, Filter, Chorus, Body Resonance, Presets)
5. Update TopBar.tsx with LUSH button
6. Update App.tsx with LushPanel overlay + lush active indicator
7. Update SpectralCanvas.tsx: chord mode brush paints N chord tones based on brushSize
