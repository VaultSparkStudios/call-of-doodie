import { RANK_NAMES } from "../constants.js";
import { CANONICAL_SITE_HOST } from "../config/site.js";

/**
 * Generates a 1200×630 share card PNG blob for social sharing.
 * Extracted from DeathScreen (S164 diet) — pure canvas function, no DOM side effects.
 *
 * Returns a Promise<{ blob: Blob, cvs: HTMLCanvasElement }>.
 */
export function generateScoreCard({
  DIFFICULTIES,
  difficulty,
  kills,
  wave,
  bestStreak,
  score,
  timeSurvived,
  level,
  deathMessage,
  bossRushMode,
  cursedRunMode,
  scoreAttackMode,
  dailyChallengeMode,
  username,
  playerSkin,
  fmtTime,
  replayProofReceipt,
  replayProofPresenter,
}) {
  return new Promise((resolve) => {
    const W = 1200, H = 630;
    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const c = cvs.getContext("2d");
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const rank = RANK_NAMES[Math.min(Math.floor(kills / 10), RANK_NAMES.length - 1)];

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
    c.fillStyle = "#888"; c.fillText(CANONICAL_SITE_HOST, W - 18, 38);

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
    c.fillText(diff.emoji + " " + diff.label.toUpperCase() + "  ·  " + rank.toUpperCase(), W - 18, _pillY + _pillH - 6);
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
      c.fillText(replayProofPresenter.shareStamp, W / 2, 502);
    }

    // ── Bottom bar: CTA ───────────────────────────────────────────────────────
    c.fillStyle = "rgba(0,0,0,0.8)"; c.fillRect(0, H - 72, W, 72);
    const ctaGrad = c.createLinearGradient(0, 0, W, 0);
    ctaGrad.addColorStop(0, "#FF6B35"); ctaGrad.addColorStop(0.5, "#FFD700"); ctaGrad.addColorStop(1, "#FF6B35");
    c.fillStyle = ctaGrad; c.fillRect(0, H - 72, W, 4);
    c.font = "bold 24px 'Courier New', monospace"; c.fillStyle = "#FFF";
    c.fillText("💀  CAN YOU BEAT " + username.toUpperCase() + "?  ·  " + CANONICAL_SITE_HOST + "  💀", W / 2, H - 32);
    c.font = "13px 'Courier New', monospace"; c.fillStyle = "#888";
    c.fillText("FREE TO PLAY IN YOUR BROWSER  ·  SHARE YOUR SCORE  ·  #CallOfDoodie", W / 2, H - 12);

    cvs.toBlob(blob => resolve({ blob, cvs }), "image/png");
  });
}
