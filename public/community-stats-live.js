(() => {
  const POLL_MS = 15000;
  const TREND_KEY = "cod-stats-trend-v1";
  const TREND_CAP = 48;
  const TREND_METRICS = ["runs", "runners", "kills", "score", "damage", "bosses"];
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

  // Trend history persists per browser so sparklines survive reloads.
  function loadTrend() {
    try {
      const raw = JSON.parse(localStorage.getItem(TREND_KEY) || "[]");
      return Array.isArray(raw) ? raw.slice(-TREND_CAP) : [];
    } catch { return []; }
  }

  function recordTrend(stats) {
    try {
      const trend = loadTrend();
      const last = trend[trend.length - 1];
      const point = { at: Date.now() };
      let changed = !last;
      for (const key of TREND_METRICS) {
        point[key] = Math.max(0, Math.floor(number(stats[key])));
        if (last && last[key] !== point[key]) changed = true;
      }
      if (!changed) return trend;
      trend.push(point);
      const bounded = trend.slice(-TREND_CAP);
      localStorage.setItem(TREND_KEY, JSON.stringify(bounded));
      return bounded;
    } catch { return []; }
  }

  function renderSparklines(trend) {
    document.querySelectorAll("[data-community-spark]").forEach((svg) => {
      const id = svg.dataset.communitySpark;
      if (!TREND_METRICS.includes(id) || trend.length < 2) { svg.innerHTML = ""; return; }
      const values = trend.map((point) => number(point[id]));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      const step = 64 / (values.length - 1);
      const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(16 - ((v - min) / span) * 13).toFixed(1)}`).join(" ");
      svg.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`;
    });
  }

  function renderRecords(stats) {
    const wrap = document.querySelector("[data-community-records]");
    if (!wrap) return;
    const fields = { bestWave: stats.bestWave ?? stats.best_wave, bestScore: stats.bestScore ?? stats.best_score, bestKills: stats.bestKills ?? stats.best_kills, runs24h: stats.runs24h ?? stats.runs_24h, kills24h: stats.kills24h ?? stats.kills_24h };
    let any = false;
    for (const [id, value] of Object.entries(fields)) {
      const node = wrap.querySelector(`[data-community-record="${id}"]`);
      if (node) node.textContent = Math.max(0, Math.floor(number(value))).toLocaleString();
      if (number(value) > 0) any = true;
    }
    wrap.hidden = !any;
  }

  function renderFeedback(stats) {
    const wrap = document.querySelector("[data-community-feedback]");
    if (!wrap) return;
    const feedback = stats.feedback || {};
    const tooEasy = number(feedback.too_easy);
    const dialedIn = number(feedback.dialed_in);
    const brutal = number(feedback.brutal);
    const total = tooEasy + dialedIn + brutal;
    wrap.hidden = total === 0;
    if (!total) return;
    const seg = (id, count) => {
      const node = wrap.querySelector(`[data-feedback-seg="${id}"]`);
      if (node) node.style.width = `${(count / total) * 100}%`;
    };
    seg("too_easy", tooEasy); seg("dialed_in", dialedIn); seg("brutal", brutal);
    const legend = wrap.querySelector("[data-feedback-legend]");
    if (legend) legend.textContent = `🥱 Too easy ${tooEasy} · 🎯 Dialed in ${dialedIn} · 💀 Brutal ${brutal}`;
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
    renderRecords(stats);
    renderFeedback(stats);
    renderSparklines(recordTrend(stats));
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
      .catch(() => {
        renderSparklines(loadTrend());
        setStatus("Verified snapshot shown · reconnecting automatically", "cached");
      })
      .finally(() => { pending = null; });
    return pending;
  }

  const wake = () => { if (document.visibilityState !== "hidden") refresh(); };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  window.addEventListener("online", wake);
  renderSparklines(loadTrend());
  refresh();
  setInterval(wake, POLL_MS);
})();
