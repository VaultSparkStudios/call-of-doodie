import { describe, expect, it } from "vitest";
import { beginAbilityCooldown, grantAbilityReady, advanceAbilityCooldowns, addSpeedPickup, speedPickupBonus, advanceSpeedPickups } from "./runTiming.js";
import { applyPlayerMovement } from "./gameStep.js";

describe("active-frame ability cooldowns", () => {
  it.each([["dash", 1500, 90], ["grenade", 8000, 480], ["dash", 1500 * 0.6, 54], ["grenade", 8000 * 0.8, 384]])("readies %s after exactly its duration (%ims)", (ability, ms, frames) => {
    const gs = {};
    beginAbilityCooldown(gs, ability, ms);
    for (let frame = 1; frame < frames; frame++) expect(advanceAbilityCooldowns(gs)).toEqual([]);
    expect(advanceAbilityCooldowns(gs)).toEqual([ability]);
    expect(advanceAbilityCooldowns(gs)).toEqual([]);
  });

  it("an immediate grant discards the previous countdown before the next use", () => {
    const gs = {};
    beginAbilityCooldown(gs, "grenade", 8000);
    for (let i = 0; i < 479; i++) advanceAbilityCooldowns(gs);
    grantAbilityReady(gs, "grenade");
    expect(advanceAbilityCooldowns(gs)).toEqual([]);
    beginAbilityCooldown(gs, "grenade", 8000);
    for (let i = 0; i < 479; i++) expect(advanceAbilityCooldowns(gs)).toEqual([]);
    expect(advanceAbilityCooldowns(gs)).toEqual(["grenade"]);
  });

  it("a rematch owns independent timers", () => {
    const previous = {}, current = {};
    beginAbilityCooldown(previous, "dash", 1500);
    beginAbilityCooldown(current, "dash", 1500);
    for (let i = 0; i < 90; i++) advanceAbilityCooldowns(previous);
    expect(current.abilityCooldowns.dash).toBe(90);
  });
});

describe("temporary speed pickup", () => {
  it.each([3.2, 4, 7.8, 8, 9])("expires after 300 active movement frames without changing base %s", base => {
    const gs = { player: { x: 100, y: 100, speed: base } };
    addSpeedPickup(gs);
    for (let frame = 0; frame < 300; frame++) {
      const bonus = speedPickupBonus(gs);
      gs.player.x = 100;
      applyPlayerMovement(gs.player, { dx: 1, dy: 0 }, { speedBonus: bonus });
      expect(gs.player.x - 100).toBeCloseTo(base + Math.max(0, Math.min(0.5, 8 - base)));
      expect(gs.player.speed).toBe(base);
      advanceSpeedPickups(gs);
    }
    expect(speedPickupBonus(gs)).toBe(0);
    expect(gs.player.speed).toBe(base);
  });

  it("stacks independent expiries and respects permanent speed changes during the buff", () => {
    const gs = { player: { speed: 4 } };
    addSpeedPickup(gs);
    for (let i = 0; i < 100; i++) advanceSpeedPickups(gs);
    addSpeedPickup(gs);
    expect(speedPickupBonus(gs)).toBe(1);
    gs.player.speed *= 1.1;
    for (let i = 0; i < 200; i++) advanceSpeedPickups(gs);
    expect(speedPickupBonus(gs)).toBe(0.5);
    for (let i = 0; i < 100; i++) advanceSpeedPickups(gs);
    expect(speedPickupBonus(gs)).toBe(0);
    expect(gs.player.speed).toBe(4.4);
    expect(speedPickupBonus({ player: { speed: 5.4 } })).toBe(0);
  });

  it("composes the temporary bonus with adrenaline and rubble without mutating base stats", () => {
    const gs = { player: { x: 100, y: 100, speed: 3.2 } };
    addSpeedPickup(gs);
    applyPlayerMovement(gs.player, { dx: 1, dy: 0 }, { speedBonus: speedPickupBonus(gs), adrenalineRushTimer: 10, rubbleSlowed: true });
    expect(gs.player.x).toBeCloseTo(100 + 3.7 * 2 * 0.6);
    expect(gs.player.speed).toBe(3.2);
  });

  it("composes Frenzy with capped pickups and permanent gains without changing base speed", () => {
    const gs = { player: { x: 100, y: 100, speed: 7.8 } };
    addSpeedPickup(gs);
    applyPlayerMovement(gs.player, { dx: 1, dy: 0 }, { speedBonus: speedPickupBonus(gs), speedMultiplier: 1.2, adrenalineRushTimer: 10, rubbleSlowed: true });
    expect(gs.player.x - 100).toBeCloseTo(8 * 1.2 * 2 * 0.6);
    expect(gs.player.speed).toBe(7.8);
    gs.player.speed *= 1.1;
    gs.player.x = 100;
    applyPlayerMovement(gs.player, { dx: 1, dy: 0 }, { speedBonus: speedPickupBonus(gs), speedMultiplier: 1.2 });
    expect(gs.player.x - 100).toBeCloseTo(7.8 * 1.1 * 1.2);
    expect(gs.player.speed).toBeCloseTo(8.58);
  });
});
