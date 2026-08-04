const SCHEMA = "sewer-scenario-v1";
const MODES = new Set(["standard", "score_attack", "daily_challenge", "cursed", "boss_rush", "speedrun", "gauntlet"]);
const DIFFICULTIES = new Set(["easy", "normal", "hard", "nightmare"]);

function safeText(value, max = 24) {
  return String(value ?? "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, max);
}

function checksum(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function buildScenarioCartridge({ seed, mode, difficulty, loadout, targetScore = null, rival = null } = {}) {
  const body = {
    schemaVersion: SCHEMA,
    seed: Math.max(0, Math.floor(Number(seed) || 0)),
    mode: MODES.has(mode) ? mode : "standard",
    difficulty: DIFFICULTIES.has(difficulty) ? difficulty : "normal",
    loadout: safeText(loadout || "standard", 20) || "standard",
    targetScore: Number.isFinite(Number(targetScore)) ? Math.max(0, Math.floor(Number(targetScore))) : null,
    rival: safeText(rival, 18) || null,
  };
  return { ...body, checksum: checksum(JSON.stringify(body)) };
}

export function validateScenarioCartridge(value) {
  if (!value || value.schemaVersion !== SCHEMA) return { valid: false, reason: "schema" };
  const rebuilt = buildScenarioCartridge(value);
  if (rebuilt.checksum !== value.checksum) return { valid: false, reason: "integrity" };
  return { valid: true, cartridge: rebuilt };
}

export function encodeScenarioCartridge(value) {
  const checked = validateScenarioCartridge(value);
  if (!checked.valid) return null;
  const json = JSON.stringify(checked.cartridge);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeScenarioCartridge(code) {
  try {
    const normalized = String(code || "").replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return validateScenarioCartridge(JSON.parse(new TextDecoder().decode(bytes))).cartridge || null;
  } catch {
    return null;
  }
}

export function buildSewerRelayUrl(cartridge, baseUrl = globalThis.location?.href || "https://callofdoodie.wtf/") {
  const code = encodeScenarioCartridge(cartridge);
  if (!code) return null;
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("scenario", code);
  return url.toString();
}
