// Shared numerical promises for permanent upgrades. Percent values describe the
// player-visible effect; runtime multipliers are derived here, never recopied.
export const META_UPGRADE_FACTS = Object.freeze({
  veteran: Object.freeze([20, 45, 75]),
  field_medic: Object.freeze([20, 50, 100]),
  swift_boots: Object.freeze([20, 40, 60]),
  deep_mag: Object.freeze([25, 60, 100]),
  hardened: Object.freeze([15, 30, 50]),
  scavenger: Object.freeze([50, 125, 200]),
  grenadier: Object.freeze([25, 45, 65]),
  crit_master: Object.freeze([5, 12, 20]),
  speedster: Object.freeze([10, 22, 38]),
  vampire_bite: Object.freeze([3, 6, 10]),
});

export const META_TREE_FACTS = Object.freeze({
  off1: 5, off2: 10, off3: 8, off4: 20,
  killFrenzySeconds: 1.5,
  def1: 20, def2: 8, def3: 6, def4: 50,
  util1: 20, util2: 25, util3: 30, util4: 1,
  cha1: 25, cha2: 40, cha4: 2,
});

export const META_BASE_PICKUP_RANGE = 30;
export const metaIncrease = (percent) => 1 + percent / 100;
export const metaReduction = (percent) => 1 - percent / 100;

// Authoritative numbers for ordinary in-run perks. Percent values describe the
// player-visible effect; runtime multipliers derive from these, never recopied.
// Fire-rate entries use the gap-reduction convention: "N% fire rate" = gap * (1 - N/100).
export const PERK_FACTS = Object.freeze({
  hollow_points:   { dmg: 25 },
  eagle_eye:       { crit: 10 },
  adrenaline:      { speed: 15 },
  iron_gut:        { hp: 30 },
  fast_learner:    { xp: 30 },
  scavenger:       { drops: 40, restore: 30 },
  grenadier:       { cd: 35 },
  parkour_pro:     { cd: 40 },
  vampire:         { ls: 8 },
  deep_pockets:    { ammo: 50 },
  combo_master:    { window: 50 },
  turbo_boots:     { cd: 30, synSpeed: 20 },
  tungsten_rounds: { dmg: 20 },
  combo_lifesteal: { ls: 6, window: 60 },
  overdrive:       { rate: 40, dmg: 10 },
  hoarder:         { range: 80, drops: 50 },
  overclocked:     { rate: 35, dmg: 15, shots: 20 },
  magnetism:       { mult: 2, synPickupTotal: 5 },
  glass_mind:      { xp: 80, hp: 25 },
  bullet_hose:     { ammo: 100, restore: 40, synAmmoPair: 50 },
  crit_cascade:    { crit: 12, synPierceCrit: 8 },
  bloodlust:       { dmg: 30, synLs: 15, synPiercedLs: 12 },
  grenade_chain:   { cd: 50, dmg: 25 },
  chain_lightning: { synLs: 6 },
});
export function metaUpgradeValue(id, tier = 0) {
  return META_UPGRADE_FACTS[id]?.[Math.min(3, Math.max(0, Math.floor(tier))) - 1] || 0;
}

export function metaUpgradeDescription(id, tier) {
  const value = metaUpgradeValue(id, tier);
  const descriptions = {
    veteran: `Start each run with +${value}% XP gain`,
    field_medic: `Start each run with +${value} max HP`,
    swift_boots: `Start with −${value}% dash cooldown`,
    deep_mag: `Start with +${value}% max ammo on all weapons`,
    hardened: `Start each run with +${value}% bullet damage`,
    scavenger: `Start with +${value}% pickup range`,
    grenadier: `Start with −${value}% grenade cooldown`,
    crit_master: `Start each run with +${value}% crit chance`,
    speedster: `Start each run with +${value}% move speed`,
    vampire_bite: `Start with ${value}% lifesteal on every hit`,
  };
  return descriptions[id];
}

export function applyMetaUpgrades(mods, gs, tiers = {}) {
  const value = (id) => metaUpgradeValue(id, tiers[id]);
  for (const [id, field] of Object.entries({ veteran: "xpMult", deep_mag: "ammoMult", hardened: "damageMult" })) {
    if (value(id)) mods[field] = metaIncrease(value(id));
  }
  for (const [id, field] of Object.entries({ swift_boots: "dashCDMult", grenadier: "grenadeCDMult" })) {
    if (value(id)) mods[field] = metaReduction(value(id));
  }
  if (value("scavenger")) mods.pickupRange = META_BASE_PICKUP_RANGE * metaIncrease(value("scavenger"));
  if (value("crit_master")) mods.critBonus = value("crit_master") / 100;
  if (value("vampire_bite")) mods.lifesteal = value("vampire_bite") / 100;
  gs.player.health += value("field_medic");
  gs.player.maxHealth += value("field_medic");
  gs.player.speed *= metaIncrease(value("speedster"));
}

export function applyMetaTree(mods, gs, unlocked) {
  const f = META_TREE_FACTS;
  if (unlocked.has("off1")) mods.damageMult = (mods.damageMult || 1) * metaIncrease(f.off1);
  // A +10% shot frequency means dividing the interval by 1.10.
  if (unlocked.has("off2")) mods.fireRateMult = (mods.fireRateMult || 1) / metaIncrease(f.off2);
  if (unlocked.has("off3")) mods.critBonus = (mods.critBonus || 0) + f.off3 / 100;
  if (unlocked.has("off4")) gs._killFrenzyUnlocked = true;
  if (unlocked.has("def1")) { gs.player.health += f.def1; gs.player.maxHealth += f.def1; }
  if (unlocked.has("def2")) gs._treeArmorMult = metaReduction(f.def2);
  if (unlocked.has("def3")) gs._treeWaveHeal = f.def3;
  if (unlocked.has("def4")) gs._treeLastStand = true;
  if (unlocked.has("util1")) mods.ammoMult = (mods.ammoMult || 1) * metaIncrease(f.util1);
  if (unlocked.has("util2")) mods.xpMult = (mods.xpMult || 1) * metaIncrease(f.util2);
  if (unlocked.has("util3")) gs._treeCoinBonus = metaIncrease(f.util3);
  if (unlocked.has("util4")) gs._treeFreeShopItem = true;
  if (unlocked.has("cha1")) gs._treeMutBoost = metaIncrease(f.cha1);
  if (unlocked.has("cha2")) gs._treeCoinBonus = (gs._treeCoinBonus || 1) * metaIncrease(f.cha2);
  if (unlocked.has("cha3")) gs._treeGauntletBonusPerk = true;
  if (unlocked.has("cha4") && gs.cursedRunMode) gs.killScoreMult = (gs.killScoreMult || 1) * f.cha4;
}
// Amplify favorable deltas only; enemy penalties keep their original strength.
export function applyWeeklyMutationWithAffinity(gs, mutation, unlocked) {
  if (!mutation) return;
  const before = { ...gs };
  mutation.apply(gs);
  if (gs.killScoreMult !== before.killScoreMult) gs._weeklyKillScoreMult = (gs.killScoreMult || 1) / (before.killScoreMult || 1);
  if (!unlocked.has("cha1")) return;
  const boost = metaIncrease(META_TREE_FACTS.cha1);
  for (const field of ["mutBulletSpeed", "settPickupMagnet", "killScoreMult", "mutXpMult", "mutPickupRate"]) {
    const baseline = before[field] || 1;
    if (gs[field] > baseline) gs[field] = baseline + (gs[field] - baseline) * boost;
  }
  if (gs.killScoreMult !== before.killScoreMult) gs._weeklyKillScoreMult = (gs.killScoreMult || 1) / (before.killScoreMult || 1);
  if (gs.mutEnemyHPMult < (before.mutEnemyHPMult || 1)) {
    const baseline = before.mutEnemyHPMult || 1;
    gs.mutEnemyHPMult = Math.max(0, baseline - (baseline - gs.mutEnemyHPMult) * boost);
  }
  if (gs.mutSpawnFrozen > (before.mutSpawnFrozen || 0)) {
    gs.mutSpawnFrozen = (before.mutSpawnFrozen || 0) + (gs.mutSpawnFrozen - (before.mutSpawnFrozen || 0)) * boost;
  }
}

export function consumeGauntletMetaChoice(gs) {
  if (!gs?.gauntletMode || !gs._treeGauntletBonusPerk || gs._treeGauntletBonusGranted) return 0;
  gs._treeGauntletBonusGranted = true;
  return 1;
}
// Called after run modifiers and settings so later starting bonuses survive.
export function finalizeMetaStart(gs) {
  if (gs._killFrenzyUnlocked) gs._killFrenzyBaseSpeed = gs.player.speed;
}

export function multiplyKillScore(gs, multiplier) {
  gs.killScoreMult = (gs.killScoreMult || 1) * multiplier;
}
