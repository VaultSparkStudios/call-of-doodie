#!/usr/bin/env node
/**
 * skill-profile.mjs
 *
 * Small public-repo resolver for Studio OS skill overlays. The canonical
 * profile catalog lives in private Studio Ops, but project skills call this
 * file before /start, /audit, /implement, and /closeout. Keep the local shim
 * deterministic so public sessions stay executable without private imports.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function detectMedium(repoRoot = ROOT) {
  const status = readJson(path.join(repoRoot, 'context', 'PROJECT_STATUS.json'), {});
  const manifest = readJson(path.join(repoRoot, 'context', 'STUDIO_MANIFEST.json'), {});
  return (
    status.type
    || manifest.identity?.type
    || (status.slug === 'call-of-doodie' ? 'game' : 'unknown')
  );
}

const GAME_PROFILE = {
  medium: 'game',
  extraSignals: [
    'Browser build/test parity is launch-critical for this public game.',
    'Prioritize playable-loop trust, input reliability, run feedback, and replay integrity.',
  ],
  successBar: [
    'Core game loop remains playable on keyboard/mouse and controller paths.',
    'Any player-facing copy follows acronym expansion rules on first use.',
    'No free-tier feature introduces studio-paid variable per-user cost.',
    'Protocol changes must keep /start, /audit, /implement, and /closeout executable from this repo.',
  ],
  preHooks: [],
  promptOverlay: [
    'Call-Of-Doodie is a deployed public-unlaunched browser game. Favor improvements that protect launch confidence, input fairness, comedic combat readability, and replay/leaderboard trust.',
    'When protocol automation breaks, repair it before adding larger gameplay scope because this repo depends on repeatable Studio OS sessions for launch hygiene.',
  ].join(' '),
  axisWeightDeltas: {
    gamification: 3,
    'gamification / engagement / immersion': 3,
    'ui / ux / user-experience': 2,
    'feature depth & refinement': 1.5,
    'ai / intelligence integration': 1.5,
  },
};

const EMPTY_PROFILE = {
  medium: 'unknown',
  extraSignals: [],
  successBar: [],
  preHooks: [],
  promptOverlay: '',
  axisWeightDeltas: {},
};

export function resolveSkillProfile(skill = 'unknown', repoRoot = ROOT) {
  const medium = detectMedium(repoRoot);
  const base = medium === 'game' ? GAME_PROFILE : EMPTY_PROFILE;
  return {
    skill,
    repoRoot,
    ...base,
    medium,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const skill = process.argv[2] || 'unknown';
  const profile = resolveSkillProfile(skill);
  console.log(JSON.stringify(profile, null, 2));
}

export default { resolveSkillProfile };
