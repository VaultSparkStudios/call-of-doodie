// Browser-safe challenge invite contract. The checksum catches damaged or
// casually edited links; it is not a signature or a verified score receipt.
export const CHALLENGE_MODES = Object.freeze(["standard", "score_attack", "daily_challenge", "cursed", "boss_rush", "speedrun", "gauntlet", "zombies", "boss_gauntlet", "sewer_extraction", "bot_royale", "hold_the_throne"]);
export const CHALLENGE_LOADOUTS = Object.freeze(["standard", "cannon", "tank", "speedster"]);
const DIFFICULTIES = new Set(["easy", "normal", "hard", "insane"]);
const MODES = new Set(CHALLENGE_MODES);
const LOADOUTS = new Set(CHALLENGE_LOADOUTS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEYS = ["cv", "seed", "diff", "mode", "loadout", "vs", "vsName", "duel", "exp"];
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function integer(value, min, max) {
  const text = String(value ?? "");
  if (!/^\d{1,10}$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

function checksum(params) {
  const source = KEYS.map((key) => `${key}=${params.get(key) || ""}`).join("&");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildChallengeParams({ seed, difficulty = "normal", mode = "standard", loadout = "standard", vsScore = null, vsName = "", duelId = null, expiresAt = null } = {}, now = Date.now()) {
  const safeSeed = integer(seed, 1, 999999999);
  const safeScore = vsScore == null ? null : integer(vsScore, 0, 10000000);
  const safeName = String(vsName || "").trim();
  const safeDuel = duelId == null ? null : String(duelId);
  const expiration = expiresAt ? Date.parse(expiresAt) : now + (safeDuel ? 24 * 60 * 60 * 1000 : MAX_AGE_MS);
  if (!safeSeed || !DIFFICULTIES.has(difficulty) || !MODES.has(mode) || !LOADOUTS.has(loadout) ||
    (vsScore != null && safeScore == null) || safeName.length > 24 || /[\u0000-\u001f\u007f]/.test(safeName) ||
    (safeDuel && !UUID.test(safeDuel)) || !Number.isFinite(expiration) || expiration <= now || expiration > now + MAX_AGE_MS) return null;
  const params = new URLSearchParams({ cv: "2", seed: String(safeSeed), diff: difficulty, mode, loadout });
  if (safeScore != null) params.set("vs", String(safeScore));
  if (safeName) params.set("vsName", safeName);
  if (safeDuel) params.set("duel", safeDuel);
  params.set("exp", String(Math.floor(expiration / 1000)));
  params.set("check", checksum(params));
  return params;
}

export function parseChallengeInvite(search, now = Date.now()) {
  const raw = typeof search === "string" ? search.replace(/^\?/, "") : String(search || "");
  if (raw.length > 600) return { ok: false, reason: "Link exceeds the invite limit." };
  const params = new URLSearchParams(raw);
  const allowed = new Set([...KEYS, "check"]);
  for (const [key] of params) if (!allowed.has(key) || params.getAll(key).length !== 1) return { ok: false, reason: "Link contains an unexpected or repeated field." };
  if (params.get("cv") !== "2") return { ok: false, reason: "This is not a supported challenge invite." };
  const seed = integer(params.get("seed"), 1, 999999999);
  const score = params.has("vs") ? integer(params.get("vs"), 0, 10000000) : null;
  const name = params.get("vsName") || "";
  const duelId = params.get("duel") || null;
  const exp = integer(params.get("exp"), 1, 9999999999);
  if (!seed || !DIFFICULTIES.has(params.get("diff")) || !MODES.has(params.get("mode")) || !LOADOUTS.has(params.get("loadout")) ||
    (params.has("vs") && score == null) || name.length > 24 || /[\u0000-\u001f\u007f]/.test(name) ||
    (duelId && !UUID.test(duelId)) || !exp) return { ok: false, reason: "Challenge rules or score are invalid." };
  if (exp * 1000 <= now) return { ok: false, reason: "This invite has expired." };
  if (exp * 1000 > now + MAX_AGE_MS + 1000) return { ok: false, reason: "Invite expiry is too far away." };
  if (params.get("check") !== checksum(params)) return { ok: false, reason: "The invite appears to have changed in transit." };
  return { ok: true, invite: { seed, difficulty: params.get("diff"), mode: params.get("mode"), loadout: params.get("loadout"), vsScore: score, vsName: name, duelId, expiresAt: new Date(exp * 1000).toISOString() } };
}
