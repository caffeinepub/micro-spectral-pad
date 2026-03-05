/**
 * Module Engine - DSP module parameter management
 * Provides smooth parameter ramping and module bypass logic
 * All processing reads from audioParams
 */

import { useSynthStore } from "../store/synthStore";
import { audioParams } from "./audioEngine";

// Throttled update timer
let updateTimer: ReturnType<typeof setTimeout> | null = null;
const UPDATE_INTERVAL = 100; // max 10 updates/sec

// Smooth parameter ramp targets
const paramTargets: Record<string, number> = {};
const paramCurrents: Record<string, number> = {};

export function setParamSmoothed(
  key: string,
  value: number,
  immediate = false,
) {
  paramTargets[key] = value;
  if (immediate || !(key in paramCurrents)) {
    paramCurrents[key] = value;
  }
}

// Called from RAF to smooth parameters
export function tickParamSmoothing(deltaMs: number) {
  const alpha = 1 - Math.exp(-deltaMs / 15); // ~15ms time constant
  for (const key in paramTargets) {
    const target = paramTargets[key];
    const current = paramCurrents[key] ?? target;
    const next = current + (target - current) * alpha;
    paramCurrents[key] = Math.abs(next - target) < 0.0001 ? target : next;
  }
}

// Sync all store params to audioParams (throttled)
export function syncParamsToAudio() {
  if (updateTimer) return;
  updateTimer = setTimeout(() => {
    updateTimer = null;
    doSyncParams();
  }, UPDATE_INTERVAL);
}

// Immediate sync (for transport controls)
export function syncParamsImmediately() {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  doSyncParams();
}

function doSyncParams() {
  const state = useSynthStore.getState();

  audioParams.masterVolume = state.masterVolume;
  audioParams.stereoMode = state.stereoMode;
  audioParams.stereoSpread = state.stereoSpreadAmount;
  audioParams.softSaturation = state.softSaturation;
  audioParams.blurEnabled = state.blurEnabled;
  audioParams.lowCpuMode = state.lowCpuMode;
  audioParams.masterBypass = state.masterBypass;
  audioParams.performanceSafeMode = state.performanceSafeMode;
  audioParams.previewMode = state.previewMode;
  audioParams.attack = state.attack;
  audioParams.decay = state.decay;
  audioParams.release = state.release;
  audioParams.harmonicTilt = state.harmonicTilt;
  audioParams.spectralTilt = state.spectralTilt + state.macroBrightness * 100;
  audioParams.centerShiftEnabled = state.centerShiftEnabled;
  audioParams.centerShiftAmount = state.centerShiftAmount;

  // Drift - macro motion affects drift speed
  audioParams.driftEnabled = state.driftEnabled;
  audioParams.driftAmount = state.driftAmount * state.macroDrift;
  audioParams.driftSpeed = state.driftSpeed * (1 + state.macroMotion);
  audioParams.driftMode = state.driftMode;
  audioParams.highHarmonicEmphasis = state.highHarmonicEmphasis;

  // Sequencer
  audioParams.seqEnabled = state.seqEnabled;
  audioParams.seqStepCount = state.seqStepCount;
  audioParams.seqMode = state.seqMode;
  audioParams.seqLimitHarmonics = state.seqLimitHarmonics;
  audioParams.bpm = state.bpm;
  audioParams.seqDivision = state.seqTempoDivision;

  // Partial envelope
  audioParams.partialEnvEnabled = state.partialEnvEnabled;
  audioParams.partialAttack = state.partialAttack;
  audioParams.partialDecay = state.partialDecay;
  audioParams.partialSustain = state.partialSustain;
  audioParams.partialRelease = state.partialRelease;

  // Distortion
  audioParams.distortionEnabled = state.distortionEnabled;
  audioParams.distortionStart = state.distortionStart - 1;
  audioParams.distortionEnd = state.distortionEnd - 1;
  audioParams.distortionDrive = state.distortionDrive;
  audioParams.distortionClip = state.distortionClipMode;

  // Noise layer
  audioParams.noiseLayerEnabled = state.noiseLayerEnabled;
  audioParams.noiseLayerAmount = state.noiseLayerAmount;
  audioParams.noiseLayerAffect = state.noiseLayerAffect;

  // Cluster
  audioParams.clusterEnabled = state.clusterEnabled;
  audioParams.clusterSize = state.clusterSize;
  audioParams.clusterResonance = state.clusterResonance;

  // Micro tuning
  audioParams.microTuningEnabled = state.microTuningEnabled;
  audioParams.customRatios = state.customRatios;

  // Sub harmonic
  audioParams.subHarmonicEnabled = state.subHarmonicEnabled;
  audioParams.hybridBalance = state.hybridBalance;
}

// Performance safe mode enforcement
export function enforceSafeMode(enabled: boolean) {
  const state = useSynthStore.getState();
  if (enabled) {
    // Reduce seqStepCount if too high
    if (state.seqStepCount > 16) {
      useSynthStore.getState().setSeqStepCount(16);
    }
    // Disable interpolation toggles
    if (state.centerShiftInterpolation) {
      useSynthStore.getState().setCenterShiftInterpolation(false);
    }
  }
}

// Macro control updates - apply macro to relevant params
export function applyMacroControls() {
  const state = useSynthStore.getState();

  // Macro Drift → Drift Amount
  if (state.driftEnabled) {
    audioParams.driftAmount = state.driftAmount * state.macroDrift;
  }

  // Macro Brightness → Spectral Tilt
  audioParams.spectralTilt = state.spectralTilt + state.macroBrightness * 50;

  // Macro Width → Stereo Spread
  audioParams.stereoSpread = state.stereoSpreadAmount * state.macroWidth * 2;

  // Macro Motion → Drift Speed + Seq depth
  audioParams.driftSpeed = state.driftSpeed * (1 + state.macroMotion * 2);
}

// Initialize with current state
export function initModuleEngine() {
  doSyncParams();
}
