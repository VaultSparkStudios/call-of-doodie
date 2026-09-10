import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { deriveSilAverage, enforceSilInvariant } from "../lib/write-project-status.mjs";

/**
 * S174 · court for deriving silAvg3/silAvg5 instead of trusting them.
 *
 * Before this, the averages were hand-entered at closeout with no authority behind
 * them: PROJECT_STATUS carried 995 while STATE_VECTOR carried 997.7, and the
 * disagreement survived because nothing compared either to the ledger. The visible
 * symptom was a permanent churn loop — a closeout writes `995.0`, JSON.stringify
 * drops the trailing `.0`, the next script write reverts it.
 */

const ledger = (...scores) =>
  scores
    .map((total, i) => `## 2026-09-10 — Session ${200 - i} | Total: ${total}/1000 | Velocity: 1 | Debt: ↓\nbody\n`)
    .join("\n");

describe("deriveSilAverage", () => {
  it("averages the newest N scored sessions", () => {
    expect(deriveSilAverage(ledger(995, 991, 999, 997, 999), 3)).toBe(995);
    expect(deriveSilAverage(ledger(995, 991, 999, 997, 999), 5)).toBe(996.2);
  });

  it("rounds to one decimal", () => {
    // 1000 + 999 + 999 = 2998 / 3 = 999.333…
    expect(deriveSilAverage(ledger(1000, 999, 999), 3)).toBe(999.3);
  });

  it("returns null rather than averaging a short window", () => {
    // A 5-session mean computed from 3 sessions is a different statistic wearing
    // the same field name. Refusing is the honest answer.
    expect(deriveSilAverage(ledger(995, 991, 999), 5)).toBeNull();
    expect(deriveSilAverage("", 3)).toBeNull();
  });

  it("ignores unscored ledger entries", () => {
    const withUnscored = `## 2026-09-10 — Session 300 | Debt: ↓\nno total here\n\n${ledger(900, 900, 900)}`;
    expect(deriveSilAverage(withUnscored, 3)).toBe(900);
  });
});

describe("enforceSilInvariant · averages", () => {
  it("recomputes a wrong average and records the violation", () => {
    const { status, violations } = enforceSilInvariant(
      { silAvg3: 1, silAvg5: 2 },
      { silText: ledger(995, 991, 999, 997, 999) },
    );
    expect(status.silAvg3).toBe(995);
    expect(status.silAvg5).toBe(996.2);
    expect(violations.map((v) => v.field)).toEqual(["silAvg3", "silAvg5"]);
  });

  it("reports no violation when the stored averages already match the ledger", () => {
    const { violations } = enforceSilInvariant(
      { silAvg3: 995, silAvg5: 996.2 },
      { silText: ledger(995, 991, 999, 997, 999) },
    );
    expect(violations).toHaveLength(0);
  });

  it("never introduces an average the status does not already publish", () => {
    // Regression: the first cut of this derivation injected silAvg3/silAvg5 into every
    // status passed through the writer — including other projects' and temp fixtures'
    // status files, which tests/doctor-score-sync.test.js caught immediately. Correcting
    // a published field is an invariant; adding one is authoring someone else's schema.
    const { status, violations } = enforceSilInvariant(
      { slug: "some-other-project", currentSession: 122 },
      { silText: ledger(995, 991, 999, 997, 999) },
    );
    expect(status).not.toHaveProperty("silAvg3");
    expect(status).not.toHaveProperty("silAvg5");
    expect(violations).toHaveLength(0);
  });

  it("derives from the target repo's ledger, never the running repo's", () => {
    // repoRoot points at a directory with no ledger, so there is nothing to derive
    // from and the stored values must survive untouched.
    const { status } = enforceSilInvariant({ silAvg3: 42 }, { repoRoot: path.join(import.meta.dirname, "no-such-repo") });
    expect(status.silAvg3).toBe(42);
  });

  it("leaves the stored averages untouched when the ledger cannot supply a window", () => {
    // No ledger must never mean "overwrite with a guess".
    const { status, violations } = enforceSilInvariant({ silAvg3: 42, silAvg5: 43 }, { silText: "" });
    expect(status.silAvg3).toBe(42);
    expect(status.silAvg5).toBe(43);
    expect(violations).toHaveLength(0);
  });

  it("ends the float-formatting churn: a hand-written .0 survives a stringify round-trip", () => {
    const silText = ledger(995, 991, 999, 997, 999);
    // The historical loop: closeout hand-writes 995.0, the writer serialises, the
    // trailing .0 vanishes, and the diff reappears next session. Derivation makes the
    // value a fixed point of the round-trip instead.
    const first = enforceSilInvariant({ silAvg3: 995.0 }, { silText }).status;
    const roundTripped = JSON.parse(JSON.stringify(first));
    const second = enforceSilInvariant(roundTripped, { silText });
    expect(second.status.silAvg3).toBe(first.silAvg3);
    expect(second.violations.filter((v) => v.field === "silAvg3")).toHaveLength(0);
  });
});

describe("live repository", () => {
  it("keeps PROJECT_STATUS averages equal to the ledger", () => {
    const repoRoot = path.resolve(import.meta.dirname, "..", "..");
    const silText = fs.readFileSync(path.join(repoRoot, "context", "SELF_IMPROVEMENT_LOOP.md"), "utf8");
    const status = JSON.parse(fs.readFileSync(path.join(repoRoot, "context", "PROJECT_STATUS.json"), "utf8"));
    for (const [field, window] of [["silAvg3", 3], ["silAvg5", 5]]) {
      const derived = deriveSilAverage(silText, window);
      if (derived == null) continue;
      expect(status[field], `${field} disagrees with the SIL ledger`).toBe(derived);
    }
  });
});
