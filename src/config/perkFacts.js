// Numeric promises for ordinary perks. Descriptions and their apply paths read
// these same values; effects owned by other systems import them as needed.
export const PERK_FACTS = Object.freeze({
  hollow_points: { damage: 1.25 },
  eagle_eye: { crit: 0.10, pierceCrit: 0.10 },
  adrenaline: { speed: 1.15 },
  iron_gut: { health: 30 },
  fast_learner: { xp: 1.30 },
  grenadier: { cooldown: 0.65, pyroDamage: 1.50 },
  parkour_pro: { cooldown: 0.60 },
  vampire: { lifesteal: 0.08, chainLifesteal: 0.06 },
  deep_pockets: { ammo: 1.50 },
  combo_master: { window: 1.50 },
  magnetism: { range: 2, hoarderRange: 5, hoarderBase: 1.80 },
  penetrator: { pierce: 1, eagleCrit: 0.10, bloodlustLifesteal: 0.12 },
  bloodlust: { damage: 1.30, vampireLifesteal: 0.15, pierceLifesteal: 0.12 },
  turbo_boots: { cooldown: 0.70, surgeSpeed: 1.20, rushFrames: 240 },
  tungsten_rounds: { damage: 1.20, pierce: 1 },
  adrenaline_rush: { healthThreshold: 0.30, frames: 120, turboFrames: 240 },
  chain_lightning: { chance: 0.20, targets: 1, damage: 0.50, vampireLifesteal: 0.06 },
  dead_mans_hand: { radius: 250, baseDamage: 200, lastResortDamage: 3 },
  overclocked: { fireRate: 1.35, damage: 0.85, forcedReloadShots: 20 },
  scavenger: { ammoDrop: 1.40, ammoRestore: 1.30 },
  combo_lifesteal: { lifesteal: 0.06, window: 1.60 },
  overdrive: { fireRate: 1.40, damage: 1.10 },
  hoarder: { range: 1.80, ammoDrop: 1.50, magnetismRange: 5, magnetismBase: 2 },
  glass_mind: { xp: 1.80, healthLoss: 25, critXp: 10 },
  bullet_hose: { ammo: 2, ammoRestore: 1.40, deepPocketsAmmo: 1.50 },
  crit_cascade: { crit: 0.12, eagleCrit: 0.10, pierceCrit: 0.08, glassMindXp: 10 },
  grenade_chain: { cooldown: 0.50, damage: 1.25, pyroDamage: 1.50 },
});

export const perkPercent = value => Math.round(value * 100);
export const perkIncrease = multiplier => Math.round((multiplier - 1) * 100);
export const perkReduction = multiplier => Math.round((1 - multiplier) * 100);
export const shotIntervalForRate = rateMultiplier => 1 / rateMultiplier;
export const perkSeconds = frames => frames / 60;
