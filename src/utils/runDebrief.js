import { WEAPONS } from "../constants.js";

function modeLabel({ scoreAttackMode, dailyChallengeMode, bossRushMode, cursedRunMode }) {
  if (bossRushMode) return "boss-rush";
  if (cursedRunMode) return "cursed";
  if (scoreAttackMode) return "score-attack";
  if (dailyChallengeMode) return "daily-challenge";
  return "standard";
}

function topWeapon(weaponKills = []) {
  const total = weaponKills.reduce((sum, value) => sum + (value || 0), 0);
  if (!total) return null;
  let bestIndex = 0;
  for (let i = 1; i < weaponKills.length; i += 1) {
    if ((weaponKills[i] || 0) > (weaponKills[bestIndex] || 0)) bestIndex = i;
  }
  return {
    weapon: WEAPONS[bestIndex],
    kills: weaponKills[bestIndex] || 0,
    share: (weaponKills[bestIndex] || 0) / total,
  };
}

function verdict({ score, wave }) {
  if (wave >= 35 || score >= 150000) return "legend-tier run";
  if (wave >= 25 || score >= 70000) return "breakout run";
  if (wave >= 15 || score >= 25000) return "stable run";
  if (wave >= 8 || score >= 10000) return "promising run";
  return "rebuild run";
}

function identity({ activePerks = [], bestStreak, crits, grenades, kills, weaponKills = [], scoreAttackMode, dailyChallengeMode, bossRushMode, cursedRunMode }) {
  const cursedCount = activePerks.filter(perk => perk?.cursed).length;
  const top = topWeapon(weaponKills);
  if (bossRushMode) return "boss hunter";
  if (cursedRunMode && cursedCount >= 2) return "cursed gambler";
  if (scoreAttackMode && bestStreak >= 25) return "streak chaser";
  if (dailyChallengeMode) return "seed racer";
  if (crits >= Math.max(12, kills * 0.3)) return "precision build";
  if (grenades >= 8) return "demolition build";
  if (bestStreak >= 40) return "momentum build";
  if (top?.share >= 0.58 && top.weapon?.name) return `${top.weapon.name.toLowerCase()} specialist`;
  if (activePerks.length >= 7) return "stacked generalist";
  return "balanced scavenger";
}

function pushUnique(list, text) {
  if (text && !list.includes(text)) list.push(text);
}

export function buildRunDebrief(input) {
  const {
    score = 0,
    kills = 0,
    wave = 1,
    bestStreak = 0,
    timeSurvived = 0,
    crits = 0,
    grenades = 0,
    missionsSummary = [],
    weaponKills = [],
    vsScore = null,
  } = input;

  const top = topWeapon(weaponKills);
  const completedMissions = missionsSummary.filter(mission => mission?.completed).length;
  const mode = modeLabel(input);
  const strengths = [];
  const actions = [];

  pushUnique(strengths, top?.weapon ? `${top.weapon.emoji} ${top.weapon.name} carried ${Math.round(top.share * 100)}% of your kills.` : "No single weapon dominated the run, which usually means the build stayed flexible.");
  pushUnique(strengths, bestStreak >= 25 ? `Kill-chain discipline was strong: best streak ${bestStreak}.` : `Momentum ceiling is still low: best streak ${bestStreak}.`);
  if (completedMissions > 0) pushUnique(strengths, `You cleared ${completedMissions} daily mission${completedMissions > 1 ? "s" : ""} during the run.`);
  else if (missionsSummary.length > 0) pushUnique(strengths, "No daily mission was completed; there is free progression left on the table.");
  pushUnique(strengths, `Mode context: ${mode}. Survival time ${Math.floor(timeSurvived / 60)}m ${String(timeSurvived % 60).padStart(2, "0")}s.`);

  if (vsScore != null && score < vsScore) pushUnique(actions, `Replay the same seed and target ${vsScore.toLocaleString()} points; the fastest improvement path is learning the same run, not randomizing immediately.`);

  if (wave < 10) pushUnique(actions, "Prioritize survival perks and max-HP tempo before greed picks; the run is ending before the build comes online.");
  else pushUnique(actions, "Stay alive long enough to complete the build; route and shop choices matter more now than raw aim alone.");

  if (top?.share >= 0.58 && top.weapon?.name) pushUnique(actions, `Lean harder into ${top.weapon.name}: upgrade it earlier and pair it with a second weapon that unlocks a synergy instead of splitting power evenly.`);
  else pushUnique(actions, "Commit to a two-weapon plan earlier so upgrades and synergies produce a clear identity instead of a flat generalist run.");

  if (bestStreak < 20 && kills >= 40) pushUnique(actions, "Play tighter around chain kills; score and survivability both improve when you keep the arena under control instead of trading damage.");
  if (grenades === 0) pushUnique(actions, "Use grenades as tempo tools, not panic buttons; unused cooldowns are lost damage and lost breathing room.");
  if (crits < Math.max(6, kills * 0.12)) pushUnique(actions, "Try a precision lane next run: stack crit-oriented perks or weapons so elite kills happen faster.");
  if (missionsSummary.length > 0 && completedMissions === 0) pushUnique(actions, "Pivot one decision per run toward an unfinished daily mission so progression advances even on failed pushes.");

  return {
    verdict: verdict(input),
    identity: identity(input),
    strengths: strengths.slice(0, 3),
    actions: actions.slice(0, 4),
  };
}
