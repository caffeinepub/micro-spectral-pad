/**
 * Chord Engine - chord/progression logic
 * All interval tables precomputed, no dynamic allocation per frame
 */

// Precomputed chord interval tables (semitones from root)
export const CHORD_INTERVALS: Record<string, number[]> = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Diminished: [0, 3, 6],
  Augmented: [0, 4, 8],
  Sus2: [0, 2, 7],
  Sus4: [0, 5, 7],
  "Major 7": [0, 4, 7, 11],
  "Minor 7": [0, 3, 7, 10],
  "Dominant 7": [0, 4, 7, 10],
  "Minor Major 7": [0, 3, 7, 11],
  "Diminished 7": [0, 3, 6, 9],
  "Half Diminished": [0, 3, 6, 10],
  Add9: [0, 4, 7, 14],
  "Minor Add9": [0, 3, 7, 14],
  "Major 9": [0, 4, 7, 11, 14],
  "Minor 9": [0, 3, 7, 10, 14],
  "Dominant 9": [0, 4, 7, 10, 14],
  "6": [0, 4, 7, 9],
  "Minor 6": [0, 3, 7, 9],
  "Power Chord": [0, 7],
  Quartal: [0, 5, 10],
  Cluster: [0, 1, 2, 3],
};

// Scale intervals (semitones)
export const SCALE_INTERVALS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor": [0, 2, 3, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Root note to MIDI note number (octave 4)
export const ROOT_NOTES: Record<string, number> = {
  C: 60,
  "C#": 61,
  D: 62,
  "D#": 63,
  E: 64,
  F: 65,
  "F#": 66,
  G: 67,
  "G#": 68,
  A: 69,
  "A#": 70,
  B: 71,
};

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// Progression presets (scale degree indices)
export const PROGRESSIONS: Record<string, number[]> = {
  "I–IV–V–I": [0, 3, 4, 0],
  "I–V–vi–IV": [0, 4, 5, 3],
  "ii–V–I": [1, 4, 0],
  "i–VI–III–VII": [0, 5, 2, 6],
  "i–iv–v": [0, 3, 4],
  "I–vi–IV–V": [0, 5, 3, 4],
  "12 Bar Blues": [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 0],
  "vi–IV–I–V": [5, 3, 0, 4],
  "i–bVII–bVI–bVII": [0, 6, 5, 6],
};

// Roman numeral labels for display
export const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const ROMAN_NUMERALS_LOWER = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function getChordNotes(
  root: string,
  octave: number,
  chordType: string,
  inversion: string,
  spread: number,
  voiceCount: number,
  voiceStacking: "closed" | "open" | "drop2",
): number[] {
  const baseNote = (ROOT_NOTES[root] || 60) + (octave - 4) * 12;
  const intervals = CHORD_INTERVALS[chordType] || [0, 4, 7];

  let notes = intervals.slice(0, voiceCount).map((i) => baseNote + i);

  // Apply inversion
  switch (inversion) {
    case "1st":
      if (notes.length > 1) {
        notes = [...notes.slice(1), notes[0] + 12];
      }
      break;
    case "2nd":
      if (notes.length > 2) {
        notes = [...notes.slice(2), notes[0] + 12, notes[1] + 12];
      }
      break;
    case "3rd":
      if (notes.length > 3) {
        notes = [
          ...notes.slice(3),
          notes[0] + 12,
          notes[1] + 12,
          notes[2] + 12,
        ];
      }
      break;
  }

  // Apply voice stacking
  if (voiceStacking === "open") {
    notes = notes.map((n, i) => n + (i % 2 === 1 ? 12 : 0));
  } else if (voiceStacking === "drop2" && notes.length >= 4) {
    const secondHighest = notes[notes.length - 2];
    notes[notes.length - 2] = secondHighest - 12;
  }

  // Apply spread
  if (spread > 0) {
    notes = notes.map((n, i) => n + Math.floor((i * spread) / 12));
  }

  return notes.slice(0, voiceCount);
}

export function getChordName(
  root: string,
  chordType: string,
  inversion: string,
): string {
  const typeAbbrev: Record<string, string> = {
    Major: "maj",
    Minor: "m",
    Diminished: "dim",
    Augmented: "aug",
    Sus2: "sus2",
    Sus4: "sus4",
    "Major 7": "maj7",
    "Minor 7": "m7",
    "Dominant 7": "7",
    "Minor Major 7": "mM7",
    "Diminished 7": "dim7",
    "Half Diminished": "ø7",
    Add9: "add9",
    "Minor Add9": "madd9",
    "Major 9": "maj9",
    "Minor 9": "m9",
    "Dominant 9": "9",
    "6": "6",
    "Minor 6": "m6",
    "Power Chord": "5",
    Quartal: "qrt",
    Cluster: "clst",
  };

  const abbrev = typeAbbrev[chordType] || chordType;
  const invText = inversion !== "Root" ? `/${inversion}` : "";
  return `${root}${abbrev}${invText}`;
}

export function getProgressionChords(
  progressionPreset: string,
  root: string,
  scale: string,
  _chordType: string,
): string[] {
  const degrees = PROGRESSIONS[progressionPreset] || [0, 3, 4, 0];
  const scaleNotes = SCALE_INTERVALS[scale] || SCALE_INTERVALS.Major;
  const rootMidi = ROOT_NOTES[root] || 60;

  return degrees.map((degree) => {
    const semitone = scaleNotes[degree % scaleNotes.length];
    const noteIndex = (((rootMidi - 60 + semitone) % 12) + 12) % 12;
    return NOTE_NAMES[noteIndex];
  });
}

export function getActiveNoteMidi(
  root: string,
  octave: number,
  chordType: string,
  inversion: string,
  spread: number,
  voiceCount: number,
  voiceStacking: "closed" | "open" | "drop2",
): number[] {
  return getChordNotes(
    root,
    octave,
    chordType,
    inversion,
    spread,
    voiceCount,
    voiceStacking,
  );
}

export function noteMidiToKeyIndex(midi: number): number {
  return midi % 12;
}

export function getScaleDegreeLabel(degree: number, isMinor: boolean): string {
  const upper = ROMAN_NUMERALS[degree % 7] || "I";
  return isMinor ? upper.toLowerCase() : upper;
}

// Precompute just intonation ratios
export const JUST_INTONATION_RATIOS = [
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

export function applyMicroTuning(
  freq: number,
  noteIndex: number,
  scale: "equal" | "just" | "custom",
  customRatios: number[],
): number {
  if (scale === "equal") return freq;

  const ratios = scale === "just" ? JUST_INTONATION_RATIOS : customRatios;
  const octave = Math.floor(noteIndex / 12);
  const chromatic = noteIndex % 12;
  const ratio = ratios[chromatic] || 1;

  // Apply ratio relative to equal temperament
  const equalFreq = 440 * 2 ** ((noteIndex - 69) / 12);
  const justFreq = 440 * 2 ** octave * ratio;
  const correction = justFreq / equalFreq;

  return freq * correction;
}
