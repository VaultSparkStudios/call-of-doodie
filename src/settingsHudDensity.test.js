import { describe, expect, it } from "vitest";
import { hudFlags } from "./settings.js";

describe("HUD density surface selection", () => {
  it("keeps compact surfaces for minimal and standard while preserving tactical depth", () => {
    expect(hudFlags("minimal").useCompactDesktop).toBe(true);
    expect(hudFlags("standard").useCompactDesktop).toBe(true);
    expect(hudFlags("tactical").useCompactDesktop).toBe(false);
  });
});
