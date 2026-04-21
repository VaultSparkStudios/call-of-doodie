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
    doctrineForgeAt: 5,
    doctrineName: "Wall of Flesh",
    doctrineDesc: "Your commitment is irreversible. +15% damage reduction, lifesteal on every hit. You are the front line — stop running.",
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
    doctrineForgeAt: 5,
    doctrineName: "Glass Cannon Oath",
    doctrineDesc: "You've locked in. +20% crit damage, max fire rate bonus. No survivability perks will feel as good as your next kill.",
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
    doctrineForgeAt: 4,
    doctrineName: "Scorched Earth Compact",
    doctrineDesc: "Everything burns. +25% AOE radius, grenades chain twice as fast. The arena is a kill zone — own it.",
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
    doctrineForgeAt: 5,
    doctrineName: "Perpetual Motion Doctrine",
    doctrineDesc: "You never stop moving. Combo timers don't drop below 50% on dash. Speed is your armor — stopping is death.",
  },
];

function perksById(activePerks = []) {
  return new Set(activePerks.map(perk => perk.id));
}

function getArchetypeMilestoneState(archetype, count) {
  const maxCount = archetype.perkIds.length;
  const forgeAt = archetype.doctrineForgeAt ?? archetype.unlockAt + 2;

  if (count <= 0) {
    return {
      statusLabel: "UNFORMED",
      statusDetail: `No ${archetype.name.toLowerCase()} lane yet. One aligned perk starts the doctrine.`,
      nextMilestoneAt: 1,
      nextMilestoneLabel: "Lane identified",
      doctrineForged: false,
    };
  }
  if (count < archetype.unlockAt) {
    return {
      statusLabel: "FORMING",
      statusDetail: `${archetype.unlockAt - count} more aligned perk${archetype.unlockAt - count === 1 ? "" : "s"} to activate ${archetype.capstoneName}.`,
      nextMilestoneAt: archetype.unlockAt,
      nextMilestoneLabel: archetype.capstoneName,
      doctrineForged: false,
    };
  }
  if (count < forgeAt) {
    return {
      statusLabel: "CAPSTONE ONLINE",
      statusDetail: archetype.capstoneDesc,
      nextMilestoneAt: forgeAt,
      nextMilestoneLabel: archetype.doctrineName,
      doctrineForged: false,
    };
  }
  if (count < maxCount) {
    return {
      statusLabel: "DOCTRINE FORGED",
      statusDetail: archetype.doctrineDesc,
      nextMilestoneAt: maxCount,
      nextMilestoneLabel: "Full Mastery",
      doctrineForged: true,
    };
  }
  return {
    statusLabel: "MASTERED",
    statusDetail: `${archetype.name} — every perk online. ${archetype.doctrineDesc}`,
    nextMilestoneAt: null,
    nextMilestoneLabel: "Complete",
    doctrineForged: true,
  };
}

/**
 * Returns the ordered milestone roadmap for a given archetype so the PauseMenu
 * can render a progress track.
 */
export function getDoctrineMilestones(archetype) {
  const forgeAt = archetype.doctrineForgeAt ?? archetype.unlockAt + 2;
  return [
    { at: 1,                label: "Lane Identified",      tier: "forming" },
    { at: archetype.unlockAt, label: archetype.capstoneName, tier: "capstone" },
    { at: forgeAt,          label: archetype.doctrineName,  tier: "doctrine" },
    { at: archetype.perkIds.length, label: "Mastered",     tier: "mastered" },
  ];
}

export function getArchetypeProgress(activePerks = []) {
  const owned = perksById(activePerks);
  return BUILD_ARCHETYPES.map(archetype => {
    const count = archetype.perkIds.filter(id => owned.has(id)).length;
    const milestone = getArchetypeMilestoneState(archetype, count);
    return {
      ...archetype,
      count,
      active: count > 0,
      unlocked: count >= archetype.unlockAt,
      remaining: Math.max(0, archetype.unlockAt - count),
      ...milestone,
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
