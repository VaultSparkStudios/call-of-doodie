import { describe, expect, it, vi } from "vitest";
import { clearHash, navigateHash, parseHash, watchHash } from "./hashRoute.js";
import { exportProgressBackup, importProgressBackup } from "../storage.js";
import { fetchCloudBackup, pushCloudBackup } from "./cloudBackup.js";
import { PLAYER_NAVIGATION_MIGRATION } from "../config/playerNavigation.js";

describe("hashRoute (S163)", () => {
  it("parses known panels and ignores unknown hashes", () => {
    expect(parseHash("#profile")).toEqual({ id: "profile", arg: null });
    expect(parseHash("#board/daily")).toEqual({ id: "board", arg: "daily" });
    expect(parseHash("#profile/runs")).toEqual({ id: "profile", arg: "runs" });
    expect(parseHash("#settings")).toEqual({ id: "settings", arg: null });
    expect(parseHash("#achievements")).toEqual({ id: "profile", arg: "collection" });
    expect(parseHash("#loadouts")).toEqual({ id: "build", arg: "setup" });
    expect(parseHash("#deploy")).toBeNull();
    expect(parseHash("")).toBeNull();
  });

  it("navigates and notifies watchers, then clears", () => {
    const seen = [];
    const stop = watchHash((route) => seen.push(route?.id));
    expect(navigateHash("profile")).toBe(true);
    expect(seen).toContain("profile");
    expect(window.location.hash).toBe("#profile");
    clearHash();
    expect(window.location.hash).toBe("");
    stop();
    expect(navigateHash("nope")).toBe(false);
  });

  it("maps each former player entry to one reachable Record or Build destination", () => {
    expect(new Set(PLAYER_NAVIGATION_MIGRATION.map((entry) => entry.source)).size).toBe(PLAYER_NAVIGATION_MIGRATION.length);
    for (const entry of PLAYER_NAVIGATION_MIGRATION) {
      const expected = parseHash(entry.destination);
      expect(["profile", "build"]).toContain(expected.id);
      if (entry.legacyHash) expect(parseHash(`#${entry.legacyHash}`)).toEqual(expected);
    }
  });
});

describe("progress backup (S163)", () => {
  it("exports only cod- keys and restores them", () => {
    localStorage.clear();
    localStorage.setItem("cod-career-v1", JSON.stringify({ bestScore: 42 }));
    localStorage.setItem("unrelated", "x");
    const backup = exportProgressBackup();
    expect(backup.keys).toBe(1);
    localStorage.clear();
    const result = importProgressBackup(JSON.stringify(backup));
    expect(result.restored).toBe(1);
    expect(JSON.parse(localStorage.getItem("cod-career-v1")).bestScore).toBe(42);
    expect(() => importProgressBackup("{}")).toThrow();
  });
});

describe("cloud backup client (S163)", () => {
  it("is disabled without a passport and reports a 503 as disabled", async () => {
    expect((await fetchCloudBackup(null)).state).toBe("disabled");
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 }));
    expect((await fetchCloudBackup({ subject: "s1" }, { fetchImpl, session: { token: "k", capability: "signed" } })).state).toBe("disabled");
    expect((await pushCloudBackup({ subject: "s1" }, { schema: "cod-progress-backup-v2", entries: {} }, { fetchImpl, session: { token: "k", capability: "signed" } })).state).toBe("disabled");
  });

  it("sends a live session token and reads a found backup", async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      expect(init.headers.authorization).toBe("Bearer k");
      expect(init.headers["x-profile-capability"]).toBe("signed");
      return new Response(JSON.stringify({ backup: { schema: "cod-progress-backup-v2", entries: {} }, updatedAt: "2026-09-03T00:00:00Z" }), { status: 200 });
    });
    const r = await fetchCloudBackup({ subject: "s1" }, { fetchImpl, session: { token: "k", capability: "signed" } });
    expect(r.state).toBe("found");
    expect(r.updatedAt).toBe("2026-09-03T00:00:00Z");
  });
});
