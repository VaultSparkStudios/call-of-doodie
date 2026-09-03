import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import OperationCompleteModal from "../src/components/OperationCompleteModal.jsx";
import PerkModal from "../src/components/PerkModal.jsx";
import DraftScreen from "../src/components/DraftScreen.jsx";
import HUD from "../src/components/HUD.jsx";
import { RunHistoryPanel } from "../src/components/MenuPanels.jsx";
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

const drillEvents = Object.freeze([
  { type: "run_drill_outcome", payload: { receiptId: "visual-2", drillId: "hold-lane", title: "Keep one exit lane open", status: "improved", endedAt: 200, baseline: { wave: 5, score: 1400 }, observed: { wave: 7, score: 2200 }, scoreDelta: 800 } },
  { type: "run_drill_outcome", payload: { receiptId: "visual-1", drillId: "hold-lane", title: "Keep one exit lane open", status: "improved", endedAt: 100, baseline: { wave: 4, score: 900 }, observed: { wave: 5, score: 1400 }, scoreDelta: 500 } },
]);

function EvidenceHudStage({ baseline = false }) {
  const isMobile = matchMedia("(max-width: 600px)").matches;
  return (
    <main style={{ minHeight: "100dvh", position: "relative", overflow: "hidden", background: "radial-gradient(circle at 50% 45%, #17382e, #050a08 62%)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.38, backgroundImage: "linear-gradient(rgba(124,255,184,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(124,255,184,.1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <HUD
        wave={6} timeSurvived={102} score={1960} kills={48} deaths={0} health={82} ammo={18}
        isReloading={false} currentWeapon={0} combo={4} comboTimer={20} killstreak={6} level={8}
        xp={40} xpNeeded={100} killFeed={[]} username="VISUAL-QA" grenadeReady dashReady extraLives={0}
        bankedPerkChoices={0} nextPerkLevel={10} difficulty="normal" isMobile={isMobile}
        weaponUpgrades={[]} activePerks={[]} weaponEvolutions={[]} unlockedArchetypes={[]}
        onPause={() => {}} fmtTime={() => "1:42"} mapTheme={1} missions={[]} missionDoneSet={new Set()}
        practiceDrill={{ id: "hold-lane", label: "REMATCH DRILL", title: "Keep one exit lane open", detail: "Practice the exact failure point.", baseline: { wave: 5, score: 1400 }, launchKind: "rematch", receiptId: "visual-live" }}
        practiceEvidence={baseline ? { label: "BEST-OF-3 0/2", repeatable: false } : { label: "EVIDENCE 1/2", repeatable: false }}
        hud={{ useCompactDesktop: isMobile }}
      />
    </main>
  );
}

function OrderHistoryStage({ baseline = false }) {
  return (
    <RunHistoryPanel
      onClose={() => {}}
      runHistory={[]}
      rivalryHistory={[]}
      studioEvents={baseline ? [] : drillEvents}
      username="VISUAL-QA"
    />
  );
}

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

// Perks that belong to known archetypes — used for the draft-after surface
const draftOptionsWithSeeds = Object.freeze([
  { id: "eagle_eye", name: "Eagle Eye", emoji: "🎯", tier: "common", desc: "Raise critical-hit chance." },
  { id: "iron_gut", name: "Iron Gut", emoji: "🛡️", tier: "uncommon", desc: "Gain a chunk of bonus max health." },
  { id: "deep_pockets", name: "Deep Pockets", emoji: "💰", tier: "common", desc: "Carry more coins." },
]);

// Perks with no archetype membership — used for the draft-before surface to verify clean state
const draftOptionsPlain = Object.freeze([
  { id: "hollow_points", name: "Hollow Points", emoji: "🔸", tier: "common", desc: "Bullets deal more damage." },
  { id: "fast_learner", name: "Fast Learner", emoji: "📚", tier: "common", desc: "Gain XP faster." },
  { id: "deep_pockets", name: "Deep Pockets", emoji: "💰", tier: "common", desc: "Carry more coins." },
]);

const surface = new URLSearchParams(location.search).get("surface") || "operation";
const visualSurface = surface === "draft-before"
  ? <DraftScreen options={draftOptionsPlain} onSelect={() => {}} />
  : surface === "draft-after"
    ? <DraftScreen options={draftOptionsWithSeeds} onSelect={() => {}} />
    : surface === "perk-before"
  ? <PerkModal options={perkOptions} level={7} activePerks={activePerks} previewDoctrineDeltas={false} onSelect={() => {}} />
  : surface === "perk-after"
    ? <PerkModal options={perkOptions} level={7} activePerks={activePerks} onSelect={() => {}} />
    : surface === "threat-before"
      ? <ThreatStage baseline />
    : surface === "threat-after"
      ? <ThreatStage />
      : surface === "order-hud-before"
        ? <EvidenceHudStage baseline />
        : surface === "order-hud-after"
          ? <EvidenceHudStage />
          : surface === "order-history-before"
            ? <OrderHistoryStage baseline />
            : surface === "order-history-after"
              ? <OrderHistoryStage />
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
