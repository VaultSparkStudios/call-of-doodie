// scoreLedger.js — pure score-resolution rules.
//
// Owns: kill score composition (perk bonuses × route × cursed × hot-zone × combo).
// Does NOT own: combo timer state, killstreak counter, achievement triggers.
//
// Hot-zone integration: when gs.activeObjective is a hot_zone and the player is
// inside it, kills earn `gs.activeObjective.scoreMult` (typically 2x or 3x).
// The objective module owns the geometry + lifetime; scoreLedger only honors
// the multiplier flag.

/**
 * Compute the final point value for a kill.
 * @param {object} ctx
 * @param {number} ctx.basePoints  raw enemy points
 * @param {number} ctx.comboMult   combo system mult (e.g. perfect bonus combo)
 * @param {number} ctx.killScoreMult   gs.killScoreMult (perks)
 * @param {number} ctx.routeKillScoreMult   gs.routeKillScoreMult (route bonus)
 * @param {object} [ctx.activeObjective]   { type, scoreMult, contains(player) }
 * @param {{x:number,y:number}} [ctx.playerPos]   player position for objective check
 * @returns {number} final integer points
 */
export function computeKillPoints({
  basePoints = 0,
  comboMult = 1,
  killScoreMult = 1,
  routeKillScoreMult = 1,
  activeObjective = null,
  playerPos = null,
}) {
  let pts = basePoints * comboMult * killScoreMult * routeKillScoreMult;
  if (activeObjective && activeObjective.type === "hot_zone" && playerPos) {
    if (typeof activeObjective.contains === "function" && activeObjective.contains(playerPos)) {
      pts *= activeObjective.scoreMult || 2;
    }
  }
  return Math.floor(pts);
}

/**
 * Returns true when the player is currently earning bonus score from an
 * active objective. Used for HUD highlighting + roast triggers.
 */
export function isInHotZone(activeObjective, playerPos) {
  if (!activeObjective || activeObjective.type !== "hot_zone" || !playerPos) return false;
  return typeof activeObjective.contains === "function" && activeObjective.contains(playerPos);
}
