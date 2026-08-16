import { describe, expect, it } from "vitest";
import {
  LEGACY_MODE_IDS, MODE_RULES, applyModeRules, getExclusiveModeFlags,
  getModeRewardFlow, getModeRules, getModeWaveEffects, isBossWaveForMode,
  resolveModeId,
} from "./modeRules.js";

describe("modeRules legacy compatibility", () => {
  it("pins the eight replay-compatible legacy identifiers", () => {
    expect(LEGACY_MODE_IDS).toEqual([
      "standard", "score_attack", "daily_challenge", "cursed",
      "boss_rush", "speedrun", "gauntlet", "zombies",
    ]);
    expect(Object.keys(MODE_RULES)).toEqual(LEGACY_MODE_IDS);
    expect(Object.isFrozen(MODE_RULES.cursed.escalations)).toBe(true);
  });

  it("preserves flag priority and accepts runtime field names", () => {
    expect(resolveModeId({ zombiesMode: true })).toBe("zombies");
    expect(resolveModeId({ scoreAttack: true, zombies: true })).toBe("zombies");
    expect(resolveModeId({ dailyChallengeMode: true, bossRushMode: true })).toBe("boss_rush");
    expect(resolveModeId()).toBe("standard");
  });

  it("makes flags exclusive and falls back safely", () => {
    expect(getExclusiveModeFlags("boss_rush")).toEqual({
      scoreAttackMode: false, dailyChallengeMode: false, cursedRunMode: false,
      bossRushMode: true, speedrunMode: false, gauntletMode: false, zombiesMode: false,
    });
    expect(getModeRules("not-a-mode")).toBe(MODE_RULES.standard);
  });

  it("preserves score attack countdown and cursed score initialization", () => {
    expect(applyModeRules({ killScoreMult: 2 }, "score_attack")).toMatchObject({
      mode: "score_attack", scoreAttackMode: true,
      scoreAttackTimeLeft: 18000, killScoreMult: 2,
    });
    expect(applyModeRules({ killScoreMult: 2 }, "cursed")).toMatchObject({
      cursedRunMode: true, scoreAttackTimeLeft: 0, killScoreMult: 6,
    });
  });

  it("preserves boss cadence and reward gates", () => {
    expect(isBossWaveForMode("standard", 5)).toBe(true);
    expect(isBossWaveForMode("standard", 6)).toBe(false);
    expect(isBossWaveForMode("boss_rush", 3)).toBe(false);
    expect(isBossWaveForMode("boss_rush", 4)).toBe(true);
    expect(isBossWaveForMode("standard", 2, true)).toBe(true);
    expect(getModeRewardFlow("standard", 10)).toEqual({
      showRoute: true, showMutation: true, showShop: true, awardLevelPerks: true,
    });
    expect(getModeRewardFlow("daily_challenge", 10)).toEqual({
      showRoute: false, showMutation: false, showShop: true, awardLevelPerks: true,
    });
    expect(getModeRewardFlow("gauntlet", 10)).toEqual({
      showRoute: true, showMutation: false, showShop: false, awardLevelPerks: false,
    });
  });

  it("replays cursed escalations without mutating input", () => {
    const input = { waveEnemyMult: 1.5 };
    expect(getModeWaveEffects("cursed", 5, input)).toMatchObject({ mutAlwaysEnraged: true });
    expect(getModeWaveEffects("cursed", 25, input)).toMatchObject({ waveEnemyMult: 3 });
    expect(input).toEqual({ waveEnemyMult: 1.5 });
  });

  it("retains special seed, draft, timer, event, and outbreak contracts", () => {
    expect(MODE_RULES.daily_challenge).toMatchObject({ seedPolicy: "daily_fixed", draft: false, waveDirectorEvents: false });
    expect(MODE_RULES.gauntlet).toMatchObject({ seedPolicy: "weekly_fixed", fixedOpeningKit: true, shop: false });
    expect(MODE_RULES.speedrun.timer).toEqual({ direction: "up", limitFrames: null, timeoutEndsRun: false });
    expect(MODE_RULES.zombies.zombies).toBe(true);
  });
});
