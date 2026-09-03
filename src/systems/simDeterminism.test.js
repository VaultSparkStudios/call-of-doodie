import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RUN_RNG_STREAMS, getRunRng } from "./runRng.js";
import { createFixedStepClock, SIM_STEP_MS } from "../hooks/useGameLoop.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Files allowed to reference Math.random inside src/systems: the RNG module
// itself (it is the fallback) and cosmetic-only presentation helpers.
const ALLOW = new Set(["runRng.js"]);

function listSystemFiles() {
  return fs.readdirSync(here).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"));
}

describe("sim determinism guard (S163)", () => {
  it("no simulation module calls Math.random() directly", () => {
    const offenders = [];
    for (const file of listSystemFiles()) {
      if (ALLOW.has(file)) continue;
      const text = fs.readFileSync(path.join(here, file), "utf8");
      // Default-parameter fallbacks (`rng = Math.random`) are allowed: callers
      // inject seeded streams. A direct invocation `Math.random(` is not.
      if (/Math\.random\(\)/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("exposes the S163 additive streams without touching spawn derivation", () => {
    expect(RUN_RNG_STREAMS).toContain("allies");
    expect(RUN_RNG_STREAMS).toContain("director");
    expect(RUN_RNG_STREAMS).toContain("royale");
    const gs = { runSeed: 4242, currentWave: 3 };
    const a = getRunRng(gs, "spawn")();
    const gs2 = { runSeed: 4242, currentWave: 3 };
    expect(getRunRng(gs2, "spawn")()).toBe(a);
    expect(getRunRng({ runSeed: 4242, currentWave: 3 }, "allies")()).not.toBe(a);
  });
});

describe("fixed-step clock (S163)", () => {
  it("runs one step per 60Hz frame and half as many on 120Hz", () => {
    const clock = createFixedStepClock();
    expect(clock.advance(0)).toBe(1);
    let steps60 = 0;
    for (let i = 1; i <= 60; i += 1) steps60 += clock.advance(i * SIM_STEP_MS);
    expect(steps60).toBe(60);
    const c120 = createFixedStepClock();
    c120.advance(0);
    let steps120 = 0;
    for (let i = 1; i <= 120; i += 1) steps120 += c120.advance(i * (SIM_STEP_MS / 2));
    expect(steps120).toBe(60);
  });

  it("clamps long gaps and caps catch-up", () => {
    const clock = createFixedStepClock();
    clock.advance(0);
    expect(clock.advance(5000)).toBe(4);
    expect(clock.advance(5000 + SIM_STEP_MS)).toBe(1);
  });
});
