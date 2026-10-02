import { CANONICAL_SITE_URL } from "../config/site.js";
import { buildChallengeParams } from "./challengePayload.js";

export function buildChallengeUrl({
  seed,
  difficulty = "normal",
  mode = "standard",
  loadout = "standard",
  vsScore = null,
  vsName = "",
  duelId = null,
  expiresAt = null,
  baseUrl = null,
} = {}) {
  const params = buildChallengeParams({ seed, difficulty, mode, loadout, vsScore, vsName, duelId, expiresAt });
  if (!params) return null;

  const resolvedBase = baseUrl
    || `${CANONICAL_SITE_URL}challenge/`
    || (typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "");
  if (!resolvedBase) return `?${params.toString()}`;
  return `${resolvedBase}?${params.toString()}`;
}

export async function copyChallengeUrl(options = {}) {
  const url = buildChallengeUrl(options);
  if (!url) return null;
  try {
    await navigator.clipboard?.writeText?.(url);
  } catch {}
  return url;
}
