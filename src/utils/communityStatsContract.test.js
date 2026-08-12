import { describe, expect, it } from "vitest";
import descriptor from "../../public/stats-surface.json";
import {
  COMMUNITY_STATS_FEED_VERSION,
  COMMUNITY_STATS_REFRESH_MECHANISM,
  COMMUNITY_STATS_REFRESH_SECONDS,
  COMMUNITY_STATS_SHOWCASE,
} from "./communityStatsContract.js";

describe("Analytica stats twin contract", () => {
  it("binds the machine descriptor to the visible showcase and poll cadence", () => {
    expect(descriptor.feedVersion).toBe(COMMUNITY_STATS_FEED_VERSION);
    expect(descriptor.refreshSeconds).toBe(COMMUNITY_STATS_REFRESH_SECONDS);
    expect(descriptor.refreshMechanism).toBe(COMMUNITY_STATS_REFRESH_MECHANISM);
    expect(descriptor.showcase).toEqual(COMMUNITY_STATS_SHOWCASE.map((metric) => metric.id));
    expect(COMMUNITY_STATS_SHOWCASE).toHaveLength(4);
    const metricIds = new Set(descriptor.metrics.map((metric) => metric.id));
    expect(COMMUNITY_STATS_SHOWCASE.every((metric) => metricIds.has(metric.id))).toBe(true);
  });
});
