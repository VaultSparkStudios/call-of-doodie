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

  it("paints screen-anchored texts outside the camera translate", () => {
    const worldPass = drawSource.indexOf("gs.floatingTexts.forEach(ft => { if (ft.screen !== true) _paintFloatingText(ft); });");
    const restore = drawSource.indexOf("if (_ftCam) ctx.restore();", worldPass);
    const screenPass = drawSource.indexOf("gs.floatingTexts.forEach(ft => { if (ft.screen === true) _paintFloatingText(ft); });", restore);
    expect(worldPass).toBeGreaterThan(-1);
    expect(restore).toBeGreaterThan(worldPass);
    expect(screenPass).toBeGreaterThan(restore);
  });
});
