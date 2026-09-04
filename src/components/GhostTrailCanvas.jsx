import { useEffect, useRef } from "react";
import { ENEMY_TYPES } from "../constants.js";
import { buildGhostKillerMarker } from "../utils/ghostPath.js";

/**
 * Renders the ghost-path trail canvas for the post-run debrief.
 * Extracted from DeathScreen (S164 diet).
 *
 * Props:
 *   ghostData          – array of {x, y, f?} position samples
 *   replayNonce        – increment to retrigger the replay animation
 *   replayMode         – "full" | "best_shot"
 *   precisionPeakFrame – frame index of the precision peak (for best_shot mode)
 */
export default function GhostTrailCanvas({ ghostData, replayNonce, replayMode, precisionPeakFrame }) {
  const ghostCanvasRef = useRef(null);

  useEffect(() => {
    if (!ghostData || !ghostCanvasRef.current) return;
    const canvas = ghostCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
    if (ghostData.length < 2) return;
    let rafId = 0;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    ghostData.forEach(pt => { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); });
    const rangeX = Math.max(maxX - minX, 100), rangeY = Math.max(maxY - minY, 100);
    const toC = (x, y) => [(x - minX) / rangeX * (W - 20) + 10, (y - minY) / rangeY * (H - 20) + 10];
    const total = ghostData.length;
    // Draw path in color-coded segments: green → yellow → red (early → mid → final)
    for (let i = 1; i < total; i++) {
      const t = i / total; // 0=start, 1=end
      // Interpolate color: green(0) → yellow(0.5) → red(1)
      let r, g, b;
      if (t < 0.5) { const s = t * 2; r = Math.round(s * 255); g = Math.round(180 + (1 - s) * 55); b = Math.round((1 - s) * 80); }
      else { const s = (t - 0.5) * 2; r = 255; g = Math.round(180 * (1 - s)); b = 0; }
      const alpha = 0.45 + t * 0.45;
      const [px1, py1] = toC(ghostData[i - 1].x, ghostData[i - 1].y);
      const [px2, py2] = toC(ghostData[i].x, ghostData[i].y);
      ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.5 + t; // path gets slightly thicker toward end
      ctx.stroke();
    }
    // Start marker (green dot)
    const [stx, sty] = toC(ghostData[0].x, ghostData[0].y);
    ctx.fillStyle = "#00FF88"; ctx.beginPath(); ctx.arc(stx, sty, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#002200"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
    ctx.fillText("▶", stx, sty + 3);
    // End marker (skull)
    const [ex, ey] = toC(ghostData[ghostData.length - 1].x, ghostData[ghostData.length - 1].y);
    ctx.fillStyle = "#FF2222"; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
    ctx.fillText("☠", ex, ey + 3);
    const killerMarker = buildGhostKillerMarker(ghostData, ENEMY_TYPES, { width: W, height: H });
    if (killerMarker) {
      const labelX = Math.max(66, Math.min(W - 66, killerMarker.x));
      const labelY = killerMarker.y < 28 ? killerMarker.y + 22 : killerMarker.y - 16;
      ctx.strokeStyle = killerMarker.color + "AA";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(killerMarker.x, killerMarker.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#FFF";
      ctx.fillText(killerMarker.emoji, Math.min(W - 12, killerMarker.x + 12), Math.max(14, killerMarker.y - 8));
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(labelX - 58, labelY - 9, 116, 16);
      ctx.strokeStyle = killerMarker.color + "88";
      ctx.strokeRect(labelX - 58, labelY - 9, 116, 16);
      ctx.fillStyle = killerMarker.color;
      ctx.font = "bold 8px monospace";
      ctx.fillText(killerMarker.label.toUpperCase().slice(0, 18), labelX, labelY + 3);
      ctx.shadowBlur = 0;
    }
    // Legend
    ctx.globalAlpha = 0.65; ctx.font = "7px monospace"; ctx.textAlign = "left";
    const legend = [["#00B450","EARLY"],["#FFB000","MID"],["#FF2222","FINAL"]];
    legend.forEach(([col, label], i) => {
      ctx.fillStyle = col; ctx.fillRect(4, H - 22 + i * 8, 10, 5);
      ctx.fillStyle = "#CCC"; ctx.fillText(label, 17, H - 17 + i * 8);
    });
    ctx.globalAlpha = 1;
    let replayFrames;
    if (replayMode === "best_shot" && precisionPeakFrame > 0) {
      const targetFrame = Math.max(0, precisionPeakFrame - 90);
      let startIdx = 0;
      for (let i = 0; i < ghostData.length; i++) {
        if ((ghostData[i].f || 0) >= targetFrame) { startIdx = i; break; }
      }
      replayFrames = ghostData.slice(startIdx, startIdx + 300);
    } else {
      replayFrames = ghostData.slice(-Math.min(480, ghostData.length));
    }
    if (replayFrames.length >= 2) {
      const replayStart = performance.now();
      const drawReplay = (now) => {
        const progress = Math.max(0, Math.min(1, (now - replayStart) / 4000));
        const frameIndex = Math.min(replayFrames.length - 1, Math.floor(progress * (replayFrames.length - 1)));
        const startIndex = Math.max(0, frameIndex - 45);
        for (let i = startIndex + 1; i <= frameIndex; i++) {
          const t = (i - startIndex) / Math.max(1, frameIndex - startIndex);
          const [x1, y1] = toC(replayFrames[i - 1].x, replayFrames[i - 1].y);
          const [x2, y2] = toC(replayFrames[i].x, replayFrames[i].y);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(0,229,255,${(0.08 + t * 0.45).toFixed(2)})`;
          ctx.lineWidth = 1 + t * 2.5;
          ctx.stroke();
        }
        const pt = replayFrames[frameIndex];
        const [px, py] = toC(pt.x, pt.y);
        ctx.fillStyle = progress >= 0.98 ? "#FF2222" : "#00E5FF";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, progress >= 0.98 ? 6 : 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (progress < 1) rafId = requestAnimationFrame(drawReplay);
      };
      rafId = requestAnimationFrame(drawReplay);
    }
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [ghostData, replayNonce, replayMode, precisionPeakFrame]);

  return (
    <canvas
      ref={ghostCanvasRef}
      width={280}
      height={140}
      style={{ borderRadius: 6, border: "1px solid #1A1A1A", display: "block", margin: "0 auto" }}
    />
  );
}
