import { describe, expect, it } from "vitest";
import { applyObservedPlayerDamage, createDamageSequence, describeDamageSequence, finalizeDamageSequence, recordDamageEvent } from "./damageSequence.js";

describe("damage sequence receipt", () => {
  it("coalesces adjacent damage from the same source while bounding memory", () => {
    const sequence = createDamageSequence();
    for (let frame = 0; frame < 40; frame += 1) {
      recordDamageEvent(sequence, { frame, wave: 2, kind: "hazard", sourceName: "Acid pool", damage: 0.5, healthBefore: 100 - frame * 0.5, healthAfter: 99.5 - frame * 0.5 });
    }
    expect(sequence.events.length).toBe(2);
    expect(sequence.events.reduce((sum, event) => sum + event.hits, 0)).toBe(40);
  });

  it("classifies an observed burst without claiming causality", () => {
    const sequence = createDamageSequence();
    recordDamageEvent(sequence, { frame: 100, kind: "projectile", sourceType: 4, sourceName: "Karen", damage: 20, healthBefore: 100, healthAfter: 80 });
    recordDamageEvent(sequence, { frame: 180, kind: "boss", sourceType: 4, sourceName: "Karen", damage: 55, healthBefore: 55, healthAfter: 0 });
    const receipt = finalizeDamageSequence(sequence, { maxHealth: 100, finalFrame: 180 });
    expect(receipt).toMatchObject({ finishStyle: "burst", hitCount: 2, totalDamage: 75, finalTwoSecondDamage: 75 });
    expect(receipt.claim).toContain("not-causality");
    expect(describeDamageSequence(receipt)).toContain("burst finish");
  });

  it("distinguishes attrition across a long observed window", () => {
    const sequence = createDamageSequence();
    for (const frame of [100, 190, 280, 370, 460]) {
      recordDamageEvent(sequence, { frame, kind: "contact", sourceType: 1, sourceName: "Grunt", damage: 12, healthBefore: 80, healthAfter: 68 });
    }
    const receipt = finalizeDamageSequence(sequence, { maxHealth: 100, finalFrame: 460 });
    expect(receipt.finishStyle).toBe("attrition");
    expect(receipt.finalTwoSecondDamage).toBe(24);
  });

  it("preserves terminal health math while recording the observable HP delta", () => {
    const gs = { player: { health: 10 }, currentWave: 3, frameCount: 99, damageSequence: createDamageSequence() };
    const result = applyObservedPlayerDamage(gs, { damage: 25, kind: "mine", sourceName: "Proximity mine" });
    expect(result).toEqual({ healthBefore: 10, healthAfter: -15, damage: 25 });
    expect(gs.player.health).toBe(-15);
    expect(gs.damageSequence.events[0]).toMatchObject({ kind: "mine", damage: 10, wave: 3 });
  });

  it("sanitizes persisted source labels and caps event history", () => {
    const sequence = createDamageSequence();
    for (let index = 0; index < 20; index += 1) {
      recordDamageEvent(sequence, { frame: index * 5, kind: "unknown", sourceName: `bad\u0000${index}`, damage: 1, healthBefore: 100, healthAfter: 99 });
    }
    const receipt = finalizeDamageSequence(sequence, { finalFrame: 95 });
    expect(receipt.events).toHaveLength(12);
    expect(receipt.events.every((event) => !event.sourceName.includes("\u0000"))).toBe(true);
  });
});
