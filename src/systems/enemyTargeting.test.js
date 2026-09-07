import { describe, it, expect } from "vitest";
import { pickTarget } from "./enemyFrame.js";

// S165 A1 — a free-for-all mode publishes every combatant into
// `gs._targetables`. Before the identity skip, each bot found its own entry at
// distance zero and steered/fired at the spot it already stood on, so BOT
// ROYALE bots never advanced on the player or on each other.

const player = { x: 1000, y: 1000 };

describe("pickTarget identity skip", () => {
  it("never returns the enemy's own free-for-all candidate", () => {
    const bot = { id: "bot-3", x: 100, y: 100 };
    const gs = {
      _targetables: [
        { x: 100, y: 100, alive: true, kind: "bot", id: "bot-3" },
        { x: 160, y: 100, alive: true, kind: "bot", id: "bot-4" },
      ],
    };
    const target = pickTarget(bot, gs, player);
    expect(target.id).toBe("bot-4");
  });

  it("picks the nearest rival rather than the far player", () => {
    const bot = { id: "bot-0", x: 0, y: 0 };
    const gs = {
      _targetables: [
        { x: 0, y: 0, alive: true, kind: "bot", id: "bot-0" },
        { x: 900, y: 900, alive: true, kind: "bot", id: "bot-1" },
        { x: 40, y: 0, alive: true, kind: "bot", id: "bot-2" },
      ],
    };
    expect(pickTarget(bot, gs, player).id).toBe("bot-2");
  });

  it("still targets the player when every rival is farther away", () => {
    const bot = { id: "bot-1", x: 990, y: 1000 };
    const gs = {
      _targetables: [
        { x: 990, y: 1000, alive: true, kind: "bot", id: "bot-1" },
        { x: 5000, y: 5000, alive: true, kind: "bot", id: "bot-2" },
      ],
    };
    expect(pickTarget(bot, gs, player)).toBe(player);
  });

  it("leaves the zone/structure path untouched for enemies without an id", () => {
    const enemy = { x: 200, y: 200 };
    const gs = { _targetables: [{ x: 210, y: 200, alive: true, kind: "zone", id: "zone-a" }] };
    expect(pickTarget(enemy, gs, player).id).toBe("zone-a");
  });

  it("keeps skipping dead candidates", () => {
    const bot = { id: "bot-1", x: 0, y: 0 };
    const gs = {
      _targetables: [
        { x: 0, y: 0, alive: true, kind: "bot", id: "bot-1" },
        { x: 10, y: 0, alive: false, kind: "bot", id: "bot-2" },
      ],
    };
    expect(pickTarget(bot, gs, player)).toBe(player);
  });
});
