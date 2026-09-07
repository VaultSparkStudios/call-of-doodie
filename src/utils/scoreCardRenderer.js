/**
 * scoreCardRenderer.js — the 1200×630 "KILLCAM" share card (S165).
 *
 * Extracted verbatim from DeathScreen.jsx so the death beat's first paint does
 * not carry ~5 KB of canvas painting that only runs when the player presses
 * SHARE. DeathScreen imports it dynamically inside the share handler, so it
 * lands in its own chunk and is fetched on demand.
 *
 * Everything the card needs arrives in one options bag — no React, no module
 * state, no DOM beyond the offscreen canvas it creates itself — which also
 * makes the layout unit-testable against a fake 2D context.
 */

export const SCORE_CARD_WIDTH = 1200;
export const SCORE_CARD_HEIGHT = 630;

/**
 * Paint the card into an existing 2D context. Pure with respect to module
 * state; every value comes from `options`.
 */
export function paintScoreCard(c, {
  W = SCORE_CARD_WIDTH,
  H = SCORE_CARD_HEIGHT,
  score = 0,
  kills = 0,
  wave = 0,
  level = 0,
  bestStreak = 0,
  timeSurvived = 0,
  username = "",
  playerSkin = "",
  deathMessage = "",
  difficulty,
  DIFFICULTIES = {},
  RANK_NAMES = [],
  fmtTime = (v) => String(v),
  siteHost = "",
  bossRushMode = false,
  cursedRunMode = false,
  scoreAttackMode = false,
  dailyChallengeMode = false,
  replayProofReceipt = null,
  replayProofPresenter = null,
} = {}) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal || {};
  const rank = RANK_NAMES[Math.min(Math.floor(kills / 10), Math.max(0, RANK_NAMES.length - 1))] || "";

  // ── Background: dark with scanlines + vignette ────────────────────────────
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d0005"); bg.addColorStop(0.45, "#140a1a"); bg.addColorStop(1, "#0a0200");
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // Scanlines
  c.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < H; y += 4) { c.fillRect(0, y, W, 2); }
  // Vignette
  const vig = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.82);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.75)");
  c.fillStyle = vig; c.fillRect(0, 0, W, H);

  // ── Stream chrome: top bar ────────────────────────────────────────────────
  c.fillStyle = "rgba(0,0,0,0.72)"; c.fillRect(0, 0, W, 52);
  // LIVE badge
  c.fillStyle = "#E00000"; c.beginPath(); c.roundRect(16, 12, 68, 28, 5); c.fill();
  c.font = "bold 16px 'Courier New', monospace"; c.textAlign = "left";
  c.fillStyle = "#FFF"; c.fillText("● LIVE", 24, 31);
  // Channel name (centre)
  c.textAlign = "center";
  c.font = "bold 20px 'Courier New', monospace"; c.fillStyle = "#FFF";
  c.fillText("📺  CALL OF DOODIE  ·  MODERN WARFARE ON MOM'S WIFI", W / 2, 32);
  // Viewer count (right)
  const _viewers = ((score / 100 + kills * 3 + wave * 50) | 0).toLocaleString();
  c.textAlign = "right"; c.font = "14px 'Courier New', monospace"; c.fillStyle = "#CCC";
  c.fillText("👥 " + _viewers + " watching", W - 18, 20);
  c.fillStyle = "#888"; c.fillText(siteHost, W - 18, 38);

  // ── KILLCAM banner ────────────────────────────────────────────────────────
  c.textAlign = "center";
  c.fillStyle = "rgba(180,0,0,0.82)"; c.fillRect(0, 52, W, 50);
  c.font = "bold 30px 'Courier New', monospace";
  c.fillStyle = "#FFF"; c.shadowColor = "#F00"; c.shadowBlur = 20;
  const _modeLabel = bossRushMode ? "  ·  ☠ BOSS RUSH" : cursedRunMode ? "  ·  ☠ CURSED" : scoreAttackMode ? "  ·  ⏱ SCORE ATTACK" : dailyChallengeMode ? "  ·  📅 DAILY" : "";
  c.fillText("💀  KILLCAM  ·  " + (playerSkin || "🪖") + " " + username.toUpperCase() + "  HAS FALLEN" + _modeLabel, W / 2, 86);
  c.shadowBlur = 0;

  // ── Match HUD: left side stat pills ───────────────────────────────────────
  const _pillY = 120, _pillH = 36, _pillGap = 8;
  const _pills = [
    { label: "WAVE", val: String(wave), color: "#ff3b3b" },
    { label: "KILLS", val: String(kills), color: "#00FF88" },
    { label: "STREAK", val: String(bestStreak), color: "#FF8800" },
  ];
  let _px = 18;
  _pills.forEach(p => {
    const tw = Math.max(90, p.val.length * 18 + 60);
    c.fillStyle = "rgba(0,0,0,0.7)"; c.beginPath(); c.roundRect(_px, _pillY, tw, _pillH, 6); c.fill();
    c.strokeStyle = p.color + "88"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(_px, _pillY, tw, _pillH, 6); c.stroke();
    c.textAlign = "left"; c.font = "10px 'Courier New', monospace"; c.fillStyle = p.color;
    c.fillText(p.label, _px + 8, _pillY + 14);
    c.font = "bold 18px 'Courier New', monospace"; c.fillStyle = "#FFF";
    c.fillText(p.val, _px + 8, _pillY + _pillH - 8);
    _px += tw + _pillGap;
  });

  // ── Rank + difficulty pill (right side) ───────────────────────────────────
  c.textAlign = "right";
  c.font = "bold 16px 'Courier New', monospace"; c.fillStyle = diff.color || "#CCC";
  c.fillText((diff.emoji || "") + " " + String(diff.label || "").toUpperCase() + "  ·  " + String(rank).toUpperCase(), W - 18, _pillY + _pillH - 6);
  c.font = "13px 'Courier New', monospace"; c.fillStyle = "#888";
  c.fillText("⏱ " + fmtTime(timeSurvived) + "  survived", W - 18, _pillY + 14);

  // ── Big score in the middle ───────────────────────────────────────────────
  c.textAlign = "center";
  const scoreGrad = c.createLinearGradient(0, 190, 0, 300);
  scoreGrad.addColorStop(0, "#FFD700"); scoreGrad.addColorStop(1, "#FF6B00");
  c.font = "bold 140px 'Courier New', monospace";
  c.fillStyle = scoreGrad;
  c.shadowColor = "rgba(255,150,0,0.55)"; c.shadowBlur = 40;
  c.fillText(score.toLocaleString(), W / 2, 295);
  c.shadowBlur = 0;
  c.font = "bold 20px 'Courier New', monospace"; c.fillStyle = "#CCC";
  c.fillText("FINAL SCORE", W / 2, 325);

  // ── Stats row ─────────────────────────────────────────────────────────────
  const _stats = [
    { val: "LV " + level, label: "LEVEL", color: "#33e6ff" },
    { val: kills, label: "ELIMINATED", color: "#00FF88" },
    { val: "WAVE " + wave, label: "REACHED", color: "#ff3b3b" },
    { val: fmtTime(timeSurvived), label: "SURVIVED", color: "#33e6ff" },
  ];
  const _sw = W / _stats.length;
  _stats.forEach((s, i) => {
    const sx = _sw * i + _sw / 2;
    c.fillStyle = "rgba(255,255,255,0.05)";
    c.beginPath(); c.roundRect(_sw * i + 10, 348, _sw - 20, 80, 6); c.fill();
    c.strokeStyle = s.color + "44"; c.lineWidth = 1;
    c.beginPath(); c.roundRect(_sw * i + 10, 348, _sw - 20, 80, 6); c.stroke();
    c.textAlign = "center";
    c.font = "bold 30px 'Courier New', monospace"; c.fillStyle = s.color;
    c.shadowColor = s.color; c.shadowBlur = 8;
    c.fillText(s.val, sx, 390);
    c.shadowBlur = 0;
    c.font = "11px 'Courier New', monospace"; c.fillStyle = "#888";
    c.fillText(s.label, sx, 416);
  });

  // ── Death quote ───────────────────────────────────────────────────────────
  c.textAlign = "center";
  c.font = "italic 17px 'Courier New', monospace";
  c.fillStyle = "#FF8888"; c.fillText('"' + deathMessage + '"', W / 2, 462);

  if (replayProofReceipt) {
    c.fillStyle = "rgba(0,0,0,0.72)";
    c.beginPath(); c.roundRect(314, 478, 572, 38, 6); c.fill();
    c.strokeStyle = replayProofReceipt.color + "AA"; c.lineWidth = 1.5;
    c.beginPath(); c.roundRect(314, 478, 572, 38, 6); c.stroke();
    c.textAlign = "center";
    c.font = "bold 13px 'Courier New', monospace";
    c.fillStyle = replayProofReceipt.color;
    c.fillText(replayProofPresenter?.shareStamp, W / 2, 502);
  }

  // ── Bottom bar: CTA ───────────────────────────────────────────────────────
  c.fillStyle = "rgba(0,0,0,0.8)"; c.fillRect(0, H - 72, W, 72);
  const ctaGrad = c.createLinearGradient(0, 0, W, 0);
  ctaGrad.addColorStop(0, "#FF6B35"); ctaGrad.addColorStop(0.5, "#FFD700"); ctaGrad.addColorStop(1, "#FF6B35");
  c.fillStyle = ctaGrad; c.fillRect(0, H - 72, W, 4);
  c.font = "bold 24px 'Courier New', monospace"; c.fillStyle = "#FFF";
  c.fillText("💀  CAN YOU BEAT " + username.toUpperCase() + "?  ·  " + siteHost + "  💀", W / 2, H - 32);
  c.font = "13px 'Courier New', monospace"; c.fillStyle = "#888";
  c.fillText("FREE TO PLAY IN YOUR BROWSER  ·  SHARE YOUR SCORE  ·  #CallOfDoodie", W / 2, H - 12);
}

/**
 * Create the offscreen canvas, paint it, and resolve `{ blob, cvs }` — the same
 * shape DeathScreen's share handler consumed before the extraction.
 */
export function generateScoreCard(options = {}) {
  return new Promise((resolve) => {
    const W = SCORE_CARD_WIDTH, H = SCORE_CARD_HEIGHT;
    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const c = cvs.getContext("2d");
    paintScoreCard(c, { ...options, W, H });
    cvs.toBlob(blob => resolve({ blob, cvs }), "image/png");
  });
}
