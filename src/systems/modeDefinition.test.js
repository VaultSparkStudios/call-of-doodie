import { describe, expect, it } from "vitest";
import { createModeState, getModeDefinition, getModeHudModel, getModeWaveEnemyCount, isModeBossWave, isNewModeId, PLAYABLE_MODE_IDS, stepMode } from "./modeDefinition.js";
import { LEGACY_MODE_IDS } from "./modeRules.js";
import { createSimInput, createSimState, runSim } from "../sim/stepSim.js";
import { hashSimState } from "../sim/presentationKeys.js";
import { startVerbObjective, tickVerbObjective, OBJECTIVE_VERBS } from "./objectiveHandlers.js";
import { FULL_MODE_CATALOG, MODE_CATALOG, NEW_MODE_CATALOG, listModesByKind } from "../config/modeCatalog.js";
import { ZONE_STATE } from "./zones.js";

const noText = { addText: () => {}, addParticles: () => {}, W: 1280, H: 720 };

describe("mode definition layer (S163)", () => {
  it("legacy ids resolve to passthrough definitions that change nothing", () => {
    for (const id of LEGACY_MODE_IDS) {
      const def = getModeDefinition(id);
      expect(def.kind).toBe("legacy");
      expect(def.replayEligible).toBe(true);
      expect(isModeBossWave(def, {}, true)).toBe(true);
      expect(isModeBossWave(def, {}, false)).toBe(false);
      expect(getModeWaveEnemyCount(def, {}, 17)).toBe(17);
      expect(getModeHudModel({}, def)).toBeNull();
    }
    expect(getModeDefinition("nope").id).toBe("standard");
  });

  it("catalog and definitions agree on the playable set", () => {
    expect(MODE_CATALOG.map((m) => m.id)).toEqual([...LEGACY_MODE_IDS]);
    for (const m of NEW_MODE_CATALOG) {
      expect(isNewModeId(m.id)).toBe(true);
      expect(PLAYABLE_MODE_IDS).toContain(m.id);
      expect(m.replayEligible).toBe(false);
      expect(m.kind).toBe("mode");
    }
    expect(FULL_MODE_CATALOG.length).toBe(MODE_CATALOG.length + NEW_MODE_CATALOG.length);
    expect(listModesByKind("ruleset").map((m) => m.id)).toEqual(["score_attack", "daily_challenge", "cursed", "boss_rush", "speedrun", "gauntlet"]);
    expect(listModesByKind("mode").map((m) => m.id)).toEqual(["standard", "zombies", "boss_gauntlet", "sewer_extraction", "bot_royale", "hold_the_throne"]);
  });

  it("BOSS GAUNTLET: every wave is a boss, six defeats win, local-only", () => {
    const def = getModeDefinition("boss_gauntlet");
    const gs = createSimState({ seed: 11 });
    createModeState(def, gs, noText);
    expect(gs.replayEligible).toBe(false);
    expect(isModeBossWave(def, gs, false)).toBe(true);
    expect(getModeWaveEnemyCount(def, { currentWave: 1 }, 40)).toBe(1);
    expect(getModeWaveEnemyCount(def, { currentWave: 5 }, 40)).toBe(2);
    for (let i = 0; i < 5; i += 1) def.onBossDefeated(gs);
    expect(stepMode(gs, def, { ...noText, frame: 100 })).toBeNull();
    def.onBossDefeated(gs);
    expect(stepMode(gs, def, { ...noText, frame: 101 })).toBe("win");
    const hud = getModeHudModel(gs, def);
    expect(hud.banner).toMatch(/6\/6 DOWN/);
    expect(hud.progress.label).toBe("PAR");
  });

  it("HOLD THE THRONE: spawns the squad, captures thrones, wins at three, loses at two lost", () => {
    const def = getModeDefinition("hold_the_throne");
    const gs = createSimState({ seed: 21 });
    createModeState(def, gs, noText);
    expect(gs.allies.map((a) => a.personality)).toEqual(["sergeant", "intern", "roomba"]);
    expect(gs.zones.length).toBe(3);
    expect(gs.zones.filter((z) => z.active).length).toBe(1);
    // Player stands on the active throne with no enemies: capture in 30s.
    const zone = gs.zones[0];
    gs.player.x = zone.x; gs.player.y = zone.y;
    gs.enemies = [];
    let verdict = null;
    for (let f = 0; f < 30 * 60 + 5 && !verdict; f += 1) {
      gs.allies.forEach((a) => { a.x = zone.x; a.y = zone.y; });
      verdict = stepMode(gs, def, { ...noText, frame: f });
    }
    expect(gs._thronesCaptured).toBe(1);
    expect(gs.zones[0].state).toBe(ZONE_STATE.CAPTURED);
    expect(gs.zones[1].active).toBe(true);
    expect(getModeHudModel(gs, def).squad.length).toBe(3);
    expect(getModeHudModel(gs, def).banner).toMatch(/1\/3 THRONES/);
    // Lose two thrones → lose.
    gs._thronesLost = 2;
    expect(stepMode(gs, def, { ...noText, frame: 9999 })).toBe("lose");
  });

  it("HOLD THE THRONE runs deterministically inside the headless kernel", () => {
    const build = () => {
      const gs = createSimState({ seed: 99 });
      createModeState(getModeDefinition("hold_the_throne"), gs, noText);
      return gs;
    };
    const def = getModeDefinition("hold_the_throne");
    const hooks = { afterEnemies: (gs) => { def.step(gs, noText); } };
    const a = runSim(build(), 300, () => createSimInput({ move: { dx: -1, dy: 0 } }), { hooks });
    const b = runSim(build(), 300, () => createSimInput({ move: { dx: -1, dy: 0 } }), { hooks });
    expect(JSON.stringify(a.gs.zones.map((z) => [z.progress, z.pressure, z.state]))).toBe(JSON.stringify(b.gs.zones.map((z) => [z.progress, z.pressure, z.state])));
  });
});

describe("SEWER EXTRACTION and BOT ROYALE (S163 tranche 3)", () => {
  it("extraction: crates raise loot and alarm, evac opens at 60, extracting wins and banks the stash", () => {
    const def = getModeDefinition("sewer_extraction");
    const gs = createSimState({ seed: 7 });
    createModeState(def, gs, noText);
    expect(gs.pickups.filter((p) => p.type === "loot").length).toBe(3);
    const crate = gs.pickups.find((p) => p.type === "loot");
    gs.player.x = crate.x; gs.player.y = crate.y;
    stepMode(gs, def, { ...noText, frame: 1 });
    expect(gs._extractLoot).toBeGreaterThan(0);
    expect(gs.alarm).toBeGreaterThan(0);
    gs.alarm = 60;
    stepMode(gs, def, { ...noText, frame: 2 });
    const exit = gs.structures.find((s) => s.id === "evac-toilet");
    expect(exit).toBeTruthy();
    gs.player.x = exit.x; gs.player.y = exit.y;
    expect(stepMode(gs, def, { ...noText, frame: 3 })).toBe("win");
    expect(gs._extractBanked.loot).toBe(gs._extractLoot);
    expect(getModeHudModel(gs, def).banner).toMatch(/LOOT/);
  });

  it("extraction: alarm 100 locks the exit", () => {
    const def = getModeDefinition("sewer_extraction");
    const gs = createSimState({ seed: 8 });
    createModeState(def, gs, noText);
    gs.alarm = 100;
    stepMode(gs, def, { ...noText, frame: 1 });
    expect(gs._extractLocked).toBe(true);
    expect(gs.structures.find((s) => s.id === "evac-toilet")).toBeUndefined();
  });

  it("royale: twelve bots spawn, bot bullets hurt other bots, flood shrinks, last one wins", () => {
    const def = getModeDefinition("bot_royale");
    const gs = createSimState({ seed: 3 });
    createModeState(def, gs, noText);
    const bots = gs.enemies.filter((e) => e.isBot);
    expect(bots.length).toBe(12);
    expect(getModeWaveEnemyCount(def, gs, 40)).toBe(0);
    // A bullet from bot-0 hits bot-1.
    const target = bots[1];
    gs.enemyBullets.push({ x: target.x, y: target.y, vx: 0, vy: 0, life: 10, size: 4, damage: 999, sourceId: "bot-0" });
    stepMode(gs, def, { ...noText, frame: 1 });
    expect(target._defeatResolved).toBe(true);
    stepMode(gs, def, { ...noText, frame: 2 });
    expect(gs._targetables.length).toBe(11);
    // Flood shrinks after a phase.
    const r0 = gs.flood.r;
    stepMode(gs, def, { ...noText, frame: 20 * 60 + 1 });
    expect(gs.flood.targetR).toBeLessThan(r0);
    // Everyone else gone → win.
    for (const b of gs.enemies) if (b.isBot) b._defeatResolved = true;
    expect(stepMode(gs, def, { ...noText, frame: 20 * 60 + 2 })).toBe("win");
    expect(def.placement({ _royaleAlive: 3 })).toBe(4);
  });

  it("royale runs deterministically inside the headless kernel", () => {
    const def = getModeDefinition("bot_royale");
    const build = () => { const gs = createSimState({ seed: 55 }); createModeState(def, gs, noText); return gs; };
    const hooks = { afterEnemies: (gs) => { def.step(gs, noText); } };
    const a = runSim(build(), 240, () => createSimInput({ move: { dx: 1, dy: 0 }, fire: true, aim: 0 }), { hooks });
    const b = runSim(build(), 240, () => createSimInput({ move: { dx: 1, dy: 0 }, fire: true, aim: 0 }), { hooks });
    expect(hashSimState(a.gs)).toBe(hashSimState(b.gs));
  });
});

describe("objective verb handlers (S163)", () => {
  it("registers all seven Operation verbs", () => {
    expect(OBJECTIVE_VERBS).toEqual(["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"]);
  });

  it("BREACH completes when bullets chew through the door", () => {
    const gs = createSimState({ seed: 1, arena: false });
    startVerbObjective(gs, "BREACH", { hp: 50 }, noText);
    const door = gs.structures[0];
    expect(tickVerbObjective(gs, noText)).toBe("active");
    gs.bullets.push({ x: door.x, y: door.y, damage: 60, vx: 0, vy: 0, life: 10 });
    expect(tickVerbObjective(gs, noText)).toBe("done");
    expect(gs.structures.length).toBe(0);
  });

  it("HOLD completes after the player holds the zone", () => {
    const gs = createSimState({ seed: 1, arena: false });
    startVerbObjective(gs, "HOLD", { seconds: 1 }, noText);
    gs.player.x = gs.zones[0].x; gs.player.y = gs.zones[0].y;
    let status = "active";
    for (let i = 0; i < 65 && status === "active"; i += 1) status = tickVerbObjective(gs, noText);
    expect(status).toBe("done");
  });

  it("ESCAPE fails when the alarm maxes and succeeds at the exit", () => {
    const gs = createSimState({ seed: 1, arena: false });
    startVerbObjective(gs, "ESCAPE", { alarmStart: 99.99 }, noText);
    expect(tickVerbObjective(gs, noText)).toBe("failed");
    const gs2 = createSimState({ seed: 1, arena: false });
    startVerbObjective(gs2, "ESCAPE", {}, noText);
    const exit = gs2.structures[0];
    gs2.player.x = exit.x; gs2.player.y = exit.y;
    expect(tickVerbObjective(gs2, noText)).toBe("done");
  });

  it("SABOTAGE needs a held interact near the pump", () => {
    const gs = createSimState({ seed: 1, arena: false });
    startVerbObjective(gs, "SABOTAGE", { seconds: 0.1 }, noText);
    const pump = gs.structures[0];
    gs.player.x = pump.x; gs.player.y = pump.y;
    expect(tickVerbObjective(gs, noText)).toBe("active");
    gs._interactHeld = true;
    let status = "active";
    for (let i = 0; i < 10 && status === "active"; i += 1) status = tickVerbObjective(gs, noText);
    expect(status).toBe("done");
  });

  it("ESCORT completes when the cart reaches its last waypoint", () => {
    const gs = createSimState({ seed: 1, arena: false });
    startVerbObjective(gs, "ESCORT", { waypoints: [{ x: 100, y: 100 }, { x: 130, y: 100 }] }, noText);
    const cart = gs.allies[0];
    expect(cart.order).toBe("carry");
    let status = "active";
    for (let i = 0; i < 120 && status === "active"; i += 1) {
      stepMode(gs, getModeDefinition("standard"), { ...noText, frame: i });
      status = tickVerbObjective(gs, noText);
    }
    expect(status).toBe("done");
  });

  it("HUNT marks a fleeing elite and completes on its defeat", () => {
    const gs = createSimState({ seed: 1, arena: false });
    gs.enemies.push({ x: 50, y: 50, health: 20, maxHealth: 20, speed: 2, size: 20, typeIndex: 1 });
    startVerbObjective(gs, "HUNT", {}, noText);
    expect(gs.enemies[0].fleeing).toBe(true);
    expect(tickVerbObjective(gs, noText)).toBe("active");
    gs.enemies[0]._defeatResolved = true;
    expect(tickVerbObjective(gs, noText)).toBe("done");
  });
});
