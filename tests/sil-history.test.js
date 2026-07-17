import { describe, expect, it } from "vitest";
import { forecastNext } from "../scripts/lib/sil-forecaster.mjs";
import { parseSilHistory, latestScoredSilSession, totalFromCategories, validateSilSession } from "../scripts/lib/sil-history.mjs";

const categories = `
| Category | Score | Delta | Rationale |
|---|---:|---|---|
| Dev Health | 100 | same | ok |
| Creative Alignment | 100 | same | ok |
| Momentum | 100 | same | ok |
| Engagement | 100 | same | ok |
| Process Quality | 100 | same | ok |
| Cross-Repo Coherence | 100 | same | ok |
| Security Posture | 100 | same | ok |
| Ecosystem Integration | 100 | same | ok |
| Capital Efficiency | 100 | same | ok |
| Automation Coverage | 100 | same | ok |
`;

describe("canonical SIL history", () => {
  it("parses both formats, sorts by session number, and keeps body totals", () => {
    const text = `
## Session 8 — 2026-07-01

**Total: 800/1000**
**Velocity: 2**

| 1 | Dev Health | 80 | same | ok |

## 2026-07-16 — Session 10 | Total: 1000/1000 | Velocity: 6 | Debt: ↓
${categories}

## 2026-07-10 — Session 9 | Total: 900/1000 | Velocity: 4
${categories.replaceAll("100", "90")}
`;
    const parsed = parseSilHistory(text);
    expect(parsed.map((entry) => entry.session)).toEqual([10, 9, 8]);
    expect(parsed[0]).toMatchObject({ date: "2026-07-16", total: 1000, max: 1000, velocity: 6, debt: "↓" });
    expect(parsed[2]).toMatchObject({ date: "2026-07-01", total: 800, velocity: 2 });
    expect(totalFromCategories(parsed[0])).toBe(1000);
    expect(validateSilSession(parsed[0])).toMatchObject({ ok: true, categoryCount: 10 });
  });

  it("selects the latest scored entry instead of a stale rolling header", () => {
    const text = `Last session: 2026-06-01\n## 2026-07-16 — Session 123 | Total: 1000/1000 | Velocity: 6\n${categories}`;
    expect(latestScoredSilSession(text)).toMatchObject({ session: 123, date: "2026-07-16", total: 1000 });
  });

  it("forecasts from current unnumbered category tables and never emits a fake zero total", () => {
    const text = `
## 2026-07-16 — Session 123 | Total: 1000/1000 | Velocity: 6
${categories}
## 2026-07-15 — Session 122 | Total: 990/1000 | Velocity: 5
${categories.replace("| Momentum | 100", "| Momentum | 90")}
`;
    const sessions = parseSilHistory(text);
    const forecast = forecastNext(sessions, { velocity: 6, blockerPressure: 0, contextAge: 0 });
    expect(forecast.totalPredicted).toBeGreaterThanOrEqual(990);
    expect(forecast.totalPredicted).toBeLessThanOrEqual(1000);
  });

  it("fails closed when a scored session omits categories", () => {
    const [entry] = parseSilHistory("## 2026-07-16 — Session 1 | Total: 1000/1000 | Velocity: 1\n");
    expect(validateSilSession(entry)).toMatchObject({ ok: false, categoryCount: 0 });
    expect(forecastNext([entry])).toBeNull();
  });
});
