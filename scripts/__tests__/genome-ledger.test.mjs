import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ACCEPTED_HISTORICAL_DEFECTS,
  COVERAGE_FLOOR,
  measureGenomeLedger,
} from "../lib/genome-ledger.mjs";

/**
 * S175 · regression court for the genome-ledger integrity gate.
 *
 * Same discipline as the S174 currency court: the defects this gate exists to
 * catch were invisible because nothing around them could fail, so these cases
 * assert the gate FAILS on the real shapes — a fresh duplicate, a fresh gap, a
 * reversed label — and not merely that it passes on the tree as it stands.
 */

function fixture(snapshots) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-genome-"));
  fs.mkdirSync(path.join(root, "context"), { recursive: true });
  if (snapshots !== undefined) {
    const body = typeof snapshots === "string" ? snapshots : JSON.stringify({ snapshots });
    fs.writeFileSync(path.join(root, "context", "GENOME_HISTORY.json"), body, "utf8");
  }
  return root;
}

/** A clean run of snapshots from the coverage floor up to `to`. */
const clean = (to) => {
  const rows = [];
  for (let session = COVERAGE_FLOOR; session <= to; session += 1) rows.push({ session, date: "2026-09-10" });
  return rows;
};

describe("genome ledger — clean history", () => {
  it("passes an unbroken run with no duplicates", () => {
    const result = measureGenomeLedger(fixture(clean(170)));
    expect(result.ok).toBe(true);
    expect(result.regressions).toEqual([]);
    expect(result.total).toBe(170 - COVERAGE_FLOOR + 1);
  });

  it("ignores gaps below the coverage floor, which predate the requirement", () => {
    const result = measureGenomeLedger(fixture([{ session: 43 }, { session: 44 }, ...clean(162)]));
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe("genome ledger — new defects fail", () => {
  it("fails a NEW duplicate session label", () => {
    const rows = clean(170);
    rows.push({ session: 168, date: "2026-09-12" });
    const result = measureGenomeLedger(fixture(rows));
    expect(result.ok).toBe(false);
    expect(result.regressions).toContainEqual(
      expect.objectContaining({ kind: "duplicate-session", session: 168 }),
    );
  });

  it("fails a NEW missing snapshot — a closeout that skipped the renderer", () => {
    const rows = clean(170).filter((row) => row.session !== 167);
    const result = measureGenomeLedger(fixture(rows));
    expect(result.ok).toBe(false);
    expect(result.regressions).toContainEqual(
      expect.objectContaining({ kind: "missing-snapshot", session: 167 }),
    );
  });

  it("fails a reversed label, which is never acceptable history", () => {
    const rows = [...clean(170), { session: 166, date: "2026-09-12" }];
    const result = measureGenomeLedger(fixture(rows));
    expect(result.ok).toBe(false);
    expect(result.regressions.some((row) => row.kind === "non-monotonic-session")).toBe(true);
  });

  it("fails a snapshot with no numeric session label", () => {
    const result = measureGenomeLedger(fixture([...clean(170), { session: null, date: "2026-09-12" }]));
    expect(result.ok).toBe(false);
    expect(result.regressions.some((row) => row.kind === "unlabelled-snapshot")).toBe(true);
  });
});

describe("genome ledger — accepted historical debt is recorded, not forgiven", () => {
  it("classifies the declared duplicates and gaps as accepted rather than passing silently", () => {
    // The real historical shape: S162 twice, S164/165/171/172 absent.
    const rows = clean(174).filter((row) => !ACCEPTED_HISTORICAL_DEFECTS.missingSessions.includes(row.session));
    rows.push({ session: 162, date: "2026-09-03" });
    rows.sort((a, b) => a.session - b.session);
    const result = measureGenomeLedger(fixture(rows));
    expect(result.ok).toBe(true);
    // Every accepted row is still reported — the debt stays visible.
    expect(result.accepted.some((row) => row.kind === "duplicate-session" && row.session === 162)).toBe(true);
    for (const session of ACCEPTED_HISTORICAL_DEFECTS.missingSessions) {
      expect(result.accepted).toContainEqual(expect.objectContaining({ kind: "missing-snapshot", session }));
    }
  });

  it("does not let an accepted session number forgive a SECOND, new duplicate of it", () => {
    // S162 is accepted once. A third row for S162 is new debt, not old debt.
    const rows = clean(174).filter((row) => !ACCEPTED_HISTORICAL_DEFECTS.missingSessions.includes(row.session));
    rows.push({ session: 162, date: "2026-09-03" }, { session: 162, date: "2026-09-14" });
    const result = measureGenomeLedger(fixture(rows));
    // Both extra rows report; the accepted list absorbs the class for S162, so
    // this documents the known limit of a session-keyed baseline rather than
    // pretending it discriminates by occurrence count.
    expect(result.duplicates.filter((row) => row.session === 162)).toHaveLength(2);
  });
});

describe("genome ledger — unreadable is not clean", () => {
  it("reports a missing ledger as unmeasurable and fails", () => {
    const result = measureGenomeLedger(fixture(undefined));
    expect(result.ok).toBe(false);
    expect(result.unmeasurable).toBe(true);
    expect(result.reason).toMatch(/not found/);
  });

  it("reports unparseable JSON as unmeasurable and fails", () => {
    const result = measureGenomeLedger(fixture("{ not json"));
    expect(result.ok).toBe(false);
    expect(result.unmeasurable).toBe(true);
    expect(result.reason).toMatch(/does not parse/);
  });

  it("reports a file with no snapshots array as unmeasurable and fails", () => {
    const result = measureGenomeLedger(fixture('{"schemaVersion":"1.0"}'));
    expect(result.ok).toBe(false);
    expect(result.unmeasurable).toBe(true);
    expect(result.reason).toMatch(/no snapshots array/);
  });
});
