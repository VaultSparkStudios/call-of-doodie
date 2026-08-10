import { describe, expect, it } from "vitest";
import {
  createWhisperLedger,
  selectTacticalWhisper,
  WHISPER_COOLDOWN_FRAMES,
  WHISPER_MAX_PER_WAVE,
} from "./tacticalWhisper.js";

const rival = (delta) => ({ name: "Ghost", delta, ahead: delta >= 0 });

describe("tactical whisper selector (S145)", () => {
  it("returns nothing with no signals", () => {
    expect(selectTacticalWhisper({ frame: 5000, ledger: createWhisperLedger() })).toBeNull();
  });

  it("prioritizes repeated-damage pattern over rival pace", () => {
    const whisper = selectTacticalWhisper({
      frame: 5000,
      ledger: createWhisperLedger(),
      recentDamageKinds: ["contact", "contact", "contact"],
      rivalPace: rival(2000),
    });
    expect(whisper.kind).toBe("damage:contact");
    expect(whisper.text).toContain("DASH");
  });

  it("whispers rival pace only on meaningful swings", () => {
    const small = selectTacticalWhisper({ frame: 5000, ledger: createWhisperLedger(), rivalPace: rival(120) });
    expect(small).toBeNull();
    const big = selectTacticalWhisper({ frame: 5000, ledger: createWhisperLedger(), rivalPace: rival(-1200) });
    expect(big.kind).toBe("rival:behind");
  });

  it("surfaces a critical-health disengage whisper instead of a rival prompt at low health", () => {
    const whisper = selectTacticalWhisper({ frame: 5000, ledger: createWhisperLedger(), rivalPace: rival(2000), health: 20, maxHealth: 100 });
    expect(whisper.kind).toBe("critical-health");
    expect(whisper.text).toContain("DISENGAGE");
  });

  it("does not surface a critical-health whisper above the threshold", () => {
    const whisper = selectTacticalWhisper({ frame: 5000, ledger: createWhisperLedger(), health: 50, maxHealth: 100 });
    expect(whisper).toBeNull();
  });

  it("never repeats the critical-health whisper back-to-back within the same wave", () => {
    const ledger = createWhisperLedger();
    const first = selectTacticalWhisper({ frame: 5000, ledger, health: 20, maxHealth: 100 });
    expect(first.kind).toBe("critical-health");
    const repeat = selectTacticalWhisper({ frame: 5000 + WHISPER_COOLDOWN_FRAMES + 1, ledger, health: 15, maxHealth: 100 });
    expect(repeat).toBeNull();
  });

  it("still prioritizes repeated-damage pattern over critical health", () => {
    const whisper = selectTacticalWhisper({
      frame: 5000,
      ledger: createWhisperLedger(),
      recentDamageKinds: ["contact", "contact", "contact"],
      health: 10,
      maxHealth: 100,
    });
    expect(whisper.kind).toBe("damage:contact");
  });

  it("surfaces a doctrine near-miss when one perk remains", () => {
    const whisper = selectTacticalWhisper({
      frame: 5000,
      ledger: createWhisperLedger(),
      doctrineProgress: { id: "trench", label: "Trench Doctrine", remaining: 1, nextPerk: "Fortify" },
    });
    expect(whisper.kind).toBe("doctrine:trench");
    expect(whisper.text).toContain("FORTIFY");
  });

  it("enforces the cooldown between whispers", () => {
    const ledger = createWhisperLedger();
    const first = selectTacticalWhisper({ frame: 5000, ledger, rivalPace: rival(900) });
    expect(first).not.toBeNull();
    const tooSoon = selectTacticalWhisper({ frame: 5000 + WHISPER_COOLDOWN_FRAMES - 1, ledger, doctrineProgress: { id: "x", label: "X", remaining: 1, nextPerk: "Y" } });
    expect(tooSoon).toBeNull();
    const later = selectTacticalWhisper({ frame: 5000 + WHISPER_COOLDOWN_FRAMES, ledger, doctrineProgress: { id: "x", label: "X", remaining: 1, nextPerk: "Y" } });
    expect(later).not.toBeNull();
  });

  it("caps whispers per wave and resets on a new wave", () => {
    const ledger = createWhisperLedger();
    let frame = 0;
    for (let i = 0; i < WHISPER_MAX_PER_WAVE; i += 1) {
      frame += WHISPER_COOLDOWN_FRAMES + 1;
      const whisper = selectTacticalWhisper({ frame, wave: 2, ledger, rivalPace: rival(i % 2 === 0 ? 900 : -900) });
      expect(whisper).not.toBeNull();
    }
    frame += WHISPER_COOLDOWN_FRAMES + 1;
    expect(selectTacticalWhisper({ frame, wave: 2, ledger, rivalPace: rival(9000) })).toBeNull();
    expect(selectTacticalWhisper({ frame, wave: 3, ledger, rivalPace: rival(9000) })).not.toBeNull();
  });

  it("never repeats the same whisper kind back-to-back", () => {
    const ledger = createWhisperLedger();
    const first = selectTacticalWhisper({ frame: 5000, ledger, rivalPace: rival(900) });
    expect(first.kind).toBe("rival:ahead");
    const repeat = selectTacticalWhisper({ frame: 5000 + WHISPER_COOLDOWN_FRAMES + 1, ledger, rivalPace: rival(950) });
    expect(repeat).toBeNull();
  });
});
