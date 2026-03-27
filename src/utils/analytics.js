// ===== ANALYTICS — PostHog wrapper =====
// Degrades gracefully: all calls are no-ops until VITE_POSTHOG_KEY is set in .env.local
// To enable: add VITE_POSTHOG_KEY=phc_YOUR_KEY to .env.local, then npm run dev

const KEY = import.meta.env.VITE_POSTHOG_KEY;
let _loaded = false;

function _ph() {
  return typeof window !== "undefined" ? window.posthog : null;
}

function _load() {
  if (!KEY || _loaded || typeof document === "undefined") return;
  _loaded = true;
  const s = document.createElement("script");
  s.src = "https://app.posthog.com/array.js";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.onload = () => {
    try {
      _ph()?.init(KEY, {
        api_host: "https://app.posthog.com",
        autocapture: false,
        capture_pageview: true,
        persistence: "localStorage",
        disable_session_recording: true,
      });
    } catch { /* ignore */ }
  };
  document.head.appendChild(s);
}

/** Call once at app startup. No-op if VITE_POSTHOG_KEY is absent. */
export function analyticsInit() {
  _load();
}

/**
 * Track a game event.
 * @param {string} event  - e.g. "game_start", "wave_reached", "death"
 * @param {object} [props] - arbitrary payload
 */
export function track(event, props = {}) {
  if (!KEY) return;
  try { _ph()?.capture(event, { ...props, game: "call-of-doodie" }); } catch { /* ignore */ }
}

/**
 * Identify the current player (call after callsign is set).
 * @param {string} id     - player callsign / username
 * @param {object} traits - e.g. { prestige, accountLevel }
 */
export function identify(id, traits = {}) {
  if (!KEY || !id) return;
  try { _ph()?.identify(id, { ...traits, game: "call-of-doodie" }); } catch { /* ignore */ }
}

/** Reset identity on callsign change. */
export function analyticsReset() {
  if (!KEY) return;
  try { _ph()?.reset(); } catch { /* ignore */ }
}

/**
 * Build a standard context object from game-loop state.
 * Spread this into any track() call to ensure consistent event shape.
 * @param {{ difficulty?: string, mode?: string, wave?: number, score?: number }} opts
 */
export function gameCtx({ difficulty, mode, wave, score } = {}) {
  return {
    difficulty: difficulty ?? undefined,
    mode:       mode       ?? "standard",
    wave:       wave       ?? undefined,
    score:      score      ?? undefined,
  };
}

/**
 * Resolve the canonical mode string from ref values.
 * Pass boolean values (not refs) — call with ref.current at each site.
 */
export function resolveMode(scoreAttack, dailyChallenge, cursed, bossRush, speedrun, gauntlet) {
  if (scoreAttack)    return "score_attack";
  if (dailyChallenge) return "daily_challenge";
  if (cursed)         return "cursed";
  if (bossRush)       return "boss_rush";
  if (speedrun)       return "speedrun";
  if (gauntlet)       return "gauntlet";
  return "standard";
}
