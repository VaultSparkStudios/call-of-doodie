// replayCode.js — encode/decode a 12-char shareable run code.
//
// Run conditions captured: { seed, mode, difficulty, starterLoadout, weaponIdx }.
// Format (12 hex chars):
//   chars 0-5 : seed     (24 bits, 0..16777215)
//   char  6   : mode index
//   char  7   : difficulty index
//   char  8-9 : weapon index (matches loadoutCode)
//   char  10  : starter index
//   char  11  : checksum (sum of bytes mod 16)
//
// Routes/mutations are intentionally NOT in the code — they are mid-run
// player choices. The seed makes the world deterministic; player choices
// remain the player's own. This is the right shareable surface.

const MODES = ["standard", "score_attack", "daily_challenge", "cursed", "boss_rush", "speedrun", "gauntlet"];
const DIFFS = ["easy", "normal", "hard", "insane", "nightmare", "doodie"];
const STARTERS = ["standard", "cannon", "tank", "speedster"];

const MODE_IDX = (m) => Math.max(0, MODES.indexOf(m));
const DIFF_IDX = (d) => {
  const i = DIFFS.indexOf(d);
  return i >= 0 ? i : 1;
};
const STARTER_IDX = (s) => Math.max(0, STARTERS.indexOf(s));

function checksum(s11) {
  let sum = 0;
  for (let i = 0; i < s11.length; i++) sum += parseInt(s11[i], 16) || 0;
  return (sum & 0xF).toString(16).toUpperCase();
}

export function encodeReplayCode({
  seed = 0,
  mode = "standard",
  difficulty = "normal",
  starterLoadout = "standard",
  weaponIdx = 0,
} = {}) {
  const s = Math.max(0, Math.min(0xFFFFFF, Math.floor(Number(seed) || 0)));
  const m = MODE_IDX(mode) & 0xF;
  const d = DIFF_IDX(difficulty) & 0xF;
  const w = (Math.max(0, Math.min(255, Math.floor(Number(weaponIdx) || 0))) & 0xFF);
  const st = STARTER_IDX(starterLoadout) & 0xF;
  const seedHex = s.toString(16).toUpperCase().padStart(6, "0");
  const wHex = w.toString(16).toUpperCase().padStart(2, "0");
  const body = `${seedHex}${m.toString(16).toUpperCase()}${d.toString(16).toUpperCase()}${wHex}${st.toString(16).toUpperCase()}`;
  return body + checksum(body);
}

export function isValidReplayCode(code) {
  if (typeof code !== "string") return false;
  const c = code.trim().toUpperCase();
  if (!/^[0-9A-F]{12}$/.test(c)) return false;
  return checksum(c.slice(0, 11)) === c[11];
}

export function decodeReplayCode(code) {
  if (!isValidReplayCode(code)) return null;
  const c = code.trim().toUpperCase();
  const seed = parseInt(c.slice(0, 6), 16);
  const m = parseInt(c[6], 16);
  const d = parseInt(c[7], 16);
  const w = parseInt(c.slice(8, 10), 16);
  const st = parseInt(c[10], 16);
  return {
    seed,
    mode: MODES[m] || "standard",
    difficulty: DIFFS[d] || "normal",
    weaponIdx: Number.isFinite(w) ? w : 0,
    starterLoadout: STARTERS[st] || "standard",
  };
}
