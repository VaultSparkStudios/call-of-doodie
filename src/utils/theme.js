export const THEME_STORAGE_KEY = "cod-theme";

export const THEMES = Object.freeze({
  "sewer-night": Object.freeze({
    id: "sewer-night",
    label: "Sewer Night",
    icon: "🌙",
    colorScheme: "dark",
    page: "radial-gradient(ellipse at top, #1a0a05 0%, #0a0a0a 55%, #050505 100%)",
    ink: "#f4f0e8",
    muted: "#b7b2aa",
    quiet: "#8f8a83",
    panel: "rgba(255,255,255,0.035)",
    panelStrong: "rgba(15,10,5,0.98)",
    panelSoft: "rgba(0,0,0,0.32)",
    line: "rgba(255,255,255,0.14)",
    grid: "rgba(255,255,255,0.025)",
    shadow: "rgba(0,0,0,0.60)",
    accent: "#ff7a38",
    accentInk: "#fffaf3",
    cyan: "#8fefff"
  }),
  "porcelain-day": Object.freeze({
    id: "porcelain-day",
    label: "Porcelain Day",
    icon: "☀️",
    colorScheme: "light",
    page: "radial-gradient(ellipse at top, #fff4dd 0%, #f6f0e7 48%, #e8e0d4 100%)",
    ink: "#24160f",
    muted: "#604c3e",
    quiet: "#725f52",
    panel: "rgba(255,255,255,0.70)",
    panelStrong: "rgba(255,250,241,0.98)",
    panelSoft: "rgba(255,255,255,0.62)",
    line: "rgba(77,48,28,0.24)",
    grid: "rgba(77,48,28,0.055)",
    shadow: "rgba(79,49,27,0.20)",
    accent: "#b83c00",
    accentInk: "#ffffff",
    cyan: "#00647a"
  })
});

export function isTheme(value) {
  return Object.hasOwn(THEMES, value);
}

export function resolveTheme({ query = "", stored = null } = {}) {
  const requested = new URLSearchParams(query.startsWith("?") ? query : `?${query}`).get("theme");
  if (isTheme(requested)) return requested;
  if (isTheme(stored)) return stored;
  return "sewer-night";
}

export function readTheme(win = globalThis.window) {
  if (!win) return "sewer-night";
  let stored = null;
  try { stored = win.localStorage?.getItem(THEME_STORAGE_KEY); } catch {}
  return resolveTheme({
    query: win.location?.search || "",
    stored,
  });
}

export function applyTheme(theme, { doc = globalThis.document, storage = globalThis.localStorage, persist = true } = {}) {
  const id = isTheme(theme) ? theme : "sewer-night";
  if (doc?.documentElement) {
    doc.documentElement.dataset.codTheme = id;
    doc.documentElement.style.colorScheme = THEMES[id].colorScheme;
  }
  if (persist) {
    try { storage?.setItem(THEME_STORAGE_KEY, id); } catch {}
  }
  return id;
}

export function nextTheme(theme) {
  return theme === "porcelain-day" ? "sewer-night" : "porcelain-day";
}
