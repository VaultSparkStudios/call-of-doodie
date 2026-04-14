export const BUILD_ARCHETYPES = [
  {
    id: "vanguard",
    name: "Vanguard",
    emoji: "🛡️",
    color: "#5EE6A8",
    perkIds: ["iron_gut", "vampire", "bloodlust", "parkour_pro", "last_resort", "combo_lifesteal"],
    unlockAt: 3,
    capstoneName: "Frontline Doctrine",
    capstoneDesc: "+8% damage reduction and +3% lifesteal.",
  },
  {
    id: "gunslinger",
    name: "Gunslinger",
    emoji: "🎯",
    color: "#FFD166",
    perkIds: ["eagle_eye", "penetrator", "overclocked", "bullet_hose", "overdrive", "crit_cascade", "tungsten_rounds"],
    unlockAt: 3,
    capstoneName: "Killbox Protocol",
    capstoneDesc: "+10% crit chance and 12% faster fire rate.",
  },
  {
    id: "demolitionist",
    name: "Demolitionist",
    emoji: "💣",
    color: "#FF7B5C",
    perkIds: ["grenadier", "grenade_chain", "pyromaniac", "dead_mans_hand", "scavenger"],
    unlockAt: 3,
    capstoneName: "Siegebreaker",
    capstoneDesc: "+12% damage and 20% faster grenade cooldown.",
  },
  {
    id: "tempo",
    name: "Tempo",
    emoji: "⚡",
    color: "#7FDBFF",
    perkIds: ["adrenaline", "turbo_boots", "combo_master", "magnetism", "hoarder", "adrenaline_rush"],
    unlockAt: 3,
    capstoneName: "Momentum Engine",
    capstoneDesc: "+15% combo duration, +20% pickup range, and 20% faster dash cooldown.",
  },
];

function perksById(activePerks = []) {
  return new Set(activePerks.map(perk => perk.id));
}

export function getArchetypeProgress(activePerks = []) {
  const owned = perksById(activePerks);
  return BUILD_ARCHETYPES.map(archetype => {
    const count = archetype.perkIds.filter(id => owned.has(id)).length;
    return {
      ...archetype,
      count,
      active: count > 0,
      unlocked: count >= archetype.unlockAt,
      remaining: Math.max(0, archetype.unlockAt - count),
    };
  }).sort((a, b) => b.count - a.count);
}

export function getDominantArchetype(activePerks = []) {
  const [first] = getArchetypeProgress(activePerks);
  if (!first || first.count === 0) return null;
  return first;
}

export function getNewlyUnlockedArchetypes(activePerks = [], unlockedIds = []) {
  const unlocked = new Set(unlockedIds);
  return getArchetypeProgress(activePerks).filter(archetype => archetype.unlocked && !unlocked.has(archetype.id));
}

export function getPerkArchetypeMatches(perk) {
  if (!perk?.id) return [];
  return BUILD_ARCHETYPES.filter(archetype => archetype.perkIds.includes(perk.id));
}

export function getShopRecommendation(archetypeId, optionId, currentWeapon) {
  switch (archetypeId) {
    case "vanguard":
      return optionId === "health" || optionId === "maxhp" || optionId.startsWith("curse_");
    case "gunslinger":
      return optionId === "upgrade" || optionId === "ammo" || optionId.startsWith("bless_");
    case "demolitionist":
      return optionId === "damage" || optionId === "ammo" || optionId === "cs_grenade" || optionId === "cs_nuke";
    case "tempo":
      return optionId === "speed" || optionId === "health" || optionId === "cs_timedil";
    default:
      return optionId === "upgrade" && currentWeapon >= 0;
  }
}

export function getRouteRecommendation(archetypeId, routeId) {
  switch (archetypeId) {
    case "vanguard":
      return routeId === "standard" || routeId === "boss_fork";
    case "gunslinger":
      return routeId === "boss_fork" || routeId === "mutation";
    case "demolitionist":
      return routeId === "mutation";
    case "tempo":
      return routeId === "standard" || routeId === "mutation";
    default:
      return routeId === "standard";
  }
}
