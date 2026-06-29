import { describe, expect, it, vi } from "vitest";
import { buildDeathCoachTelemetry, buildDeathScreenProps } from "./deathFlow.js";

describe("buildDeathScreenProps", () => {
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
});

