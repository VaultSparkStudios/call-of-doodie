// A save is portable game state, never an identity or eligibility receipt.
export const BACKUP_SCHEMA = "cod-progress-backup-v2";
const LEGACY_SCHEMA = "cod-progress-backup-v1";
const MAX_BYTES = 512 * 1024;
const MAX_ENTRIES = 128;
const textEncoder = new TextEncoder();

const JSON_OBJECT_KEYS = new Set([
  "cod-career-v1", "cod-mission-streak-v1", "cod-meta-v2", "cod-doctrine-archive-v1",
  "cod-boss-kills-v1", "cod-last-experiment-v1", "cod-stash-v1",
  "cod-settings-v1", "cod-cosmetic-track-v1", "cod-operation-campaign-progress-v1",
  "cod-tutorial-v2", "cod-input-calibration", "cod-controller-profile",
  "cod-mastery-trail-v1",
]);
const JSON_ARRAY_KEYS = new Set([
  "cod-lb-v5", "cod-run-history-v1", "cod-field-reports-v1", "cod-custom-loadouts-v1",
  "cod-presets-v1", "cod-rivalry-history-v1", "cod-meta-tree-v1",
]);
const TEXT_KEYS = new Set([
  "cod-callsign-v1", "cod-theme", "cod-primary-weapon", "cod-music-vibe",
  "cod-music-muted", "cod-colorblind", "cod-autoaim", "cod-squad-v1",
]);
const DATE_KEYS = /^cod-(?:daily|missions)-\d{4}-\d{2}-\d{2}$/;
const GHOST_KEYS = /^cod-ghost-(?:normal|easy|hard|nightmare|operation-[a-z0-9-]{1,50})-v1$/;
const FORBIDDEN_FIELDS = /^(?:__proto__|prototype|constructor|profilekey|token|accesstoken|refreshtoken|session|secret|authorization|password|email)$/i;

function kindFor(key) {
  if (JSON_OBJECT_KEYS.has(key)) return "object";
  if (JSON_ARRAY_KEYS.has(key)) return "array";
  if (DATE_KEYS.test(key) || GHOST_KEYS.test(key)) return "json";
  if (TEXT_KEYS.has(key)) return "text";
  return null;
}

function safeTree(value, depth = 0) {
  if (depth > 24) return false;
  if (Array.isArray(value)) return value.every((item) => safeTree(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value).every(([key, item]) => !FORBIDDEN_FIELDS.test(key) && safeTree(item, depth + 1));
  }
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

function validEntry(key, value) {
  const kind = kindFor(key);
  if (!kind || typeof value !== "string" || textEncoder.encode(value).length > 128 * 1024) return false;
  if (kind === "text") return value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value);
  try {
    const parsed = JSON.parse(value);
    if (kind === "object" && (!parsed || Array.isArray(parsed) || typeof parsed !== "object")) return false;
    if (kind === "array" && !Array.isArray(parsed)) return false;
    if (kind === "json" && (!parsed || typeof parsed !== "object")) return false;
    return safeTree(parsed);
  } catch { return false; }
}

function sizeOf(value) { return textEncoder.encode(JSON.stringify(value)).length; }

export function exportProgressBackup(storage = globalThis.localStorage) {
  const entries = Object.create(null);
  const skipped = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !kindFor(key)) continue;
    const value = storage.getItem(key);
    if (!validEntry(key, value) || Object.keys(entries).length >= MAX_ENTRIES) { skipped.push(key); continue; }
    entries[key] = value;
    if (sizeOf({ schema: BACKUP_SCHEMA, entries }) > MAX_BYTES) { delete entries[key]; skipped.push(key); }
  }
  return { schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), keys: Object.keys(entries).length, entries, skipped };
}

export function previewProgressBackup(backup) {
  const parsed = typeof backup === "string" ? JSON.parse(backup) : backup;
  if (!parsed || (parsed.schema !== BACKUP_SCHEMA && parsed.schema !== LEGACY_SCHEMA) ||
      !parsed.entries || Array.isArray(parsed.entries) || typeof parsed.entries !== "object") {
    throw new Error("Not a Call of Doodie progress backup");
  }
  if (sizeOf(parsed) > MAX_BYTES) throw new Error("Backup exceeds the 512 KB save limit.");
  const all = Object.entries(parsed.entries);
  if (all.length > MAX_ENTRIES) throw new Error("Backup contains too many records.");
  const entries = Object.create(null);
  const ignored = [];
  for (const [key, value] of all) {
    if (!kindFor(key)) { ignored.push(key); continue; }
    if (!validEntry(key, value)) throw new Error(`Invalid save record: ${key}`);
    entries[key] = value;
  }
  return { entries, restored: Object.keys(entries).length, ignored, legacy: parsed.schema === LEGACY_SCHEMA, exportedAt: parsed.exportedAt || null };
}

export function importProgressBackup(backup, storage = globalThis.localStorage) {
  const preview = previewProgressBackup(backup);
  const before = new Map(Object.keys(preview.entries).map((key) => [key, storage.getItem(key)]));
  const written = [];
  try {
    for (const [key, value] of Object.entries(preview.entries)) {
      storage.setItem(key, value);
      written.push(key);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of written.reverse()) {
      try {
        const previous = before.get(key);
        if (previous === null) storage.removeItem(key);
        else storage.setItem(key, previous);
      } catch { rollbackFailed = true; }
    }
    throw new Error(rollbackFailed ? "Restore interrupted and rollback failed; check browser storage." : "Restore interrupted; previous save preserved.", { cause: error });
  }
  return { restored: preview.restored, ignored: preview.ignored, legacy: preview.legacy, exportedAt: preview.exportedAt };
}
