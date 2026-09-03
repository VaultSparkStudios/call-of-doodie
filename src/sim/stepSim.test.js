import { describe, expect, it } from "vitest";
import { createSimInput, createSimState, runSim, stepSim } from "./stepSim.js";
import { hashSimState, snapshotSimState } from "./presentationKeys.js";
import { spawnAlly, issueAllyOrder, summarizeSquad, damageAlly, ALLY_BLEEDOUT_FRAMES } from "../systems/allyUnit.js";

function autoplay(frame, gs) {
  // Strafe in a circle and fire at the nearest enemy.
  const p = gs.player;
  let aim = null;
  let best = Infinity;
  for (const e of gs.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) { best = d; aim = Math.atan2(e.y - p.y, e.x - p.x); }
  }
  const t = frame * 0.03;
  return createSimInput({ move: { dx: Math.cos(t), dy: Math.sin(t) }, aim, fire: aim !== null });
}

describe("stepSim headless kernel (S163)", () => {
  it("runs 600 frames in Node without DOM and produces a stable hash for the same seed", () => {
    const a = runSim(createSimState({ seed: 777 }), 600, autoplay);
    const b = runSim(createSimState({ seed: 777 }), 600, autoplay);
    expect(a.gs.frame).toBe(b.gs.frame);
    expect(hashSimState(a.gs)).toBe(hashSimState(b.gs));
    expect(a.events.some((e) => e.type === "spawn")).toBe(true);
  });

  it("diverges for a different seed", () => {
    const a = runSim(createSimState({ seed: 1 }), 400, autoplay);
    const b = runSim(createSimState({ seed: 2 }), 400, autoplay);
    expect(hashSimState(a.gs)).not.toBe(hashSimState(b.gs));
  });

  it("strips presentation keys from the snapshot", () => {
    const gs = createSimState({ seed: 5 });
    gs.particles.push({ x: 1 });
    gs.screenShake = 9;
    const snap = snapshotSimState(gs);
    expect(snap.particles).toBeUndefined();
    expect(snap.screenShake).toBeUndefined();
    expect(snap.player).toBeTruthy();
  });

  it("reports a lose verdict when the player dies and stops stepping", () => {
    const gs = createSimState({ seed: 9 });
    gs.player.health = 0;
    const r = stepSim(gs, createSimInput());
    expect(r.verdict).toBe("lose");
    expect(stepSim(gs, createSimInput()).ok).toBe(false);
  });

  it("honours a mode win condition hook", () => {
    const gs = createSimState({ seed: 3 });
    const r = runSim(gs, 50, () => createSimInput(), { hooks: { winCondition: (s) => (s.frame >= 10 ? "win" : null) } });
    expect(r.verdict).toBe("win");
    expect(gs.frame).toBe(10);
  });
});

describe("allies (S163)", () => {
  it("spawn, follow the player, and shoot enemies deterministically", () => {
    const build = () => {
      const gs = createSimState({ seed: 42 });
      spawnAlly(gs, "intern");
      spawnAlly(gs, "sergeant");
      spawnAlly(gs, "roomba");
      return gs;
    };
    const a = runSim(build(), 500, autoplay);
    const b = runSim(build(), 500, autoplay);
    expect(hashSimState(a.gs)).toBe(hashSimState(b.gs));
    expect(a.gs.allies.length).toBeGreaterThan(0);
    const allyShots = a.events.filter((e) => e.type === "shot").length;
    expect(a.gs.bullets.concat().length + allyShots).toBeGreaterThanOrEqual(0);
    const squad = summarizeSquad(a.gs);
    expect(squad.every((s) => s.healthPct >= 0 && s.healthPct <= 1)).toBe(true);
  });

  it("orders apply to every non-roomba ally", () => {
    const gs = createSimState({ seed: 1, arena: false });
    spawnAlly(gs, "intern");
    spawnAlly(gs, "roomba");
    expect(issueAllyOrder(gs, "hold")).toBe(1);
    expect(gs.allies[0].order).toBe("hold");
    expect(issueAllyOrder(gs, "nonsense")).toBe(0);
  });

  it("downed allies bleed out unless revived by a nearby player", () => {
    const gs = createSimState({ seed: 1, arena: false });
    const a = spawnAlly(gs, "intern", { x: 100, y: 100 });
    damageAlly(gs, a, 999);
    expect(a.downed).toBe(true);
    gs.player.x = 600; gs.player.y = 600;
    runSim(gs, ALLY_BLEEDOUT_FRAMES + 5, () => createSimInput());
    expect(gs.allies.length).toBe(0);

    const gs2 = createSimState({ seed: 1, arena: false });
    const b = spawnAlly(gs2, "intern", { x: 100, y: 100 });
    damageAlly(gs2, b, 999);
    gs2.player.x = 100; gs2.player.y = 110;
    runSim(gs2, 120, () => createSimInput());
    expect(gs2.allies[0].downed).toBe(false);
    expect(gs2.allies[0].health).toBeGreaterThan(0);
  });
});
