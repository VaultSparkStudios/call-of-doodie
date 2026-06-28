import { describe, expect, it, vi } from "vitest";
import { buildDeathScreenProps, buildScoreSubmitPlan, buildSubmitFallbackPayload } from "./deathFlow.js";

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
});

describe("buildScoreSubmitPlan", () => {
  it("resolves standard mode when no flags are set", () => {
    const { mode } = buildScoreSubmitPlan({});
    expect(mode).toBe("standard");
  });

  it("resolves daily_challenge when dailyChallenge flag is true", () => {
    const { mode } = buildScoreSubmitPlan({ flags: { dailyChallenge: true } });
    expect(mode).toBe("daily_challenge");
  });

  it("resolves score_attack over other modes by flag priority", () => {
    const { mode } = buildScoreSubmitPlan({ flags: { scoreAttack: true, dailyChallenge: true } });
    expect(mode).toBe("score_attack");
  });

  it("returns customSettings false when settings match defaults", () => {
    const defaults = { enemySpawnMult: 1, enemyHealthMult: 1, playerSpeedMult: 1 };
    const { customSettings } = buildScoreSubmitPlan({ settings: defaults, settingsDefaults: defaults });
    expect(customSettings).toBe(false);
  });

  it("returns customSettings true when a gameplay key differs from defaults", () => {
    const defaults = { enemySpawnMult: 1 };
    const { customSettings } = buildScoreSubmitPlan({
      settings: { enemySpawnMult: 2 },
      settingsDefaults: defaults,
    });
    expect(customSettings).toBe(true);
  });

  it("returns customSettings false when only non-gameplay keys differ", () => {
    const defaults = { volume: 0.8, enemySpawnMult: 1 };
    const { customSettings } = buildScoreSubmitPlan({
      settings: { volume: 0.5, enemySpawnMult: 1 },
      settingsDefaults: defaults,
    });
    expect(customSettings).toBe(false);
  });
});

describe("buildSubmitFallbackPayload", () => {
  it("returns a local submission payload with the correct surface", () => {
    const payload = buildSubmitFallbackPayload({ mode: "daily_challenge", difficulty: "hard", score: 5000, wave: 10, runSeed: 42 });
    expect(payload).toEqual({
      surface: "death_screen",
      mode: "daily_challenge",
      difficulty: "hard",
      score: 5000,
      wave: 10,
      seed: 42,
      submission: "local",
    });
  });

  it("uses safe defaults when called with no arguments", () => {
    const payload = buildSubmitFallbackPayload();
    expect(payload.submission).toBe("local");
    expect(payload.surface).toBe("death_screen");
    expect(payload.mode).toBe("standard");
    expect(payload.seed).toBeNull();
  });
});
