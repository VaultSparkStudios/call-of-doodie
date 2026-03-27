// ===== LOADOUT CODE — encode/decode custom loadout configs as short shareable codes =====
// Format: 2 hex chars weapon index (00–0C) + 1 hex char starter index (0–3) = 3 chars total
// Examples: weapon 11 (B) + starter "cannon" (1) → "0B1"
//           weapon 0  (0) + starter "standard"  → "000"

const STARTERS = ["standard", "cannon", "tank", "speedster"];

/**
 * Encode a loadout config into a 3-char hex code.
 * @param {{ weaponIdx: number, starterLoadout: string }} loadout
 * @returns {string} 3-char uppercase hex code
 */
export function encodeLoadout({ weaponIdx = 0, starterLoadout = "standard" }) {
  const wi = Math.max(0, Math.min(12, Math.floor(weaponIdx)));
  const si = Math.max(0, STARTERS.indexOf(starterLoadout));
  return wi.toString(16).toUpperCase().padStart(2, "0") + si.toString(16).toUpperCase();
}

/**
 * Decode a 3-char hex code back into a loadout config.
 * @param {string} code
 * @returns {{ weaponIdx: number, starterLoadout: string } | null} null if invalid
 */
export function decodeLoadout(code) {
  if (!code || typeof code !== "string" || code.length < 3) return null;
  try {
    const weaponIdx = parseInt(code.slice(0, 2), 16);
    const si = parseInt(code.slice(2, 3), 16);
    if (isNaN(weaponIdx) || isNaN(si) || weaponIdx > 12 || si > 3) return null;
    return { weaponIdx, starterLoadout: STARTERS[si] };
  } catch { return null; }
}

/** Validate that a code string looks like a loadout code (3 uppercase hex chars). */
export function isValidLoadoutCode(code) {
  return typeof code === "string" && /^[0-9A-F]{3}$/i.test(code.trim());
}
