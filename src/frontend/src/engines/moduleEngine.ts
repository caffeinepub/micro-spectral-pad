/**
 * Module Engine - DSP module parameter management
 */

import { useSynthStore } from "../store/synthStore";
import { audioParams, lushParams, updateLushParams } from "./audioEngine";

let updateTimer: ReturnType<typeof setTimeout> | null = null;
const UPDATE_INTERVAL = 100;

const paramTargets: Record<string, number> = {};
const paramCurrents: Record<string, number> = {};

export function setParamSmoothed(
  key: string,
  value: number,
  immediate = false,
) {
  paramTargets[key] = value;
  if (immediate || !(key in paramCurrents)) paramCurrents[key] = value;
}

export function tickParamSmoothing(deltaMs: number) {
  const alpha = 1 - Math.exp(-deltaMs / 15);
  for (const key in paramTargets) {
    const target = paramTargets[key];
    const current = paramCurrents[key] ?? target;
    const next = current + (target - current) * alpha;
    paramCurrents[key] = Math.abs(next - target) < 0.0001 ? target : next;
  }
}

export function syncParamsToAudio() {
  if (updateTimer) return;
  updateTimer = setTimeout(() => {
    updateTimer = null;
    doSyncParams();
  }, UPDATE_INTERVAL);
}

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
  audioParams.driftEnabled = state.driftEnabled;
  audioParams.driftAmount = state.driftAmount * state.macroDrift;
  audioParams.driftSpeed = state.driftSpeed * (1 + state.macroMotion);
  audioParams.driftMode = state.driftMode;
  audioParams.highHarmonicEmphasis = state.highHarmonicEmphasis;
  audioParams.seqEnabled = state.seqEnabled;
  audioParams.seqStepCount = state.seqStepCount;
  audioParams.seqMode = state.seqMode;
  audioParams.seqLimitHarmonics = state.seqLimitHarmonics;
  audioParams.bpm = state.bpm;
  audioParams.seqDivision = state.seqTempoDivision;
  audioParams.partialEnvEnabled = state.partialEnvEnabled;
  audioParams.partialAttack = state.partialAttack;
  audioParams.partialDecay = state.partialDecay;
  audioParams.partialSustain = state.partialSustain;
  audioParams.partialRelease = state.partialRelease;
  audioParams.distortionEnabled = state.distortionEnabled;
  audioParams.distortionStart = state.distortionStart - 1;
  audioParams.distortionEnd = state.distortionEnd - 1;
  audioParams.distortionDrive = state.distortionDrive;
  audioParams.distortionClip = state.distortionClipMode;
  audioParams.noiseLayerEnabled = state.noiseLayerEnabled;
  audioParams.noiseLayerAmount = state.noiseLayerAmount;
  audioParams.noiseLayerAffect = state.noiseLayerAffect;
  audioParams.clusterEnabled = state.clusterEnabled;
  audioParams.clusterSize = state.clusterSize;
  audioParams.clusterResonance = state.clusterResonance;
  audioParams.microTuningEnabled = state.microTuningEnabled;
  audioParams.customRatios = state.customRatios;
  audioParams.subHarmonicEnabled = state.subHarmonicEnabled;
  audioParams.hybridBalance = state.hybridBalance;

  // Sync lush params
  updateLushParams({
    enabled: state.lushModeEnabled,
    unisonVoices: state.lushUnisonVoices,
    detuneAmount: state.lushDetuneAmount,
    stereoSpread: state.lushStereoSpread / 100,
    analogDriftAmount: state.lushAnalogDriftAmount,
    driftSpeed: state.lushDriftSpeed,
    subEnabled: state.lushSubEnabled,
    subLevel: state.lushSubLevel / 100,
    subCutoffLimit: state.lushSubCutoffLimit,
    satEnabled: state.lushSatEnabled,
    satDrive: state.lushSatDrive,
    satMix: state.lushSatMix / 100,
    filterEnabled: state.lushFilterEnabled,
    filterType: state.lushFilterType,
    filterCutoff: state.lushFilterCutoff,
    filterResonance: state.lushFilterResonance,
    filterLfoEnabled: state.lushFilterLfoEnabled,
    filterLfoRate: state.lushFilterLfoRate,
    filterLfoDepth: state.lushFilterLfoDepth,
    chorusEnabled: state.lushChorusEnabled,
    chorusDelay: state.lushChorusDelay / 1000,
    chorusModDepth: state.lushChorusModDepth / 1000,
    chorusRate: state.lushChorusRate,
    chorusMix: state.lushChorusMix / 100,
    bodyResEnabled: state.lushBodyResEnabled,
    bodyResGain: state.lushBodyResGain / 100,
  });
  void lushParams;
}

export function enforceSafeMode(enabled: boolean) {
  const state = useSynthStore.getState();
  if (enabled) {
    if (state.seqStepCount > 16) useSynthStore.getState().setSeqStepCount(16);
    if (state.centerShiftInterpolation)
      useSynthStore.getState().setCenterShiftInterpolation(false);
  }
}

export function applyMacroControls() {
  const state = useSynthStore.getState();
  if (state.driftEnabled)
    audioParams.driftAmount = state.driftAmount * state.macroDrift;
  audioParams.spectralTilt = state.spectralTilt + state.macroBrightness * 50;
  audioParams.stereoSpread = state.stereoSpreadAmount * state.macroWidth * 2;
  audioParams.driftSpeed = state.driftSpeed * (1 + state.macroMotion * 2);
}

export function initModuleEngine() {
  doSyncParams();
}
