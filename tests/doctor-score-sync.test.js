import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncDoctorScore } from "../scripts/lib/doctor-score-sync.mjs";

const created = [];

afterEach(() => {
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("syncDoctorScore", () => {
  it("copies only the authoritative doctor receipt into the project status", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cod-doctor-sync-"));
    created.push(dir);
    const sourceStatusPath = path.join(dir, "source.json");
    const targetStatusPath = path.join(dir, "target.json");
    const doctorScore = {
      date: "2026-07-16",
      overallPass: true,
      passing: 113,
      warning: 28,
      failing: 0,
      blockingFailing: 0,
      skipped: 2,
      ran: 141,
      total: 143,
      score: 80,
      checks: [{ id: "portfolio-only-detail", pass: true }],
    };
    fs.writeFileSync(sourceStatusPath, JSON.stringify({ slug: "studio-ops", doctorScore }));
    fs.writeFileSync(targetStatusPath, JSON.stringify({ slug: "call-of-doodie", currentSession: 122, doctorScore: { date: "stale" } }));

    const expectedReceipt = {
      ...doctorScore,
    };
    delete expectedReceipt.checks;
    expect(syncDoctorScore({ sourceStatusPath, targetStatusPath })).toEqual(expectedReceipt);
    expect(JSON.parse(fs.readFileSync(targetStatusPath, "utf8"))).toEqual({
      slug: "call-of-doodie",
      currentSession: 122,
      doctorScore: expectedReceipt,
    });
  });

  it("fails closed when the upstream doctor receipt is absent", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cod-doctor-sync-"));
    created.push(dir);
    const sourceStatusPath = path.join(dir, "source.json");
    const targetStatusPath = path.join(dir, "target.json");
    fs.writeFileSync(sourceStatusPath, JSON.stringify({ slug: "studio-ops" }));
    fs.writeFileSync(targetStatusPath, JSON.stringify({ slug: "call-of-doodie" }));

    expect(() => syncDoctorScore({ sourceStatusPath, targetStatusPath })).toThrow(/doctorScore missing/);
  });
});
