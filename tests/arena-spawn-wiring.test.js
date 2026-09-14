import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(path.resolve("src/App.jsx"), "utf8");
const drawSource = fs.readFileSync(path.resolve("src/drawGame.js"), "utf8");
const modeSources = ["sewerExtraction", "botRoyale", "bossGauntlet", "holdTheThrone"].map((name) => fs.readFileSync(path.resolve(`src/modes/${name}.js`), "utf8"));

describe("large-arena spawn wiring", () => {
  it("routes enemy, boss, and cluster bounds through the runtime arena authority", () => {
    expect(appSource).toContain("resolveArenaBounds(gs, GW(), GH())");
    expect(appSource).toContain("_spawnEnemy(gs, world.W, world.H");
    expect(appSource).toContain("_spawnBoss(gs, world.W, world.H");
    expect(appSource).toContain("Math.min(world.W - 20");
    expect(appSource).toContain("Math.min(world.H - 20");
    expect(appSource).not.toContain("_spawnEnemy(gs, GW(), GH()");
    expect(appSource).not.toContain("_spawnBoss(gs, GW(), GH()");
  });

  it("hands every mode hook the arena plus the viewport and an announce channel (S167)", () => {
    expect(appSource).toContain("onModeWaveStart(gs, modeDefRef.current, { ...resolveArenaBounds(gs, GW(), GH()), viewW: GW(), viewH: GH(), addText, addParticles, announce: _modeAnnounce })");
    expect(appSource).toContain("createModeState(modeDefRef.current, gsRef.current, { W: aw, H: ah, viewW: w, viewH: h, addText, addParticles, announce: _modeAnnounce })");
    expect(appSource).toContain("viewW: W, viewH: H, frame: frameCountRef.current, addText, addParticles, announce: _modeAnnounce");
    expect(appSource).not.toContain("onModeWaveStart(gs, modeDefRef.current, { W: GW(), H: GH()");
  });

  it("ends a fatal combat frame before mode mechanics can award a victory (S168)", () => {
    const enemyStep = appSource.indexOf("combat.stepEnemyFrame({");
    const terminalGuard = appSource.indexOf("if ((gs.runPhase || RUN_PHASE.PLAYING) !== RUN_PHASE.PLAYING) return;", enemyStep);
    const modeStep = appSource.indexOf("modeRuntimeRef.current.stepMode(", enemyStep);
    expect(enemyStep).toBeGreaterThan(-1);
    expect(terminalGuard).toBeGreaterThan(enemyStep);
    expect(modeStep).toBeGreaterThan(terminalGuard);
  });
});

describe("screen-anchored announcements (S167)", () => {
  it("never writes a centre-screen announcement in arena coordinates", () => {
    expect(appSource).not.toMatch(/addText\((gs|gsRef\.current|_gs), (GW\(\) \/ 2|sizeRef\.current\.w \/ 2)/);
    expect(appSource).not.toMatch(/addText\(gs, VX, /);
    expect(appSource.match(/addScreenText\(/g).length).toBeGreaterThanOrEqual(50);
    for (const source of modeSources) expect(source).not.toMatch(/addText\?\.\(gs, (ctx\.)?W \/ 2/);
  });

  it("paints newest screen notices outside the camera transform", () => {
    const start = drawSource.indexOf("if (_ftCam) { ctx.save(); ctx.translate(-_camX, -_camY); }");
    const end = drawSource.indexOf("ctx.globalAlpha = 1;", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    let transform = { x: 0, y: 0 };
    const stack = [], painted = [];
    const ctx = {
      save: () => stack.push({ ...transform }),
      translate: (x, y) => { transform.x += x; transform.y += y; },
      restore: () => { transform = stack.pop(); },
    };
    const gs = { floatingTexts: [
      { text: "world", screen: false },
      { text: "older notice", screen: true },
      { text: "newest notice", screen: true },
    ] };
    // Execute the actual isolated draw pass, so equivalent loop syntax stays valid.
    const paint = new Function("gs", "ctx", "_ftCam", "_camX", "_camY", "_paintFloatingText", drawSource.slice(start, end));
    paint(gs, ctx, true, 160, 90, (text) => painted.push({ text: text.text, ...transform }));
    expect(painted).toEqual([
      { text: "world", x: -160, y: -90 },
      { text: "newest notice", x: 0, y: 0 },
      { text: "older notice", x: 0, y: 0 },
    ]);
    expect(stack).toHaveLength(0);
  });
});
