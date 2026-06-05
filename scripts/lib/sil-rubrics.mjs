/**
 * sil-rubrics.mjs
 *
 * Local SIL v3 rubric shim used by closeout personalization. Scores remain
 * bounded to the canonical 10 categories × 100 model.
 */

export const SIL_CATEGORIES_V3 = [
  'devHealth',
  'creativeAlignment',
  'momentum',
  'engagement',
  'processQuality',
  'crossRepoCoherence',
  'securityPosture',
  'ecosystemIntegration',
  'capitalEfficiency',
  'automationCoverage',
];

export function getRubric(medium = 'unknown') {
  return {
    medium,
    maxScore: 1000,
    categories: SIL_CATEGORIES_V3,
    notes: medium === 'game'
      ? 'Game closeout weighs playable-loop evidence, launch confidence, input trust, and session automation integrity.'
      : 'Universal Studio OS SIL v3 rubric.',
  };
}

export default { getRubric, SIL_CATEGORIES_V3 };
