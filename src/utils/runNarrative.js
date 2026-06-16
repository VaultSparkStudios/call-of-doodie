// Act classification + turning-point detection for the death screen RUN ARC card.

function classifyAct(wave) {
  if (wave >= 35) return { act: "THE LEGEND", desc: "You pushed into territory most players never see." };
  if (wave >= 25) return { act: "THE PUSH", desc: "Past the mid-game wall — the run had real legs." };
  if (wave >= 10) return { act: "THE GRIND", desc: "The build came online but the pressure kept rising." };
  return { act: "THE OPENER", desc: "The run ended before the build found its identity." };
}

export function getRunAct(wave) {
  return classifyAct(wave).act;
}

export function buildRunNarrative({
  wave = 1,
  _score = 0,
  _kills = 0,
  bestStreak = 0,
  nearDeathEvents = [],
  precisionPeakStreak = 0,
  bossKillCount = 0,
  flowStateFired = 0,
  _timeSurvived = 0,
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
      desc: `${bossKillCount} boss${bossKillCount === 1 ? "" : "es"} defeated including phase-two pressure.`,
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
