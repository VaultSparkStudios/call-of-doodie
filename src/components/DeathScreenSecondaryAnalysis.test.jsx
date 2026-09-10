import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import DeathScreenSecondaryAnalysis from "./DeathScreenSecondaryAnalysis.jsx";
import { createPressureArc, finalizePressureArc, recordFormationExposure, recordPressureSnapshot } from "../systems/pressureArc.js";
import { createDamageSequence, finalizeDamageSequence, recordDamageEvent } from "../systems/damageSequence.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// S171: the model passed here mirrors every field DeathScreen.jsx wires into
// <SecondaryRunAnalysis model={{...}} /> (DeathScreen.jsx:719-726). A field the
// parent stops producing, or a rename either side misses, throws on render here
// before it can reach staging — this lazily-mounted panel previously had no
// coverage of its own (S171 audit item, carried since the S165-era backlog).
function buildMinimalModel(overrides = {}) {
  return {
    runModifier: null,
    card: {},
    buildGrade: {
      label: "Solid Run",
      grade: "B",
      breakdown: [{ id: "aggression", label: "AGGRESSION", value: 62 }],
    },
    weaponKills: [3, 0, 1],
    leaderboard: [],
    wave: 7,
    score: 4200,
    kills: 40,
    level: 5,
    bestStreak: 9,
    fmtTime: (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`,
    timeSurvived: 185,
    totalDamage: 9800,
    crits: 12,
    grenades: 2,
    insightGraph: { nodes: [{ id: "n1" }, { id: "n2" }], fingerprint: "abc123" },
    runNarrative: null,
    replayProofPresenter: null,
    runCoach: {
      killedBy: "a rushdown grunt",
      tryNext: "keep distance with the shotgun",
      working: "crowd control on chokepoints",
      weaponTip: null,
      weaponDeathTip: null,
      precisionTip: null,
      doctrineNearMissTip: null,
      crossRunTip: null,
      enemyLab: null,
      brain: { chokeWarning: null, nextExperiment: "try the flank route", followThrough: "not yet attempted" },
    },
    experimentMatched: null,
    nextContract: { title: "Clear wave 8 without a hit", progress: "0/1" },
    fairnessReceipt: null,
    wavePlanReceipt: null,
    performanceReceipt: null,
    debrief: {
      verdict: "Overextended",
      identity: "Shotgun rusher",
      strengths: ["Cleared early waves fast"],
      actions: ["Hold a chokepoint on wave 8"],
      missedValue: [],
      rematchPlan: [],
      nextRunContract: { focus: "Survival", target: "Reach wave 9", proof: "wave >= 9" },
    },
    collapseCoaching: {
      primary: { label: "COLLAPSE CAUSE", statement: "Got surrounded in the open" },
      contributingFactor: { label: "Contributing factor", statement: "No escape route used" },
    },
    postRunIntel: { drill: "Practice kiting on the next run.", callout: "Almost had it.", rivalry: null },
    runHistory: [{}],
    nextRunDrill: {
      id: "drill-1",
      title: "Hold the line",
      detail: "Stay near cover on wave 8.",
      action: "new_run",
      seed: 0,
      cta: "RUN THE FIX",
    },
    recordPlaytestChoice: () => {},
    mode: "survival",
    makeDrillLaunch: () => ({}),
    onStartGame: () => {},
    ...overrides,
  };
}

function buildSamplePressureReceipt() {
  let arc = createPressureArc();
  arc = recordPressureSnapshot(arc, { pressureBand: "stable", pressureRatio: 0.6, wave: 3, stageId: "pressure" });
  arc = recordPressureSnapshot(arc, { pressureBand: "overrun", pressureRatio: 1.4, wave: 5, stageId: "climax" });
  arc = recordFormationExposure(arc, { id: "pincer", lane: "left", role: "flanker" }, { wave: 5, stageId: "climax" });
  return finalizePressureArc(arc, { deathWave: 5 });
}

function buildSampleDamageReceipt() {
  let seq = createDamageSequence();
  seq = recordDamageEvent(seq, { amount: 12, source: "grunt", wave: 4 });
  seq = recordDamageEvent(seq, { amount: 30, source: "boss", wave: 5 });
  return finalizeDamageSequence(seq, { maxHealth: 100, finalFrame: { amount: 30, source: "boss" } });
}

describe("DeathScreenSecondaryAnalysis", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders every always-present section from a minimal model without crashing", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<DeathScreenSecondaryAnalysis model={buildMinimalModel()} />);
    });
    expect(container.querySelector('[data-testid="analysis-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="analysis-build-grade"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="analysis-run-stats"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="coach-evidence"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="analysis-tactical-debrief"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="analysis-run-intelligence"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="analysis-next-drill"]')).not.toBeNull();
    expect(container.textContent).toContain("Overextended");
  });

  it("renders every optional receipt when its model field is present", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const model = buildMinimalModel({
      fairnessReceipt: { seed: 42, fingerprint: "fp1", streamCount: 3, totalCalls: 120, streams: [{ key: "spawn", wave: 1, name: "spawn", calls: 40 }] },
      wavePlanReceipt: { count: 2, combinedFingerprint: "wp1", firstWave: 1, lastWave: 2 },
      performanceReceipt: { assisted: true, label: "PERFORMANCE ASSIST", slowPct: 4, p95Ms: 18, assistActivations: 1 },
      runHistory: [{ pressureReceipt: buildSamplePressureReceipt(), damageReceipt: buildSampleDamageReceipt() }],
    });
    await act(async () => {
      root = createRoot(container);
      root.render(<DeathScreenSecondaryAnalysis model={model} />);
    });
    expect(container.querySelector('[data-testid="fairness-receipt"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="wave-plan-receipt"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="performance-receipt"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pressure-arc-summary"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="formation-pressure-summary"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="damage-sequence-summary"]')).not.toBeNull();
  });
});
