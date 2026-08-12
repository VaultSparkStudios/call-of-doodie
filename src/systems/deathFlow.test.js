import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildDeathCoachTelemetry, buildDeathScreenProps, buildDebriefStudioEventPlan, buildRunTheFixContract, buildScoreSubmitFallbackStudioEvent } from "./deathFlow.js";

describe("buildDeathScreenProps", () => {
  it("carries an inspectable live fairness receipt without claiming full replay proof", () => {
    const gs = { runSeed: 404, currentWave: 3 };
    const props = buildDeathScreenProps({ runSeed: 404, gs });
    expect(props.fairnessReceipt).toMatchObject({
      seed: 404,
      contract: "deterministic-decision-stream-evidence-not-full-physics-replay",
    });
    expect(props.fairnessReceipt.fingerprint).toMatch(/^[0-9A-F]{8}$/);
    expect(props.gsSnapshot).toBe(gs);
  });

  it("promotes a seeded corrective REMATCH into the single primary action", () => {
    const contract = buildRunTheFixContract({
      debrief: {
        collapseReason: "You got pinned between a ranged lane and the wall.",
        nextRunContract: {
          focus: "SPACE FIRST",
          target: "Clear the death wave without touching the outer wall.",
          proof: "Win condition: clear wave 8 with one dash still ready.",
        },
      },
      nextRunDrill: { id: "spacing", title: "Spacing drill", cta: "TRY AGAIN" },
      runSeed: 77,
      wave: 8,
      rematchWave: 8,
    });

    expect(contract.action).toEqual({
      type: "rematch",
      label: "RUN THE FIX · REMATCH W8",
      seed: 77,
      startWave: 8,
    });
    expect(contract.focusOrder).toEqual(["run_the_fix", "secondary_analysis", "more_run_actions"]);
  });

  it("uses a clean new-run action for a wave-one collapse", () => {
    const contract = buildRunTheFixContract({
      debrief: { nextRunContract: { focus: "SAFE OPENER" } },
      nextRunDrill: { title: "Reset the opener", cta: "DEPLOY AGAIN" },
      runSeed: 44,
      wave: 1,
      rematchWave: null,
    });

    expect(contract.action).toEqual({ type: "new_run", label: "DEPLOY AGAIN" });
    expect(contract.focus).toBe("SAFE OPENER");
  });

  it("falls back honestly when run evidence is sparse", () => {
    const contract = buildRunTheFixContract({});

    expect(contract).toMatchObject({
      diagnosis: "pressure breakdown",
      focus: "Stabilize the opener",
      target: "Survive one more wave with one deliberate adjustment.",
      proof: "Win condition: finish the target and bank the result.",
      secondaryDisclosureLabel: "OPEN RUN ANALYSIS",
    });
  });

  it("keeps keyboard focus order primary-first with disclosures after it", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "..", "components", "DeathScreen.jsx"), "utf8");
    const primary = source.indexOf('data-focus-order="run_the_fix"');
    const analysis = source.indexOf('data-focus-order="secondary_analysis"');
    const moreActions = source.indexOf('data-focus-order="more_run_actions"');

    expect(primary).toBeGreaterThan(-1);
    expect(analysis).toBeGreaterThan(primary);
    expect(moreActions).toBeGreaterThan(analysis);
    expect(source).toContain('data-testid="run-the-fix"');
    expect(source).toContain("<summary");
    expect(source).toContain("onMenu(debrief.nextRunContract)");
  });

  it("renders the revenge brief before one collapsed secondary analysis block", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "..", "components", "DeathScreen.jsx"), "utf8");
    const challenge = source.indexOf("{/* Challenge result card */}");
    const brief = source.indexOf("{revengeBrief}", challenge);
    const analysis = source.indexOf('data-testid="secondary-run-analysis"', brief);
    const buildGrade = source.indexOf("BUILD GRADE", analysis);
    const runDna = source.indexOf("RUN DNA", analysis);

    expect(challenge).toBeGreaterThan(-1);
    expect(brief).toBeGreaterThan(challenge);
    expect(analysis).toBeGreaterThan(brief);
    expect(buildGrade).toBeGreaterThan(analysis);
    expect(runDna).toBeGreaterThan(analysis);
    expect(source).not.toContain("autoFocus");
  });

  it("maps death screen state without reaching into React", () => {
    const onStartGame = vi.fn();
    const props = buildDeathScreenProps({
      score: 1200,
      kills: 12,
      deaths: 1,
      wave: 5,
      level: 3,
      stats: { crits: 7, grenades: 2, bestPrecisionStreak: 4 },
      runModifier: "double",
      runModifiers: [{ id: "double", name: "Double Trouble" }],
      onStartGame,
      gs: {
        _precisionPeakFrame: 42,
        _precisionPeakStreak: 6,
        proximityRivals: [{ name: "Rival", score: 1300 }],
        _nearDeathEvents: [{ wave: 4 }],
        _flowStateFiredCount: 2,
        playerSkin: "gold",
        _ghostKey: "cod-ghost-normal-v1",
        _waveScoreLog: [{ wave: 5, score: 1200 }],
      },
      challengeVsScore: 1500,
      challengeVsName: "Rival",
      performanceReceipt: { assisted: true, slowPct: 22 },
    });

    expect(props).toMatchObject({
      score: 1200,
      crits: 7,
      grenades: 2,
      bestPrecisionStreak: 4,
      runModifier: { id: "double", name: "Double Trouble" },
      precisionPeakFrame: 42,
      precisionPeakStreak: 6,
      flowStateFired: 2,
      playerSkin: "gold",
      ghostKey: "cod-ghost-normal-v1",
      vsScore: 1500,
      vsName: "Rival",
      performanceReceipt: { assisted: true, slowPct: 22 },
    });
    expect(props.onStartGame).toBe(onStartGame);
    expect(props.proximityRivals).toHaveLength(1);
    expect(props.nearDeathEvents).toHaveLength(1);
    expect(props.waveScoreLog).toHaveLength(1);
  });

  it("uses safe defaults for optional run evidence", () => {
    const props = buildDeathScreenProps({ runModifier: "missing", runModifiers: [] });

    expect(props.runModifier).toBeNull();
    expect(props.bestPrecisionStreak).toBe(0);
    expect(props.precisionPeakFrame).toBe(0);
    expect(props.proximityRivals).toEqual([]);
    expect(props.nearDeathEvents).toEqual([]);
    expect(props.waveScoreLog).toEqual([]);
  });
  it("builds debrief coaching telemetry from visible coach surfaces", () => {
    const telemetry = buildDeathCoachTelemetry({
      postRunTelemetry: { surface: "death_screen", cause: "cornered" },
      eventDigest: { v: 2 },
      runCoach: {
        weaponTip: "Keep the shotgun for close mobs.",
        weaponDeathTip: "You died to ranged threats with a short-range build.",
        precisionTip: "Hold aim through the beat window.",
        crossRunTip: "Gym Bro keeps ending runs.",
        enemyLab: { pressure: "high" },
        brain: { chokeWarning: { wave: 12, tip: "Wave 12 deletes most runs." } },
      },
    });

    expect(telemetry).toMatchObject({
      surface: "death_screen",
      cause: "cornered",
      digestVersion: 2,
      weaponDeathTip: "You died to ranged threats with a short-range build.",
      chokeWarning: { wave: 12, tip: "Wave 12 deletes most runs." },
      coaching: {
        weaponTipShown: true,
        weaponMismatchShown: true,
        precisionTipShown: true,
        crossRunPatternShown: true,
        enemyLabShown: true,
        chokeWarningShown: true,
      },
    });
  });
  it("carries the insight-graph agent projection through to debrief telemetry", () => {
    const agentProjection = { schemaVersion: "run-insight-graph-v1", claim: "evidence-ranked-coaching-not-causality", verdict: { statement: "test" } };
    const telemetry = buildDeathCoachTelemetry({
      postRunTelemetry: { surface: "death_screen" },
      insightAgentProjection: agentProjection,
    });

    expect(telemetry.insightAgentProjection).toEqual(agentProjection);
  });
  it("builds debrief Studio event plans from visible death-screen truth", () => {
    const plan = buildDebriefStudioEventPlan({
      debriefTelemetry: { surface: "death_screen", cause: "cornered" },
      nextRunDrill: { id: "drill-1", action: "Replay the seed", seed: 77 },
      contractProgress: { contractId: "seed-week", seed: 77, score: 1200, wave: 8, progressLabel: "1 seeded run" },
      rivalryResult: { seed: 77, result: "won", delta: 200 },
      mode: "daily_challenge",
      score: 1200,
      wave: 8,
    });

    expect(plan.events.map((event) => event.type)).toEqual([
      "debrief_intelligence",
      "next_run_drill_shown",
      "weekly_contract_progress",
      "rivalry_result",
    ]);
    expect(plan.contractProgressKey).toBe("seed-week:77:1200:8");
    expect(plan.debriefEventKey).toBe("daily_challenge:1200:8:drill-1:cornered");
    expect(plan.analyticsPayload.studioEvent.type).toBe("debrief_intelligence");
    expect(plan.events[1].payload).toMatchObject({ drillId: "drill-1", mode: "daily_challenge", score: 1200 });
  });

  it("builds local score-submit fallback events without inline component payloads", () => {
    const event = buildScoreSubmitFallbackStudioEvent({
      mode: "boss_rush",
      difficulty: "hard",
      score: 2200,
      wave: 11,
      runSeed: 99,
    });

    expect(event.type).toBe("score_submit_result");
    expect(event.surface).toBe("death_screen");
    expect(event.payload).toMatchObject({
      mode: "boss_rush",
      difficulty: "hard",
      score: 2200,
      wave: 11,
      seed: 99,
      submission: "local",
    });
  });
});
