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
});
