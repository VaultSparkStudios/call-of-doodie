import { describe, expect, it } from "vitest";
import { checkPublicStatsRoute } from "../scripts/lib/public-stats-route-contract.mjs";

const route = { id: "stats", path: "/stats/", generated: true, canonicalUrl: "https://callofdoodie.wtf/stats/" };
const html = '<link rel="canonical" href="https://callofdoodie.wtf/stats/"><strong data-community-stat="runs">52</strong><p data-stats-takeaway>Recorded activity</p>';

describe("public stats route claim", () => {
  it("accepts the actual page when the machine descriptor and route agree", () => {
    expect(checkPublicStatsRoute({ routes: [route], descriptor: { page: route.canonicalUrl }, html })).toEqual([]);
  });

  it("rejects the former redirect even if the descriptor and generated page exist", () => {
    expect(checkPublicStatsRoute({ routes: [route], descriptor: { page: route.canonicalUrl }, html, redirects: "/stats/  /board/  301\n" }))
      .toContain("/stats/ is redirected away from its claimed page");
  });

  it("rejects a missing route, false descriptor, or missing live analysis", () => {
    expect(checkPublicStatsRoute({ routes: [], descriptor: { page: route.canonicalUrl }, html })).toContain("stats descriptor requires a generated /stats/ route");
    expect(checkPublicStatsRoute({ routes: [route], descriptor: { page: "https://callofdoodie.wtf/board/" }, html }))
      .toContain("stats descriptor page disagrees with the public stats route");
    expect(checkPublicStatsRoute({ routes: [route], descriptor: { page: route.canonicalUrl }, html: "" }))
      .toContain("generated stats page lacks its canonical live-analysis surface");
  });
});
