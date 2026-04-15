const PERK_SYNERGIES = [
  {
    condition: (mods) => mods.hasVampire && mods.hasChainLightning && !mods._synergyStormVampire,
    flag: "_synergyStormVampire",
    name: "⚡🧛 STORM VAMPIRE",
    desc: "",
    apply: () => {},
  },
  {
    condition: (mods) => mods.hasGrenadier && mods.hasPyromaniac && !mods._synergyPyroGrenadier,
    flag: "_synergyPyroGrenadier",
    name: "💣🔥 PYRO GRENADIER",
    desc: "",
    apply: () => {},
  },
  {
    condition: (mods) => mods.hasEagleEye && mods.pierce > 0 && !mods._synergyDeadEye,
    flag: "_synergyDeadEye",
    name: "🎯🔫 DEAD EYE",
    desc: "",
    apply: () => {},
  },
  {
    condition: (mods) => mods.hasVampire && mods.hasLastResort && !mods._synVampireLastResort,
    flag: "_synVampireLastResort",
    name: "⚡ DEATH'S DOOR",
    desc: "+4% lifesteal & +10% crit at low HP",
    apply: (mods) => {
      mods.lifesteal = (mods.lifesteal || 0) + 0.04;
      mods.critBonus = (mods.critBonus || 0) + 0.1;
    },
  },
  {
    condition: (mods) => mods.hasAdrenaline && mods.hasDash && !mods._synAdrenalineDash,
    flag: "_synAdrenalineDash",
    name: "💨 AFTERBURNER",
    desc: "Dash cooldown cut by 40%",
    apply: (mods) => {
      mods.dashCDMult = (mods.dashCDMult || 1) * 0.6;
    },
  },
  {
    condition: (mods) => mods.hasOverclocked && mods.hasLastResort && !mods._synOCGlass,
    flag: "_synOCGlass",
    name: "💥 FRAGILE FURY",
    desc: "+25% damage while at low HP",
    apply: (mods) => {
      mods.damageMult = (mods.damageMult || 1) * 1.25;
    },
  },
  {
    condition: (mods) => mods.hasScavenger && mods.hasAmmoBoost && !mods._synScavAmmo,
    flag: "_synScavAmmo",
    name: "🎒 PACK RAT",
    desc: "+30% max ammo & 50% more ammo drops",
    apply: (mods) => {
      mods.ammoMult = (mods.ammoMult || 1) * 1.3;
      mods.ammoDropMult = (mods.ammoDropMult || 1) * 1.5;
    },
  },
  {
    condition: (mods) => mods.hasEagleEye && (mods.pierce || 0) > 0 && !mods._synEaglePierce,
    flag: "_synEaglePierce",
    name: "🦅 SNIPER'S MARK",
    desc: "+1 pierce & +8% crit chance",
    apply: (mods) => {
      mods.pierce = (mods.pierce || 0) + 1;
      mods.critBonus = (mods.critBonus || 0) + 0.08;
    },
  },
  {
    condition: (mods) => mods.hasComboMaster && mods.hasVampire && !mods._synComboVamp,
    flag: "_synComboVamp",
    name: "🌪️ BLOODCOMBO",
    desc: "Lifesteal doubles during active combo",
    apply: (mods) => {
      mods.comboVampireMult = true;
    },
  },
  {
    condition: (mods) => mods.hasTurboBoots && mods.hasAdrenaline && !mods._synTurboAdrenaline,
    flag: "_synTurboAdrenaline",
    name: "⚡ NITRO RUSH",
    desc: "Adrenaline Rush lasts 4s instead of 2s",
    apply: (mods) => {
      mods.adrenalineRushDuration = 240;
    },
  },
  {
    condition: (mods) => mods.hasLastResort && (mods.deadManTripleExplosion || mods.hasLastResort) && !mods._synDeadLastResort,
    flag: "_synDeadLastResort",
    name: "💀 DEATH'S GAMBIT",
    desc: "Dead Man's Hand explosion triples at low HP",
    apply: (mods) => {
      mods.deadManTripleExplosion = true;
    },
  },
  {
    condition: (mods) => mods.hasGlassMind && mods.hasCritCascade && !mods._synGlassCrit,
    flag: "_synGlassCrit",
    name: "🧠 FOCUSED FURY",
    desc: "Every crit grants +10 bonus XP",
    apply: (mods) => {
      mods.critGrantsXp = true;
    },
  },
  {
    condition: (mods) => mods.hasOverclocked && mods.hasScavenger && !mods._synOCSav,
    flag: "_synOCSav",
    name: "🔧 RELOAD SALVAGE",
    desc: "Forced reloads drop an ammo crate",
    apply: (mods) => {
      mods.reloadDropsAmmo = true;
    },
  },
  {
    condition: (mods) => mods.hasGrenadeChain && mods.hasOverclocked && !mods._synGrenadeOC,
    flag: "_synGrenadeOC",
    name: "💥 CHAIN REACTION",
    desc: "Forced reload instantly readies your grenade",
    apply: (mods) => {
      mods.reloadFreesGrenade = true;
    },
  },
  {
    condition: (mods) => mods.hasBloodlust && (mods.pierce || 0) > 0 && !mods._synBloodPierce,
    flag: "_synBloodPierce",
    name: "🩸 BLOODSHOT",
    desc: "+12% lifesteal on every pierced target",
    apply: (mods) => {
      mods.piercedLifesteal = (mods.piercedLifesteal || 0) + 0.12;
    },
  },
  {
    condition: (mods) => mods.hasBulletHose && mods.hasAmmoBoost && !mods._synFullArmory,
    flag: "_synFullArmory",
    name: "📦 FULL ARMORY",
    desc: "+50% extra max ammo on top of existing boost",
    apply: (mods) => {
      mods.ammoMult = (mods.ammoMult || 1) * 1.5;
    },
  },
];

export function applyPerkSynergies(perkMods) {
  const unlocked = [];
  for (const synergy of PERK_SYNERGIES) {
    if (!synergy.condition(perkMods)) continue;
    perkMods[synergy.flag] = true;
    synergy.apply(perkMods);
    unlocked.push({ name: synergy.name, desc: synergy.desc });
  }
  return unlocked;
}

export function applyArchetypeCapstone(archetypeId, perkMods, gameState) {
  switch (archetypeId) {
    case "vanguard":
      perkMods.lifesteal = (perkMods.lifesteal || 0) + 0.03;
      if (gameState) gameState._treeArmorMult = (gameState._treeArmorMult || 1) * 0.92;
      break;
    case "gunslinger":
      perkMods.critBonus = (perkMods.critBonus || 0) + 0.10;
      perkMods.fireRateMult = (perkMods.fireRateMult || 1) * 0.88;
      break;
    case "demolitionist":
      perkMods.damageMult = (perkMods.damageMult || 1) * 1.12;
      perkMods.grenadeCDMult = (perkMods.grenadeCDMult || 1) * 0.80;
      perkMods.grenadeDamageMult = (perkMods.grenadeDamageMult || 1) * 1.20;
      break;
    case "tempo":
      perkMods.comboTimerMult = (perkMods.comboTimerMult || 1) * 1.15;
      perkMods.dashCDMult = (perkMods.dashCDMult || 1) * 0.80;
      perkMods.pickupRange = Math.max(perkMods.pickupRange || 30, Math.round((perkMods.pickupRange || 30) * 1.2));
      if (gameState?.player) gameState.player.speed *= 1.08;
      break;
    default:
      break;
  }
}
