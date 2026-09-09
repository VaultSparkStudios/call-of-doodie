import { describe, expect, it } from "vitest";
import { describeDeathAttribution, resolveDeathAttribution } from "./deathAttribution.js";
import { applyObservedPlayerDamage, createDamageSequence } from "./damageSequence.js";

function state({ enemies = [], events = [] } = {}) {
  const gs = { player: { x: 100, y: 100, health: 100 }, enemies, damageSequence: createDamageSequence() };
  for (const event of events) applyObservedPlayerDamage(gs, event);
  return gs;
}

describe("death attribution (S167)", () => {
  it("prefers the last observed damage event and reports it as observed evidence", () => {
    const gs = state({
      enemies: [{ typeIndex: 1, name: "Grunt", x: 105, y: 100 }, { typeIndex: 4, name: "Karen", x: 900, y: 900, isBossEnemy: true }],
      events: [
        { damage: 20, frame: 100, kind: "contact", sourceType: 1, sourceName: "Grunt" },
        { damage: 80, frame: 400, kind: "boss", sourceType: 4, sourceName: "Karen ground slam" },
      ],
    });
    const attribution = resolveDeathAttribution(gs);
    expect(attribution).toMatchObject({ typeIndex: 4, sourceName: "Karen ground slam", kind: "boss", evidenceLevel: "observed", basis: "damage-sequence", boss: true, hazard: false });
    expect(describeDeathAttribution(attribution)).toBe("The last recorded damage came from Karen ground slam.");
  });

  it("names a non-enemy hazard instead of blaming the nearest bot", () => {
    const gs = state({
      enemies: [{ typeIndex: 2, name: "rentfree", x: 110, y: 100, isBot: true }],
      events: [{ damage: 100, frame: 900, kind: "hazard", sourceName: "Sewer flood" }],
    });
    const attribution = resolveDeathAttribution(gs);
    expect(attribution).toMatchObject({ typeIndex: null, sourceName: "Sewer flood", kind: "hazard", hazard: true, evidenceLevel: "observed" });
    expect(describeDeathAttribution(attribution)).toBe("The last recorded damage came from Sewer flood (hazard).");
  });

  it("falls back to the nearest LIVE enemy by typeIndex and labels it a hypothesis", () => {
    const gs = state({
      enemies: [
        { typeIndex: 7, name: "Retired", x: 101, y: 100, _defeatResolved: true },
        { typeIndex: 3, name: "Sniper", x: 160, y: 180 },
        { typeIndex: 9, name: "Landlord", x: 500, y: 500, isBossEnemy: true },
      ],
    });
    const attribution = resolveDeathAttribution(gs);
    expect(attribution).toMatchObject({ typeIndex: 3, sourceName: "Sniper", kind: "proximity", evidenceLevel: "hypothesis", basis: "nearest-enemy", boss: false, distance: 100 });
    expect(describeDeathAttribution(attribution)).toBe("No damage was recorded; Sniper was the nearest threat (100px) when the run ended.");
  });

  it("returns null when nothing can be attributed and never invents a type", () => {
    expect(resolveDeathAttribution({ player: { x: 0, y: 0 }, enemies: [] })).toBeNull();
    expect(resolveDeathAttribution({ player: { x: 0, y: 0 }, enemies: [{ x: 1, y: 1, name: "no type" }] })).toBeNull();
    expect(resolveDeathAttribution(null)).toBeNull();
    expect(describeDeathAttribution(null)).toBe("No killer could be attributed for this run.");
  });
});
