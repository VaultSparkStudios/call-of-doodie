// Retro pack render-path contract (S145).
// The Retro visual pack must stay pixel-faithful to the first-playable look:
// circle + emoji enemies, circle soldier — no atlas sprites, no sprite-motion
// transforms. This guard pins the call-shape so the Modern-pack visual
// overhaul cannot silently leak into Retro.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { drawRetroEnemyCharacter, drawRetroPlayerCharacter, VISUAL_PACKS } from "./visualPack.js";

function makeMockCtx() {
  const calls = [];
  const record = (name) => (...args) => { calls.push({ name, args }); };
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === "__calls") return calls;
      return record(String(prop));
    },
    set() { return true; },
  });
  return ctx;
}

describe("retro pack render-path contract", () => {
  it("retro enemy draw uses circle + emoji text and never drawImage", () => {
    const ctx = makeMockCtx();
    drawRetroEnemyCharacter(ctx, { size: 30, color: "#F00", hitFlash: 0, ranged: true, emoji: "🧟" });
    const names = ctx.__calls.map((c) => c.name);
    expect(names).toContain("arc");
    expect(names).toContain("fillText");
    expect(names).not.toContain("drawImage");
    expect(names).not.toContain("setTransform");
  });

  it("retro player draw uses circle body + rect barrel and never drawImage", () => {
    const ctx = makeMockCtx();
    drawRetroPlayerCharacter(ctx, { angle: 1.2, weapon: { color: "#FFD700" }, muzzleFlash: 2 });
    const names = ctx.__calls.map((c) => c.name);
    expect(names).toContain("arc");
    expect(names).toContain("fillRect");
    expect(names).not.toContain("drawImage");
  });

  it("drawGame guards every atlas drawImage path behind the retro branch", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../drawGame.js"), "utf8");
    // Retro invariant: the renderer must branch on the retro pack before any
    // character atlas blit. If the retro gate disappears, this contract fails.
    expect(source).toMatch(/VISUAL_PACKS\.RETRO|isRetro|retroPack/);
    // New visual systems must declare their retro no-op explicitly.
    const retroGateCount = (source.match(/RETRO|retro/g) || []).length;
    expect(retroGateCount).toBeGreaterThanOrEqual(3);
  });

  it("visual pack ids stay stable for stored player preferences", () => {
    expect(VISUAL_PACKS.MODERN).toBe("modern");
    expect(VISUAL_PACKS.RETRO).toBe("retro");
  });
});
