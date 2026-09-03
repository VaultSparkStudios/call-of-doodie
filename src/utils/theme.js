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

// ── S163 design tokens ─────────────────────────────────────────────────────
// One palette, two consumers: the SPA imports the generated
// `src/styles/tokens.css`, the static companion pages link `/tokens.css`.
// Both files are written by `scripts/generate-tokens-css.mjs` from this
// object, so a color can only ever be changed here.
export const BRAND_TOKENS = Object.freeze({
  dark: Object.freeze({
    "--cod-bg": "#070b10",
    "--cod-bg-deep": "#020305",
    "--cod-page": "linear-gradient(180deg,#070b10 0%,#020305 72%,#070402 100%)",
    "--cod-ink": "#f4f0e8",
    "--cod-muted": "#b7b2aa",
    "--cod-quiet": "#8f8a83",
    "--cod-panel": "rgba(255,255,255,0.035)",
    "--cod-panel-strong": "rgba(15,10,5,0.98)",
    "--cod-panel-soft": "rgba(0,0,0,0.32)",
    "--cod-line": "rgba(255,255,255,0.14)",
    "--cod-line-warm": "rgba(255,160,60,0.28)",
    "--cod-shadow": "rgba(0,0,0,0.60)",
    "--cod-orange": "#ff6b22",
    "--cod-orange-ink": "#1c0900",
    "--cod-gold": "#ffd34f",
    "--cod-cyan": "#33e6ff",
    "--cod-green": "#7cffb8",
    "--cod-danger": "#ff3b3b",
    "--cod-focus": "#33e6ff",
  }),
  light: Object.freeze({
    "--cod-bg": "#f6f0e7",
    "--cod-bg-deep": "#e8e0d4",
    "--cod-page": "linear-gradient(180deg,#fff4dd 0%,#f6f0e7 48%,#e8e0d4 100%)",
    "--cod-ink": "#24160f",
    "--cod-muted": "#604c3e",
    "--cod-quiet": "#725f52",
    "--cod-panel": "rgba(255,255,255,0.70)",
    "--cod-panel-strong": "rgba(255,250,241,0.98)",
    "--cod-panel-soft": "rgba(255,255,255,0.62)",
    "--cod-line": "rgba(77,48,28,0.24)",
    "--cod-line-warm": "rgba(91,52,28,0.22)",
    "--cod-shadow": "rgba(79,49,27,0.20)",
    "--cod-orange": "#b83c00",
    "--cod-orange-ink": "#ffffff",
    "--cod-gold": "#8a5a00",
    "--cod-cyan": "#00647a",
    "--cod-green": "#006341",
    "--cod-danger": "#b3261e",
    "--cod-focus": "#00647a",
  }),
  shared: Object.freeze({
    "--font-display": "Impact, \"Arial Narrow Bold\", \"Arial Black\", sans-serif",
    "--font-mono": "\"Cascadia Mono\", Consolas, \"Courier New\", ui-monospace, monospace",
    "--fs-display": "clamp(40px, 9vw, 96px)",
    "--fs-h1": "32px",
    "--fs-h2": "22px",
    "--fs-body": "16px",
    "--fs-support": "14px",
    "--fs-label": "12px",
    "--sp-1": "4px", "--sp-2": "8px", "--sp-3": "12px", "--sp-4": "16px",
    "--sp-5": "24px", "--sp-6": "32px", "--sp-7": "48px", "--sp-8": "64px",
    "--r-1": "4px", "--r-2": "8px", "--r-3": "14px",
    "--shadow-1": "0 18px 45px rgba(0,0,0,0.28)",
  }),
});

function block(selector, vars) {
  return `${selector} {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
}

/** Render the token stylesheet. Light values apply under data-cod-theme="porcelain-day". */
export function tokensToCss() {
  return [
    "/* GENERATED by scripts/generate-tokens-css.mjs from src/utils/theme.js — do not edit. */",
    block(":root", { ...BRAND_TOKENS.shared, ...BRAND_TOKENS.dark, "color-scheme": "dark" }),
    block(':root[data-cod-theme="porcelain-day"]', { ...BRAND_TOKENS.light, "color-scheme": "light" }),
    "",
    "/* CRT effects are opt-in utilities; off in light scheme and reduced motion. */",
    ".fx-scanlines { position: relative; isolation: isolate; }",
    ".fx-scanlines::before { content: \"\"; position: fixed; inset: 0; z-index: 4; pointer-events: none; opacity: .16; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,.55) 4px); mix-blend-mode: multiply; }",
    ".fx-vignette::after { content: \"\"; position: fixed; inset: 0; z-index: 3; pointer-events: none; box-shadow: inset 0 0 100px rgba(0,0,0,.88), inset 0 0 24px rgba(255,104,24,.08); }",
    ".fx-glow { text-shadow: 0 0 12px color-mix(in srgb, currentColor 55%, transparent); }",
    ".fx-grid { background-image: linear-gradient(var(--cod-line) 1px, transparent 1px), linear-gradient(90deg, var(--cod-line) 1px, transparent 1px); background-size: 40px 40px; }",
    ':root[data-cod-theme="porcelain-day"] .fx-scanlines::before { opacity: .07; }',
    ':root[data-cod-theme="porcelain-day"] .fx-vignette::after { box-shadow: inset 0 0 90px rgba(79,49,27,.18), inset 0 0 24px rgba(184,60,0,.08); }',
    "@media (prefers-reduced-motion: reduce) { .fx-scanlines::before { display: none; } }",
    "",
  ].join("\n");
}
