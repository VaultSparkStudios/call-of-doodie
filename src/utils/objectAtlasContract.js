// S145 — frozen contracts for the weapon and world-object sprite atlases.
// Mirrors enemyAtlasContract.js: integer grid math, explicit byte budgets,
// and stable cell ordering so stored indices never drift.

export const WEAPON_ATLAS_CONTRACT = Object.freeze({
  id: "weapon-atlas",
  runtimePath: "public/visual-assets/weapon-atlas-v1.webp",
  sourcePath: "assets/source/weapon-pack/weapon-atlas-source.svg",
  columns: 4,
  rows: 3,
  slots: 12,
  width: 1024,
  height: 768,
  maxBytes: 260000,
  // Cell order is WEAPONS index order (src/constants.js) — never reorder.
  weaponIndices: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
});

// Cell order for the world-object atlas. Pickup keys match the live pickup
// type keys in drawGame.js; the tail cells are world furniture.
export const WORLD_OBJECT_CELLS = Object.freeze([
  "pickup:health",
  "pickup:ammo",
  "pickup:speed",
  "pickup:guardian_angel",
  "pickup:upgrade",
  "pickup:nuke",
  "pickup:rage",
  "pickup:magnet",
  "pickup:freeze",
  "grenade",
  "hazard:poison",
  "hazard:shock",
  "hazard:rock",
  "escort-cart",
]);

export const WORLD_OBJECT_ATLAS_CONTRACT = Object.freeze({
  id: "world-object-atlas",
  runtimePath: "public/visual-assets/world-object-atlas-v1.webp",
  sourcePath: "assets/source/weapon-pack/world-object-atlas-source.svg",
  columns: 4,
  rows: 4,
  slots: 16,
  usedSlots: WORLD_OBJECT_CELLS.length,
  width: 1024,
  height: 1024,
  maxBytes: 220000,
});

function integerGridRect(index, contract) {
  const column = index % contract.columns;
  const row = Math.floor(index / contract.columns);
  const x0 = Math.floor((column * contract.width) / contract.columns);
  const x1 = Math.floor(((column + 1) * contract.width) / contract.columns);
  const y0 = Math.floor((row * contract.height) / contract.rows);
  const y1 = Math.floor(((row + 1) * contract.height) / contract.rows);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export function getWeaponAtlasRect(weaponIndex) {
  if (!Number.isInteger(weaponIndex) || weaponIndex < 0 || weaponIndex >= WEAPON_ATLAS_CONTRACT.slots) return null;
  return integerGridRect(weaponIndex, WEAPON_ATLAS_CONTRACT);
}

export function getWorldObjectAtlasRect(cellId) {
  const index = WORLD_OBJECT_CELLS.indexOf(cellId);
  if (index < 0) return null;
  return integerGridRect(index, WORLD_OBJECT_ATLAS_CONTRACT);
}
