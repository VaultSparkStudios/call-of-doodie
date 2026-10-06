// skill-profile.mjs — resolve per-medium skill overlays (audit item #12 · S125)
// Pairs with ~/.claude/skills/PROFILES/<medium>.json

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getProjectProfile } from './project-profile.mjs';
import { MEDIA_SKILL_PROFILES, projectMedium } from './media-profile.mjs';
import { lifecycleSkillOverlay } from './lifecycle-skill-profile.mjs';

const PROFILES_DIR = join(homedir(), '.claude', 'skills', 'PROFILES');

const EMPTY = { extraSignals: [], successBarAdditions: [], axisWeightDeltas: {}, preHooks: [], postHooks: [], promptOverlay: '' };

export function getSkillProfile(skill, medium) {
  if (!skill || !medium) return EMPTY;
  if (projectMedium({ medium }) === 'media') return { ...EMPTY, ...(MEDIA_SKILL_PROFILES[skill] || {}) };
  const p = join(PROFILES_DIR, `${medium}.json`);
  if (!existsSync(p)) return EMPTY;
  try {
    const overlay = JSON.parse(readFileSync(p, 'utf8'));
    return { ...EMPTY, ...(overlay.skills?.[skill] || {}) };
  } catch { return EMPTY; }
}

export function applySkillProfile(skill, baseConfig = {}) {
  const profile = getProjectProfile();
  const overlay = getSkillProfile(skill, profile.medium);
  const lifecycle = lifecycleSkillOverlay(skill, profile.lifecycleFocus);
  const axisWeights = { ...(baseConfig.axisWeights || {}), ...overlay.axisWeightDeltas };
  for (const [axis, weight] of Object.entries(lifecycle.axisWeightDeltas)) axisWeights[axis] = Math.max(axisWeights[axis] || 0, weight);
  return {
    ...baseConfig,
    profile,
    overlay,
    signals: [...(baseConfig.signals || []), ...overlay.extraSignals, ...lifecycle.extraSignals],
    successBar: [...(baseConfig.successBar || []), ...overlay.successBarAdditions, ...lifecycle.successBarAdditions],
    axisWeights,
    preHooks: [...(baseConfig.preHooks || []), ...overlay.preHooks],
    postHooks: [...(baseConfig.postHooks || []), ...overlay.postHooks],
    lifecycleFocus: profile.lifecycleFocus,
    promptOverlay: [baseConfig.promptOverlay, overlay.promptOverlay, lifecycle.promptOverlay].filter(Boolean).join(' '),
  };
}

// CLI: `node scripts/lib/skill-profile.mjs <skill>` → prints resolved overlay
const __isMain = (() => {
  try {
    const u = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '').replace(/\\/g, '/');
    const a = (process.argv[1] || '').replace(/\\/g, '/');
    return u === a || u.endsWith(a) || a.endsWith(u);
  } catch { return false; }
})();
if (__isMain) {
  const skill = process.argv[2] || 'start';
  const cfg = applySkillProfile(skill);
  console.log(JSON.stringify({ skill, medium: cfg.profile.medium, lifecycleFocus: cfg.lifecycleFocus, signals: cfg.signals, successBar: cfg.successBar, axisWeights: cfg.axisWeights, promptOverlay: cfg.promptOverlay }, null, 2));
}
