import { describe, expect, it } from "vitest";
import { analyzeBootStorageSources, scanBootStorageBoundary } from "../lib/boot-storage-boundary.mjs";

describe("boot storage boundary", () => {
  it("passes the live boot surfaces", () => {
    expect(scanBootStorageBoundary()).toMatchObject({ ok: true, directAccessCount: 0 });
  });

  it("finds local, session, window, and global direct access", () => {
    const receipt = analyzeBootStorageSources({
      "App.jsx": [
        'localStorage.getItem("a");',
        'sessionStorage["x"] = "b";',
        'window.localStorage.setItem("c", "d");',
        'globalThis.sessionStorage.removeItem("e");',
      ].join("\n"),
    });
    expect(receipt.ok).toBe(false);
    expect(receipt.violations.map((entry) => entry.storage)).toEqual(["localStorage", "sessionStorage", "localStorage", "sessionStorage"]);
  });

  it("ignores documentation-only comments", () => {
    expect(analyzeBootStorageSources({ "App.jsx": "// localStorage.getItem('example')\nconst safe = true;" })).toMatchObject({ ok: true });
  });
});
