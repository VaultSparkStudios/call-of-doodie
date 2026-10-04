import { DIFFICULTIES } from "../constants.js";
import { FULL_MODE_CATALOG, MODE_CATALOG } from "../config/modeCatalog.js";

export const SCENARIO_SCHEMA_VERSION = "sewer-scenario-v2";
const SCHEMA = SCENARIO_SCHEMA_VERSION;
const LEGACY_SCHEMA = "sewer-scenario-v1";
const MODES = new Set(FULL_MODE_CATALOG.map(({ id }) => id));
const LEGACY_MODES = new Set(MODE_CATALOG.map(({ id }) => id));
const LEGACY_DIFFICULTIES = new Set(["easy", "normal", "hard", "nightmare"]);

function safeText(value, max = 24) {
  return String(value ?? "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, max);
}

function checksum(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function createCartridge({ seed, mode = "standard", difficulty = "normal", loadout, targetScore = null, rival = null } = {}, schema = SCHEMA) {
  const legacy = schema === LEGACY_SCHEMA;
  if (!(legacy ? LEGACY_MODES : MODES).has(mode) || !(legacy ? LEGACY_DIFFICULTIES.has(difficulty) : Object.hasOwn(DIFFICULTIES, difficulty))) return null;
  const normalizedSeed = Number(seed ?? 0);
  if (!Number.isSafeInteger(normalizedSeed) || normalizedSeed < 0 || normalizedSeed > 999999999) return null;
  const body = {
    schemaVersion: schema,
    seed: normalizedSeed,
    mode,
    difficulty,
    loadout: safeText(loadout || "standard", 20) || "standard",
    targetScore: Number.isFinite(Number(targetScore)) ? Math.max(0, Math.floor(Number(targetScore))) : null,
    rival: safeText(rival, 18) || null,
  };
  return { ...body, checksum: checksum(JSON.stringify(body)) };
}

export function buildScenarioCartridge(input = {}) { return createCartridge(input); }

export function validateScenarioCartridge(value) {
  if (!value || ![SCHEMA, LEGACY_SCHEMA].includes(value.schemaVersion)) return { valid: false, reason: "schema" };
  const rebuilt = createCartridge(value, value.schemaVersion);
  if (!rebuilt) return { valid: false, reason: "unsupported-setup" };
  if (rebuilt.checksum !== value.checksum) return { valid: false, reason: "integrity" };
  // Authenticate the old bytes before upgrading the obsolete difficulty name.
  const cartridge = value.schemaVersion === LEGACY_SCHEMA
    ? createCartridge({ ...rebuilt, difficulty: rebuilt.difficulty === "nightmare" ? "insane" : rebuilt.difficulty }) : rebuilt;
  return { valid: true, cartridge };
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
