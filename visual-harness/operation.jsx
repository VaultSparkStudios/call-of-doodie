import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import OperationCompleteModal from "../src/components/OperationCompleteModal.jsx";
import PerkModal from "../src/components/PerkModal.jsx";
import { drawOffscreenThreatArrows, getOffscreenThreatArrows } from "../src/utils/offscreenIndicators.js";
import { applyTheme, readTheme } from "../src/utils/theme.js";

applyTheme(readTheme(), { persist: false });

const receipt = Object.freeze({
  mission: "Blacksite Flush",
  score: 8125,
  act: "ACT III",
  route: "Executive Washroom",
  checkpoint: "LOCAL OPERATION RECEIPT",
  fingerprint: "op-3101-executive-washroom-7f4c9b20",
  durationSeconds: 814,
  scoringContract: "operation-score-v2",
  scoreBreakdown: Object.freeze({
    schemaVersion: "operation-score-v2",
    objective: 7000,
    interaction: 450,
    tempo: 775,
    extraction: 500,
    pressurePenalty: 600,
    awarded: 8125,
  }),
});

const activePerks = Object.freeze([{ id: "iron_gut" }, { id: "vampire" }]);
const perkOptions = Object.freeze([
  { id: "bloodlust", name: "Bloodlust", emoji: "🩸", tier: "rare", desc: "Heal on kills and stay in the mess." },
  { id: "parkour_pro", name: "Parkour Pro", emoji: "🏃", tier: "uncommon", desc: "Move faster and keep the flank readable." },
  { id: "eagle_eye", name: "Eagle Eye", emoji: "🎯", tier: "common", desc: "Raise critical-hit chance." },
]);

function ThreatStage({ baseline = false }) {
  const canvasRef = useRef(null);
  const W = 800;
  const H = 600;
  const player = { x: 180, y: 390 };
  const enemies = Array.from({ length: 18 }, (_, index) => {
    const angle = -0.7 + (index % 6) * 0.11;
    const radius = 760 + index * 8;
    return {
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      isBossEnemy: index === 0,
      eliteType: index === 1 ? "armored" : null,
    };
  });
  const arrows = getOffscreenThreatArrows(enemies, W, H, baseline
    ? { focusX: W / 2, focusY: H / 2, zoom: 1, sectorCount: 16, maxArrows: 16 }
    : { focusX: player.x, focusY: player.y, zoom: 1.28 });

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#07130f";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(94,230,168,0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 75) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#00E5FF";
    ctx.beginPath(); ctx.arc(player.x, player.y, 14, 0, Math.PI * 2); ctx.fill();
    if (baseline) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(1.28, 1.28);
      ctx.translate(-player.x, -player.y);
      drawOffscreenThreatArrows(ctx, arrows);
      ctx.restore();
    } else {
      drawOffscreenThreatArrows(ctx, arrows);
    }
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(16, 16, 360, 62);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px monospace";
    ctx.fillText(baseline ? "BEFORE · WORLD-TRANSFORMED ARROWS" : "AFTER · PLAYER-RELATIVE COMPASS", 28, 43);
    ctx.fillStyle = "#8BD3FF";
    ctx.font = "13px monospace";
    ctx.fillText("AIM-DOWN-SIGHTS ZOOM · BURST PRESSURE", 28, 65);
  }, [arrows, baseline]);

  return (
    <main
      data-testid="threat-stage"
      data-arrow-count={arrows.length}
      data-threat-count={enemies.length}
      style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--surface-0, #020806)", padding: 16 }}
    >
      <canvas ref={canvasRef} width={W} height={H} style={{ width: "min(100%, 800px)", height: "auto", border: "1px solid #2a6", borderRadius: 12 }} />
    </main>
  );
}

const surface = new URLSearchParams(location.search).get("surface") || "operation";
const visualSurface = surface === "perk-before"
  ? <PerkModal options={perkOptions} level={7} activePerks={activePerks} previewDoctrineDeltas={false} onSelect={() => {}} />
  : surface === "perk-after"
    ? <PerkModal options={perkOptions} level={7} activePerks={activePerks} onSelect={() => {}} />
    : surface === "threat-before"
      ? <ThreatStage baseline />
      : surface === "threat-after"
        ? <ThreatStage />
        : (
          <OperationCompleteModal
            receipt={receipt}
            onContinue={() => {}}
            onRematch={() => {}}
            onReturnToMenu={() => {}}
          />
        );

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {visualSurface}
  </StrictMode>,
);
