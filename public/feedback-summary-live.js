(() => {
  const root = document.querySelector("[data-feedback-summary]");
  if (!root) return;
  const status = root.querySelector("[data-feedback-status]");
  const results = root.querySelector("[data-feedback-results]");
  const labels = { too_easy: "Too easy", dialed_in: "Dialed in", brutal: "Brutal", controls: "Controls", clarity: "Clarity", pacing: "Pacing", balance: "Balance", bug: "Bug", other: "Other" };
  const number = (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  const add = (title, value, note) => {
    const card = document.createElement("div");
    card.className = "feedback-summary-stat";
    const label = document.createElement("span");
    label.textContent = title;
    const count = document.createElement("strong");
    count.textContent = String(number(value));
    const detail = document.createElement("small");
    detail.textContent = note;
    card.append(label, count, detail);
    results.append(card);
  };
  const render = (summary) => {
    const n = number(summary.responses);
    status.textContent = n === 0
      ? "0 consented Field Reports so far. There is no player-report evidence to interpret yet."
      : `${n} consented Field Report${n === 1 ? "" : "s"} received. These are descriptive counts, not a survey of all players.`;
    results.replaceChildren();
    add("Responses", n, "Individual submitted reports (n)");
    add("Reporters", summary.reporters, "Distinct consenting reporter IDs");
    add("Returning reporters", summary.returningReporters, "Reported again at least 24 hours later");
    add("Server runners", summary.runnerSample, "Distinct IDs in completed rich run facts; separate sample");
    if (n > 0) {
      for (const key of ["too_easy", "dialed_in", "brutal"]) add(labels[key], summary.sentiments?.[key], `of ${n} reports`);
      for (const key of ["controls", "clarity", "pacing", "balance", "bug", "other"]) add(labels[key], summary.reasons?.[key], `of ${n} reports; reason optional`);
    }
    results.hidden = false;
  };
  fetch("/api/feedback-summary", { headers: { accept: "application/json" } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("unavailable")))
    .then((payload) => {
      if (payload?.summary?.schemaVersion !== "field-report-summary-v1") throw new Error("invalid summary");
      render(payload.summary);
    })
    .catch(() => { status.textContent = "Live feedback counts are unavailable right now. No sample size or conclusion is shown until they can be checked."; });
})();
