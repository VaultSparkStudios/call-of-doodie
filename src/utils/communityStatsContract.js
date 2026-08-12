export const COMMUNITY_STATS_FEED_VERSION = "analytica-feed-v1";
export const COMMUNITY_STATS_REFRESH_SECONDS = 15;
export const COMMUNITY_STATS_REFRESH_MECHANISM = "poll";

export const COMMUNITY_STATS_SHOWCASE = Object.freeze([
  Object.freeze({ id: "verified_runs", label: "VERIFIED RUNS", field: "runs" }),
  Object.freeze({ id: "distinct_runners", label: "DISTINCT RUNNERS", field: "runners" }),
  Object.freeze({ id: "enemies_terminated", label: "ENEMIES TERMINATED", field: "kills" }),
  Object.freeze({ id: "total_score", label: "TOTAL SCORE", field: "score" }),
]);
