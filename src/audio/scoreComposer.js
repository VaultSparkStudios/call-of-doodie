// Original scores: musical events are independent of the audio device and clock.
// Each score has a 32-bar arrangement, eight chords, and its own rhythm language.
export const SCORE_PROFILES = {
  classic: { title: "Porcelain Pursuit", bpm: 116, root: 45, swing: 0.09, progression: [0, 0, 5, 7, 0, 3, 5, 7], chord: [0, 3, 7, 10] },
  operations: { title: "Blackwater Dispatch", bpm: 126, root: 38, swing: 0, progression: [0, 0, 8, 8, 5, 5, 7, 7], chord: [0, 7, 12, 14] },
  zombies: { title: "The Drain Waltz", bpm: 94, root: 40, swing: 0.18, progression: [0, 1, 0, 6, 0, 8, 1, 0], chord: [0, 3, 6, 11] },
};
const VIBES = new Set(["chill", "action", "intense", "retro", "spooky"]);
export function normalizeScoreMode(mode) {
  if (["zombies", "sewer-zombies", "sewer_zombies"].includes(mode)) return "zombies";
  return mode === "operations" || mode === "operation" ? "operations" : "classic";
}
export function normalizeScoreVibe(vibe) { return VIBES.has(vibe) ? vibe : "action"; }
export function scoreBPM({ mode = "classic", vibe = "action", boss = false } = {}) {
  const base = SCORE_PROFILES[normalizeScoreMode(mode)].bpm;
  return base + (boss ? 10 : vibe === "chill" ? -18 : vibe === "intense" ? 14 : vibe === "spooky" ? -8 : 0);
}
export function midiHz(note) { return 440 * 2 ** ((note - 69) / 12); }

export function composeScoreStep(step, state = {}) {
  const mode = normalizeScoreMode(state.mode);
  const vibe = normalizeScoreVibe(state.vibe);
  const profile = SCORE_PROFILES[mode];
  const bar = Math.floor(step / 16);
  const s = step % 16;
  const section = Math.floor(bar / 8) % 4; // establish → develop → breakdown → climax
  const tier = Math.max(0, Math.min(2, Number(state.tier) || 0));
  const energy = Math.max(0, Math.min(3, tier + (state.boss ? 1 : 0) + (vibe === "intense" ? 1 : vibe === "chill" ? -1 : 0)));
  const root = profile.root + profile.progression[bar % 8];
  const events = [];
  const add = (instrument, note, length, volume, pan = 0, offset = 0) => events.push({ instrument, note, length, volume, pan, offset });
  const breakdown = section === 2 && !state.boss && energy < 2;
  const swing = s % 2 === 1 ? profile.swing : 0;
  const kickSteps = mode === "classic" ? [0, 6, 8, 11] : mode === "operations" ? [0, 3, 8, 10] : [0, 7, 10];
  if ((!breakdown || s === 0) && (kickSteps.includes(s) || energy >= 2 && [4, 12].includes(s))) add("kick", 0, 1, 0.12);
  const snareSteps = mode === "zombies" ? [6, 14] : [4, 12];
  if (!breakdown && snareSteps.includes(s)) add(mode === "operations" ? "metal" : "snare", 0, 0.7, 0.062, -0.1);
  if (!breakdown && (s % 2 === 0 || energy >= 2)) add("hat", 0, s === 14 ? 0.55 : 0.18, s % 4 === 0 ? 0.025 : 0.012, s % 4 === 0 ? 0.28 : -0.28, swing);
  if (mode === "operations" && s % 4 === 2) add("metal", 0, 0.3, 0.017, 0.35);
  const bassSteps = mode === "classic" ? [0, 3, 6, 8, 11, 14] : mode === "operations" ? [0, 2, 3, 6, 8, 10, 11, 14] : [0, 5, 7, 10, 13];
  if (bassSteps.includes(s) && (!breakdown || s === 0 || s === 8)) {
    const interval = s >= 14 ? 7 : s === 11 || s === 13 ? (mode === "zombies" ? 1 : 10) : s === 6 || s === 7 ? 7 : 0;
    add("bass", root + interval, mode === "zombies" ? 2 : 1.35, 0.058, 0, swing);
  }
  if (s === 0) profile.chord.forEach((interval, index) => add("pad", root + 24 + interval, breakdown ? 15 : 12, breakdown ? 0.017 : 0.01, (index - 1.5) * 0.32));
  // Melodic call and response develops across eight bars, rather than repeating a beat loop.
  const motifs = {
    classic: [[12, null, 15, 19, null, 17, 15, 10], [19, 22, null, 19, 17, null, 15, 12]],
    operations: [[12, 19, null, 14, 12, null, 19, 26], [24, null, 19, 14, 17, 19, null, 12]],
    zombies: [[24, null, 23, 18, null, 15, 13, null], [12, 13, null, 18, 23, null, 24, 11]],
  };
  if (s % 2 === 0 && (section !== 0 || bar % 2 === 0) && (!breakdown || s % 4 === 0)) {
    const motif = motifs[mode][bar % 4 >= 2 ? 1 : 0];
    const note = motif[s / 2];
    if (note != null) add(vibe === "retro" ? "chip" : mode === "zombies" ? "bell" : "lead", root + 12 + note, mode === "zombies" ? 3.4 : 1.2, 0.026, s < 8 ? -0.22 : 0.22);
  }
  if ((energy >= 1 || section === 3) && s % 2 === 1 && !breakdown) add("pluck", root + 24 + profile.chord[(Math.floor(s / 2) + bar) % 4], 0.65, 0.015, s % 4 === 1 ? -0.5 : 0.5, swing);
  if (bar % 8 === 7 && s >= 12 && !breakdown) add("snare", 0, 0.32, 0.02 + (s - 12) * 0.009, (s - 13.5) * 0.15);
  if (s === 0 && bar % 8 === 0 && bar > 0) add("crash", 0, 6, 0.035, 0.2);
  if (mode === "zombies" && bar % 4 === 3 && s === 13) add("groan", root + 24, 2.8, 0.023, -0.4);
  return { events, section, bar, energy, bpm: scoreBPM({ ...state, mode, vibe }) };
}
