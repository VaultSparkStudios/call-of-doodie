// leaderboard-live.js — populates the /leaderboard/ page's top-10 table from
// /api/top-scores (S155). Mirrors community-stats-live.js patterns: graceful
// fallback copy on failure, refresh on visibility, no external dependencies.
(() => {
  const REFRESH_MS = 60000;
  const table = document.querySelector("[data-top-scores]");
  const statusNode = document.querySelector("[data-top-scores-status]");
  if (!table) return;

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

  async function refresh() {
    try {
      const response = await fetch("/api/top-scores", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      if (!Array.isArray(body.entries) || body.entries.length === 0) {
        setStatus("empty", "No verified runs on the board yet — deploy and claim the first slot.");
        return;
      }
      render(body.entries);
      setStatus("live", `Live top ${body.entries.length} · refreshed ${new Date().toLocaleTimeString()}`);
    } catch {
      setStatus("offline", "Live board unavailable right now — scores are still recorded in game.");
    }
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
})();
