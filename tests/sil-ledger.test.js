import { describe, expect, it } from "vitest";
import { parseSilSessions, resolveLatestSilDate } from "../scripts/lib/sil-ledger.mjs";

describe("SIL ledger freshness", () => {
  it("uses the newest session block date instead of a stale rolling-status date", () => {
    const markdown = [
      "## 2026-08-12 — Session 152 | Total: 997/1000 | Velocity: 5",
      "",
      "Latest closeout.",
      "",
      "## 2026-08-01 — Session 136 | Total: 999/1000 | Velocity: 13",
      "",
      "Historical closeout.",
      "",
      "Last session: 2026-08-01 | Session 136 | Total: 999/1000",
    ].join("\n");

    const entries = parseSilSessions(markdown);
    expect(entries[0]).toMatchObject({ session: 152, date: "2026-08-12" });
    expect(resolveLatestSilDate(entries, "Last session: 2026-08-01")).toBe("2026-08-12");
  });

  it("keeps the rolling header as a compatibility fallback", () => {
    expect(resolveLatestSilDate([], "Last session: 2026-07-30 | Session 135")).toBe("2026-07-30");
    expect(resolveLatestSilDate([], "Last session: unknown")).toBeNull();
  });

  it("keeps addendum score revisions without turning subheadings into phantom sessions", () => {
    const markdown = [
      "## 2026-08-13 — Session 154 | Total: 980/1000 | Velocity: 3",
      "",
      "### 2026-08-13 — Session 154 addendum | Score revised: 980 → 984 | Kind: verifier seal",
      "",
      "## 2026-08-12 — Session 153 | Total: 998/1000 | Velocity: 5",
    ].join("\n");
    const entries = parseSilSessions(markdown);
    expect(entries.map((entry) => entry.session)).toEqual([154, 153]);
    expect(entries[0]).toMatchObject({ total: 984, baseTotal: 980 });
    expect(entries[0].revisions).toEqual([{ from: 980, to: 984 }]);
    expect(resolveLatestSilDate(entries, "Last session: 2026-08-01")).toBe("2026-08-13");
  });
});
