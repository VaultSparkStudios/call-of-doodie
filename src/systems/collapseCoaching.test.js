import { describe, expect, it } from "vitest";
import { buildCollapseCoaching } from "./collapseCoaching.js";

describe("collapse coaching evidence contract", () => {
  it("ranks a captured finish above a heuristic without claiming causality", () => {
    const result = buildCollapseCoaching({
      damageReceipt: {
        schemaVersion: "damage-sequence-v1",
        hitCount: 3,
        totalDamage: 72,
        finalTwoSecondDamage: 60,
        finishStyle: "burst",
        topSource: { sourceName: "Karen" },
      },
      postRunIntel: { cause: "cooldown_hoarding" },
    });
    expect(result).toMatchObject({
      claim: "evidence-ranked-coaching-not-causality",
      primary: { evidenceLevel: "observed", label: "OBSERVED FINISH", reasonCode: "observed_burst_finish" },
      contributingFactor: { evidenceLevel: "likely_factor", reasonCode: "unused_tempo_tool" },
    });
    expect(result.primary.statement).toContain("Karen");
  });

  it("labels summary heuristics as likely factors without a receipt", () => {
    expect(buildCollapseCoaching({ postRunIntel: { cause: "chain_control" } }).primary).toMatchObject({
      evidenceLevel: "likely_factor",
      label: "LIKELY FACTOR",
      reasonCode: "chain_control",
    });
  });

  it("falls back to an explicitly bounded hypothesis", () => {
    expect(buildCollapseCoaching({
      debrief: { collapseReason: "Try a safer opening." },
      postRunIntel: { cause: "unknown" },
    }).primary).toMatchObject({
      evidenceLevel: "hypothesis",
      label: "COACHING HYPOTHESIS",
      statement: "Try a safer opening.",
    });
  });

  it("sanitizes observed source labels", () => {
    const result = buildCollapseCoaching({
      damageReceipt: {
        schemaVersion: "damage-sequence-v1",
        hitCount: 1,
        totalDamage: 10,
        finalTwoSecondDamage: 10,
        finishStyle: "mixed",
        topSource: { sourceName: "Boss\u0000\nInjected" },
      },
    });
    expect(result.primary.evidence.topSource).toBe("BossInjected");
  });
});
