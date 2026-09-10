import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CLOSEOUT_ARTIFACTS,
  ledgerSession,
  measureCloseoutArtifacts,
} from "../lib/closeout-artifact-currency.mjs";

/**
 * S174 · regression court for the closeout-artifact currency gate.
 *
 * The defect this gate exists to catch (three consecutive closeouts skipping a
 * §3.7 renderer while every probe stayed green) was invisible precisely because
 * the probes around it could not fail. So these cases assert the gate FAILS on
 * the real historical shape, not merely that it passes on a good tree.
 */

const SIL = [
  "## 2026-09-10 — Session 173 | Total: 995/1000 | Velocity: 2 | Debt: ↓",
  "body",
  "",
  "## 2026-09-10 — Session 172 | Total: 991/1000 | Velocity: 1 | Debt: ↓",
  "body",
].join("\n");

/** Build a throwaway repo with the given artifact contents. */
function fixture({ sil = SIL, stateVector, genome } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-currency-"));
  fs.mkdirSync(path.join(root, "context"), { recursive: true });
  fs.writeFileSync(path.join(root, "context", "SELF_IMPROVEMENT_LOOP.md"), sil, "utf8");
  if (stateVector !== undefined) {
    fs.writeFileSync(path.join(root, "context", "STATE_VECTOR.json"), stateVector, "utf8");
  }
  if (genome !== undefined) {
    fs.writeFileSync(path.join(root, "context", "GENOME_HISTORY.json"), genome, "utf8");
  }
  return root;
}

const vector = (session) => JSON.stringify({ session });
const genomeOf = (...sessions) => JSON.stringify({ snapshots: sessions.map((session) => ({ session })) });

describe("ledgerSession", () => {
  it("reads the newest closed-out session from the append-only ledger", () => {
    expect(ledgerSession(SIL)).toBe(173);
  });

  it("returns null rather than guessing when the ledger has no entries", () => {
    expect(ledgerSession("")).toBeNull();
  });
});

describe("measureCloseoutArtifacts", () => {
  it("passes when every artifact records the newest closed-out session", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: vector(173), genome: genomeOf(172, 173) }));
    expect(result.authority).toBe(173);
    expect(result.ok).toBe(true);
    expect(result.stale).toHaveLength(0);
  });

  it("fails on the exact S174 shape: renderers stopped at S170 while the ledger reached S173", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: vector(170), genome: genomeOf(169, 170) }));
    expect(result.ok).toBe(false);
    expect(result.stale.map((row) => row.file)).toEqual([
      "context/STATE_VECTOR.json",
      "context/GENOME_HISTORY.json",
    ]);
    for (const row of result.stale) expect(row.lag).toBe(3);
  });

  it("names the renderer to re-run for each stale artifact", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: vector(170), genome: genomeOf(173) }));
    const [staleRow] = result.stale;
    // A gate that says "stale" without saying what to run is a gate people learn to skip.
    expect(staleRow.renderer).toBe("scripts/render-state-vector.mjs");
    expect(staleRow.protocol).toContain("§3.7");
  });

  it("tolerates an artifact rendered ahead of the ledger mid-session", () => {
    // The renderer legitimately runs before the SIL entry is appended; only lag is debt.
    const result = measureCloseoutArtifacts(fixture({ stateVector: vector(174), genome: genomeOf(174) }));
    expect(result.ok).toBe(true);
  });

  it("takes the maximum genome snapshot, so an out-of-order append does not read as stale", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: vector(173), genome: genomeOf(173, 166) }));
    expect(result.ok).toBe(true);
  });

  it("reports a missing artifact as unmeasurable, never as fresh", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: vector(173) }));
    expect(result.ok).toBe(false);
    expect(result.unmeasurable.map((row) => row.file)).toEqual(["context/GENOME_HISTORY.json"]);
    expect(result.unmeasurable[0].reason).toBe("file missing");
  });

  it("reports an unparseable artifact as unmeasurable rather than crashing the gate", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: "{ not json", genome: genomeOf(173) }));
    expect(result.ok).toBe(false);
    expect(result.unmeasurable[0].file).toBe("context/STATE_VECTOR.json");
    expect(result.unmeasurable[0].reason).toMatch(/unreadable/);
  });

  it("reports an artifact with no session marker as unmeasurable", () => {
    const result = measureCloseoutArtifacts(fixture({ stateVector: JSON.stringify({}), genome: genomeOf(173) }));
    expect(result.unmeasurable[0].reason).toBe("no session marker");
  });

  it("cannot assert currency when the ledger itself is unreadable", () => {
    const result = measureCloseoutArtifacts(fixture({ sil: "", stateVector: vector(173), genome: genomeOf(173) }));
    expect(result.authority).toBeNull();
    expect(result.ok).toBe(false);
    for (const row of result.unmeasurable) expect(row.reason).toBe("SIL ledger unreadable");
  });
});

describe("declared artifact table", () => {
  it("declares a renderer and protocol clause for every artifact", () => {
    for (const artifact of CLOSEOUT_ARTIFACTS) {
      expect(artifact.renderer, `${artifact.file} declares no renderer`).toBeTruthy();
      expect(artifact.protocol, `${artifact.file} declares no protocol clause`).toBeTruthy();
      expect(typeof artifact.session).toBe("function");
    }
  });

  it("covers the live repository and is currently clean", () => {
    // Binds the gate to the real tree: if a future session skips a renderer, this
    // fails in the suite as well as in schema:lint.
    const repoRoot = path.resolve(import.meta.dirname, "..", "..");
    const result = measureCloseoutArtifacts(repoRoot);
    expect(result.rows.length).toBe(CLOSEOUT_ARTIFACTS.length);
    expect(
      result.stale.map((row) => `${row.file} is ${row.lag} session(s) behind — run ${row.renderer}`),
    ).toEqual([]);
  });
});
