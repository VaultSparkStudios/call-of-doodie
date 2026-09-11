// Perk-to-perk synergy detection.
//
// Derived from the `apply` functions in constants.js: each entry captures the
// DIRECTIONAL relationship "picking `candidate` while `partners[i]` is already
// in the build triggers an extra bonus". The direction matters — the bonus only
// fires when the perk that does the checking is the one being picked.
//
// Used at perk-selection time to show "⚡ SYNERGY ACTIVE" badges in PerkModal
// before the player commits to a choice.

const DIRECT_SYNERGY_MAP = {
  eagle_eye: [
    { partners: ["penetrator", "tungsten_rounds"], label: "+10% crit" },
  ],
  grenadier: [
    { partners: ["pyromaniac"], label: "+50% grenade dmg" },
  ],
  vampire: [
    { partners: ["chain_lightning"], label: "+6% lifesteal" },
    { partners: ["last_resort"], label: "+4% lifesteal & +10% crit" },
  ],
  combo_master: [
    { partners: ["vampire"], label: "lifesteal×2 on combo" },
  ],
  magnetism: [
    { partners: ["hoarder"], label: "5× pickup range" },
  ],
  // hoarder intentionally absent: hoarder.apply() multiplies by 1.8 only; the 5× path lives in magnetism.apply()
  adrenaline: [
    { partners: ["turbo_boots"], label: "rush extends to 4s" },
    { partners: ["parkour_pro"], label: "dash CD −40%" },
  ],
  parkour_pro: [
    { partners: ["adrenaline"], label: "dash CD −40%" },
  ],
  penetrator: [
    { partners: ["eagle_eye"], label: "+10% crit" },
    { partners: ["bloodlust"], label: "+12% lifesteal per pierce" },
  ],
  bloodlust: [
    { partners: ["vampire"], label: "+15% lifesteal" },
    { partners: ["penetrator", "tungsten_rounds"], label: "+12% lifesteal per pierce" },
  ],
  turbo_boots: [
    { partners: ["adrenaline"], label: "+20% speed & 4s rush" },
  ],
  chain_lightning: [
    { partners: ["vampire"], label: "+6% lifesteal" },
  ],
  dead_mans_hand: [
    { partners: ["last_resort"], label: "explosion triples" },
  ],
  last_resort: [
    { partners: ["vampire"], label: "+4% lifesteal & +10% crit" },
    { partners: ["overclocked"], label: "+25% damage at low HP" },
  ],
  overclocked: [
    { partners: ["scavenger"], label: "reloads drop ammo" },
    { partners: ["grenade_chain"], label: "reloads throw grenade" },
    { partners: ["last_resort"], label: "+25% damage at low HP" },
  ],
  scavenger: [
    { partners: ["overclocked"], label: "reloads drop ammo" },
    { partners: ["deep_pockets"], label: "+30% ammo & 50% more drops" },
  ],
  deep_pockets: [
    { partners: ["scavenger"], label: "+30% ammo & 50% more drops" },
    { partners: ["bullet_hose"], label: "+50% extra ammo" },
  ],
  bullet_hose: [
    { partners: ["deep_pockets"], label: "+50% extra ammo" },
  ],
  crit_cascade: [
    { partners: ["eagle_eye"], label: "+10% crit" },
    { partners: ["penetrator", "tungsten_rounds"], label: "+8% crit" },
    { partners: ["glass_mind"], label: "crits grant +10 XP" },
  ],
  grenade_chain: [
    { partners: ["pyromaniac"], label: "+50% grenade dmg" },
    { partners: ["overclocked"], label: "reloads throw grenade" },
  ],
  pyromaniac: [
    { partners: ["grenadier"], label: "+50% grenade dmg" },
  ],
};

/**
 * Returns the synergy bonuses that would immediately activate if `candidatePerk`
 * were added to the given `activePerks` set. Returns an empty array when there
 * are no live synergy partners in the build.
 *
 * @param {{ id: string } | null | undefined} candidatePerk
 * @param {Array<{ id: string }>} activePerks
 * @returns {Array<{ partnerId: string, label: string }>}
 */
export function getActiveSynergiesForPick(candidatePerk, activePerks) {
  if (!candidatePerk?.id) return [];
  const rules = DIRECT_SYNERGY_MAP[candidatePerk.id];
  if (!rules || !activePerks?.length) return [];

  const activeIds = new Set(activePerks.map((p) => p.id));
  const results = [];

  for (const rule of rules) {
    const matchedPartnerId = rule.partners.find((id) => activeIds.has(id));
    if (matchedPartnerId) {
      results.push({ partnerId: matchedPartnerId, label: rule.label });
    }
  }

  return results;
}
