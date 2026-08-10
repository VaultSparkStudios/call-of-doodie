// S145 mid-run tactical whisper — the deterministic intelligence stack
// finally speaks while the player can still act. Pure selector + caller-owned
// cooldown ledger; at most one quiet line, rate-limited, zero hosted cost.

import { buildRivalPace } from "../utils/rivalPace.js";
import { getArchetypeProgress } from "../utils/buildArchetypes.js";

// Loop-facing orchestrator: assembles every whisper input from live game
// state so the App game loop stays a three-line call site.
export function tickTacticalWhisper(gs, { frame = 0, activePerks = [], unlockedArchetypeIds = new Set() } = {}) {
  if (!gs?.settTacticalWhisper || !gs._whisperLedger) return null;
  const events = gs.damageSequence?.events || [];
  const doctrine = getArchetypeProgress(activePerks)
    .find((a) => !a.unlocked && a.remaining === 1 && !unlockedArchetypeIds.has(a.id));
  return selectTacticalWhisper({
    frame,
    wave: gs.currentWave || 1,
    ledger: gs._whisperLedger,
    rivalPace: buildRivalPace({ score: gs.score || 0, wave: gs.currentWave || 1, topGhosts: gs.topGhosts || [], weeklyRival: gs.weeklyRival || null }),
    recentDamageKinds: events.filter((ev) => frame - (ev.frame || 0) < 600).map((ev) => ev.kind),
    doctrineProgress: doctrine
      ? { id: doctrine.id, label: doctrine.name || doctrine.label, remaining: 1, nextPerk: doctrine.perkIds?.find((id) => !activePerks.some((p) => p.id === id)) }
      : null,
    health: gs.player?.health ?? 100,
    maxHealth: gs.player?.maxHealth ?? 100,
  });
}

export const WHISPER_COOLDOWN_FRAMES = 20 * 60; // ≥20s between whispers
export const WHISPER_MAX_PER_WAVE = 3;
export const CRITICAL_HEALTH_RATIO = 0.35;

export function createWhisperLedger() {
  return { lastFrame: -WHISPER_COOLDOWN_FRAMES, waveCount: 0, wave: 0, lastKind: null };
}

// Priority order: survival pattern > critical health > rival pace > doctrine progress.
export function selectTacticalWhisper({
  frame = 0,
  wave = 1,
  ledger = createWhisperLedger(),
  rivalPace = null,
  recentDamageKinds = [],
  doctrineProgress = null,
  health = 100,
  maxHealth = 100,
} = {}) {
  if (!ledger || typeof ledger !== "object") return null;
  // A new wave resets both the per-wave budget and the repeat-suppression —
  // the same evidence is worth restating after a full wave has passed.
  if (ledger.wave !== wave) { ledger.wave = wave; ledger.waveCount = 0; ledger.lastKind = null; }
  if (ledger.waveCount >= WHISPER_MAX_PER_WAVE) return null;
  if (frame - ledger.lastFrame < WHISPER_COOLDOWN_FRAMES) return null;

  let whisper = null;

  // 1. Survival pattern: repeated damage of one kind inside the window.
  const kinds = Array.isArray(recentDamageKinds) ? recentDamageKinds.filter(Boolean) : [];
  if (kinds.length >= 3) {
    const counts = {};
    for (const kind of kinds) counts[kind] = (counts[kind] || 0) + 1;
    const [topKind, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (topCount >= 3 && ledger.lastKind !== `damage:${topKind}`) {
      const tip = topKind === "contact"
        ? "CONTACT DAMAGE STACKING — KEEP MOVING, USE DASH"
        : topKind === "projectile"
          ? "EATING PROJECTILES — BREAK LINE OF SIGHT AT THE WALLS"
          : `REPEATED ${String(topKind).toUpperCase()} DAMAGE — CHANGE POSITION`;
      whisper = { kind: `damage:${topKind}`, text: tip, color: "#FFB36B" };
    }
  }

  // 2. Critical health: the near-death decision point itself — a quiet,
  // non-scorekeeping nudge to disengage rather than a score/doctrine prompt.
  const healthRatio = health / Math.max(1, maxHealth);
  if (!whisper && healthRatio <= CRITICAL_HEALTH_RATIO && ledger.lastKind !== "critical-health") {
    whisper = { kind: "critical-health", text: "CRITICAL HEALTH — DISENGAGE AND CREATE DISTANCE", color: "#FF4C4C" };
  }

  // 3. Rival pace: only whisper on meaningful swings, and only when healthy
  // enough that a score prompt is not a distraction.
  if (!whisper && rivalPace && healthRatio > CRITICAL_HEALTH_RATIO) {
    const kind = rivalPace.ahead ? "rival:ahead" : "rival:behind";
    if (ledger.lastKind !== kind && Math.abs(rivalPace.delta) >= 500) {
      whisper = rivalPace.ahead
        ? { kind, text: `AHEAD OF ${rivalPace.name.slice(0, 12).toUpperCase()} BY ${Math.abs(rivalPace.delta).toLocaleString()}`, color: "#7FE6FF" }
        : { kind, text: `${rivalPace.name.slice(0, 12).toUpperCase()} LEADS BY ${Math.abs(rivalPace.delta).toLocaleString()} — PUSH`, color: "#FF9AC2" };
    }
  }

  // 4. Doctrine progress: one perk from a capstone the player has not forged.
  if (!whisper && doctrineProgress && doctrineProgress.remaining === 1 && doctrineProgress.label) {
    const kind = `doctrine:${doctrineProgress.id || doctrineProgress.label}`;
    if (ledger.lastKind !== kind) {
      whisper = { kind, text: `ONE PERK FROM ${String(doctrineProgress.label).toUpperCase()} — NEED ${String(doctrineProgress.nextPerk || "?").toUpperCase()}`, color: "#B98CFF" };
    }
  }

  if (!whisper) return null;
  ledger.lastFrame = frame;
  ledger.waveCount += 1;
  ledger.lastKind = whisper.kind;
  return whisper;
}
