(() => {
  const key = "cod-theme";
  const themes = ["sewer-night", "porcelain-day"];
  const params = new URLSearchParams(window.location.search);
  let stored = null;
  try { stored = localStorage.getItem(key); } catch {}
  let theme = params.get("theme");
  if (!themes.includes(theme)) theme = themes.includes(stored) ? stored : "sewer-night";

  const apply = (next, persist = true) => {
    theme = themes.includes(next) ? next : "sewer-night";
    document.documentElement.dataset.codTheme = theme;
    document.documentElement.style.colorScheme = theme === "porcelain-day" ? "light" : "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const day = theme === "porcelain-day";
      button.textContent = day ? "☀ PORCELAIN DAY" : "☾ SEWER NIGHT";
      button.setAttribute("aria-label", `Switch to ${day ? "Sewer Night" : "Porcelain Day"} theme`);
      button.setAttribute("aria-pressed", String(day));
    });
    if (persist) {
      try { localStorage.setItem(key, theme); } catch {}
    }
  };

  document.documentElement.dataset.codTheme = theme;
  document.addEventListener("DOMContentLoaded", () => {
    apply(theme, false);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => apply(theme === "porcelain-day" ? "sewer-night" : "porcelain-day"));
    });
  });
})();
