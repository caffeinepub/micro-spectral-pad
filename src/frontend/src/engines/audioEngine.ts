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

// All preallocated - NEVER recreate
const phaseAccumulators = new Float32Array(MAX_HARMONICS);
const detuneOffsets = new Float32Array(MAX_HARMONICS); // cents, static
const noiseBuf = new Float32Array(NOISE_BUF_SIZE);
const noiseSeededBuf = new Float32Array(NOISE_BUF_SIZE);
const colAmplitudes = new Float32Array(MAX_HARMONICS);
const colHueNorm = new Float32Array(MAX_HARMONICS);
const colSaturation = new Float32Array(MAX_HARMONICS);
const mixBuf = new Float32Array(BUFFER_SIZE);
const driftValues = new Float32Array(MAX_HARMONICS); // smoothed drift per harmonic
const tiltMultipliers = new Float32Array(MAX_HARMONICS);
const seqModValues = new Float32Array(32); // smoothed sequencer values

// Resonator state (for resonator mode)
const resonatorPhase = new Float32Array(MAX_HARMONICS);
const resonatorAmp = new Float32Array(MAX_HARMONICS);
const resonatorDecay = new Float32Array(MAX_HARMONICS);

// Wavetable frames
const wavetableFrames = new Float32Array(COLS * MAX_HARMONICS); // column * row

// Module state (outside audio loop)
let driftLFOPhase = 0;

let samplePosition = 0; // current sample in loop (0 to LOOP_SAMPLES-1)
let noiseReadPos = 0;
let lastRebuildTime = 0;
let rebuildScheduled = false;
let audioInitialized = false;
let seqCurrentStep = 0;
let seqSampleCounter = 0;

// Smoothed parameter values (avoid zipper noise)
let smoothVolume = 0.7;
let smoothSpread = 0.3;
let smoothTilt = 0;
let smoothCenterShift = 0;
let smoothDrive = 1.0;

// Module parameter refs (updated from store, read by audio loop)
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

// Initialize noise buffers once
function initNoise() {
  let x = 1234567;
  for (let i = 0; i < NOISE_BUF_SIZE; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    noiseBuf[i] = (x / 0x7fffffff) * 2 - 1;
  }
}

// Initialize detune offsets once
function initDetuneOffsets() {
  let x = 7654321;
  for (let i = 0; i < MAX_HARMONICS; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    // ±3 to 7 cents
    detuneOffsets[i] = ((x / 0x7fffffff) * 10 - 5) * 0.001; // in ratio: cents/1200*log(2)
  }
}

// Initialize tilt multipliers cache
function updateTiltMultipliers(tilt: number) {
  for (let row = 0; row < ROWS; row++) {
    const t = tilt / 100;
    if (t === 0) {
      tiltMultipliers[row] = 1;
    } else if (t > 0) {
      // Bright: boost high frequencies
      tiltMultipliers[row] = 1 + t * (row / (ROWS - 1));
    } else {
      // Dark: boost low frequencies
      tiltMultipliers[row] = 1 + -t * (1 - row / (ROWS - 1));
    }
  }
}

// Color Engine V2: continuous morph between 4 oscillator types
// Returns sample value for given phase, frequency, saturation, hueNorm
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
  const TWO_PI = 6.283185307;

  switch (seg) {
    case 0: {
      // Pure Sine → Additive Harmonic
      oscA = Math.sin(phase);
      oscB =
        Math.sin(phase) +
        saturation * 0.6 * Math.sin(2 * phase) +
        saturation * 0.3 * Math.sin(3 * phase);
      break;
    }
    case 1: {
      // Additive Harmonic → Detuned Dual
      oscA =
        Math.sin(phase) +
        saturation * 0.6 * Math.sin(2 * phase) +
        saturation * 0.3 * Math.sin(3 * phase);
      const detuneRatio = 1 + saturation * detuneFactor;
      oscB = Math.sin(phase) + Math.sin(phase * detuneRatio);
      break;
    }
    case 2: {
      // Detuned Dual → Simple FM
      const detuneRatio = 1 + saturation * detuneFactor;
      oscA = Math.sin(phase) + Math.sin(phase * detuneRatio);
      const fmIndex = saturation * 1.5;
      oscB = Math.sin(phase + fmIndex * Math.sin(2 * phase));
      break;
    }
    case 3: {
      // Simple FM → Pure Sine
      const fmIndex = saturation * 1.5;
      oscA = Math.sin(phase + fmIndex * Math.sin(2 * phase));
      oscB = Math.sin(phase);
      break;
    }
  }

  // Suppress unused variable warning
  void freq;
  void TWO_PI;

  return (1 - localT) * oscA + localT * oscB;
}

// Get interpolated cell amplitude for a given column position
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

// The main audio process callback - ZERO allocations allowed
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

  // Per-block calculations (outside sample loop)
  const tiltChanged = Math.abs(smoothTilt - audioParams.spectralTilt) > 0.01;
  if (tiltChanged) {
    smoothTilt += (audioParams.spectralTilt - smoothTilt) * 0.1;
    updateTiltMultipliers(smoothTilt);
  }

  // Smooth volume
  smoothVolume += (audioParams.masterVolume - smoothVolume) * 0.05;

  for (let i = 0; i < bufLen; i++) {
    // Advance sample position
    const colPos = (samplePosition / LOOP_SAMPLES) * colRange;

    let sample = 0;

    // Synthesize each row
    for (let row = 0; row < maxRows; row++) {
      const amp = getInterpolatedAmplitude(colPos, row);
      if (amp < 0.001) {
        // Advance phase but skip computation
        const freq = freqBands[row];
        phaseAccumulators[row] += TWO_PI * freq * sampleRateRecip;
        if (phaseAccumulators[row] > TWO_PI) phaseAccumulators[row] -= TWO_PI;
        continue;
      }

      const amplitude = amp * amp; // amplitude squared
      const freq = freqBands[row];
      const hue = colHueNorm[row];
      const sat = colSaturation[row];

      // Advance phase
      phaseAccumulators[row] += TWO_PI * freq * sampleRateRecip;
      if (phaseAccumulators[row] > TWO_PI) phaseAccumulators[row] -= TWO_PI;

      // Color Engine V2
      const rowSample = colorEngineV2Sample(
        phaseAccumulators[row],
        freq,
        sat,
        hue,
        detuneOffsets[row],
      );

      // Apply tilt
      const tiltMul = tiltMultipliers[row] || 1;

      // Apply drift
      let driftMul = 1;
      if (audioParams.driftEnabled) {
        const emphasis =
          1 + audioParams.highHarmonicEmphasis * (row / (ROWS - 1));
        driftMul = 1 + driftValues[row] * audioParams.driftAmount * emphasis;
      }

      sample += rowSample * amplitude * tiltMul * driftMul;
    }

    // Sub harmonic
    if (audioParams.subHarmonicEnabled && !audioParams.masterBypass) {
      const subFreq = freqBands[0] * 0.5;
      phaseAccumulators[ROWS] =
        (phaseAccumulators[ROWS] || 0) + TWO_PI * subFreq * sampleRateRecip;
      if (phaseAccumulators[ROWS] > TWO_PI) phaseAccumulators[ROWS] -= TWO_PI;
      const lowSum = (cellData[0] + cellData[3] + cellData[6]) / 3;
      sample += Math.sin(phaseAccumulators[ROWS]) * lowSum * 0.5;
    }

    // Soft saturation
    if (audioParams.softSaturation && !audioParams.masterBypass) {
      sample = Math.tanh(sample * 1.5) / 1.5;
    }

    // Distortion zone
    if (audioParams.distortionEnabled && !audioParams.masterBypass) {
      const drive = audioParams.distortionDrive;
      if (audioParams.distortionClip === "soft") {
        sample = Math.tanh(sample * drive);
      } else {
        sample = Math.max(-1, Math.min(1, sample * drive));
      }
    }

    // Apply master volume
    sample *= smoothVolume * 0.15; // scale down to avoid clipping

    // Stereo
    if (audioParams.stereoMode) {
      outputL[i] = sample;
      outputR[i] = sample * 0.98 + outputL[i - 1] * 0.02 || sample;
    } else {
      outputL[i] = sample;
      outputR[i] = sample;
    }

    // Advance loop position
    samplePosition++;
    if (samplePosition >= LOOP_SAMPLES) {
      samplePosition = 0;
      // Trigger resonator excitation on loop restart
      if (!audioParams.masterBypass) {
        for (let r = 0; r < maxRows; r++) {
          resonatorAmp[r] = cellData[(0 * ROWS + r) * 3] * 0.5;
        }
      }
    }
  }

  // Update noise read position
  noiseReadPos = (noiseReadPos + bufLen) % NOISE_BUF_SIZE;

  // Update sequencer
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
    // Apply sequencer smoothing to seqModValues
    const targetVal = seqStepsData[seqCurrentStep] || 0;
    for (let r = 0; r < maxRows; r++) {
      seqModValues[r] += (targetVal - seqModValues[r]) * 0.1;
    }
  }
}

// Update drift values from LFO (called from RAF, not audio callback)
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
        // Use noise buffer for random walk
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
    // Smooth drift values
    driftValues[row] += (target - driftValues[row]) * 0.02;
  }
}

// Schedule audio rebuild (throttled to max 8/sec)
export function scheduleRebuild() {
  if (rebuildScheduled) return;
  const now = performance.now();
  const minInterval = audioParams.lowCpuMode ? 500 : 125; // 2/sec or 8/sec
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
  // Build wavetable frames for dirty columns
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

  audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });

  // ScriptProcessorNode for broad compatibility
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
  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
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
  // Reset all modulation state
  for (let i = 0; i < MAX_HARMONICS; i++) {
    driftValues[i] = 0;
  }
  for (let i = 0; i < 32; i++) {
    seqModValues[i] = 0;
  }
  driftLFOPhase = 0;
  seqCurrentStep = 0;
  seqSampleCounter = 0;
}

export function randomizePhases() {
  let x = Math.floor(Math.random() * 0x7fffffff);
  for (let i = 0; i < MAX_HARMONICS; i++) {
    x = (x ^ (x << 13) ^ (x >> 7) ^ (x << 17)) & 0x7fffffff;
    phaseAccumulators[i] = (x / 0x7fffffff) * 6.283185307;
  }
}

// Export WAV using OfflineAudioContext
export async function exportWav(
  cellDataSnapshot: Float32Array,
  params: typeof audioParams,
): Promise<Blob> {
  const offlineCtx = new OfflineAudioContext(2, LOOP_SAMPLES, SAMPLE_RATE);

  // Create buffer source for offline render
  const buffer = offlineCtx.createBuffer(2, LOOP_SAMPLES, SAMPLE_RATE);
  const channelL = buffer.getChannelData(0);
  const channelR = buffer.getChannelData(1);

  // Simple additive synthesis for export (no ScriptProcessor in offline context)
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
      // Add harmonic complexity based on hue
      if (hue > 0.1) {
        sample += Math.sin(2 * localPhase[row]) * amp * amp * sat * 0.5;
      }
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

  // Convert to WAV
  const numChannels = 2;
  const sampleCount = rendered.length;
  const wavBuffer = new ArrayBuffer(44 + sampleCount * numChannels * 2);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
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
