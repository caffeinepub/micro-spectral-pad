import { create } from "zustand";

export const COLS = 64;
export const ROWS = 48;
export const CELL_FLOATS = 3; // amplitude, hueNorm, saturation
export const TOTAL_CELLS = COLS * ROWS * CELL_FLOATS;

// Preallocate once, never recreated
export const cellData = new Float32Array(TOTAL_CELLS);
export const undoBufferData = new Float32Array(TOTAL_CELLS);
export const dirtyColumnsData = new Uint8Array(COLS);
export const seqStepsData = new Float32Array(32);

// Precomputed frequency bands (log-spaced 40Hz to 8000Hz)
export const freqBands = new Float32Array(ROWS);
for (let i = 0; i < ROWS; i++) {
  freqBands[i] = 40 * 200 ** (i / (ROWS - 1));
}

export type SoundMode = "additive" | "noise" | "wavetable" | "resonator";
export type DriftMode = "random" | "sine" | "chaos";
export type SeqMode = "amplitude" | "pitch" | "pan";
export type SeqDivision = "1/4" | "1/8" | "1/16" | "1/32";
export type PartialApplyMode = "global" | "odd" | "even" | "high";
export type SpreadCurve = "linear" | "exponential";
export type DistortionClip = "soft" | "hard";
export type NoiseAffect = "amplitude" | "pitch" | "both";
export type TuningScale = "equal" | "just" | "custom";
export type VoiceStacking = "closed" | "open" | "drop2";
export type BrushType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MutationType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ActivePanel =
  | null
  | "brush"
  | "sound"
  | "modules"
  | "chord"
  | "settings";
export type StepCount = 8 | 16 | 32;
export type Material = "glass" | "metal" | "string";
export type NoiseColor = "white" | "pink";

export interface SynthState {
  // Transport
  isPlaying: boolean;
  playheadCol: number;
  bpm: number;
  loopEnabled: boolean;

  // Grid
  previewMode: boolean;
  hasUndo: boolean;

  // Brush
  brushType: BrushType;
  brushSize: 1 | 2 | 3;
  brushIntensity: number;
  brushHueNorm: number;
  brushSaturation: number;
  mutateMode: boolean;
  mutationType: MutationType;
  mutateStrength: number;
  formantWidth: number;

  // Sound
  soundMode: SoundMode;
  masterVolume: number;
  attack: number;
  decay: number;
  release: number;
  softSaturation: boolean;
  stereoMode: boolean;
  stereoSpreadAmount: number;
  blurEnabled: boolean;
  lowCpuMode: boolean;
  harmonicTilt: number;
  noiseColor: NoiseColor;
  resonance: number;
  frameInterpolation: number;
  morphSpeed: number;
  material: Material;
  damping: number;
  hybridBalance: number;
  subHarmonicEnabled: boolean;

  // Modules
  masterBypass: boolean;
  performanceSafeMode: boolean;
  cpuUsage: number;

  // Harmonic Drift
  driftEnabled: boolean;
  driftAmount: number;
  driftSpeed: number;
  driftMode: DriftMode;
  highHarmonicEmphasis: number;

  // Step Sequencer
  seqEnabled: boolean;
  seqStepCount: StepCount;
  seqTempoDivision: SeqDivision;
  seqMode: SeqMode;
  seqLimitHarmonics: boolean;
  seqSmoothing: number;

  // Spectral Tilt
  spectralTilt: number;

  // Center Shift
  centerShiftEnabled: boolean;
  centerShiftAmount: number;
  centerShiftInterpolation: boolean;

  // Partial Envelope
  partialEnvEnabled: boolean;
  partialAttack: number;
  partialDecay: number;
  partialSustain: number;
  partialRelease: number;
  partialApplyMode: PartialApplyMode;

  // Stereo Spread Module
  stereoSpreadEnabled: boolean;
  stereoSpreadModAmount: number;
  stereoSpreadCurve: SpreadCurve;
  stereoSpreadDriftWidth: number;

  // Partial Distortion
  distortionEnabled: boolean;
  distortionStart: number;
  distortionEnd: number;
  distortionDrive: number;
  distortionClipMode: DistortionClip;

  // Noise Layer
  noiseLayerEnabled: boolean;
  noiseLayerAmount: number;
  noiseLayerAffect: NoiseAffect;
  noiseLayerLockFundamental: boolean;
  noiseLayerSeed: number;

  // Cluster Mode
  clusterEnabled: boolean;
  clusterSize: number;
  clusterSpacing: number;
  clusterResonance: number;

  // Micro Tuning
  microTuningEnabled: boolean;
  microTuningScale: TuningScale;
  customRatios: number[];

  // Macro Controls
  macroDrift: number;
  macroBrightness: number;
  macroWidth: number;
  macroMotion: number;

  // Chord Mode
  chordModeEnabled: boolean;
  chordRoot: string;
  chordOctave: number;
  chordScale: string;
  chordLockRoot: boolean;
  chordType: string;
  chordAutoInvert: boolean;
  chordInversion: string;
  chordSpread: number;
  chordVoiceCount: number;
  chordVoiceStacking: VoiceStacking;
  progressionEnabled: boolean;
  progressionPreset: string;
  progressionLength: number;
  chordDuration: string;
  loopProgression: boolean;
  progressionStep: number;
  strumSpeed: number;
  strumDirection: "up" | "down" | "alternate" | "random";
  humanizeTiming: number;
  humanizeVelocity: number;
  keepBassStatic: boolean;
  octaveBassReinforcement: boolean;
  topVoiceShine: boolean;
  bassLevel: number;
  topVoiceLevel: number;

  // UI
  activePanel: ActivePanel;
  currentChordName: string;
  tempoSyncEnabled: boolean;
  triggerMode: "auto" | "manual" | "midi";
  retriggerEnvelopes: boolean;

  // Actions
  setIsPlaying: (v: boolean) => void;
  setPlayheadCol: (v: number) => void;
  setBpm: (v: number) => void;
  setPreviewMode: (v: boolean) => void;
  setHasUndo: (v: boolean) => void;
  setBrushType: (v: BrushType) => void;
  setBrushSize: (v: 1 | 2 | 3) => void;
  setBrushIntensity: (v: number) => void;
  setBrushHueNorm: (v: number) => void;
  setBrushSaturation: (v: number) => void;
  setMutateMode: (v: boolean) => void;
  setMutationType: (v: MutationType) => void;
  setMutateStrength: (v: number) => void;
  setFormantWidth: (v: number) => void;
  setSoundMode: (v: SoundMode) => void;
  setMasterVolume: (v: number) => void;
  setAttack: (v: number) => void;
  setDecay: (v: number) => void;
  setRelease: (v: number) => void;
  setSoftSaturation: (v: boolean) => void;
  setStereoMode: (v: boolean) => void;
  setStereoSpreadAmount: (v: number) => void;
  setBlurEnabled: (v: boolean) => void;
  setLowCpuMode: (v: boolean) => void;
  setHarmonicTilt: (v: number) => void;
  setNoiseColor: (v: NoiseColor) => void;
  setResonance: (v: number) => void;
  setFrameInterpolation: (v: number) => void;
  setMorphSpeed: (v: number) => void;
  setMaterial: (v: Material) => void;
  setDamping: (v: number) => void;
  setHybridBalance: (v: number) => void;
  setSubHarmonicEnabled: (v: boolean) => void;
  setMasterBypass: (v: boolean) => void;
  setPerformanceSafeMode: (v: boolean) => void;
  setCpuUsage: (v: number) => void;
  setDriftEnabled: (v: boolean) => void;
  setDriftAmount: (v: number) => void;
  setDriftSpeed: (v: number) => void;
  setDriftMode: (v: DriftMode) => void;
  setHighHarmonicEmphasis: (v: number) => void;
  setSeqEnabled: (v: boolean) => void;
  setSeqStepCount: (v: StepCount) => void;
  setSeqTempoDivision: (v: SeqDivision) => void;
  setSeqMode: (v: SeqMode) => void;
  setSeqLimitHarmonics: (v: boolean) => void;
  setSeqSmoothing: (v: number) => void;
  setSpectralTilt: (v: number) => void;
  setCenterShiftEnabled: (v: boolean) => void;
  setCenterShiftAmount: (v: number) => void;
  setCenterShiftInterpolation: (v: boolean) => void;
  setPartialEnvEnabled: (v: boolean) => void;
  setPartialAttack: (v: number) => void;
  setPartialDecay: (v: number) => void;
  setPartialSustain: (v: number) => void;
  setPartialRelease: (v: number) => void;
  setPartialApplyMode: (v: PartialApplyMode) => void;
  setStereoSpreadEnabled: (v: boolean) => void;
  setStereoSpreadModAmount: (v: number) => void;
  setStereoSpreadCurve: (v: SpreadCurve) => void;
  setStereoSpreadDriftWidth: (v: number) => void;
  setDistortionEnabled: (v: boolean) => void;
  setDistortionStart: (v: number) => void;
  setDistortionEnd: (v: number) => void;
  setDistortionDrive: (v: number) => void;
  setDistortionClipMode: (v: DistortionClip) => void;
  setNoiseLayerEnabled: (v: boolean) => void;
  setNoiseLayerAmount: (v: number) => void;
  setNoiseLayerAffect: (v: NoiseAffect) => void;
  setNoiseLayerLockFundamental: (v: boolean) => void;
  setNoiseLayerSeed: (v: number) => void;
  setClusterEnabled: (v: boolean) => void;
  setClusterSize: (v: number) => void;
  setClusterSpacing: (v: number) => void;
  setClusterResonance: (v: number) => void;
  setMicroTuningEnabled: (v: boolean) => void;
  setMicroTuningScale: (v: TuningScale) => void;
  setCustomRatios: (v: number[]) => void;
  setMacroDrift: (v: number) => void;
  setMacroBrightness: (v: number) => void;
  setMacroWidth: (v: number) => void;
  setMacroMotion: (v: number) => void;
  setChordModeEnabled: (v: boolean) => void;
  setChordRoot: (v: string) => void;
  setChordOctave: (v: number) => void;
  setChordScale: (v: string) => void;
  setChordLockRoot: (v: boolean) => void;
  setChordType: (v: string) => void;
  setChordAutoInvert: (v: boolean) => void;
  setChordInversion: (v: string) => void;
  setChordSpread: (v: number) => void;
  setChordVoiceCount: (v: number) => void;
  setChordVoiceStacking: (v: VoiceStacking) => void;
  setProgressionEnabled: (v: boolean) => void;
  setProgressionPreset: (v: string) => void;
  setProgressionLength: (v: number) => void;
  setChordDuration: (v: string) => void;
  setLoopProgression: (v: boolean) => void;
  setProgressionStep: (v: number) => void;
  setStrumSpeed: (v: number) => void;
  setStrumDirection: (v: "up" | "down" | "alternate" | "random") => void;
  setHumanizeTiming: (v: number) => void;
  setHumanizeVelocity: (v: number) => void;
  setKeepBassStatic: (v: boolean) => void;
  setOctaveBassReinforcement: (v: boolean) => void;
  setTopVoiceShine: (v: boolean) => void;
  setBassLevel: (v: number) => void;
  setTopVoiceLevel: (v: number) => void;
  setActivePanel: (v: ActivePanel) => void;
  setCurrentChordName: (v: string) => void;
  setTempoSyncEnabled: (v: boolean) => void;
  setTriggerMode: (v: "auto" | "manual" | "midi") => void;
  setRetriggerEnvelopes: (v: boolean) => void;
}

// Default just intonation ratios
const DEFAULT_RATIOS = [
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
];

export const useSynthStore = create<SynthState>((set) => ({
  // Transport
  isPlaying: false,
  playheadCol: 0,
  bpm: 120,
  loopEnabled: true,

  // Grid
  previewMode: false,
  hasUndo: false,

  // Brush
  brushType: 0,
  brushSize: 1,
  brushIntensity: 0.8,
  brushHueNorm: 0.5,
  brushSaturation: 0.7,
  mutateMode: false,
  mutationType: 0,
  mutateStrength: 0.5,
  formantWidth: 4,

  // Sound
  soundMode: "additive",
  masterVolume: 0.7,
  attack: 0.01,
  decay: 0.1,
  release: 0.3,
  softSaturation: false,
  stereoMode: false,
  stereoSpreadAmount: 0.3,
  blurEnabled: false,
  lowCpuMode: false,
  harmonicTilt: 0,
  noiseColor: "white",
  resonance: 0.5,
  frameInterpolation: 0.5,
  morphSpeed: 1.0,
  material: "glass",
  damping: 0.5,
  hybridBalance: 0.5,
  subHarmonicEnabled: false,

  // Modules
  masterBypass: false,
  performanceSafeMode: false,
  cpuUsage: 0,

  // Harmonic Drift
  driftEnabled: false,
  driftAmount: 0.3,
  driftSpeed: 0.5,
  driftMode: "sine",
  highHarmonicEmphasis: 0.5,

  // Step Sequencer
  seqEnabled: false,
  seqStepCount: 16,
  seqTempoDivision: "1/8",
  seqMode: "amplitude",
  seqLimitHarmonics: false,
  seqSmoothing: 10,

  // Spectral Tilt
  spectralTilt: 0,

  // Center Shift
  centerShiftEnabled: false,
  centerShiftAmount: 0,
  centerShiftInterpolation: true,

  // Partial Envelope
  partialEnvEnabled: false,
  partialAttack: 0.1,
  partialDecay: 0.3,
  partialSustain: 0.8,
  partialRelease: 0.5,
  partialApplyMode: "global",

  // Stereo Spread Module
  stereoSpreadEnabled: false,
  stereoSpreadModAmount: 0.5,
  stereoSpreadCurve: "linear",
  stereoSpreadDriftWidth: 0.5,

  // Partial Distortion
  distortionEnabled: false,
  distortionStart: 1,
  distortionEnd: 48,
  distortionDrive: 1.0,
  distortionClipMode: "soft",

  // Noise Layer
  noiseLayerEnabled: false,
  noiseLayerAmount: 0.2,
  noiseLayerAffect: "amplitude",
  noiseLayerLockFundamental: true,
  noiseLayerSeed: 42,

  // Cluster Mode
  clusterEnabled: false,
  clusterSize: 4,
  clusterSpacing: 0.5,
  clusterResonance: 1.0,

  // Micro Tuning
  microTuningEnabled: false,
  microTuningScale: "equal",
  customRatios: DEFAULT_RATIOS,

  // Macro Controls
  macroDrift: 0.3,
  macroBrightness: 0,
  macroWidth: 0.5,
  macroMotion: 0.3,

  // Chord Mode
  chordModeEnabled: false,
  chordRoot: "C",
  chordOctave: 4,
  chordScale: "Major",
  chordLockRoot: false,
  chordType: "Major",
  chordAutoInvert: false,
  chordInversion: "Root",
  chordSpread: 0,
  chordVoiceCount: 4,
  chordVoiceStacking: "closed",
  progressionEnabled: false,
  progressionPreset: "I–IV–V–I",
  progressionLength: 4,
  chordDuration: "1 Bar",
  loopProgression: true,
  progressionStep: 0,
  strumSpeed: 0,
  strumDirection: "up",
  humanizeTiming: 0,
  humanizeVelocity: 0,
  keepBassStatic: false,
  octaveBassReinforcement: false,
  topVoiceShine: false,
  bassLevel: 1.0,
  topVoiceLevel: 1.0,

  // UI
  activePanel: null,
  currentChordName: "Cmaj",
  tempoSyncEnabled: false,
  triggerMode: "auto",
  retriggerEnvelopes: false,

  // Actions - simple setters
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPlayheadCol: (v) => set({ playheadCol: v }),
  setBpm: (v) => set({ bpm: v }),
  setPreviewMode: (v) => set({ previewMode: v }),
  setHasUndo: (v) => set({ hasUndo: v }),
  setBrushType: (v) => set({ brushType: v }),
  setBrushSize: (v) => set({ brushSize: v }),
  setBrushIntensity: (v) => set({ brushIntensity: v }),
  setBrushHueNorm: (v) => set({ brushHueNorm: v }),
  setBrushSaturation: (v) => set({ brushSaturation: v }),
  setMutateMode: (v) => set({ mutateMode: v }),
  setMutationType: (v) => set({ mutationType: v }),
  setMutateStrength: (v) => set({ mutateStrength: v }),
  setFormantWidth: (v) => set({ formantWidth: v }),
  setSoundMode: (v) => set({ soundMode: v }),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setAttack: (v) => set({ attack: v }),
  setDecay: (v) => set({ decay: v }),
  setRelease: (v) => set({ release: v }),
  setSoftSaturation: (v) => set({ softSaturation: v }),
  setStereoMode: (v) => set({ stereoMode: v }),
  setStereoSpreadAmount: (v) => set({ stereoSpreadAmount: v }),
  setBlurEnabled: (v) => set({ blurEnabled: v }),
  setLowCpuMode: (v) => set({ lowCpuMode: v }),
  setHarmonicTilt: (v) => set({ harmonicTilt: v }),
  setNoiseColor: (v) => set({ noiseColor: v }),
  setResonance: (v) => set({ resonance: v }),
  setFrameInterpolation: (v) => set({ frameInterpolation: v }),
  setMorphSpeed: (v) => set({ morphSpeed: v }),
  setMaterial: (v) => set({ material: v }),
  setDamping: (v) => set({ damping: v }),
  setHybridBalance: (v) => set({ hybridBalance: v }),
  setSubHarmonicEnabled: (v) => set({ subHarmonicEnabled: v }),
  setMasterBypass: (v) => set({ masterBypass: v }),
  setPerformanceSafeMode: (v) => set({ performanceSafeMode: v }),
  setCpuUsage: (v) => set({ cpuUsage: v }),
  setDriftEnabled: (v) => set({ driftEnabled: v }),
  setDriftAmount: (v) => set({ driftAmount: v }),
  setDriftSpeed: (v) => set({ driftSpeed: v }),
  setDriftMode: (v) => set({ driftMode: v }),
  setHighHarmonicEmphasis: (v) => set({ highHarmonicEmphasis: v }),
  setSeqEnabled: (v) => set({ seqEnabled: v }),
  setSeqStepCount: (v) => set({ seqStepCount: v }),
  setSeqTempoDivision: (v) => set({ seqTempoDivision: v }),
  setSeqMode: (v) => set({ seqMode: v }),
  setSeqLimitHarmonics: (v) => set({ seqLimitHarmonics: v }),
  setSeqSmoothing: (v) => set({ seqSmoothing: v }),
  setSpectralTilt: (v) => set({ spectralTilt: v }),
  setCenterShiftEnabled: (v) => set({ centerShiftEnabled: v }),
  setCenterShiftAmount: (v) => set({ centerShiftAmount: v }),
  setCenterShiftInterpolation: (v) => set({ centerShiftInterpolation: v }),
  setPartialEnvEnabled: (v) => set({ partialEnvEnabled: v }),
  setPartialAttack: (v) => set({ partialAttack: v }),
  setPartialDecay: (v) => set({ partialDecay: v }),
  setPartialSustain: (v) => set({ partialSustain: v }),
  setPartialRelease: (v) => set({ partialRelease: v }),
  setPartialApplyMode: (v) => set({ partialApplyMode: v }),
  setStereoSpreadEnabled: (v) => set({ stereoSpreadEnabled: v }),
  setStereoSpreadModAmount: (v) => set({ stereoSpreadModAmount: v }),
  setStereoSpreadCurve: (v) => set({ stereoSpreadCurve: v }),
  setStereoSpreadDriftWidth: (v) => set({ stereoSpreadDriftWidth: v }),
  setDistortionEnabled: (v) => set({ distortionEnabled: v }),
  setDistortionStart: (v) => set({ distortionStart: v }),
  setDistortionEnd: (v) => set({ distortionEnd: v }),
  setDistortionDrive: (v) => set({ distortionDrive: v }),
  setDistortionClipMode: (v) => set({ distortionClipMode: v }),
  setNoiseLayerEnabled: (v) => set({ noiseLayerEnabled: v }),
  setNoiseLayerAmount: (v) => set({ noiseLayerAmount: v }),
  setNoiseLayerAffect: (v) => set({ noiseLayerAffect: v }),
  setNoiseLayerLockFundamental: (v) => set({ noiseLayerLockFundamental: v }),
  setNoiseLayerSeed: (v) => set({ noiseLayerSeed: v }),
  setClusterEnabled: (v) => set({ clusterEnabled: v }),
  setClusterSize: (v) => set({ clusterSize: v }),
  setClusterSpacing: (v) => set({ clusterSpacing: v }),
  setClusterResonance: (v) => set({ clusterResonance: v }),
  setMicroTuningEnabled: (v) => set({ microTuningEnabled: v }),
  setMicroTuningScale: (v) => set({ microTuningScale: v }),
  setCustomRatios: (v) => set({ customRatios: v }),
  setMacroDrift: (v) => set({ macroDrift: v }),
  setMacroBrightness: (v) => set({ macroBrightness: v }),
  setMacroWidth: (v) => set({ macroWidth: v }),
  setMacroMotion: (v) => set({ macroMotion: v }),
  setChordModeEnabled: (v) => set({ chordModeEnabled: v }),
  setChordRoot: (v) => set({ chordRoot: v }),
  setChordOctave: (v) => set({ chordOctave: v }),
  setChordScale: (v) => set({ chordScale: v }),
  setChordLockRoot: (v) => set({ chordLockRoot: v }),
  setChordType: (v) => set({ chordType: v }),
  setChordAutoInvert: (v) => set({ chordAutoInvert: v }),
  setChordInversion: (v) => set({ chordInversion: v }),
  setChordSpread: (v) => set({ chordSpread: v }),
  setChordVoiceCount: (v) => set({ chordVoiceCount: v }),
  setChordVoiceStacking: (v) => set({ chordVoiceStacking: v }),
  setProgressionEnabled: (v) => set({ progressionEnabled: v }),
  setProgressionPreset: (v) => set({ progressionPreset: v }),
  setProgressionLength: (v) => set({ progressionLength: v }),
  setChordDuration: (v) => set({ chordDuration: v }),
  setLoopProgression: (v) => set({ loopProgression: v }),
  setProgressionStep: (v) => set({ progressionStep: v }),
  setStrumSpeed: (v) => set({ strumSpeed: v }),
  setStrumDirection: (v) => set({ strumDirection: v }),
  setHumanizeTiming: (v) => set({ humanizeTiming: v }),
  setHumanizeVelocity: (v) => set({ humanizeVelocity: v }),
  setKeepBassStatic: (v) => set({ keepBassStatic: v }),
  setOctaveBassReinforcement: (v) => set({ octaveBassReinforcement: v }),
  setTopVoiceShine: (v) => set({ topVoiceShine: v }),
  setBassLevel: (v) => set({ bassLevel: v }),
  setTopVoiceLevel: (v) => set({ topVoiceLevel: v }),
  setActivePanel: (v) => set({ activePanel: v }),
  setCurrentChordName: (v) => set({ currentChordName: v }),
  setTempoSyncEnabled: (v) => set({ tempoSyncEnabled: v }),
  setTriggerMode: (v) => set({ triggerMode: v }),
  setRetriggerEnvelopes: (v) => set({ retriggerEnvelopes: v }),
}));
