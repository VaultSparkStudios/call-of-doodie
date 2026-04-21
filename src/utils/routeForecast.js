/**
 * routeForecast.js — Plain-language forecasts for each route type.
 *
 * Gives the player a concrete "what this means for your next wave" summary
 * that goes beyond the static route description — accounting for current
 * game state (wave number, health, coins, build) where relevant.
 */

/**
 * @param {object} route   - A WAVE_ROUTES entry (id, name, emoji, desc)
 * @param {object} gs      - Current game state snapshot
 * @returns {{ headline: string, tradeoff: string, tip: string }}
 */
export function getRouteForecast(route, gs) {
  gs = gs || {};
  const wave = gs.currentWave || 1;
  const hp = gs.player?.health || 100;
  const maxHp = gs.player?.maxHealth || 100;
  const coins = gs.coins || 0;
  const hpPct = maxHp > 0 ? hp / maxHp : 1;

  switch (route?.id) {
    case "standard":
      return {
        headline: "Steady progression — no surprises.",
        tradeoff: "Lowest risk, lowest upside. Safe choice when health is low or build is incomplete.",
        tip: hpPct < 0.4
          ? "You're wounded — Standard buys time to stabilize in the next shop."
          : "With decent health, other routes offer better value per wave.",
      };

    case "boss_fork": {
      const isBossImminent = (wave + 1) % 5 === 0;
      return {
        headline: `Force boss wave ${wave + 1}. Kills worth ×2 score.`,
        tradeoff: "All-in on burst scoring — boss waves drop better loot but punish underprepared builds hard.",
        tip: isBossImminent
          ? "Boss is already due next wave — Boss Gauntlet doubles the kill score on a wave you'd fight anyway."
          : coins < 15
            ? "Low on coins. Boss Gauntlet pays, but only if you can clear it — make sure your build is ready."
            : "×2 score on boss kills is the highest single-wave scoring opportunity available.",
      };
    }

    case "mutation":
      return {
        headline: "+50% XP this wave. One random mutation active.",
        tradeoff: "Mutation effects range from easy (frozen spawns) to painful (always enraged). Pure lottery on difficulty.",
        tip: "If you've unlocked Mutation Affinity from the META_TREE, this is worth taking almost every time.",
      };

    case "double_trouble": {
      const killsPerWave = wave * 8;
      return {
        headline: `≈${killsPerWave * 2} enemies this wave. Kills worth +60% score.`,
        tradeoff: "High DPS demand. Ammo-hungry weapons may run dry mid-wave.",
        tip: gs.weaponUpgrades?.[0] >= 2
          ? "+60% score and your weapon is upgraded — Double Trouble has strong ROI here."
          : "Consider upgrading your primary weapon before committing to Double Trouble.",
      };
    }

    case "elite_surge":
      return {
        headline: "Every enemy is elite this wave. +40% XP.",
        tradeoff: "Elites have more HP and aggression but drop better pickups. Tight builds that can kill fast thrive.",
        tip: hpPct < 0.5
          ? "Low health + Elite Surge is risky — elites can rush a wounded player fast."
          : "Elite Surge is a strong XP boost mid-run. Worth it when health is above 50%.",
      };

    case "armory_run":
      return {
        headline: "Weapon upgrades drop 3× more often this wave.",
        tradeoff: "Lower direct score gain, but weapon progression unlocks multipliers that compound every future wave.",
        tip: gs.weaponUpgrades?.[0] < 3
          ? "Your primary weapon isn't at max — Armory Run can close that gap this wave."
          : "All weapons maxed — Armory Run has diminishing returns. Standard or Double Trouble may pay more.",
      };

    case "blitz": {
      const spawnRate = "3×";
      return {
        headline: `Enemies spawn ${spawnRate} faster. Kills worth +25% score.`,
        tradeoff: "Chaos multiplier — rewards fast, mobile players. Slower builds get swarmed.",
        tip: coins > 20
          ? "You have coins in reserve. Blitz is fine — you can absorb some chip damage and shop after."
          : "Blitz on low coins means any HP loss stings more. Only take it if your DPS is clean.",
      };
    }

    default:
      return {
        headline: route?.desc || "Unknown route.",
        tradeoff: "",
        tip: "",
      };
  }
}

/**
 * Returns a single-line summary string for inline display (ticker or tooltip).
 * @param {object} route
 * @param {object} gs
 * @returns {string}
 */
export function getRouteForecastOneliner(route, gs) {
  gs = gs || {};
  const { headline, tip } = getRouteForecast(route, gs);
  if (!tip) return headline;
  return `${headline} ${tip}`;
}
