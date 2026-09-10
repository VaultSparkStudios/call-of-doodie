import { describe, expect, it } from "vitest";
import {
  BOSS_GAUNTLET_BOSS_COUNT,
  BOSS_GAUNTLET_PAR_SECONDS,
  BOT_ROYALE_BOT_COUNT,
  EXTRACTION_ALARM_LOCK,
  PLAYER_FACING_MODE_FACTS,
  STANDARD_BOSS_WAVE_INTERVAL,
  THRONE_CAPTURE_SECONDS,
  THRONE_COUNT,
  spell,
} from "./modeFacts.js";
import { NEW_MODE_CATALOG, getMode } from "./modeCatalog.js";
import { FIELD_MANUAL_SECTIONS } from "../content/fieldManual.js";
import { BOT_ROYALE } from "../modes/botRoyale.js";
import { HOLD_THE_THRONE } from "../modes/holdTheThrone.js";
import { SEWER_EXTRACTION } from "../modes/sewerExtraction.js";
import { createModeState, stepMode } from "../systems/modeDefinition.js";
import { throneLayout } from "../systems/zones.js";
import { createSimState } from "../sim/stepSim.js";
import { QUICK_RULES } from "./quickRules.js";
import { getModeRules, isBossWaveForMode } from "../systems/modeRules.js";

const ctx = { W: 1280, H: 720 };

// The point of this court is NOT that the constants equal themselves. It is
// that each constant still equals the behavior the player actually meets, so
// changing the loop without changing the fact fails here rather than shipping
// a second, contradictory number into player-facing copy (S165 → S175).
describe("mode facts are bound to real runtime behavior", () => {
  it("BOT ROYALE drops exactly BOT_ROYALE_BOT_COUNT bots", () => {
    const gs = createSimState({ seed: 11 });
    createModeState(BOT_ROYALE, gs, ctx);
    const bots = gs.enemies.filter((enemy) => enemy?.isBot);
    expect(bots).toHaveLength(BOT_ROYALE_BOT_COUNT);
    expect(gs._royaleAlive).toBe(BOT_ROYALE_BOT_COUNT);
    // The mode publishes the count too — that surface must not drift either.
    expect(BOT_ROYALE.botCount).toBe(BOT_ROYALE_BOT_COUNT);
  });

  it("every royale bot gets a distinct id, so the count is real and not a duplicate", () => {
    const gs = createSimState({ seed: 12 });
    createModeState(BOT_ROYALE, gs, ctx);
    const ids = new Set(gs.enemies.filter((enemy) => enemy?.isBot).map((enemy) => enemy.id));
    expect(ids.size).toBe(BOT_ROYALE_BOT_COUNT);
  });

  it("HOLD THE THRONE lays out exactly THRONE_COUNT thrones", () => {
    expect(throneLayout(ctx.W, ctx.H)).toHaveLength(THRONE_COUNT);
    const gs = createSimState({ seed: 13 });
    createModeState(HOLD_THE_THRONE, gs, ctx);
    expect(gs.zones).toHaveLength(THRONE_COUNT);
  });

  it("a throne captures after THRONE_CAPTURE_SECONDS of hold, not a hand-typed 30", () => {
    const gs = createSimState({ seed: 14 });
    createModeState(HOLD_THE_THRONE, gs, ctx);
    const active = gs.zones.find((zone) => zone.active);
    expect(active.captureFrames).toBe(THRONE_CAPTURE_SECONDS * 60);
  });

  it("SEWER EXTRACTION locks the exit at EXTRACTION_ALARM_LOCK", () => {
    const gs = createSimState({ seed: 15 });
    createModeState(SEWER_EXTRACTION, gs, ctx);
    gs.pickups = [];
    gs.alarm = EXTRACTION_ALARM_LOCK;
    stepMode(gs, SEWER_EXTRACTION, ctx);
    expect(gs._extractLocked).toBe(true);
  });

  it("BOSS GAUNTLET par time is the published fact in seconds", () => {
    expect(BOSS_GAUNTLET_PAR_SECONDS).toBe(BOSS_GAUNTLET_BOSS_COUNT * 60);
  });

  it("standard survival really sends a boss every STANDARD_BOSS_WAVE_INTERVAL waves", () => {
    expect(getModeRules("standard").boss.interval).toBe(STANDARD_BOSS_WAVE_INTERVAL);
    // Behavioral, not just structural: the wave that the copy promises IS a boss wave.
    expect(isBossWaveForMode("standard", STANDARD_BOSS_WAVE_INTERVAL)).toBe(true);
    expect(isBossWaveForMode("standard", STANDARD_BOSS_WAVE_INTERVAL * 2)).toBe(true);
    expect(isBossWaveForMode("standard", STANDARD_BOSS_WAVE_INTERVAL - 1)).toBe(false);
  });

  it("the quick-reference boss line quotes the live cadence", () => {
    const line = QUICK_RULES.map((row) => row.join(" ")).join(" | ");
    expect(line).toContain(`Boss every ${STANDARD_BOSS_WAVE_INTERVAL} waves`);
  });
});

describe("player-facing copy quotes the facts, never a stale literal", () => {
  it("the royale catalog entry states the live bot count in both blurb and description", () => {
    const royale = getMode("bot_royale");
    expect(royale.blurb).toContain(String(BOT_ROYALE_BOT_COUNT));
    expect(royale.description).toContain(spell(BOT_ROYALE_BOT_COUNT));
    // The pre-S175 literals must be gone from both, not merely outnumbered.
    expect(royale.blurb).not.toMatch(/\b12\b/);
    expect(royale.description).not.toMatch(/twelve/i);
  });

  it("the field manual mode section quotes the live counts", () => {
    const [, body] = FIELD_MANUAL_SECTIONS.find(([title]) => title.startsWith("5."));
    expect(body).toContain(`${spell(BOT_ROYALE_BOT_COUNT)} bots`);
    expect(body).toContain(`${spell(BOSS_GAUNTLET_BOSS_COUNT)} bosses`);
    expect(body).toContain(`${spell(THRONE_COUNT)} points`);
    expect(body).not.toMatch(/twelve/i);
  });

  it("no NEW_MODE_CATALOG copy contradicts a fact it quotes", () => {
    // A mode blurb that names a fact's noun must not carry a different number.
    for (const mode of NEW_MODE_CATALOG) {
      const copy = `${mode.blurb} ${mode.description}`;
      for (const fact of PLAYER_FACING_MODE_FACTS) {
        if (!copy.includes(fact.noun)) continue;
        const stale = new Set([...copy.matchAll(/\b(\d+)\b/g)].map((match) => Number(match[1])));
        // Any number present must be a real published fact, not an orphan.
        for (const value of stale) {
          const known = PLAYER_FACING_MODE_FACTS.some((candidate) => candidate.value === value);
          expect(known, `${mode.id} copy quotes ${value}, which is not a published mode fact`).toBe(true);
        }
      }
    }
  });
});

describe("spell()", () => {
  it("spells every value the fact table publishes", () => {
    for (const fact of PLAYER_FACING_MODE_FACTS) {
      expect(typeof spell(fact.value)).toBe("string");
    }
  });

  it("throws rather than degrading to a numeral for an unmapped value", () => {
    expect(() => spell(17)).toThrow(/no spelled form/);
  });
});
