(() => {
  const POLL_MS = 15000;
  let pending = null;

  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const format = (id, value, stats) => {
    if (id === "hours") return `${number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
    if (id === "accuracy") {
      return number(stats.shots) > 0 ? `${Math.round((number(stats.hits) / number(stats.shots)) * 1000) / 10}%` : "—";
    }
    return Math.max(0, Math.floor(number(value))).toLocaleString();
  };

  function setStatus(text, state) {
    const node = document.querySelector("[data-community-status]");
    if (node) {
      node.textContent = text;
      node.dataset.state = state;
    }
  }

  function render(payload) {
    const stats = payload.stats || {};
    document.querySelectorAll("[data-community-stat]").forEach((node) => {
      const id = node.dataset.communityStat;
      node.textContent = format(id, id === "accuracy" ? null : stats[id], stats);
    });
    const coverage = stats.coverage || {};
    const coverageNode = document.querySelector("[data-community-coverage]");
    if (coverageNode) {
      coverageNode.textContent = `All ${format("runs", stats.runs, stats)} supported runs · ${format("richRuns", coverage.richRuns, stats)} full-detail · ${format("legacyRuns", coverage.legacyRuns, stats)} legacy · oldest supported record ${coverage.oldestSupportedAt ? new Date(coverage.oldestSupportedAt).toLocaleDateString() : "unknown"}.`;
    }
    setStatus(`Live aggregate checked ${new Date(payload.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · refreshes every 15 seconds`, "live");
  }

  async function refresh() {
    if (pending || document.visibilityState === "hidden") return pending;
    pending = fetch("../api/community-stats", { headers: { accept: "application/json" }, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Community Stats unavailable");
        return response.json();
      })
      .then(render)
      .catch(() => setStatus("Verified snapshot shown · reconnecting automatically", "cached"))
      .finally(() => { pending = null; });
    return pending;
  }

  const wake = () => { if (document.visibilityState !== "hidden") refresh(); };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  window.addEventListener("online", wake);
  refresh();
  setInterval(wake, POLL_MS);
})();
