import { describe, it, expect } from "vitest";
import { createZone, stepZones, getActiveZone, summarizeZones, throneLayout, ZONE_STATE } from "./zones.js";

function baseGs(overrides = {}) {
  return {
    player: { x: 0, y: 0 },
    allies: [],
    enemies: [],
    zones: [],
    ...overrides,
  };
}

describe("zones", () => {
  it("createZone fills in defaults and derives a stable id from coordinates", () => {
    const zone = createZone({ x: 10, y: 20 });
    expect(zone.id).toBe("zone-10-20");
    expect(zone.radius).toBe(110);
    expect(zone.captureFrames).toBe(30 * 60);
    expect(zone.label).toBe("THRONE");
    expect(zone.state).toBe(ZONE_STATE.IDLE);
    expect(zone.progress).toBe(0);
    expect(zone.pressure).toBe(0);
  });

  it("createZone honors explicit overrides", () => {
    const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 120, label: "WEST" });
    expect(zone).toMatchObject({ id: "z1", radius: 50, captureFrames: 120, label: "WEST" });
  });

  describe("stepZones", () => {
    it("returns no events when there are no zones", () => {
      const gs = baseGs();
      expect(stepZones(gs)).toEqual([]);
    });

    it("progresses HELD when only a friendly occupies the zone", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 10 });
      const gs = baseGs({ player: { x: 0, y: 0 }, zones: [zone] });
      const events = stepZones(gs);
      expect(zone.state).toBe(ZONE_STATE.HELD);
      expect(zone.progress).toBe(1);
      expect(zone.friendlyInside).toBe(1);
      expect(zone.enemyInside).toBe(0);
      expect(events.map((e) => e.type)).toContain("held");
    });

    it("counts allies alongside the player as friendly occupants", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50 });
      const gs = baseGs({
        player: { x: 1000, y: 1000 },
        allies: [{ x: 0, y: 0, downed: false, untargetable: false }],
        zones: [zone],
      });
      stepZones(gs);
      expect(zone.friendlyInside).toBe(1);
      expect(zone.state).toBe(ZONE_STATE.HELD);
    });

    it("excludes downed and untargetable allies from occupancy", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50 });
      const gs = baseGs({
        player: { x: 1000, y: 1000 },
        allies: [
          { x: 0, y: 0, downed: true, untargetable: false },
          { x: 0, y: 0, downed: false, untargetable: true },
        ],
        zones: [zone],
      });
      stepZones(gs);
      expect(zone.friendlyInside).toBe(0);
      expect(zone.state).toBe(ZONE_STATE.IDLE);
    });

    it("becomes CONTESTED when friendly and enemy both occupy, raising pressure and holding progress steady", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 10 });
      const gs = baseGs({
        player: { x: 0, y: 0 },
        enemies: [{ x: 0, y: 0, _defeatResolved: false }],
        zones: [zone],
      });
      stepZones(gs);
      expect(zone.state).toBe(ZONE_STATE.CONTESTED);
      expect(zone.pressure).toBeCloseTo(0.15);
      expect(zone.progress).toBe(0);
    });

    it("raises pressure faster and decays progress when only enemies occupy", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 10 });
      zone.progress = 5;
      const gs = baseGs({
        player: { x: 1000, y: 1000 },
        enemies: [{ x: 0, y: 0, _defeatResolved: false }],
        zones: [zone],
      });
      stepZones(gs);
      expect(zone.state).toBe(ZONE_STATE.CONTESTED);
      expect(zone.pressure).toBeCloseTo(0.35);
      expect(zone.progress).toBe(3);
    });

    it("decays pressure and progress toward IDLE when nobody occupies the zone", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 10 });
      zone.pressure = 5;
      zone.progress = 5;
      const gs = baseGs({ player: { x: 1000, y: 1000 }, zones: [zone] });
      stepZones(gs);
      expect(zone.state).toBe(ZONE_STATE.IDLE);
      expect(zone.pressure).toBeCloseTo(4.75);
      expect(zone.progress).toBe(4);
    });

    it("captures the zone once progress reaches captureFrames and clamps progress", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 1 });
      const gs = baseGs({ player: { x: 0, y: 0 }, zones: [zone] });
      const events = stepZones(gs);
      expect(zone.state).toBe(ZONE_STATE.CAPTURED);
      expect(zone.progress).toBe(1);
      expect(events).toEqual([{ type: "captured", zone }]);
    });

    it("loses the zone once pressure reaches 100", () => {
      const zone = createZone({ id: "z1", x: 0, y: 0, radius: 50, captureFrames: 1000 });
      zone.pressure = 99.9;
      const gs = baseGs({
        player: { x: 1000, y: 1000 },
        enemies: Array.from({ length: 3 }, () => ({ x: 0, y: 0, _defeatResolved: false })),
        zones: [zone],
      });
      const events = stepZones(gs);
      expect(zone.state).toBe(ZONE_STATE.LOST);
      expect(events).toEqual([{ type: "lost", zone }]);
    });

    it("skips inactive, captured, or lost zones entirely", () => {
      const captured = createZone({ id: "c1", x: 0, y: 0 });
      captured.state = ZONE_STATE.CAPTURED;
      const lost = createZone({ id: "l1", x: 0, y: 0 });
      lost.state = ZONE_STATE.LOST;
      const inactive = createZone({ id: "i1", x: 0, y: 0 });
      inactive.active = false;
      const gs = baseGs({ player: { x: 0, y: 0 }, zones: [captured, lost, inactive] });
      const events = stepZones(gs);
      expect(events).toEqual([]);
      expect(captured.progress).toBe(0);
      expect(inactive.progress).toBe(0);
    });

    it("populates gs._targetables with uncaptured zone positions for enemy pathing", () => {
      const held = createZone({ id: "z1", x: 5, y: 6 });
      const captured = createZone({ id: "z2", x: 7, y: 8 });
      captured.state = ZONE_STATE.CAPTURED;
      const gs = baseGs({ zones: [held, captured] });
      stepZones(gs);
      expect(gs._targetables).toEqual([{ x: 5, y: 6, alive: true, kind: "zone", id: "z1" }]);
    });
  });

  describe("getActiveZone", () => {
    it("returns the first zone that is active and not resolved", () => {
      const done = createZone({ id: "z1", x: 0, y: 0 });
      done.state = ZONE_STATE.CAPTURED;
      const live = createZone({ id: "z2", x: 0, y: 0 });
      const gs = baseGs({ zones: [done, live] });
      expect(getActiveZone(gs)).toBe(live);
    });

    it("returns null when there are no eligible zones", () => {
      expect(getActiveZone(baseGs())).toBeNull();
      const lost = createZone({ id: "z1", x: 0, y: 0 });
      lost.state = ZONE_STATE.LOST;
      expect(getActiveZone(baseGs({ zones: [lost] }))).toBeNull();
    });
  });

  describe("summarizeZones", () => {
    it("projects a bounded, renderer-safe shape with clamped percentages", () => {
      const zone = createZone({ id: "z1", x: 1, y: 2, radius: 30, captureFrames: 10, label: "EAST" });
      zone.progress = 15; // over captureFrames on purpose
      zone.pressure = 40;
      const gs = baseGs({ zones: [zone] });
      const [summary] = summarizeZones(gs);
      expect(summary).toEqual({
        id: "z1", label: "EAST", state: ZONE_STATE.IDLE,
        progressPct: 1, pressurePct: 0.4,
        x: 1, y: 2, radius: 30, active: true,
      });
    });

    it("returns an empty array when gs has no zones", () => {
      expect(summarizeZones(baseGs())).toEqual([]);
    });
  });

  describe("throneLayout", () => {
    it("returns three named thrones spread across the arena", () => {
      const layout = throneLayout(1000, 800);
      expect(layout).toHaveLength(3);
      expect(layout.map((t) => t.id)).toEqual(["throne-west", "throne-north", "throne-east"]);
      expect(layout[0].x).toBeCloseTo(220);
      expect(layout[1].y).toBeCloseTo(160);
    });
  });
});
