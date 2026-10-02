// Act classification + turning-point detection for the death screen RUN ARC card.

function classifyAct(wave) {
  if (wave >= 35) return { act: "THE LEGEND", desc: "You pushed beyond wave 34 and kept the run alive." };
  if (wave >= 25) return { act: "THE PUSH", desc: "You cleared wave 24 and kept going." };
  if (wave >= 10) return { act: "THE GRIND", desc: "You cleared the early waves and kept the attempt moving." };
  return { act: "THE OPENER", desc: "The run ended before many upgrade choices could unfold." };
}

export function getRunAct(wave) {
  return classifyAct(wave).act;
}

export function buildRunNarrative({
  wave = 1,
  score: _score = 0,
  kills: _kills = 0,
  bestStreak = 0,
  nearDeathEvents = [],
  precisionPeakStreak = 0,
  bossKillCount = 0,
  flowStateFired = 0,
  timeSurvived: _timeSurvived = 0,
}) {
  const { act, desc: actDesc } = classifyAct(wave);
  const moments = [];

  if (nearDeathEvents.length >= 1) {
    const first = nearDeathEvents[0];
    moments.push({
      label: "LAST STAND",
      desc: `Dropped to ${first.hpLeft} HP on wave ${first.wave}${nearDeathEvents.length > 1 ? ` (${nearDeathEvents.length}× total near-deaths)` : ""}.`,
    });
  }

  if (precisionPeakStreak >= 5) {
    const flowNote = flowStateFired > 0 ? ` — triggered FLOW STATE ${flowStateFired}×` : "";
    moments.push({
      label: "AIM LOCKED",
      desc: `Peak ${precisionPeakStreak}× precision streak${flowNote}.`,
    });
  }

  if (bossKillCount >= 1) {
    moments.push({
      label: bossKillCount >= 3 ? "BOSS HUNTER" : "BOSS SLAYER",
      desc: `${bossKillCount} boss${bossKillCount === 1 ? "" : "es"} defeated in this run.`,
    });
  }

  if (bestStreak >= 20 && moments.length < 3) {
    moments.push({
      label: "CHAIN REACTION",
      desc: `${bestStreak}-kill streak at peak momentum.`,
    });
  }

  return { act, actDesc, moments: moments.slice(0, 3) };
}
