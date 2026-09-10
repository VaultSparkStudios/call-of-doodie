import { describe, it, expect } from "vitest";
import {
  OBJECTIVE_VERBS,
  getObjectiveHandler,
  startVerbObjective,
  clearVerbObjective,
  verbSpecFor,
  tickVerbObjective,
  getVerbObjectiveHud,
} from "./objectiveHandlers.js";
import { ZONE_STATE } from "./zones.js";

function baseGs(overrides = {}) {
  return {
    frame: 0,
    runSeed: 12345,
    currentWave: 1,
    player: { x: 100, y: 100 },
    enemies: [],
    allies: [],
    bullets: [],
    structures: [],
    zones: [],
    particles: [],
    floatingTexts: [],
    alarm: 0,
    _interactHeld: false,
    ...overrides,
  };
}

describe("objectiveHandlers", () => {
  it("exposes the seven Operation verbs in stable order", () => {
    expect(OBJECTIVE_VERBS).toEqual(["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"]);
  });

  it("getObjectiveHandler is case-insensitive and returns null for unknown verbs", () => {
    expect(getObjectiveHandler("hold")).toBeTruthy();
    expect(getObjectiveHandler("HOLD")).toBeTruthy();
    expect(getObjectiveHandler("nope")).toBeNull();
    expect(getObjectiveHandler()).toBeNull();
  });

  describe("BREACH", () => {
    it("spawns a door structure and resolves as bullets chip it down", () => {
      const gs = baseGs();
      const state = startVerbObjective(gs, "BREACH", { hp: 20 });
      expect(state.status).toBe("active");
      expect(gs.structures).toHaveLength(1);
      const door = gs.structures[0];
      expect(door.hp).toBe(20);

      gs.bullets.push({ x: door.x, y: door.y, damage: 25 });
      const status = tickVerbObjective(gs);
      expect(status).toBe("done");
      expect(gs.structures).toHaveLength(0);
      expect(gs.bullets).toHaveLength(0);
    });

    it("fails when the door disappears out from under it", () => {
      const gs = baseGs();
      startVerbObjective(gs, "BREACH", { hp: 20 });
      gs.structures = [];
      expect(tickVerbObjective(gs)).toBe("failed");
    });

    it("triggers a one-time reinforcement call at 50% hp", () => {
      const gs = baseGs();
      startVerbObjective(gs, "BREACH", { hp: 100 });
      const door = gs.structures[0];
      gs.bullets.push({ x: door.x, y: door.y, damage: 51 });
      tickVerbObjective(gs);
      expect(gs.activeVerbObjective.reinforced).toBe(true);
      expect(gs.maxEnemiesThisWave).toBeGreaterThan(0);
    });

    it("reports hud progress as fraction of hp lost", () => {
      const gs = baseGs();
      startVerbObjective(gs, "BREACH", { hp: 100 });
      const door = gs.structures[0];
      door.hp = 50;
      const hud = getVerbObjectiveHud(gs);
      expect(hud.label).toBe("BREACH");
      expect(hud.pct).toBeCloseTo(0.5);
    });
  });

  describe("HOLD", () => {
    it("completes once the zone reaches captureFrames", () => {
      const gs = baseGs();
      startVerbObjective(gs, "HOLD", { seconds: 0.05 }); // 3 frames
      const zone = gs.zones[0];
      gs.player.x = zone.x;
      gs.player.y = zone.y;
      for (let i = 0; i < 10; i += 1) {
        tickVerbObjective(gs);
        if (gs.activeVerbObjective.status !== "active") break;
      }
      expect(gs.activeVerbObjective.status).toBe("done");
      expect(gs.zones.find((z) => z.id === "hold-zone").state).toBe(ZONE_STATE.CAPTURED);
    });

    it("fails when the zone is lost to enemy pressure", () => {
      const gs = baseGs();
      startVerbObjective(gs, "HOLD", { seconds: 30 });
      const zone = gs.zones[0];
      zone.pressure = 99.9;
      gs.enemies.push({ x: zone.x, y: zone.y, _defeatResolved: false });
      const status = tickVerbObjective(gs);
      expect(status).toBe("failed");
    });

    it("fails when the zone vanishes", () => {
      const gs = baseGs();
      startVerbObjective(gs, "HOLD", {});
      gs.zones = [];
      expect(tickVerbObjective(gs)).toBe("failed");
    });
  });

  describe("ESCORT", () => {
    it("spawns a cart ally and completes on carryComplete", () => {
      const gs = baseGs();
      const state = startVerbObjective(gs, "ESCORT", {});
      expect(gs.allies).toHaveLength(1);
      const cart = gs.allies[0];
      expect(cart.order).toBe("carry");
      cart.carryComplete = true;
      expect(tickVerbObjective(gs)).toBe("done");
      expect(state.status).toBe("done");
    });

    it("fails if the cart is downed or removed", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCORT", {});
      gs.allies[0].downed = true;
      expect(tickVerbObjective(gs)).toBe("failed");

      const gs2 = baseGs();
      startVerbObjective(gs2, "ESCORT", {});
      gs2.allies = [];
      expect(tickVerbObjective(gs2)).toBe("failed");
    });

    it("reports hud waypoint progress", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCORT", {});
      const cart = gs.allies[0];
      cart.waypointIndex = 1;
      const hud = getVerbObjectiveHud(gs);
      expect(hud.label).toBe("ESCORT");
      expect(hud.pct).toBeGreaterThan(0);
    });
  });

  describe("HUNT", () => {
    it("marks an existing enemy fleeing and completes on defeat", () => {
      const gs = baseGs({ enemies: [{ x: 10, y: 10, health: 40, maxHealth: 40, speed: 1, _defeatResolved: false }] });
      const state = startVerbObjective(gs, "HUNT", {});
      expect(state.targetId).toBeTruthy();
      const target = gs.enemies[0];
      expect(target.fleeing).toBe(true);
      expect(target.huntMark).toBe(true);
      expect(tickVerbObjective(gs)).toBe("active");
      target._defeatResolved = true;
      expect(tickVerbObjective(gs)).toBe("done");
    });

    it("fails to start when no enemy exists and no spawner is provided", () => {
      const gs = baseGs();
      const state = startVerbObjective(gs, "HUNT", {});
      expect(state.targetId).toBeNull();
      expect(tickVerbObjective(gs)).toBe("failed");
    });

    it("spawns via ctx.spawnEnemy when the arena is empty", () => {
      const gs = baseGs();
      const spawnEnemy = (state) => {
        state.enemies.push({ x: 0, y: 0, health: 10, maxHealth: 10, speed: 1, _defeatResolved: false });
      };
      const state = startVerbObjective(gs, "HUNT", {}, { spawnEnemy });
      expect(state.targetId).toBeTruthy();
      expect(gs.enemies).toHaveLength(1);
    });

    it("resolves done if the target disappears from the array", () => {
      const gs = baseGs({ enemies: [{ x: 10, y: 10, health: 40, maxHealth: 40, speed: 1, _defeatResolved: false }] });
      startVerbObjective(gs, "HUNT", {});
      gs.enemies = [];
      expect(tickVerbObjective(gs)).toBe("done");
    });
  });

  describe("SABOTAGE", () => {
    it("completes once channel time is held near the pump", () => {
      const gs = baseGs();
      startVerbObjective(gs, "SABOTAGE", { seconds: 0.05 }); // 3 frames
      const pump = gs.structures[0];
      gs.player.x = pump.x;
      gs.player.y = pump.y;
      gs._interactHeld = true;
      let status = "active";
      for (let i = 0; i < 10 && status === "active"; i += 1) status = tickVerbObjective(gs);
      expect(status).toBe("done");
      expect(gs.structures).toHaveLength(0);
    });

    it("decays channel progress when not held or too far away", () => {
      const gs = baseGs();
      startVerbObjective(gs, "SABOTAGE", { seconds: 3 });
      const pump = gs.structures[0];
      pump.channel = 10;
      gs.player.x = pump.x + 1000;
      tickVerbObjective(gs);
      expect(gs.structures[0].channel).toBeLessThan(10);
    });

    it("fails when the pump is missing", () => {
      const gs = baseGs();
      startVerbObjective(gs, "SABOTAGE", {});
      gs.structures = [];
      expect(tickVerbObjective(gs)).toBe("failed");
    });
  });

  describe("ESCAPE", () => {
    it("completes when the player reaches the exit before alarm hits 100", () => {
      const gs = baseGs();
      const state = startVerbObjective(gs, "ESCAPE", { alarmRate: 1 });
      const exit = gs.structures[0];
      gs.player.x = exit.x;
      gs.player.y = exit.y;
      expect(tickVerbObjective(gs)).toBe("done");
      expect(state.status).toBe("done");
    });

    it("fails once alarm reaches 100 before the player arrives", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCAPE", { alarmStart: 99, alarmRate: 5 });
      expect(tickVerbObjective(gs)).toBe("failed");
    });

    it("fails when the exit structure is gone", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCAPE", {});
      gs.structures = [];
      expect(tickVerbObjective(gs)).toBe("failed");
    });
  });

  describe("BOSS", () => {
    it("stays active while a live boss enemy remains, then completes", () => {
      const gs = baseGs({ bossWave: true, enemies: [{ isBossEnemy: true, _defeatResolved: false }] });
      startVerbObjective(gs, "BOSS", {});
      expect(tickVerbObjective(gs)).toBe("active");
      gs.enemies[0]._defeatResolved = true;
      expect(tickVerbObjective(gs)).toBe("done");
    });

    it("is immediately done when there is no boss wave", () => {
      const gs = baseGs({ bossWave: false });
      startVerbObjective(gs, "BOSS", {});
      expect(tickVerbObjective(gs)).toBe("done");
    });
  });

  describe("startVerbObjective / clearVerbObjective", () => {
    it("returns null for an unknown verb and leaves gs untouched", () => {
      const gs = baseGs();
      expect(startVerbObjective(gs, "NOPE", {})).toBeNull();
      expect(gs.activeVerbObjective).toBeUndefined();
    });

    it("increments attempt count on repeated same-verb starts", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCAPE", {});
      expect(gs.activeVerbObjective.attempt).toBe(1);
      startVerbObjective(gs, "ESCAPE", {});
      expect(gs.activeVerbObjective.attempt).toBe(2);
    });

    it("resets attempt count when the verb changes", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCAPE", {});
      startVerbObjective(gs, "BOSS", {});
      expect(gs.activeVerbObjective.attempt).toBe(1);
    });

    it("clears verb-owned world state", () => {
      const gs = baseGs();
      startVerbObjective(gs, "ESCORT", {});
      gs.alarm = 42;
      clearVerbObjective(gs);
      expect(gs.activeVerbObjective).toBeNull();
      expect(gs.zones).toEqual([]);
      expect(gs.structures).toEqual([]);
      expect(gs.alarm).toBe(0);
      expect(gs.allies.find((a) => a.order === "carry")).toBeUndefined();
      expect(gs._targetables).toEqual([]);
    });
  });

  describe("verbSpecFor", () => {
    it("returns authored defaults per verb and an empty object for unknown verbs", () => {
      expect(verbSpecFor("HOLD", { title: "West Wing" })).toMatchObject({ seconds: 30, label: "West Wing" });
      expect(verbSpecFor("BREACH", { id: "d1" })).toMatchObject({ hp: 500, targetId: "breach-d1" });
      expect(verbSpecFor("SABOTAGE")).toMatchObject({ seconds: 3 });
      expect(verbSpecFor("ESCAPE")).toMatchObject({ alarmRate: 100 / (60 * 60) });
      expect(verbSpecFor("HUNT")).toEqual({});
    });
  });

  describe("tickVerbObjective / getVerbObjectiveHud", () => {
    it("returns null when there is no active objective", () => {
      const gs = baseGs();
      expect(tickVerbObjective(gs)).toBeNull();
      expect(getVerbObjectiveHud(gs)).toBeNull();
    });

    it("does not re-tick a resolved objective", () => {
      const gs = baseGs();
      startVerbObjective(gs, "BOSS", {});
      gs.bossWave = false;
      expect(tickVerbObjective(gs)).toBe("done");
      const resolvedFrame = gs.activeVerbObjective.resolvedFrame;
      gs.frame = 99;
      expect(tickVerbObjective(gs)).toBe("done");
      expect(gs.activeVerbObjective.resolvedFrame).toBe(resolvedFrame);
    });
  });
});
