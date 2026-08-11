// S148 — frozen contract for the Sewer Zombies mode-exclusive enemy atlas.
// Mirrors objectAtlasContract.js: integer grid math, explicit byte budget,
// stable cell ordering. Distinct from ENEMY_ATLAS_CONTRACT (enemyAtlasContract.js)
// on purpose — zombies mode previously reused the base enemy atlas re-tinted,
// which is the bug this atlas fixes.

// Cell order must match ZOMBIE_VARIANTS in zombieMode.js (index-for-index),
// plus one trailing boss cell.
export const ZOMBIE_VARIANT_CELLS = Object.freeze(["shambler", "rotter", "sprinter", "bloater"]);
export const ZOMBIE_BOSS_CELL = "apex";
export const ZOMBIE_ATLAS_CELLS = Object.freeze([...ZOMBIE_VARIANT_CELLS, ZOMBIE_BOSS_CELL]);

export const ZOMBIE_ATLAS_CONTRACT = Object.freeze({
  id: "zombie-atlas",
  runtimePath: "public/visual-assets/zombie-atlas-v1.webp",
  sourcePath: "assets/source/weapon-pack/zombie-atlas-source.svg",
  columns: 4,
  rows: 2,
  slots: 8,
  usedSlots: ZOMBIE_ATLAS_CELLS.length,
  width: 1024,
  height: 512,
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

export function getZombieAtlasRect(cellId) {
  const index = ZOMBIE_ATLAS_CELLS.indexOf(cellId);
  if (index < 0) return null;
  return integerGridRect(index, ZOMBIE_ATLAS_CONTRACT);
}
