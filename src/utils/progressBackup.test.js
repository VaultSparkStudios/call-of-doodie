import { beforeEach, describe, expect, it } from "vitest";
import { exportProgressBackup, importProgressBackup, previewProgressBackup } from "./progressBackup.js";

beforeEach(() => localStorage.clear());

describe("portable progress boundary", () => {
  it("exports progression but no identity, eligibility, debug or telemetry keys", () => {
    localStorage.setItem("cod-career-v1", JSON.stringify({ bestScore: 42 }));
    localStorage.setItem("cod-obelisk-passport-v1", JSON.stringify({ profileKey: "secret" }));
    localStorage.setItem("cod-supporter-verification-v2", JSON.stringify({ token: "secret" }));
    localStorage.setItem("cod-run-fact-outbox-v1", JSON.stringify([{ email: "private" }]));
    localStorage.setItem("cod-debug-input", "1");
    const backup = exportProgressBackup();
    expect(backup.schema).toBe("cod-progress-backup-v2");
    expect(Object.keys(backup.entries)).toEqual(["cod-career-v1"]);
    expect(JSON.stringify(backup)).not.toContain("secret");
  });

  it("imports legacy saves while ignoring identity material and reporting it", () => {
    const result = importProgressBackup({ schema: "cod-progress-backup-v1", entries: {
      "cod-career-v1": JSON.stringify({ bestScore: 42 }),
      "cod-obelisk-passport-v1": JSON.stringify({ profileKey: "secret" }),
    } });
    expect(result).toMatchObject({ restored: 1, legacy: true, ignored: ["cod-obelisk-passport-v1"] });
    expect(localStorage.getItem("cod-obelisk-passport-v1")).toBeNull();
  });

  it("keeps a chosen mastery trail in portable game progress", () => {
    localStorage.setItem("cod-mastery-trail-v1", JSON.stringify({ version: 1, focusId: "survival", milestoneId: "doctrine", startedAt: 2000, baseline: { wave: 4 } }));
    const backup = exportProgressBackup();
    expect(backup.entries["cod-mastery-trail-v1"]).toBeTruthy();
    expect(previewProgressBackup(backup).restored).toBe(1);
  });

  it("rejects malformed, null, oversized and credential-bearing progress without changing the prior save", () => {
    localStorage.setItem("cod-career-v1", JSON.stringify({ bestScore: 7 }));
    const invalid = [
      { schema: "cod-progress-backup-v2", entries: null },
      { schema: "cod-progress-backup-v2", entries: { "cod-career-v1": "null" } },
      { schema: "cod-progress-backup-v2", entries: { "cod-career-v1": JSON.stringify({ profileKey: "secret" }) } },
      { schema: "cod-progress-backup-v2", entries: { "cod-career-v1": JSON.stringify({ blob: "x".repeat(520_000) }) } },
    ];
    for (const backup of invalid) expect(() => previewProgressBackup(backup)).toThrow();
    expect(JSON.parse(localStorage.getItem("cod-career-v1")).bestScore).toBe(7);
  });

  it("rolls back already written records when storage interrupts a restore", () => {
    const map = new Map([["cod-career-v1", JSON.stringify({ bestScore: 7 })]]);
    let writes = 0;
    const storage = {
      getItem: (key) => map.get(key) ?? null,
      setItem(key, value) { if (++writes === 2) throw new Error("quota"); map.set(key, value); },
      removeItem: (key) => map.delete(key),
    };
    expect(() => importProgressBackup({ schema: "cod-progress-backup-v2", entries: {
      "cod-career-v1": JSON.stringify({ bestScore: 99 }),
      "cod-stash-v1": JSON.stringify({ total: 4 }),
    } }, storage)).toThrow("previous save preserved");
    expect(JSON.parse(map.get("cod-career-v1")).bestScore).toBe(7);
    expect(map.has("cod-stash-v1")).toBe(false);
  });
});
