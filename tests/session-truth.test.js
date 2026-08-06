import { describe, expect, it } from "vitest";
import { evaluateLastSessionSummary, extractSessionId } from "../scripts/check-last-session-summary.mjs";
import { renderLastCompleted } from "../scripts/lib/brief-blocks.mjs";
import { evaluateCurrentStateCoherence, findRepeatedSessionBlocks } from "../scripts/lib/current-state-coherence.mjs";

describe("session reference truth", () => {
  it("prefers the leading completed session over a nested recovery reference", () => {
    const summary = "Session 140 recovered S139, shipped five verified items.";
    expect(extractSessionId(summary)).toBe(140);
    expect(renderLastCompleted(summary, { expectedSession: 140 })).toContain("LAST SESSION (S140)");
    expect(renderLastCompleted(summary, { expectedSession: 140 })).not.toContain("STALE LAST SESSION");
  });

  it("retains genuine stale-summary detection", () => {
    const block = renderLastCompleted("Session 139 shipped the previous tree.", { expectedSession: 140 });
    expect(block).toContain("STALE LAST SESSION SUMMARY");
    expect(evaluateLastSessionSummary({
      status: { lastSessionSummary: "Session 139 shipped the previous tree." },
      silText: "## 2026-08-05 — Session 140\n**Total: 999/1000**",
    })).toMatchObject({ ok: false, expected: 140, actual: 139 });
  });

  it("supports structured session references", () => {
    expect(extractSessionId({ session: 141 })).toBe(141);
    expect(extractSessionId({ label: "S142 closeout" })).toBe(142);
  });
});

describe("Current State idempotence", () => {
  const block = [
    "- Session 140 shipped the truth court.",
    "- Validation truth — focused checks pass.",
    "- Release truth — external gates stay explicit.",
    "",
  ].join("\n");

  it("detects an exact repeated contiguous session block", () => {
    expect(findRepeatedSessionBlocks(`${block}${block}- Session 139 stayed distinct.\n`)).toEqual([
      { session: 140, firstLine: 1, repeatedLine: 4, matchingLines: 3 },
    ]);
  });

  it("allows repeated session references when their blocks differ", () => {
    expect(evaluateCurrentStateCoherence([
      "- Session 140 shipped item A.",
      "- Evidence A.",
      "- Validation A.",
      "- Session 140 continuation shipped item B.",
      "- Evidence B.",
      "- Validation B.",
    ].join("\n")).ok).toBe(true);
  });
});
