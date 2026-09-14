import { describe, expect, it } from "vitest";
import { buildArenaEnvironment, findSafeArenaSpawn } from "./arenaEnvironment.js";
describe("safe arena spawn", () => {
  it("keeps a clear preferred position and leaves the seeded map unchanged", () => {
    const env = buildArenaEnvironment({ seed: 1, width: 390, height: 836 });
    const before = JSON.stringify(env);
    const first = findSafeArenaSpawn(env, 390, 836);
    expect(first).not.toEqual({ x: 195, y: 418 });
    expect(findSafeArenaSpawn(env, 390, 836)).toEqual(first);
    expect(findSafeArenaSpawn(env, 390, 836, first)).toEqual(first);
    expect(JSON.stringify(env)).toBe(before);
  });
  it.each([[390,836], [844,326], [1440,900]])("avoids hazards and walls across 1,000 seeds at %ix%i", (width,height) => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const env = buildArenaEnvironment({ seed, width, height });
      const p = findSafeArenaSpawn(env, width, height);
      expect(p.x).toBeGreaterThanOrEqual(24);
      expect(p.y).toBeGreaterThanOrEqual(24);
      expect(p.x).toBeLessThanOrEqual(width - 24);
      expect(p.y).toBeLessThanOrEqual(height - 24);
      for (const h of env.hazards) expect(Math.hypot(p.x-h.x,p.y-h.y)).toBeGreaterThanOrEqual(h.radius+24);
      for (const o of env.obstacles) {
        const dx = p.x - Math.max(o.x, Math.min(o.x+o.w, p.x));
        const dy = p.y - Math.max(o.y, Math.min(o.y+o.h, p.y));
        expect(Math.hypot(dx,dy)).toBeGreaterThanOrEqual(24);
      }
    }
  });
});
