import { describe, expect, it } from "vitest";
import { assessLeaderboardRow, buildTrustReceipt } from "../scripts/lib/leaderboard-trust.mjs";

describe("leaderboard trust court", () => {
  it("keeps plausible rows public", () => {
    expect(assessLeaderboardRow({ score: 42000, kills: 80, wave: 8, totalDamage: 9000, level: 12 }).severity).toBe("clear");
  });

  it("reason-codes implausible progression", () => {
    const result = assessLeaderboardRow({ score: 1063334, kills: 322, wave: 15, totalDamage: 63622, level: 77 });
    expect(result.severity).toBe("high");
    expect(result.flags.map((flag) => flag.code)).toContain("level-velocity");
  });

  it("creates a value-free reversible operator receipt", () => {
    const assessment = assessLeaderboardRow({ score: 999999, kills: 2, wave: 1, totalDamage: 50, level: 1 });
    const receipt = buildTrustReceipt({ action: "quarantine", row: { id: "row-1", name: "PLAYER", score: 999999 }, assessment, at: "2026-08-03T00:00:00.000Z" });
    expect(receipt).toMatchObject({ action: "quarantine", rowId: "row-1", severity: "high" });
    expect(JSON.stringify(receipt)).not.toContain("SUPABASE");
  });
});
