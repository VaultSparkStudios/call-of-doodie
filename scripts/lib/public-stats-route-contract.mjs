export function checkPublicStatsRoute({ routes = [], descriptor, redirects = "", html = "" }) {
  const errors = [];
  const route = routes.find((entry) => entry.id === "stats");
  if (!route || route.path !== "/stats/" || !route.generated) {
    errors.push("stats descriptor requires a generated /stats/ route");
    return errors;
  }
  if (descriptor?.page !== route.canonicalUrl) {
    errors.push("stats descriptor page disagrees with the public stats route");
  }
  if (/(?:^|\n)\/stats\/?\s+\S+\s+30[1278](?:\s|$)/.test(redirects)) {
    errors.push("/stats/ is redirected away from its claimed page");
  }
  if (!html.includes(`<link rel="canonical" href="${route.canonicalUrl}">`)
      || !html.includes('data-community-stat="runs"')
      || !html.includes("data-stats-takeaway")) {
    errors.push("generated stats page lacks its canonical live-analysis surface");
  }
  return errors;
}
