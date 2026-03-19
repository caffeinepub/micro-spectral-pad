/**
 * Audio Engine - Web Audio API synthesizer
 * CRITICAL: Zero allocations inside audio callback
 * All buffers preallocated at init
 */

import {
  COLS,
  ROWS,
  cellData,
  dirtyColumnsData,
  freqBands,
  seqStepsData,
} from "../store/synthStore";

const SAMPLE_RATE = 44100;
const LOOP_SAMPLES = SAMPLE_RATE * 2;
const BUFFER_SIZE = 2048;
const NOISE_BUF_SIZE = 512;
const MAX_HARMONICS = 48;
const LUSH_MAX_UNISON = 4;
const LUSH_CHORUS_BUF_SIZE = Math.ceil(SAMPLE_RATE * 0.06); // 60ms max chorus delay

// All preallocated - NEVER recreate
const phaseAccumulators = new Float32Array(MAX_HARMONICS + 1);
const detuneOffsets = new Float32Array(MAX_HARMONICS);
const noiseBuf = new Float32Array(NOISE_BUF_SIZE);
const noiseSeededBuf = new Float32Array(NOISE_BUF_SIZE);
const colAmplitudes = new Float32Array(MAX_HARMONICS);
const colHueNorm = new Float32Array(MAX_HARMONICS);
const colSaturation = new Float32Array(MAX_HARMONICS);
const mixBuf = new Float32Array(BUFFER_SIZE);
const driftValues = new Float32Array(MAX_HARMONICS);
const tiltMultipliers = new Float32Array(MAX_HARMONICS);
const seqModValues = new Float32Array(32);

// Resonator state
const resonatorPhase = new Float32Array(MAX_HARMONICS);
const resonatorAmp = new Float32Array(MAX_HARMONICS);
const resonatorDecay = new Float32Array(MAX_HARMONICS);

// Wavetable frames
const wavetableFrames = new Float32Array(COLS * MAX_HARMONICS);

// ─── LUSH ENGINE BUFFERS (all preallocated, never reallocated) ─────────────────
// Unison voice phase accumulators: MAX_HARMONICS rows × LUSH_MAX_UNISON voices
const lushUnisonPhases = new Float32Array(MAX_HARMONICS * LUSH_MAX_UNISON);
// Analog drift state per row
const lushDriftValues = new Float32Array(MAX_HARMONICS);
const lushDriftTargets = new Float32Array(MAX_HARMONICS);
const lushDriftTimers = new Int32Array(MAX_HARMONICS);
const lushDriftSeeds = new Uint32Array(MAX_HARMONICS);
// Sub oscillator phases
const lushSubPhases = new Float32Array(MAX_HARMONICS);
// Chorus circular delay buffers
const lushChorusBufL = new Float32Array(LUSH_CHORUS_BUF_SIZE);
const lushChorusBufR = new Float32Array(LUSH_CHORUS_BUF_SIZE);
// Global biquad filter state: [x1, x2, y1, y2] per channel
const lushFilterStateL = new Float32Array(4);
const lushFilterStateR = new Float32Array(4);
// Body resonance biquad states: 3 resonators × 4 state vars per channel
const lushBodyResL = new Float32Array(12);
const lushBodyResR = new Float32Array(12);
// Body resonance coefficients (3 resonators: 110, 440, 2200 Hz)
const lushBodyB0 = new Float32Array(3);
const lushBodyB2 = new Float32Array(3);
const lushBodyA1 = new Float32Array(3);
const lushBodyA2 = new Float32Array(3);

// Lush scalar state
let lushChorusWritePos = 0;
let lushChorusLFOPhase = 0;
let lushFilterLFOPhase = 0;
// Biquad filter coefficients (recomputed on param change, read in audio callback)
let lushBiquadB0 = 1.0;
let lushBiquadB1 = 0.0;
let lushBiquadB2 = 0.0;
let lushBiquadA1 = 0.0;
let lushBiquadA2 = 0.0;

// Lush parameters object - updated from store/UI, read by audio callback
export const lushParams = {
  enabled: false,
  unisonVoices: 3,
  detuneAmount: 4, // cents total spread
  stereoSpread: 0.6, // 0-1
  analogDriftAmount: 0.4, // cents
  driftSpeed: 0.5, // Hz
  subEnabled: false,
  subLevel: 0.25,
  subCutoffLimit: 150, // Hz
  satEnabled: false,
  satDrive: 1.5,
  satMix: 0.35,
  filterEnabled: false,
  filterType: "lowpass" as "lowpass" | "softlowpass" | "bandpass",
  filterCutoff: 6000, // Hz
  filterResonance: 0.2, // Q 0-0.8
  filterLfoEnabled: false,
  filterLfoRate: 0.05, // Hz
  filterLfoDepth: 1000, // Hz
  chorusEnabled: false,
  chorusDelay: 0.02, // seconds
  chorusModDepth: 0.002, // seconds
  chorusRate: 0.2, // Hz
  chorusMix: 0.3,
  bodyResEnabled: false,
  bodyResGain: 0.3,
};

// Update lush biquad coefficients (called outside audio callback)
function computeLushBiquad(cutoffHz: number, Q: number, type: string): void {
  const omega =
    (2 * Math.PI * Math.max(20, Math.min(20000, cutoffHz))) / SAMPLE_RATE;
  const sinO = Math.sin(omega);
  const cosO = Math.cos(omega);
  const safeQ = Math.max(0.05, Q);
  const alpha = sinO / (2 * safeQ);
  let b0: number;
  let b1: number;
  let b2: number;
  let a0: number;
  if (type === "bandpass") {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
    a0 = 1 + alpha;
  } else {
    // lowpass
    b0 = (1 - cosO) / 2;
    b1 = 1 - cosO;
    b2 = (1 - cosO) / 2;
    a0 = 1 + alpha;
  }
  lushBiquadB0 = b0 / a0;
  lushBiquadB1 = b1 / a0;
  lushBiquadB2 = b2 / a0;
  lushBiquadA1 = (-2 * cosO) / a0;
  lushBiquadA2 = (1 - alpha) / a0;
}

export function updateLushParams(p: Partial<typeof lushParams>): void {
  Object.assign(lushParams, p);
  // Recompute filter coefficients
  const cutoff =
    lushParams.filterType === "softlowpass"
      ? lushParams.filterCutoff * 0.5
      : lushParams.filterCutoff;
  const Q = Math.max(0.05, 0.5 + lushParams.filterResonance * 4);
  computeLushBiquad(
    cutoff,
    Q,
    lushParams.filterType === "bandpass" ? "bandpass" : "lowpass",
  );
}

// Initialize body resonance biquad coefficients for 110, 440, 2200 Hz
function initLushBodyResonators(): void {
  const BODY_FREQS = [110, 440, 2200];
  const Q = 1.0;
  for (let i = 0; i < 3; i++) {
    const omega = (2 * Math.PI * BODY_FREQS[i]) / SAMPLE_RATE;
    const sinO = Math.sin(omega);
    const cosO = Math.cos(omega);
    const alpha = sinO / (2 * Q);
    const a0 = 1 + alpha;
    lushBodyB0[i] = alpha / a0;
    lushBodyB2[i] = -alpha / a0;
    lushBodyA1[i] = (-2 * cosO) / a0;
    lushBodyA2[i] = (1 - alpha) / a0;
  }
}

// Initialize lush engine - called once at audio init
export function initLushEngine(): void {
  lushUnisonPhases.fill(0);
  lushDriftValues.fill(0);
  lushDriftTargets.fill(0);
  lushSubPhases.fill(0);
  lushChorusBufL.fill(0);
  lushChorusBufR.fill(0);
  lushFilterStateL.fill(0);
  lushFilterStateR.fill(0);
  lushBodyResL.fill(0);
  lushBodyResR.fill(0);
  // Spread out drift timer initialization so rows don't all update at once
  for (let row = 0; row < MAX_HARMONICS; row++) {
    lushDriftSeeds[row] = (row * 2654435761) >>> 0;
    lushDriftTimers[row] = Math.round(
      (SAMPLE_RATE / 0.5) * (row / MAX_HARMONICS),
    );
  }
  initLushBodyResonators();
  computeLushBiquad(6000, 0.5 + 0.2 * 4, "lowpass");
}

// Module state
let driftLFOPhase = 0;
let samplePosition = 0;
let noiseReadPos = 0;
let lastRebuildTime = 0;
let rebuildScheduled = false;
let audioInitialized = false;
let seqCurrentStep = 0;
let seqSampleCounter = 0;

// Smoothed parameter values
let smoothVolume = 0.7;
let smoothSpread = 0.3;
let smoothTilt = 0;
let smoothCenterShift = 0;
let smoothDrive = 1.0;

export const audioParams = {
  isPlaying: false,
  masterVolume: 0.7,
  stereoMode: false,
  stereoSpread: 0.3,
  softSaturation: false,
  blurEnabled: false,
  lowCpuMode: false,
  masterBypass: false,
  performanceSafeMode: false,
  previewMode: false,
  attack: 0.01,
  decay: 0.1,
  release: 0.3,
  harmonicTilt: 0,
  spectralTilt: 0,
  centerShiftAmount: 0,
  centerShiftEnabled: false,
  driftEnabled: false,
  driftAmount: 0.3,
  driftSpeed: 0.5,
  driftMode: "sine" as "random" | "sine" | "chaos",
  highHarmonicEmphasis: 0.5,
  seqEnabled: false,
  seqStepCount: 16,
  seqMode: "amplitude" as "amplitude" | "pitch" | "pan",
  seqLimitHarmonics: false,
  bpm: 120,
  seqDivision: "1/8" as "1/4" | "1/8" | "1/16" | "1/32",
  partialEnvEnabled: false,
  partialAttack: 0.1,
  partialDecay: 0.3,
  partialSustain: 0.8,
  partialRelease: 0.5,
  distortionEnabled: false,
  distortionStart: 0,
  distortionEnd: 47,
  distortionDrive: 1.0,
  distortionClip: "soft" as "soft" | "hard",
  noiseLayerEnabled: false,
  noiseLayerAmount: 0.2,
  noiseLayerAffect: "amplitude" as "amplitude" | "pitch" | "both",
  clusterEnabled: false,
  clusterSize: 4,
  clusterResonance: 1.0,
  microTuningEnabled: false,
  customRatios: [
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
  ] as number[],
  subHarmonicEnabled: false,
  hybridBalance: 0.5,
};

let audioCtx: AudioContext | null = null;
let scriptNode: ScriptProcessorNode | null = null;
let gainNode: GainNode | null = null;

function initNoise() {
  let x = 1234567;
  for (let i = 0; i < NOISE_BUF_SIZE; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    noiseBuf[i] = (x / 0x7fffffff) * 2 - 1;
  }
}

function initDetuneOffsets() {
  let x = 7654321;
  for (let i = 0; i < MAX_HARMONICS; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    detuneOffsets[i] = ((x / 0x7fffffff) * 10 - 5) * 0.001;
  }
}

function updateTiltMultipliers(tilt: number) {
  for (let row = 0; row < ROWS; row++) {
    const t = tilt / 100;
    if (t === 0) {
      tiltMultipliers[row] = 1;
    } else if (t > 0) {
      tiltMultipliers[row] = 1 + t * (row / (ROWS - 1));
    } else {
      tiltMultipliers[row] = 1 + -t * (1 - row / (ROWS - 1));
    }
  }
}

function colorEngineV2Sample(
  phase: number,
  freq: number,
  saturation: number,
  hueNorm: number,
  detuneFactor: number,
): number {
  const seg = Math.floor(hueNorm * 4) % 4;
  const localT = hueNorm * 4 - Math.floor(hueNorm * 4);

  let oscA = 0;
  let oscB = 0;

  switch (seg) {
    case 0: {
      oscA = Math.sin(phase);
      oscB =
        Math.sin(phase) +
        saturation * 0.6 * Math.sin(2 * phase) +
        saturation * 0.3 * Math.sin(3 * phase);
      break;
    }
    case 1: {
      oscA =
        Math.sin(phase) +
        saturation * 0.6 * Math.sin(2 * phase) +
        saturation * 0.3 * Math.sin(3 * phase);
      const detuneRatio = 1 + saturation * detuneFactor;
      oscB = Math.sin(phase) + Math.sin(phase * detuneRatio);
      break;
    }
    case 2: {
      const detuneRatio = 1 + saturation * detuneFactor;
      oscA = Math.sin(phase) + Math.sin(phase * detuneRatio);
      const fmIndex = saturation * 1.5;
      oscB = Math.sin(phase + fmIndex * Math.sin(2 * phase));
      break;
    }
    case 3: {
      const fmIndex = saturation * 1.5;
      oscA = Math.sin(phase + fmIndex * Math.sin(2 * phase));
      oscB = Math.sin(phase);
      break;
    }
  }

  void freq;
  return (1 - localT) * oscA + localT * oscB;
}

function getInterpolatedAmplitude(colPos: number, row: number): number {
  const col0 = Math.floor(colPos) % COLS;
  const col1 = (col0 + 1) % COLS;
  const t = colPos - Math.floor(colPos);

  const amp0 = cellData[(col0 * ROWS + row) * 3 + 0];
  const amp1 = cellData[(col1 * ROWS + row) * 3 + 0];
  colHueNorm[row] =
    cellData[(col0 * ROWS + row) * 3 + 1] * (1 - t) +
    cellData[(col1 * ROWS + row) * 3 + 1] * t;
  colSaturation[row] =
    cellData[(col0 * ROWS + row) * 3 + 2] * (1 - t) +
    cellData[(col1 * ROWS + row) * 3 + 2] * t;

  return amp0 * (1 - t) + amp1 * t;
}

function processAudio(e: AudioProcessingEvent) {
  const outputL = e.outputBuffer.getChannelData(0);
  const outputR = e.outputBuffer.getChannelData(1);
  const bufLen = outputL.length;

  if (!audioParams.isPlaying) {
    for (let i = 0; i < bufLen; i++) {
      outputL[i] = 0;
      outputR[i] = 0;
    }
    return;
  }

  const TWO_PI = 6.283185307;
  const sampleRateRecip = 1 / SAMPLE_RATE;
  const maxRows = audioParams.performanceSafeMode ? 32 : ROWS;
  const colRange = audioParams.previewMode ? 32 : COLS;

  const tiltChanged = Math.abs(smoothTilt - audioParams.spectralTilt) > 0.01;
  if (tiltChanged) {
    smoothTilt += (audioParams.spectralTilt - smoothTilt) * 0.1;
    updateTiltMultipliers(smoothTilt);
  }
  smoothVolume += (audioParams.masterVolume - smoothVolume) * 0.05;

  // ── Update lush filter LFO once per buffer ───────────────────────────────
  if (
    lushParams.enabled &&
    lushParams.filterEnabled &&
    lushParams.filterLfoEnabled
  ) {
    lushFilterLFOPhase +=
      TWO_PI * lushParams.filterLfoRate * (bufLen * sampleRateRecip);
    if (lushFilterLFOPhase > TWO_PI) lushFilterLFOPhase -= TWO_PI;
    const modCutoff = Math.max(
      50,
      Math.min(
        20000,
        lushParams.filterCutoff +
          Math.sin(lushFilterLFOPhase) * lushParams.filterLfoDepth,
      ),
    );
    const qVal = Math.max(0.05, 0.5 + lushParams.filterResonance * 4);
    computeLushBiquad(
      lushParams.filterType === "softlowpass" ? modCutoff * 0.5 : modCutoff,
      qVal,
      lushParams.filterType === "bandpass" ? "bandpass" : "lowpass",
    );
  }

  for (let i = 0; i < bufLen; i++) {
    const colPos = (samplePosition / LOOP_SAMPLES) * colRange;

    if (lushParams.enabled && !audioParams.masterBypass) {
      // ═══════════════════════════════════════════════════════════════
      // LUSH SYNTHESIS PATH - stereo unison + effects
      // ═══════════════════════════════════════════════════════════════
      let lL = 0;
      let lR = 0;
      const nV = Math.max(1, Math.min(4, Math.round(lushParams.unisonVoices)));

      for (let row = 0; row < maxRows; row++) {
        const amp = getInterpolatedAmplitude(colPos, row);
        const freq = freqBands[row];

        // Always advance main phase accumulator for continuity
        phaseAccumulators[row] += TWO_PI * freq * sampleRateRecip;
        if (phaseAccumulators[row] > TWO_PI) phaseAccumulators[row] -= TWO_PI;

        if (amp < 0.001) continue;

        const amplitude = amp * amp;
        const hue = colHueNorm[row];
        const sat = colSaturation[row];
        const tiltMul = tiltMultipliers[row] || 1;

        // Analog drift update (timer-based, random walk)
        lushDriftTimers[row]--;
        if (lushDriftTimers[row] <= 0) {
          lushDriftSeeds[row] =
            Math.imul(lushDriftSeeds[row], 1664525) + 1013904223;
          const randNorm = (lushDriftSeeds[row] >>> 0) / 4294967295;
          lushDriftTargets[row] =
            (randNorm * 2 - 1) * lushParams.analogDriftAmount;
          lushDriftTimers[row] = Math.max(
            1,
            Math.round(SAMPLE_RATE / Math.max(0.1, lushParams.driftSpeed)),
          );
        }
        lushDriftValues[row] +=
          (lushDriftTargets[row] - lushDriftValues[row]) * 0.0005;

        // Sub oscillator (only for frequencies below cutoff limit)
        if (lushParams.subEnabled && freq < lushParams.subCutoffLimit) {
          lushSubPhases[row] += TWO_PI * (freq * 0.5) * sampleRateRecip;
          if (lushSubPhases[row] > TWO_PI) lushSubPhases[row] -= TWO_PI;
          const subS =
            Math.sin(lushSubPhases[row]) *
            amplitude *
            tiltMul *
            lushParams.subLevel;
          lL += subS;
          lR += subS;
        }

        // Unison voice loop
        for (let v = 0; v < nV; v++) {
          const dc =
            nV === 1
              ? lushDriftValues[row]
              : (v / (nV - 1) - 0.5) * lushParams.detuneAmount +
                lushDriftValues[row];
          const vFreq = freq * 2 ** (dc / 1200);
          const phIdx = row * LUSH_MAX_UNISON + v;
          lushUnisonPhases[phIdx] += TWO_PI * vFreq * sampleRateRecip;
          if (lushUnisonPhases[phIdx] > TWO_PI)
            lushUnisonPhases[phIdx] -= TWO_PI;

          const vs =
            colorEngineV2Sample(
              lushUnisonPhases[phIdx],
              vFreq,
              sat,
              hue,
              detuneOffsets[row],
            ) *
            amplitude *
            tiltMul;

          // Equal power stereo spread
          const panPos =
            nV === 1
              ? 0.5
              : Math.max(
                  0,
                  Math.min(
                    1,
                    (v / (nV - 1) - 0.5) * lushParams.stereoSpread + 0.5,
                  ),
                );
          lL += vs * Math.sqrt(1.0 - panPos);
          lR += vs * Math.sqrt(panPos);
        }
      }

      // Apply master volume
      lL *= smoothVolume * 0.15;
      lR *= smoothVolume * 0.15;

      // Soft saturation (tanh + dry/wet mix)
      if (lushParams.satEnabled) {
        const dL = lL;
        const dR = lR;
        lL =
          Math.tanh(lL * lushParams.satDrive) * lushParams.satMix +
          dL * (1.0 - lushParams.satMix);
        lR =
          Math.tanh(lR * lushParams.satDrive) * lushParams.satMix +
          dR * (1.0 - lushParams.satMix);
      }

      // Global biquad filter
      if (lushParams.filterEnabled) {
        // L
        const fx1L = lushFilterStateL[0];
        const fx2L = lushFilterStateL[1];
        const fy1L = lushFilterStateL[2];
        const fy2L = lushFilterStateL[3];
        const outL =
          lushBiquadB0 * lL +
          lushBiquadB1 * fx1L +
          lushBiquadB2 * fx2L -
          lushBiquadA1 * fy1L -
          lushBiquadA2 * fy2L;
        lushFilterStateL[0] = lL;
        lushFilterStateL[1] = fx1L;
        lushFilterStateL[2] = outL;
        lushFilterStateL[3] = fy1L;
        if (!Number.isNaN(outL)) lL = outL;
        // R
        const fx1R = lushFilterStateR[0];
        const fx2R = lushFilterStateR[1];
        const fy1R = lushFilterStateR[2];
        const fy2R = lushFilterStateR[3];
        const outR =
          lushBiquadB0 * lR +
          lushBiquadB1 * fx1R +
          lushBiquadB2 * fx2R -
          lushBiquadA1 * fy1R -
          lushBiquadA2 * fy2R;
        lushFilterStateR[0] = lR;
        lushFilterStateR[1] = fx1R;
        lushFilterStateR[2] = outR;
        lushFilterStateR[3] = fy1R;
        if (!Number.isNaN(outR)) lR = outR;
      }

      // Chorus (two modulated delay taps, circular buffer)
      if (lushParams.chorusEnabled) {
        const modDepthSmp = lushParams.chorusModDepth * SAMPLE_RATE;
        const delayBaseSmp = lushParams.chorusDelay * SAMPLE_RATE;
        lushChorusLFOPhase += TWO_PI * lushParams.chorusRate * sampleRateRecip;
        if (lushChorusLFOPhase > TWO_PI) lushChorusLFOPhase -= TWO_PI;
        const tap1 = Math.max(
          1,
          Math.min(
            LUSH_CHORUS_BUF_SIZE - 1,
            Math.round(
              delayBaseSmp + Math.sin(lushChorusLFOPhase) * modDepthSmp,
            ),
          ),
        );
        const tap2 = Math.max(
          1,
          Math.min(
            LUSH_CHORUS_BUF_SIZE - 1,
            Math.round(
              delayBaseSmp +
                Math.sin(lushChorusLFOPhase + Math.PI) * modDepthSmp,
            ),
          ),
        );
        const r1 =
          (lushChorusWritePos - tap1 + LUSH_CHORUS_BUF_SIZE) %
          LUSH_CHORUS_BUF_SIZE;
        const r2 =
          (lushChorusWritePos - tap2 + LUSH_CHORUS_BUF_SIZE) %
          LUSH_CHORUS_BUF_SIZE;
        lushChorusBufL[lushChorusWritePos] = lL;
        lushChorusBufR[lushChorusWritePos] = lR;
        const dL = lushChorusBufL[r1] * 0.7 + lushChorusBufR[r2] * 0.3;
        const dR = lushChorusBufR[r1] * 0.3 + lushChorusBufL[r2] * 0.7;
        lL = lL * (1.0 - lushParams.chorusMix) + dL * lushParams.chorusMix;
        lR = lR * (1.0 - lushParams.chorusMix) + dR * lushParams.chorusMix;
        lushChorusWritePos = (lushChorusWritePos + 1) % LUSH_CHORUS_BUF_SIZE;
      }

      // Piano body resonance (3 parallel bandpass filters: 110, 440, 2200 Hz)
      if (lushParams.bodyResEnabled) {
        let resL = 0;
        let resR = 0;
        for (let ri = 0; ri < 3; ri++) {
          const b0 = lushBodyB0[ri];
          const b2 = lushBodyB2[ri];
          const a1 = lushBodyA1[ri];
          const a2 = lushBodyA2[ri];
          const si = ri * 4;
          // L channel
          const rx1L = lushBodyResL[si];
          const rx2L = lushBodyResL[si + 1];
          const ry1L = lushBodyResL[si + 2];
          const ry2L = lushBodyResL[si + 3];
          const oRL = b0 * lL + b2 * rx2L - a1 * ry1L - a2 * ry2L;
          lushBodyResL[si] = lL;
          lushBodyResL[si + 1] = rx1L;
          lushBodyResL[si + 2] = oRL;
          lushBodyResL[si + 3] = ry1L;
          if (!Number.isNaN(oRL)) resL += oRL;
          // R channel
          const rx1R = lushBodyResR[si];
          const rx2R = lushBodyResR[si + 1];
          const ry1R = lushBodyResR[si + 2];
          const ry2R = lushBodyResR[si + 3];
          const oRR = b0 * lR + b2 * rx2R - a1 * ry1R - a2 * ry2R;
          lushBodyResR[si] = lR;
          lushBodyResR[si + 1] = rx1R;
          lushBodyResR[si + 2] = oRR;
          lushBodyResR[si + 3] = ry1R;
          if (!Number.isNaN(oRR)) resR += oRR;
        }
        lL = lL + resL * lushParams.bodyResGain;
        lR = lR + resR * lushParams.bodyResGain;
      }

      outputL[i] = lL;
      outputR[i] = lR;
    } else {
      // ═══════════════════════════════════════════════════════════════
      // ORIGINAL SYNTHESIS PATH (unchanged)
      // ═══════════════════════════════════════════════════════════════
      let sample = 0;

      for (let row = 0; row < maxRows; row++) {
        const amp = getInterpolatedAmplitude(colPos, row);
        if (amp < 0.001) {
          const freq = freqBands[row];
          phaseAccumulators[row] += TWO_PI * freq * sampleRateRecip;
          if (phaseAccumulators[row] > TWO_PI) phaseAccumulators[row] -= TWO_PI;
          continue;
        }

        const amplitude = amp * amp;
        const freq = freqBands[row];
        const hue = colHueNorm[row];
        const sat = colSaturation[row];

        phaseAccumulators[row] += TWO_PI * freq * sampleRateRecip;
        if (phaseAccumulators[row] > TWO_PI) phaseAccumulators[row] -= TWO_PI;

        const rowSample = colorEngineV2Sample(
          phaseAccumulators[row],
          freq,
          sat,
          hue,
          detuneOffsets[row],
        );
        const tiltMul = tiltMultipliers[row] || 1;

        let driftMul = 1;
        if (audioParams.driftEnabled) {
          const emphasis =
            1 + audioParams.highHarmonicEmphasis * (row / (ROWS - 1));
          driftMul = 1 + driftValues[row] * audioParams.driftAmount * emphasis;
        }

        sample += rowSample * amplitude * tiltMul * driftMul;
      }

      if (audioParams.subHarmonicEnabled && !audioParams.masterBypass) {
        const subFreq = freqBands[0] * 0.5;
        phaseAccumulators[ROWS] =
          (phaseAccumulators[ROWS] || 0) + TWO_PI * subFreq * sampleRateRecip;
        if (phaseAccumulators[ROWS] > TWO_PI) phaseAccumulators[ROWS] -= TWO_PI;
        const lowSum = (cellData[0] + cellData[3] + cellData[6]) / 3;
        sample += Math.sin(phaseAccumulators[ROWS]) * lowSum * 0.5;
      }

      if (audioParams.softSaturation && !audioParams.masterBypass) {
        sample = Math.tanh(sample * 1.5) / 1.5;
      }

      if (audioParams.distortionEnabled && !audioParams.masterBypass) {
        const drive = audioParams.distortionDrive;
        if (audioParams.distortionClip === "soft") {
          sample = Math.tanh(sample * drive);
        } else {
          sample = Math.max(-1, Math.min(1, sample * drive));
        }
      }

      sample *= smoothVolume * 0.15;

      if (audioParams.stereoMode) {
        outputL[i] = sample;
        outputR[i] = sample * 0.98 + (outputL[i - 1] ?? sample) * 0.02;
      } else {
        outputL[i] = sample;
        outputR[i] = sample;
      }
    }

    samplePosition++;
    if (samplePosition >= LOOP_SAMPLES) {
      samplePosition = 0;
      if (!audioParams.masterBypass) {
        for (let r = 0; r < maxRows; r++) {
          resonatorAmp[r] = cellData[(0 * ROWS + r) * 3] * 0.5;
        }
      }
    }
  }

  noiseReadPos = (noiseReadPos + bufLen) % NOISE_BUF_SIZE;

  if (audioParams.seqEnabled && !audioParams.masterBypass) {
    const divMap: Record<string, number> = {
      "1/4": 1,
      "1/8": 0.5,
      "1/16": 0.25,
      "1/32": 0.125,
    };
    const beats = divMap[audioParams.seqDivision] || 0.5;
    const samplesPerStep = (60 / audioParams.bpm) * beats * SAMPLE_RATE;
    seqSampleCounter += bufLen;
    if (seqSampleCounter >= samplesPerStep) {
      seqSampleCounter = 0;
      seqCurrentStep = (seqCurrentStep + 1) % audioParams.seqStepCount;
    }
    const targetVal = seqStepsData[seqCurrentStep] || 0;
    for (let r = 0; r < maxRows; r++) {
      seqModValues[r] += (targetVal - seqModValues[r]) * 0.1;
    }
  }
}

export function updateDriftLFO(deltaMs: number) {
  if (!audioParams.driftEnabled) return;
  const TWO_PI = 6.283185307;
  driftLFOPhase += audioParams.driftSpeed * (deltaMs / 1000) * TWO_PI;
  if (driftLFOPhase > TWO_PI) driftLFOPhase -= TWO_PI;
  for (let row = 0; row < ROWS; row++) {
    let target = 0;
    switch (audioParams.driftMode) {
      case "sine":
        target = Math.sin(driftLFOPhase + row * 0.1) * 0.5;
        break;
      case "random": {
        const ni = (row + Math.floor(driftLFOPhase * 10)) % NOISE_BUF_SIZE;
        target = noiseBuf[Math.abs(ni)] * 0.3;
        break;
      }
      case "chaos":
        target =
          Math.sin(driftLFOPhase * 2.1 + row * 0.3) *
          Math.cos(driftLFOPhase * 1.7 - row * 0.2) *
          0.4;
        break;
    }
    driftValues[row] += (target - driftValues[row]) * 0.02;
  }
}

export function scheduleRebuild() {
  if (rebuildScheduled) return;
  const now = performance.now();
  const minInterval = audioParams.lowCpuMode ? 500 : 125;
  const elapsed = now - lastRebuildTime;
  if (elapsed >= minInterval) {
    doRebuild();
  } else {
    rebuildScheduled = true;
    setTimeout(() => {
      rebuildScheduled = false;
      doRebuild();
    }, minInterval - elapsed);
  }
}

function doRebuild() {
  lastRebuildTime = performance.now();
  for (let col = 0; col < COLS; col++) {
    if (dirtyColumnsData[col]) {
      for (let row = 0; row < ROWS; row++) {
        wavetableFrames[col * ROWS + row] = cellData[(col * ROWS + row) * 3];
      }
      dirtyColumnsData[col] = 0;
    }
  }
}

export async function initAudio(): Promise<void> {
  if (audioInitialized) return;
  initNoise();
  initDetuneOffsets();
  updateTiltMultipliers(0);
  initLushEngine();

  audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  scriptNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 0, 2);
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1.0;
  scriptNode.onaudioprocess = processAudio;
  scriptNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  audioInitialized = true;
}

export async function resumeAudio(): Promise<void> {
  if (!audioCtx) await initAudio();
  if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
}

export function play() {
  audioParams.isPlaying = true;
}
export function pause() {
  audioParams.isPlaying = false;
}
export function stop() {
  audioParams.isPlaying = false;
  samplePosition = 0;
}
export function resetPlayhead() {
  samplePosition = 0;
}
export function getPlayheadFraction(): number {
  return samplePosition / LOOP_SAMPLES;
}

export function panicReset() {
  for (let i = 0; i < MAX_HARMONICS; i++) driftValues[i] = 0;
  for (let i = 0; i < 32; i++) seqModValues[i] = 0;
  driftLFOPhase = 0;
  seqCurrentStep = 0;
  seqSampleCounter = 0;
  // Reset lush state
  lushFilterStateL.fill(0);
  lushFilterStateR.fill(0);
  lushBodyResL.fill(0);
  lushBodyResR.fill(0);
  lushChorusBufL.fill(0);
  lushChorusBufR.fill(0);
  lushChorusWritePos = 0;
}

export function randomizePhases() {
  let x = Math.floor(Math.random() * 0x7fffffff);
  for (let i = 0; i < MAX_HARMONICS; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    phaseAccumulators[i] = (x / 0x7fffffff) * 6.283185307;
  }
}

export async function exportWav(
  cellDataSnapshot: Float32Array,
  params: typeof audioParams,
): Promise<Blob> {
  const offlineCtx = new OfflineAudioContext(2, LOOP_SAMPLES, SAMPLE_RATE);
  const buffer = offlineCtx.createBuffer(2, LOOP_SAMPLES, SAMPLE_RATE);
  const channelL = buffer.getChannelData(0);
  const channelR = buffer.getChannelData(1);
  const localPhase = new Float32Array(ROWS);
  const TWO_PI = 6.283185307;
  const sampleRecip = 1 / SAMPLE_RATE;
  for (let s = 0; s < LOOP_SAMPLES; s++) {
    const colPos = (s / LOOP_SAMPLES) * COLS;
    const col0 = Math.floor(colPos) % COLS;
    const col1 = (col0 + 1) % COLS;
    const t = colPos - col0;
    let sample = 0;
    for (let row = 0; row < ROWS; row++) {
      const amp0 = cellDataSnapshot[(col0 * ROWS + row) * 3];
      const amp1 = cellDataSnapshot[(col1 * ROWS + row) * 3];
      const amp = amp0 * (1 - t) + amp1 * t;
      if (amp < 0.001) {
        localPhase[row] += TWO_PI * freqBands[row] * sampleRecip;
        if (localPhase[row] > TWO_PI) localPhase[row] -= TWO_PI;
        continue;
      }
      localPhase[row] += TWO_PI * freqBands[row] * sampleRecip;
      if (localPhase[row] > TWO_PI) localPhase[row] -= TWO_PI;
      const hue = cellDataSnapshot[(col0 * ROWS + row) * 3 + 1];
      const sat = cellDataSnapshot[(col0 * ROWS + row) * 3 + 2];
      sample += Math.sin(localPhase[row]) * amp * amp;
      if (hue > 0.1)
        sample += Math.sin(2 * localPhase[row]) * amp * amp * sat * 0.5;
    }
    sample *= params.masterVolume * 0.15;
    channelL[s] = sample;
    channelR[s] = sample;
  }
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  const numChannels = 2;
  const sampleCount = rendered.length;
  const wavBuffer = new ArrayBuffer(44 + sampleCount * numChannels * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * numChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, sampleCount * numChannels * 2, true);
  let offset = 44;
  const lData = rendered.getChannelData(0);
  const rData = rendered.getChannelData(1);
  for (let i = 0; i < sampleCount; i++) {
    const lSample = Math.max(-1, Math.min(1, lData[i]));
    const rSample = Math.max(-1, Math.min(1, rData[i]));
    view.setInt16(offset, lSample * 0x7fff, true);
    offset += 2;
    view.setInt16(offset, rSample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([wavBuffer], { type: "audio/wav" });
}

export { audioCtx };

// Suppress unused variable warnings
void noiseSeededBuf;
void resonatorPhase;
void resonatorDecay;
void resonatorAmp;
void wavetableFrames;
void seqModValues;
void mixBuf;
void colAmplitudes;
void smoothSpread;
void smoothCenterShift;
void smoothDrive;

// ─── HQ Audio Params ──────────────────────────────────────────────────────────
export const oscEnvelopeTime = new Float32Array(MAX_HARMONICS);
export const hqTiltMul = new Float32Array(MAX_HARMONICS);

export const hqAudioParams = {
  hqModeEnabled: false,
  hqSpectralTiltComp: true,
  hqTiltStrength: -0.3,
  hqTemporalEnvSmoothing: true,
  hqEnvelopeAttack: 0.005,
  hqEnvelopeDecay: 0.06,
  hqPhaseSpread: 0.06,
  hqPeakPartialRendering: true,
  hqPartialThreshold: 0.05,
  hqFrameInterpolation: true,
};

export function setHqAudioParams(p: Partial<typeof hqAudioParams>) {
  Object.assign(hqAudioParams, p);
  if (hqAudioParams.hqModeEnabled && hqAudioParams.hqSpectralTiltComp) {
    for (let row = 0; row < MAX_HARMONICS; row++) {
      const freq = freqBands[row] || 40;
      hqTiltMul[row] = (freq / 1000) ** hqAudioParams.hqTiltStrength;
    }
  } else {
    for (let row = 0; row < MAX_HARMONICS; row++) hqTiltMul[row] = 1;
  }
}

export function randomizePhasesWithSpread(spread: number) {
  let x = Math.floor(Math.random() * 0x7fffffff);
  for (let i = 0; i < MAX_HARMONICS; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    const base = (x / 0x7fffffff) * 6.283185307;
    const s2 = (x ^ (x << 5)) & 0x7fffffff;
    const spreadVal = (s2 / 0x7fffffff) * 2 * spread - spread;
    phaseAccumulators[i] = base + spreadVal;
  }
}
