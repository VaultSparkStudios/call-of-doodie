/**
 * shopForecast.js — Context-aware tradeoff advisories for wave shop items.
 *
 * Returns a one-line "what does this actually mean right now" advisory
 * for each shop option based on the player's current game state.
 * Displayed in WaveShopModal on hover.
 */

/**
 * @param {object} option   - Shop option object (id, name, cost, etc.)
 * @param {object} gs       - Current game state snapshot
 * @param {number} wpnIdx   - Active weapon index
 * @returns {{ advisory: string, urgency: "high"|"medium"|"low" }}
 */
export function getShopAdvisory(option, gs, wpnIdx = 0) {
  if (!option) return { advisory: "", urgency: "low" };

  gs = gs || {};
  const wave = gs.currentWave || 1;
  const hp = gs.player?.health || 100;
  const maxHp = gs.player?.maxHealth || 100;
  const hpPct = maxHp > 0 ? hp / maxHp : 1;
  const weaponLevel = gs.weaponUpgrades?.[wpnIdx] || 0;

  const id = option.id || "";

  // ── Wave shop items ────────────────────────────────────────────────────────

  if (id === "health") {
    if (hpPct < 0.3) return { advisory: "Critical — you need this now.", urgency: "high" };
    if (hpPct < 0.6) return { advisory: "Worth it. Healing buys buffer for the next threat.", urgency: "medium" };
    return { advisory: "You're in decent shape. Consider whether the other options compound more.", urgency: "low" };
  }

  if (id === "ammo") {
    const totalAmmo = gs.weaponAmmos?.reduce((a, b) => a + b, 0) ?? 99;
    if (totalAmmo < 10) return { advisory: "Running on empty. Take this before the next wave.", urgency: "high" };
    return { advisory: "Refills all weapons. Weak if you're already topped off — save coins.", urgency: "low" };
  }

  if (id === "upgrade") {
    if (weaponLevel >= 2) return { advisory: "Max upgrade incoming next. One more buys the final tier bonus.", urgency: "medium" };
    if (weaponLevel === 0) return { advisory: "First upgrade doubles the weapon's effective DPS floor. High ROI.", urgency: "high" };
    return { advisory: `Tier ${weaponLevel + 1} adds ammo capacity and damage. Compounds all future runs on this weapon.`, urgency: "medium" };
  }

  if (id === "speed") {
    return {
      advisory: "Permanent +10% speed stacks with perks. Most useful in early waves before threats outpace base movement.",
      urgency: wave <= 5 ? "medium" : "low",
    };
  }

  if (id === "maxhp") {
    return {
      advisory: wave <= 6
        ? "+25 max HP compounds across every wave left. Earlier = more value."
        : "+25 max HP. Late-run value is lower — only take it if health management is your weak point.",
      urgency: wave <= 6 ? "medium" : "low",
    };
  }

  if (id === "damage") {
    return {
      advisory: "+15% damage stacks multiplicatively with weapon upgrades and perks. Best when your DPS is already solid.",
      urgency: weaponLevel >= 2 ? "medium" : "low",
    };
  }

  if (id.startsWith("bless_")) {
    return {
      advisory: "+30% damage and 20% faster fire — permanent. Commit this weapon to a primary role. Don't bless a weapon you plan to abandon.",
      urgency: "medium",
    };
  }

  if (id.startsWith("curse_")) {
    const tankyBuild = (gs.player?.maxHealth || 100) > 130;
    return {
      advisory: tankyBuild
        ? "You're already tanky — the HP trade has diminishing returns. Only worth it if your damage weapon is already strong."
        : "Sacrifice -30% damage for +50 max HP. Best if survivability is your weakest stat right now.",
      urgency: "low",
    };
  }

  // ── Coin shop items ────────────────────────────────────────────────────────

  if (id === "cs_fullhp") {
    if (hpPct < 0.25) return { advisory: "At this HP, this might be the only way to survive the next wave.", urgency: "high" };
    if (hpPct < 0.5) return { advisory: "Good value at this health level — full restore buys real buffer.", urgency: "medium" };
    return { advisory: "Full restore is overkill above 50% HP. Consider saving coins for bigger items.", urgency: "low" };
  }

  if (id === "cs_nuke") {
    return {
      advisory: "Clears the screen instantly. Best during swarm waves or when surrounded — wasted on near-empty arenas.",
      urgency: (gs.enemies?.length || 0) > 12 ? "high" : "low",
    };
  }

  if (id === "cs_timedil") {
    return {
      advisory: "6 seconds of slowed time. Massive for repositioning when you're cornered or facing a bullet-dense wave.",
      urgency: "medium",
    };
  }

  if (id === "cs_grenade") {
    const isBossWave = wave % 5 === 0;
    return {
      advisory: isBossWave
        ? "Boss wave: a fresh grenade can open the fight with burst damage before the boss goes enraged."
        : "Instant grenade ready. Best when an elite cluster or dangerous spawn is active.",
      urgency: isBossWave ? "medium" : "low",
    };
  }

  if (id === "cs_extralife") {
    const coins = gs.coins || 0;
    return {
      advisory: coins >= 45
        ? "Guardian Angel is the highest-impact survival buy. Worth it when the run score is worth protecting."
        : "Guardian Angel costs 45 coins — make sure you have enough without draining your economy.",
      urgency: wave >= 8 ? "medium" : "low",
    };
  }

  if (id === "cs_maxhp") {
    return {
      advisory: "+30 permanent max HP for 22 coins. Compound value — earlier in the run = better return.",
      urgency: wave <= 8 ? "medium" : "low",
    };
  }

  if (id === "cs_ammo") {
    return { advisory: "Cheapest efficiency buy at 10 coins. Worth it when any weapon is below 40% ammo.", urgency: "low" };
  }

  return { advisory: option.desc || "", urgency: "low" };
}

/**
 * Urgency → accent color for visual cue in shop UI.
 */
export function getAdvisoryColor(urgency) {
  if (urgency === "high") return "#FF4444";
  if (urgency === "medium") return "#FFD700";
  return "#888";
}
