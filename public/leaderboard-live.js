// leaderboard-live.js — populates the /leaderboard/ page's top-10 table from
// /api/top-scores (S155). Mirrors community-stats-live.js patterns: graceful
// fallback copy on failure, refresh on visibility, no external dependencies.
(() => {
  const REFRESH_MS = 60000;
  const MAX_BACKOFF_MS = 300000;
  const table = document.querySelector("[data-top-scores]");
  const statusNode = document.querySelector("[data-top-scores-status]");
  if (!table) return;
  let pending = null;
  let nextAttemptAt = 0;
  let failures = 0;
  let lastSuccessAt = null;

  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));

  function setStatus(state, text) {
    if (!statusNode) return;
    statusNode.dataset.state = state;
    statusNode.textContent = text;
  }

  function render(entries) {
    const rows = entries.map((entry, index) => `
      <tr>
        <td class="rank">#${index + 1}</td>
        <td class="callsign">${entry.supporter ? "⭐ " : ""}${esc(entry.name)}</td>
        <td class="score">${Number(entry.score).toLocaleString("en-US")}</td>
        <td>${Number(entry.wave)}</td>
        <td>${Number(entry.kills).toLocaleString("en-US")}</td>
        <td class="mode">${esc(entry.mode === "standard" ? "Standard" : entry.mode.replace(/_/g, " "))}</td>
      </tr>`).join("");
    table.querySelector("tbody").innerHTML = rows;
    table.hidden = false;
  }

  function staleStatus() {
    if (lastSuccessAt) setStatus("cached", `Last verified board: ${new Date(lastSuccessAt).toLocaleTimeString()} · waiting to reconnect.`);
  }

  function refresh() {
    if (document.visibilityState === "hidden" || pending) return pending;
    if (Date.now() < nextAttemptAt) { staleStatus(); return null; }
    pending = (async () => {
      try {
        const response = await fetch("/api/top-scores", { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        const body = await response.json();
        failures = 0;
        nextAttemptAt = Date.now() + REFRESH_MS;
        lastSuccessAt = Date.parse(body.checkedAt) || Date.now();
        if (!Array.isArray(body.entries) || body.entries.length === 0) {
          table.hidden = true;
          setStatus("empty", "No verified runs on the board yet — deploy and claim the first slot.");
          return;
        }
        render(body.entries);
        setStatus("live", `Verified top ${body.entries.length} · checked ${new Date(lastSuccessAt).toLocaleTimeString()}`);
      } catch {
        failures += 1;
        nextAttemptAt = Date.now() + Math.min(MAX_BACKOFF_MS, 30000 * 2 ** (failures - 1));
        if (lastSuccessAt) staleStatus();
        else setStatus("offline", "Live board unavailable right now. Your local run record remains on this device.");
      }
    })().finally(() => { pending = null; });
    return pending;
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
    else staleStatus();
  });
})();
