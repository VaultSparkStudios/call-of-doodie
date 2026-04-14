import { WEAPONS } from "../constants.js";

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getShopOptions(gs, wpnIdx) {
  const p = gs.player;
  const unblessedIdx = WEAPONS
    .map((_, i) => i)
    .filter(i => i !== wpnIdx && !(gs.weaponMods?.[i]?.blessed) && !(gs.weaponMods?.[i]?.cursed));
  const blessTarget = unblessedIdx.length > 0
    ? unblessedIdx[Math.floor(Math.random() * unblessedIdx.length)]
    : wpnIdx;
  const alreadyCursed = !!(gs.weaponMods?.[wpnIdx]?.cursed);

  return shuffle([
    { id: "health", emoji: "💊", name: "Field Medkit", desc: "Restore 50 HP", available: p.health < p.maxHealth },
    { id: "ammo", emoji: "📦", name: "Resupply Crate", desc: "Fully refill all weapons", available: true },
    { id: "upgrade", emoji: "🔧", name: "Field Upgrade", desc: `Upgrade ${WEAPONS[wpnIdx].emoji} (+1 ⭐)`, available: (gs.weaponUpgrades?.[wpnIdx] || 0) < 3 },
    { id: "speed", emoji: "👟", name: "Combat Stim", desc: "+10% move speed (permanent)", available: true },
    { id: "maxhp", emoji: "❤️", name: "HP Canister", desc: "+25 max HP (permanent)", available: true },
    { id: "damage", emoji: "🔥", name: "Damage Boost", desc: "+15% bullet damage", available: true },
    {
      id: `bless_${blessTarget}`,
      emoji: "✨",
      name: `Bless ${WEAPONS[blessTarget].emoji}`,
      desc: `${WEAPONS[blessTarget].name}: +30% dmg, 20% faster fire (permanent)`,
      available: gs.currentWave >= 3 && !(gs.weaponMods?.[blessTarget]?.blessed),
    },
    {
      id: `curse_${wpnIdx}`,
      emoji: "☠️",
      name: "Devil's Pact",
      desc: `Curse ${WEAPONS[wpnIdx].emoji} (−30% dmg) → gain +50 max HP`,
      available: gs.currentWave >= 4 && !alreadyCursed,
    },
  ].filter(option => option.available)).slice(0, 3);
}

export function getCoinShopOptions(gs) {
  const p = gs.player;
  return shuffle([
    { id: "cs_fullhp", emoji: "💖", name: "Full Restore", desc: "Restore to full HP", cost: 20, available: p.health < p.maxHealth },
    { id: "cs_nuke", emoji: "💣", name: "Pocket Nuke", desc: "Nuke all enemies on screen", cost: 28, available: true },
    { id: "cs_timedil", emoji: "⏳", name: "Bullet Time", desc: "6 seconds of time dilation", cost: 14, available: true },
    { id: "cs_grenade", emoji: "💥", name: "Grenade Restock", desc: "Grenade instantly ready", cost: 8, available: true },
    { id: "cs_extralife", emoji: "👼", name: "Guardian Angel", desc: "+1 extra life", cost: 45, available: true },
    { id: "cs_maxhp", emoji: "❤️‍🔥", name: "HP Augment", desc: "+30 permanent max HP", cost: 22, available: true },
    { id: "cs_ammo", emoji: "🔋", name: "Full Battery", desc: "Refill all weapons", cost: 10, available: true },
  ].filter(option => option.available)).slice(0, 3);
}
