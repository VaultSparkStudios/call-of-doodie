import { describe, expect, it, vi } from "vitest";
import { buildDeathKillerInfo, buildDeathScreenProps } from "./deathFlow.js";

describe("buildDeathKillerInfo", () => {
  it("resolves killer from _deathKillerType first", () => {
    const gs = {
      _deathKillerType: 5,
      _lastDamageBy: 9,
      enemies: [{ type: 5, name: "Splitter" }, { type: 9, name: "Tank" }],
    };
    const { killerType, killerEnemy } = buildDeathKillerInfo(gs);
    expect(killerType).toBe(5);
    expect(killerEnemy.name).toBe("Splitter");
  });

  it("falls back to _lastDamageBy when _deathKillerType is absent", () => {
    const gs = {
      _lastDamageBy: 3,
      enemies: [{ type: 3, name: "Boss" }],
    };
    const { killerType, killerEnemy } = buildDeathKillerInfo(gs);
    expect(killerType).toBe(3);
    expect(killerEnemy.name).toBe("Boss");
  });

  it("returns null killerEnemy when no matching enemy exists", () => {
    const gs = { _deathKillerType: 7, enemies: [{ type: 2 }] };
    const { killerType, killerEnemy } = buildDeathKillerInfo(gs);
    expect(killerType).toBe(7);
    expect(killerEnemy).toBeNull();
  });

  it("returns nulls when gs has no damage attribution", () => {
    const { killerType, killerEnemy } = buildDeathKillerInfo({});
    expect(killerType).toBeNull();
    expect(killerEnemy).toBeNull();
  });

  it("handles null gs gracefully", () => {
    const { killerType, killerEnemy } = buildDeathKillerInfo(null);
    expect(killerType).toBeNull();
    expect(killerEnemy).toBeNull();
  });
});

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
