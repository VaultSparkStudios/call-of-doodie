import { useState } from "react";
import { WEAPONS, ENEMY_TYPES, STARTER_LOADOUTS, ACHIEVEMENTS, META_UPGRADES, NEW_FEATURES } from "../constants.js";
import {
  loadCustomLoadouts, saveCustomLoadout, loadRunHistory, loadRivalryHistory, loadStudioGameEvents,
  saveMetaProgress, purchaseMetaUpgrade, prestigeAccount,
} from "../storage.js";
import { encodeLoadout, decodeLoadout, isValidLoadoutCode } from "../utils/loadoutCode.js";
import {
  buildFeaturedSeeds,
  buildGhostBoard,
  buildWeeklyContract,
  summarizeRivalryHistory,
} from "../utils/socialRetention.js";
import {
  buildTrustRecommendations,
  summarizeStudioEvents,
} from "../utils/studioEventOps.js";

const OVERLAY = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" };
const CARD = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto", width: "100%", position: "relative" };
const BTN_P = { padding: "12px 24px", fontSize: 14, fontWeight: 900, fontFamily: "'Courier New',monospace", background: "linear-gradient(180deg,#FF6B35,#CC4400)", color: "#FFF", border: "none", borderRadius: 6, cursor: "pointer", letterSpacing: 2 };
const BTN_S = { ...BTN_P, background: "rgba(255,255,255,0.08)", color: "#CCC", border: "1px solid #444" };
const CLOSE_X = { position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" };

const TIER_LABELS = ["", "Ⅰ", "Ⅱ", "Ⅲ"];
const TIER_COLORS = ["#555", "#CD7F32", "#C0C0C0", "#FFD700"];
const PLAYER_SKINS = [
  { emoji: "",   label: "Soldier",  required: 0 },
  { emoji: "🤖", label: "Robot",    required: 1 },
  { emoji: "👾", label: "Alien",    required: 2 },
  { emoji: "🐸", label: "Frog",     required: 3 },
  { emoji: "🦊", label: "Fox",      required: 4 },
  { emoji: "🐉", label: "Dragon",   required: 5 },
];

function fmtTime(s) {
  if (!s) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
}

// ── RULES ────────────────────────────────────────────────────────────────────
export function RulesPanel({ onClose }) {
  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 460, border: "1px solid rgba(255,215,0,0.25)" }}>
        <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>📜 RULES OF ENGAGEMENT</h3>
        <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2 }}>
          <div>🎯 <strong style={{ color: "#FF6B35" }}>Objective:</strong> Survive as many waves as possible</div>
          <div>👾 <strong style={{ color: "#FF6B35" }}>Enemies:</strong> Spawn in waves, each harder than the last</div>
          <div>⚠️ <strong style={{ color: "#FF6B35" }}>Boss Waves:</strong> Every 5th wave spawns a powerful boss!</div>
          <div>⚡ <strong style={{ color: "#FF6B35" }}>Combos:</strong> Kill quickly for score multipliers (2s window)</div>
          <div>🔥 <strong style={{ color: "#FF6B35" }}>Killstreaks:</strong> Every 5 kills triggers a bonus attack</div>
          <div>💥 <strong style={{ color: "#FF6B35" }}>Critical Hits:</strong> 15% chance for 2x damage (gold text)</div>
          <div>💊 <strong style={{ color: "#FF6B35" }}>Pickups:</strong> Enemies drop health, ammo, speed, nukes & upgrades</div>
          <div>🔧 <strong style={{ color: "#FF6B35" }}>Weapon Upgrades:</strong> Rare drops — boost damage, fire rate & ammo!</div>
          <div>😇 <strong style={{ color: "#FF6B35" }}>Guardian Angel:</strong> Super rare boss drop — grants 1 extra life!</div>
          <div>✨ <strong style={{ color: "#FF6B35" }}>Perks:</strong> Pick one on every level-up. They stack!</div>
          <div>⚠️ <strong style={{ color: "#FF6B35" }}>Ranged Foes:</strong> Glowing ring enemies shoot at you!</div>
          <div>💨 <strong style={{ color: "#FF6B35" }}>Dash:</strong> Brief invincibility to dodge through danger</div>
          <div>⬆ <strong style={{ color: "#FF6B35" }}>XP & Levels:</strong> Level up from kills — choose a perk each time</div>
          <div>🏆 <strong style={{ color: "#FF6B35" }}>Leaderboard:</strong> Submit your score with famous last words</div>
          <div>🌱 <strong style={{ color: "#FF6B35" }}>Seeds:</strong> Each run uses a unique seed (0–999998) controlling map layout, walls, terrain, and theme.</div>
          <div>🔄 <strong style={{ color: "#FF6B35" }}>Replay:</strong> After death, hit 🔄 REPLAY to rerun the exact same map with the same seed</div>
        </div>
        <button onClick={onClose} style={{ ...BTN_P, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
      </div>
    </div>
  );
}

// ── CONTROLS ─────────────────────────────────────────────────────────────────
export function ControlsPanel({ onClose, isMobile, controllerType }) {
  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 460, border: "1px solid rgba(255,215,0,0.25)" }}>
        <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>⌨ CONTROLS</h3>
        {isMobile ? (
          <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2.2 }}>
            <div>👆 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left thumb</span> — Move soldier</div>
            <div>👆 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Right thumb</span> — Aim & auto-fire</div>
            <div>🎯 <span style={{ color: "#EEE" }}>Move only → auto-aims nearest enemy</span></div>
            <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>DASH button</span> — Invincible dodge</div>
            <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>GRENADE button</span> — AOE explosion</div>
            <div>🔢 <span style={{ color: "#FFD700", fontWeight: 800 }}>Weapon buttons</span> — Tap to swap</div>
            <div>⟳ <span style={{ color: "#FFD700", fontWeight: 800 }}>R button</span> — Manual reload</div>
            <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Pause button</span> — Pause menu</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2.2 }}>
            <div>🏃 <span style={{ color: "#FF6B35", fontWeight: 800 }}>W/A/S/D</span> — Move</div>
            <div>🖱 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Mouse</span> — Aim</div>
            <div>🔫 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left Click</span> — Shoot</div>
            <div>🔄 <span style={{ color: "#FFD700", fontWeight: 800 }}>R</span> — Reload</div>
            <div>🔢 <span style={{ color: "#FFD700", fontWeight: 800 }}>1 / 2 / 3 / 4</span> — Switch weapons</div>
            <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>5 / Q / G</span> — Throw grenade</div>
            <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>Space / Shift</span> — Dash</div>
            <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Escape</span> — Pause / Resume</div>
          </div>
        )}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            🎮 CONTROLLER
            {controllerType === "xbox" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(16,124,16,0.2)", border: "1px solid #107C10", color: "#4DBD61", fontWeight: 900 }}>Xbox</span>}
            {controllerType === "ps" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(0,55,145,0.22)", border: "1px solid #2255BB", color: "#6699FF", fontWeight: 900 }}>PS</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12, color: "#EEE", lineHeight: 2 }}>
            <div>🕹️ <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left Stick</span> — Move</div>
            <div>🎯 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Right Stick</span> — Aim</div>
            <div>🔫 <span style={{ color: "#FF6B35", fontWeight: 800 }}>RT / R2</span> — Shoot</div>
            <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>R3 (click stick)</span> — Dash</div>
            <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>B / Circle</span> — Grenade</div>
            <div>🔄 <span style={{ color: "#FFD700", fontWeight: 800 }}>X / Square</span> — Reload</div>
            <div>◀ <span style={{ color: "#FFD700", fontWeight: 800 }}>LB / L1</span> — Prev weapon</div>
            <div>▶ <span style={{ color: "#FFD700", fontWeight: 800 }}>RB / R1</span> — Next weapon</div>
            <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Start / Options</span> — Pause</div>
            <div>✅ <span style={{ color: "#AAA", fontWeight: 800 }}>A / Cross</span> — Confirm (menus)</div>
            <div>❌ <span style={{ color: "#AAA", fontWeight: 800 }}>B / Circle</span> — Back (menus)</div>
            <div>⬆ <span style={{ color: "#AAA", fontWeight: 800 }}>D-pad</span> — Navigate menus</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 700, marginBottom: 6 }}>WEAPONS</div>
          {WEAPONS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: "#EEE" }}>
              <span style={{ fontSize: 16 }}>{w.emoji}</span>
              <span style={{ color: w.color, fontWeight: 700, minWidth: 140 }}>[{i + 1}] {w.name}</span>
              <span style={{ color: "#CCC", fontSize: 11 }}>{w.desc}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ ...BTN_P, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
      </div>
    </div>
  );
}

// ── MOST WANTED (was BESTIARY) ───────────────────────────────────────────────
export function MostWantedPanel({ onClose }) {
  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 460, border: "1px solid rgba(255,215,0,0.25)" }}>
        <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>👾 MOST WANTED LIST</h3>
        {ENEMY_TYPES.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 6, marginBottom: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 24 }}>{e.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: e.color }}>{e.name}</div>
              <div style={{ fontSize: 10, color: "#CCC" }}>HP: {e.health} · Speed: {e.speed} · Points: {e.points}{e.ranged ? " · RANGED ⚡" : ""}</div>
              <div style={{ fontSize: 10, color: "#FF69B4", fontStyle: "italic" }}>"{Array.isArray(e.deathQuotes) ? e.deathQuotes[Math.floor(Math.random() * e.deathQuotes.length)] : (e.deathQuote || "...")}"</div>
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{ ...BTN_P, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
      </div>
    </div>
  );
}

// ── RUN HISTORY ──────────────────────────────────────────────────────────────
export function RunHistoryPanel({ onClose, runHistory = null, rivalryHistory = null, studioEvents = null }) {
  const history = Array.isArray(runHistory) ? runHistory : loadRunHistory();
  const rivalry = Array.isArray(rivalryHistory) ? rivalryHistory : loadRivalryHistory();
  const events = Array.isArray(studioEvents) ? studioEvents : loadStudioGameEvents();
  const MODE_LABELS = { score_attack: "⏱ SA", daily_challenge: "📅 DC", cursed: "☠ CU", boss_rush: "☠ BR", speedrun: "🏃 SR", gauntlet: "🏋 GT" };
  const DIFF_COLORS = { easy: "#44CC44", normal: "#FFD700", hard: "#FF4444", insane: "#FF00FF" };
  const rivalrySummary = summarizeRivalryHistory(rivalry);
  const trustSummary = summarizeStudioEvents(events);
  const weeklyContract = buildWeeklyContract(history, rivalry, events);
  const featuredSeeds = buildFeaturedSeeds(history, rivalry);
  const ghostBoard = buildGhostBoard(history, rivalry);
  const trustRecommendations = buildTrustRecommendations(trustSummary);
  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 520, border: "1px solid rgba(255,107,53,0.3)" }}>
        <button onClick={onClose} style={CLOSE_X}>X</button>
        <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18, letterSpacing: 2 }}>📜 RUN HISTORY</h3>
        <p style={{ color: "#bbb", fontSize: 11, margin: "0 0 14px" }}>Runs, rivalries, and trust signals saved locally, then mirrored when the secure event sync path is available</p>
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.22)" }}>
          <div style={{ color: "#FFD700", fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>{weeklyContract.title}</div>
          <div style={{ color: "#EEE", fontSize: 12, marginTop: 5, lineHeight: 1.45 }}>{weeklyContract.detail}</div>
          <div style={{ color: "#AAA", fontSize: 10, marginTop: 6 }}>{weeklyContract.reward}</div>
          <div style={{ color: "#FFD79C", fontSize: 10, marginTop: 6 }}>Progress: {weeklyContract.progress}</div>
        </div>
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.18)" }}>
          <div style={{ color: "#7FE6FF", fontSize: 11, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>⚔️ RIVALRY NETWORK</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#00FF88", border: "1px solid rgba(0,255,136,0.2)" }}>Wins {rivalrySummary.wins}</span>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#FF8888", border: "1px solid rgba(255,120,120,0.2)" }}>Losses {rivalrySummary.losses}</span>
            {rivalrySummary.streak !== 0 && (
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: rivalrySummary.streak > 0 ? "#A8FFCE" : "#FFC0C0", border: "1px solid rgba(255,255,255,0.12)" }}>
                {rivalrySummary.streak > 0 ? `Win streak ${rivalrySummary.streak}` : `Loss streak ${Math.abs(rivalrySummary.streak)}`}
              </span>
            )}
            {rivalrySummary.unresolved && (
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,107,53,0.12)", color: "#FFB36B", border: "1px solid rgba(255,107,53,0.28)" }}>
                Revenge seed #{rivalrySummary.unresolved.seed}
              </span>
            )}
          </div>
          {rivalrySummary.bestWin && <div style={{ color: "#CCC", fontSize: 10, marginBottom: 4 }}>Best flex: seed #{rivalrySummary.bestWin.seed} by +{Math.abs(rivalrySummary.bestWin.delta).toLocaleString()}.</div>}
          {rivalrySummary.worstLoss && <div style={{ color: "#CCC", fontSize: 10, marginBottom: 6 }}>Biggest unpaid loss: seed #{rivalrySummary.worstLoss.seed} by {Math.abs(rivalrySummary.worstLoss.delta).toLocaleString()}.</div>}
          {rivalry.length === 0 ? (
            <div style={{ color: "#888", fontSize: 10 }}>No rivalry history yet — shared seeds become meaningful once one real challenge lands.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rivalry.slice(0, 4).map((entry, index) => (
                <div key={`rival-${index}`} style={{ fontSize: 10, color: "#DDD", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>#{entry.seed} {entry.vsName ? `vs @${entry.vsName}` : "fixed-seed rivalry"} {entry.won === true ? "won" : entry.won === false ? "lost" : "logged"}</span>
                  {entry.delta != null && <span style={{ color: entry.delta >= 0 ? "#00FF88" : "#FF8888" }}>{entry.delta >= 0 ? "+" : ""}{entry.delta.toLocaleString()}</span>}
                </div>
              ))}
            </div>
          )}
          {featuredSeeds.length > 0 && (
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
              {featuredSeeds.map((card) => (
                <div key={card.id} style={{ padding: "10px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${card.accent}33` }}>
                  <div style={{ color: card.accent, fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>{card.label}</div>
                  <div style={{ color: "#FFF", fontSize: 12, marginTop: 5 }}>Seed #{card.seed}</div>
                  <div style={{ color: "#BBB", fontSize: 10, marginTop: 4, lineHeight: 1.45 }}>{card.detail}</div>
                  <div style={{ color: "#DDD", fontSize: 10, marginTop: 6 }}>{card.target}</div>
                </div>
              ))}
            </div>
          )}
          {ghostBoard.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: "#AAA", fontSize: 10, marginBottom: 6 }}>Async competition board</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ghostBoard.map((ghost) => (
                  <div key={ghost.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, color: "#DDD", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.025)" }}>
                    <span><span style={{ color: ghost.accent }}>{ghost.title}</span> · seed #{ghost.seed} · wave {ghost.wave}</span>
                    <span>{ghost.score.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(255,70,70,0.04)", border: "1px solid rgba(255,120,120,0.18)" }}>
          <div style={{ color: "#FFB5B5", fontSize: 11, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>🛡️ TRUST OPS</div>
          <div style={{ fontSize: 10, color: "#AAA", marginBottom: 6 }}>
            Front-door events: {trustSummary.frontDoorCount} · Debriefs: {trustSummary.debriefCount} · Trust flags: {trustSummary.trust.length} · Rejections: {trustSummary.rejectionCount}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#E6E6E6", border: "1px solid rgba(255,255,255,0.12)" }}>Perk picks {trustSummary.perkChoiceCount}</span>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#E6E6E6", border: "1px solid rgba(255,255,255,0.12)" }}>Route picks {trustSummary.routeChoiceCount}</span>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#E6E6E6", border: "1px solid rgba(255,255,255,0.12)" }}>Abandons {trustSummary.abandonmentCount}</span>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#9BE7FF", border: "1px solid rgba(0,229,255,0.18)" }}>Synced {trustSummary.syncedCount}</span>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#FFD79C", border: "1px solid rgba(255,215,156,0.18)" }}>Queued {trustSummary.pendingSyncCount}</span>
            <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", color: "#FFB5B5", border: "1px solid rgba(255,120,120,0.2)" }}>Retry {trustSummary.failedSyncCount}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {trustRecommendations.map((line, index) => (
              <div key={`trust-line-${index}`} style={{ color: "#FFD6D6", fontSize: 10, lineHeight: 1.4 }}>{line}</div>
            ))}
          </div>
          {trustSummary.trust.length === 0 ? (
            <div style={{ color: "#BBB", fontSize: 10 }}>No recent trust/anomaly events logged locally.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {trustSummary.trust.slice(0, 4).map((event, index) => (
                <div key={`trust-${index}`} style={{ fontSize: 10, color: "#DDD", lineHeight: 1.4 }}>
                  <div style={{ color: "#FF8888", fontWeight: 700 }}>{event.summary || event.type}</div>
                  {event.payload?.reason && <div>{event.payload.reason}</div>}
                  {Array.isArray(event.payload?.reasons) && event.payload.reasons[0] && <div style={{ color: "#FFC7C7" }}>Top flag: {event.payload.reasons[0]}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        {history.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 20 }}>No runs yet — get out there!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((run, i) => {
              const date = new Date(run.ts);
              const dateStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
              const timeFmt = run.time != null ? (run.time >= 3600 ? `${Math.floor(run.time/3600)}h${Math.floor((run.time%3600)/60)}m` : `${Math.floor(run.time/60)}:${String(run.time%60).padStart(2,"0")}`) : "--:--";
              const modeLabel = run.mode ? MODE_LABELS[run.mode] : null;
              const diffColor = DIFF_COLORS[run.difficulty] || "#AAA";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ background: "rgba(255,107,53,0.18)", border: "1px solid rgba(255,107,53,0.4)", borderRadius: 6, padding: "4px 8px", textAlign: "center", flexShrink: 0, minWidth: 38 }}>
                    <div style={{ fontSize: 9, color: "#FF6B35", fontWeight: 700 }}>W</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#FF6B35", lineHeight: 1 }}>{run.wave ?? "?"}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: "#FFD700" }}>{(run.score || 0).toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: "#00FF88" }}>☠ {run.kills ?? 0}</span>
                      {modeLabel && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "rgba(255,51,51,0.18)", border: "1px solid rgba(255,51,51,0.4)", color: "#FF6666", fontWeight: 900 }}>{modeLabel}</span>}
                      <span style={{ fontSize: 9, fontWeight: 700, color: diffColor }}>{(run.difficulty || "normal").toUpperCase()}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 9, color: "#888" }}>
                      <span>⏱ {timeFmt}</span>
                      {run.modifier && <span>🎲 {run.modifier}</span>}
                      <span style={{ marginLeft: "auto" }}>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} style={{ ...BTN_P, marginTop: 16, width: "100%" }}>← CLOSE</button>
      </div>
    </div>
  );
}

// ── LOADOUT BUILDER ──────────────────────────────────────────────────────────
export function LoadoutBuilderPanel({ onClose }) {
  const [customLoadouts, setCustomLoadouts] = useState(() => loadCustomLoadouts());
  const [editingSlot, setEditingSlot] = useState(null);
  const [editName, setEditName] = useState("");
  const [editWeaponIdx, setEditWeaponIdx] = useState(0);
  const [editStarterLoadout, setEditStarterLoadout] = useState("standard");
  const [loadoutCodeInput, setLoadoutCodeInput] = useState("");
  const [loadoutCodeError, setLoadoutCodeError] = useState("");

  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 500, border: "1px solid rgba(255,107,53,0.35)" }}>
        <button onClick={() => { setEditingSlot(null); onClose(); }} style={CLOSE_X}>X</button>
        <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18, letterSpacing: 2 }}>⚙️ CUSTOM LOADOUTS</h3>
        <p style={{ color: "#bbb", fontSize: 11, margin: "0 0 16px" }}>Save up to 3 custom weapon + loadout presets.</p>

        {editingSlot !== null ? (
          <div>
            <div style={{ fontSize: 11, color: "#FFD700", marginBottom: 12, fontWeight: 900 }}>SLOT {editingSlot + 1} — CONFIGURE</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 4, letterSpacing: 1 }}>LOADOUT NAME (max 20 chars)</div>
              <input
                value={editName} maxLength={20}
                onChange={e => setEditName(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,107,53,0.4)", borderRadius: 6, padding: "8px 10px", color: "#fff", fontFamily: "'Courier New',monospace", fontSize: 13, outline: "none" }}
                placeholder="e.g. Glass Cannon Speedrun"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 6, letterSpacing: 1 }}>STARTING WEAPON</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {WEAPONS.map((w, i) => (
                  <button key={i} onClick={() => setEditWeaponIdx(i)} style={{
                    padding: "6px 10px", fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6,
                    background: editWeaponIdx === i ? "rgba(255,107,53,0.25)" : "rgba(255,255,255,0.05)",
                    border: editWeaponIdx === i ? "1px solid #FF6B35" : "1px solid rgba(255,255,255,0.1)",
                    color: editWeaponIdx === i ? "#FF6B35" : "#CCC",
                  }}>
                    {w.emoji} {w.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 6, letterSpacing: 1 }}>STARTER LOADOUT</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STARTER_LOADOUTS.map(lo => (
                  <button key={lo.id} onClick={() => setEditStarterLoadout(lo.id)} style={{
                    padding: "6px 10px", fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6,
                    background: editStarterLoadout === lo.id ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.05)",
                    border: editStarterLoadout === lo.id ? "1px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
                    color: editStarterLoadout === lo.id ? "#FFD700" : "#CCC",
                  }}>
                    {lo.emoji} {lo.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => {
                if (!editName.trim()) return;
                saveCustomLoadout(editingSlot, { name: editName.trim(), weaponIdx: editWeaponIdx, starterLoadout: editStarterLoadout });
                setCustomLoadouts(loadCustomLoadouts());
                setEditingSlot(null);
              }} style={{ ...BTN_P, flex: 1, fontSize: 13, padding: "10px 16px" }}>💾 SAVE</button>
              <button onClick={() => setEditingSlot(null)} style={{ ...BTN_S, flex: 1, fontSize: 13, padding: "10px 16px" }}>✕ CANCEL</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.2)" }}>
              <div style={{ fontSize: 10, color: "#FFD700", letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>LOADOUT CODE SHARE</div>
              <div style={{ fontSize: 9, color: "#888", marginBottom: 8 }}>Share a 3-char code to export your current weapon + starter selection.</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <input
                  value={loadoutCodeInput}
                  onChange={e => { setLoadoutCodeInput(e.target.value.toUpperCase()); setLoadoutCodeError(""); }}
                  placeholder="e.g. 02B"
                  maxLength={3}
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${loadoutCodeError ? "#FF6666" : "rgba(255,215,0,0.35)"}`, borderRadius: 6, padding: "6px 10px", color: "#fff", fontFamily: "'Courier New',monospace", fontSize: 14, outline: "none", textTransform: "uppercase", letterSpacing: 3 }}
                />
                <button onClick={() => {
                  if (!isValidLoadoutCode(loadoutCodeInput)) { setLoadoutCodeError("Invalid code"); return; }
                  const decoded = decodeLoadout(loadoutCodeInput);
                  setEditWeaponIdx(decoded.weaponIdx);
                  setEditStarterLoadout(decoded.starterLoadout);
                  setLoadoutCodeError("");
                  setLoadoutCodeInput("");
                }} style={{ padding: "6px 12px", fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6, background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700", whiteSpace: "nowrap" }}>IMPORT</button>
              </div>
              {loadoutCodeError && <div style={{ fontSize: 10, color: "#FF6666", marginBottom: 4 }}>{loadoutCodeError}</div>}
              <div style={{ fontSize: 10, color: "#888" }}>
                Your current: <span style={{ color: "#FFD700", letterSpacing: 2, fontFamily: "monospace" }}>{encodeLoadout({ weaponIdx: editWeaponIdx, starterLoadout: editStarterLoadout })}</span>
              </div>
            </div>
            {customLoadouts.map((lo, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: lo ? "1px solid rgba(255,107,53,0.25)" : "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ background: "rgba(255,107,53,0.16)", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 6, padding: "4px 8px", textAlign: "center", flexShrink: 0, minWidth: 32 }}>
                  <div style={{ fontSize: 9, color: "#FF6B35", fontWeight: 700 }}>#{i + 1}</div>
                </div>
                {lo ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#FF6B35", marginBottom: 2 }}>{lo.name}</div>
                    <div style={{ fontSize: 10, color: "#AAA" }}>
                      {WEAPONS[lo.weaponIdx]?.emoji} {WEAPONS[lo.weaponIdx]?.name}
                      {" · "}
                      {STARTER_LOADOUTS.find(sl => sl.id === lo.starterLoadout)?.emoji} {STARTER_LOADOUTS.find(sl => sl.id === lo.starterLoadout)?.name}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: 12, color: "#555", fontStyle: "italic" }}>Empty slot</div>
                )}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {lo && (
                    <button onClick={() => { saveCustomLoadout(i, null); setCustomLoadouts(loadCustomLoadouts()); }} style={{ padding: "4px 10px", fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 5, background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.3)", color: "#FF6666" }}>DEL</button>
                  )}
                  <button onClick={() => {
                    setEditingSlot(i);
                    setEditName(lo?.name || "");
                    setEditWeaponIdx(lo?.weaponIdx ?? 0);
                    setEditStarterLoadout(lo?.starterLoadout || "standard");
                  }} style={{ padding: "4px 10px", fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 5, background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.3)", color: "#FF6B35" }}>
                    {lo ? "EDIT" : "CREATE"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CAREER STATS / ADVANCED ANALYTICS ────────────────────────────────────────
export function CareerStatsPanel({ career, meta, onClose }) {
  if (!career) return null;
  const Section = ({ label }) => (
    <div style={{ fontSize: 9, color: "#00E5FF", fontWeight: 700, letterSpacing: 2, padding: "10px 0 4px", borderBottom: "1px solid rgba(0,229,255,0.15)", marginBottom: 2 }}>{label}</div>
  );
  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
      <span style={{ color: "#CCC" }}>{label}</span>
      <span style={{ color: color || "#FFF", fontWeight: 700 }}>{value}</span>
    </div>
  );
  const runs = career.totalRuns || 1;
  const avgScore = career.totalScore ? Math.floor(career.totalScore / runs) : 0;
  const kd = career.totalDeaths > 0 ? (career.totalKills / career.totalDeaths).toFixed(1) : (career.totalKills || 0).toFixed(1);
  const avgKills = Math.floor((career.totalKills || 0) / runs);
  const accuracy = career.totalShots > 0 ? ((career.totalHits || 0) / career.totalShots * 100).toFixed(1) : null;
  const critRate = career.totalShots > 0 ? ((career.totalCrits || 0) / career.totalShots * 100).toFixed(1) : null;
  const dmgPerRun = Math.floor((career.totalDamage || 0) / runs);
  const killsPerMin = career.totalPlayTime > 0 ? ((career.totalKills || 0) / (career.totalPlayTime / 60)).toFixed(1) : null;
  const survivalRate = career.totalRuns > 0 ? (((career.totalRuns - (career.totalDeaths || career.totalRuns)) / career.totalRuns) * 100).toFixed(1) : 0;

  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 440, border: "1px solid rgba(0,229,255,0.25)" }}>
        <button onClick={onClose} style={CLOSE_X}>X</button>
        <h3 style={{ color: "#00E5FF", margin: "0 0 8px", fontSize: 18, letterSpacing: 2 }}>📊 CAREER STATS</h3>
        {meta && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "7px 12px", borderRadius: 6, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ color: "#FFD700", fontWeight: 900, fontSize: 14 }}>{meta.careerPoints || 0}</span>
            <span style={{ color: "#CCC", fontSize: 11 }}>career points · spend in 🎖️ UPGRADES</span>
          </div>
        )}
        {career.totalRuns === 0 ? (
          <p style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginTop: 12 }}>No runs yet. Get out there and die!</p>
        ) : (
          <>
            <Section label="SCORE" />
            <Row label="🏆 Best Score" value={(career.bestScore || 0).toLocaleString()} color="#FFD700" />
            <Row label="📈 Total Score" value={(career.totalScore || 0).toLocaleString()} color="#FFD700" />
            <Row label="📊 Avg Score / Run" value={avgScore.toLocaleString()} />

            <Section label="COMBAT" />
            <Row label="☠️ Total Kills" value={(career.totalKills || 0).toLocaleString()} color="#00FF88" />
            <Row label="🎯 Best Kills / Run" value={career.bestKills || 0} color="#00FF88" />
            <Row label="⚡ Avg Kills / Run" value={avgKills} />
            {killsPerMin && <Row label="⏱ Kills / Min" value={killsPerMin} />}
            <Row label="💀 K/D Ratio" value={kd} color={parseFloat(kd) >= 10 ? "#FFD700" : "#FFF"} />
            <Row label="⚔️ Total Damage" value={(career.totalDamage || 0).toLocaleString()} color="#E040FB" />
            <Row label="📈 Avg Damage / Run" value={dmgPerRun.toLocaleString()} />
            <Row label="💥 Total Crits" value={(career.totalCrits || 0).toLocaleString()} color="#FF4500" />
            <Row label="🎯 Accuracy" value={accuracy != null ? `${accuracy}%` : "—"} />
            <Row label="🎯 Crit Rate" value={critRate != null ? `${critRate}%` : "—"} />
            <Row label="💣 Grenades Thrown" value={(career.totalGrenades || 0).toLocaleString()} />
            <Row label="💨 Total Dashes" value={(career.totalDashes || 0).toLocaleString()} />
            <Row label="👹 Boss Kills" value={(career.totalBossKills || 0).toLocaleString()} color="#FF4444" />

            <Section label="PROGRESSION" />
            <Row label="🎮 Total Runs" value={career.totalRuns} />
            <Row label="🌊 Best Wave" value={career.bestWave || 0} color="#00BFFF" />
            <Row label="🔥 Best Streak" value={career.bestStreak || 0} color="#FF4500" />
            <Row label="🌪️ Best Combo" value={`×${career.bestCombo || 0}`} color="#FF4500" />
            <Row label="⬆️ Best Level" value={career.bestLevel || 0} color="#00FF88" />
            <Row label="⏱️ Total Play Time" value={fmtTime(career.totalPlayTime)} />
            <Row label="🛡️ Survival Rate" value={`${survivalRate}%`} />
            <Row label="🏅 Achievements" value={`${career.achievementsEver?.length || 0} / ${ACHIEVEMENTS.length}`} color="#FFD700" />

            <Section label="META" />
            <Row label="⭐ Career Points" value={(meta?.careerPoints || 0).toLocaleString()} color="#FFD700" />
            <Row label="👑 Prestige" value={`P${meta?.prestige || 0}`} color={meta?.prestige ? "#FFD700" : "#AAA"} />
            <Row label="🎖️ Upgrade Tiers" value={Object.values(meta?.upgradeTiers || {}).reduce((a, b) => a + b, 0)} />
          </>
        )}
      </div>
    </div>
  );
}

// ── MISSIONS ─────────────────────────────────────────────────────────────────
export function MissionsPanel({ missions, missionProgress, onClose }) {
  const now = new Date();
  const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const msLeft = midnight - now;
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 460, border: "1px solid rgba(255,215,0,0.3)" }}>
        <h3 style={{ color: "#FFD700", margin: "0 0 4px", fontSize: 18 }}>📋 DAILY MISSIONS</h3>
        <p style={{ color: "#bbb", fontSize: 11, margin: "0 0 14px" }}>Resets in {h}h {m}m · Complete for career point bonuses</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(missions || []).map((mi, i) => {
            const done = !!missionProgress[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: done ? "rgba(0,255,136,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? "rgba(0,255,136,0.35)" : "rgba(255,255,255,0.1)"}` }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{mi.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: done ? "#00FF88" : "#FFF" }}>{mi.text}</div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>Reward: +{mi.goal} career pts on completion</div>
                </div>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{done ? "✅" : "⬜"}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", fontSize: 12, color: "#CCC" }}>
          💡 Missions are tracked automatically in-game. Progress saves on run end.
        </div>
        <button onClick={onClose} style={{ ...BTN_P, marginTop: 16, width: "100%" }}>← BACK</button>
      </div>
    </div>
  );
}

// ── UPGRADES + PRESTIGE ──────────────────────────────────────────────────────
export function UpgradesPanel({ meta: initMeta, accountLevel, onClose }) {
  const [meta, setMeta] = useState(initMeta);
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);
  const prestige = meta?.prestige || 0;
  const PRESTIGE_REQUIRED_LEVEL = 25;
  const canPrestige = accountLevel >= PRESTIGE_REQUIRED_LEVEL;
  const handlePrestige = () => {
    const updated = prestigeAccount();
    setMeta(updated);
    setShowPrestigeConfirm(false);
  };
  if (!meta) return null;
  return (
    <div style={OVERLAY}>
      <div data-gamepad-scroll="" style={{ ...CARD, maxWidth: 520, border: "1px solid rgba(255,107,53,0.3)" }}>
        <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18 }}>🎖️ META UPGRADES</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ color: "#bbb", fontSize: 11, margin: 0 }}>Permanent bonuses · 3 tiers each · sequential purchase</p>
          <div style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.4)", borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 900, color: "#FFD700", flexShrink: 0 }}>
            ⭐ {(meta.careerPoints || 0).toLocaleString()}
          </div>
        </div>

        {/* Prestige */}
        <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 8, background: prestige > 0 ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${prestige > 0 ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.1)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: prestige > 0 ? "#FFD700" : "#FFF" }}>
                PRESTIGE {prestige > 0 ? `${prestige} — Reach P${prestige + 1}` : "— Reset & Rise"}
              </div>
              <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
                {prestige > 0
                  ? `Active: enemies +${prestige * 10}% health & speed on all difficulties.`
                  : "Resets all upgrades & points. Permanently raises difficulty. Earn prestige badge."}
              </div>
              {!canPrestige && (
                <div style={{ fontSize: 10, color: "#FF6B35", marginTop: 2 }}>
                  Requires Account Level {PRESTIGE_REQUIRED_LEVEL} · You are Level {accountLevel}
                </div>
              )}
            </div>
            <button
              disabled={!canPrestige}
              onClick={() => setShowPrestigeConfirm(true)}
              style={{
                padding: "7px 12px", borderRadius: 6, flexShrink: 0,
                cursor: canPrestige ? "pointer" : "not-allowed",
                background: canPrestige ? "linear-gradient(180deg,#FFD700,#AA7700)" : "rgba(255,255,255,0.05)",
                color: canPrestige ? "#000" : "#aaa", border: "none",
                fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 900,
              }}
            >PRESTIGE ★</button>
          </div>
        </div>

        {/* Player Skin */}
        <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#EEE", marginBottom: 8 }}>🎨 PLAYER SKIN</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLAYER_SKINS.map(s => {
              const unlocked = prestige >= s.required;
              const selected = (meta.playerSkin || "") === s.emoji;
              return (
                <button key={s.emoji || "default"} disabled={!unlocked}
                  onClick={() => { if (!unlocked) return; const u = { ...meta, playerSkin: s.emoji }; saveMetaProgress(u); setMeta(u); }}
                  title={unlocked ? s.label : `Requires Prestige ${s.required}`}
                  style={{ padding: "8px 14px", borderRadius: 8, cursor: unlocked ? "pointer" : "not-allowed",
                    background: selected ? "rgba(255,215,0,0.15)" : unlocked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    border: selected ? "2px solid #FFD700" : unlocked ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.06)",
                    color: unlocked ? "#FFF" : "#444", fontFamily: "'Courier New',monospace" }}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{s.emoji || "🪖"}</div>
                  <div style={{ fontSize: 9, color: unlocked ? "#AAA" : "#444" }}>{unlocked ? s.label : `P${s.required}`}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {META_UPGRADES.map((u) => {
            const ownedTier = (meta.upgradeTiers || {})[u.id] || 0;
            const nextTier = ownedTier + 1;
            const isMaxed = ownedTier >= u.tiers.length;
            const nextCost = isMaxed ? 0 : u.tiers[nextTier - 1].cost;
            const canAfford = !isMaxed && (meta.careerPoints || 0) >= nextCost;
            const activeTierDesc = ownedTier > 0 ? u.tiers[ownedTier - 1].desc : null;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
                background: isMaxed ? "rgba(255,215,0,0.05)" : ownedTier > 0 ? "rgba(255,107,53,0.05)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${isMaxed ? "rgba(255,215,0,0.35)" : ownedTier > 0 ? "rgba(255,107,53,0.3)" : "rgba(255,255,255,0.07)"}`,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{u.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isMaxed ? "#FFD700" : ownedTier > 0 ? "#FF6B35" : "#EEE" }}>{u.name}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {u.tiers.map((_, ti) => (
                        <div key={ti} style={{ width: 10, height: 10, borderRadius: 2,
                          background: ti < ownedTier ? TIER_COLORS[ti + 1] : "rgba(255,255,255,0.1)",
                          border: `1px solid ${ti < ownedTier ? TIER_COLORS[ti + 1] : "rgba(255,255,255,0.18)"}` }} />
                      ))}
                    </div>
                    {isMaxed && <span style={{ fontSize: 9, color: "#FFD700", fontWeight: 900 }}>MAX</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#AAA", lineHeight: 1.4 }}>
                    {activeTierDesc ? <span style={{ color: "#CCC" }}>{activeTierDesc}</span> : <span style={{ color: "#bbb" }}>{u.tiers[0].desc}</span>}
                  </div>
                  {!isMaxed && ownedTier > 0 && (
                    <div style={{ fontSize: 9, color: "#bbb", marginTop: 1 }}>▲ Next: {u.tiers[nextTier - 1].desc}</div>
                  )}
                </div>
                {isMaxed ? (
                  <div style={{ fontSize: 14, color: "#FFD700", flexShrink: 0 }}>★★★</div>
                ) : (
                  <button disabled={!canAfford}
                    onClick={() => { const r = purchaseMetaUpgrade(u.id, nextTier, nextCost); if (r.success) setMeta(r.meta); }}
                    style={{ padding: "5px 9px", borderRadius: 6, flexShrink: 0,
                      cursor: canAfford ? "pointer" : "not-allowed",
                      background: canAfford ? "linear-gradient(180deg,#FF6B35,#CC4400)" : "rgba(255,255,255,0.04)",
                      color: canAfford ? "#FFF" : "#444", border: "none",
                      fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {TIER_LABELS[nextTier]} ⭐{nextCost.toLocaleString()}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.18)", fontSize: 10, color: "#AAA" }}>
          💡 Earn 1 career pt per kill · Daily missions grant bonus pts · Upgrades persist between runs (reset on prestige)
        </div>
        <button onClick={onClose} style={{ ...BTN_P, marginTop: 14, width: "100%" }}>← BACK</button>

        {showPrestigeConfirm && (
          <div style={{ ...OVERLAY, zIndex: 200, background: "rgba(0,0,0,0.96)" }}>
            <div style={{ ...CARD, maxWidth: 400, border: "1px solid rgba(255,50,50,0.5)", padding: "28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>⭐</div>
              <h2 style={{ color: "#FFD700", margin: "0 0 6px", fontSize: 22, letterSpacing: 2 }}>PRESTIGE {prestige + 1}</h2>
              <div style={{ fontSize: 12, color: "#FF6B35", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>CURRENT LEVEL: {accountLevel}</div>
              <div style={{ fontSize: 12, color: "#FF9999", lineHeight: 1.7, marginBottom: 14, padding: "10px 14px", background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,50,50,0.2)", borderRadius: 8 }}>
                This will reset all career points and meta upgrades. Your callsign, kills record, and prestige count will be preserved.
              </div>
              <div style={{ fontSize: 13, color: "#CCC", lineHeight: 1.9, marginBottom: 16 }}>
                <div style={{ color: "#FF4444" }}>✗ All meta upgrades reset</div>
                <div style={{ color: "#FF4444" }}>✗ Career points reset to 0</div>
                <div style={{ color: "#00FF88", marginTop: 4 }}>✓ Prestige {prestige + 1} badge earned</div>
                <div style={{ color: "#00FF88" }}>✓ All difficulties +{(prestige + 1) * 10}% harder (more glory)</div>
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 20 }}>Kill records & achievements are preserved forever.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setShowPrestigeConfirm(false)} style={{ ...BTN_S, padding: "10px 24px" }}>CANCEL</button>
                <button onClick={handlePrestige} style={{ ...BTN_P, padding: "10px 24px", background: "linear-gradient(180deg,#FF3333,#AA0000)", border: "1px solid rgba(255,50,50,0.6)" }}>CONFIRM PRESTIGE</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NEW FEATURES ─────────────────────────────────────────────────────────────
export function NewFeaturesPanel({ onClose }) {
  return (
    <>
      <style>{`.wnscroll::-webkit-scrollbar{width:5px}.wnscroll::-webkit-scrollbar-track{background:rgba(255,255,255,0.04);border-radius:3px}.wnscroll::-webkit-scrollbar-thumb{background:rgba(255,107,53,0.55);border-radius:3px}.wnscroll{scrollbar-width:thin;scrollbar-color:rgba(255,107,53,0.55) rgba(255,255,255,0.04)}`}</style>
      <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{ ...OVERLAY, padding: "12px 12px env(safe-area-inset-bottom,12px)" }}>
        <div style={{ ...CARD, maxWidth: 460, border: "1px solid rgba(255,107,53,0.4)", padding: 0, display: "flex", flexDirection: "column", maxHeight: "90dvh", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>
            <h3 style={{ color: "#FF6B35", margin: 0, fontSize: 17, letterSpacing: 2 }}>✦ WHAT'S NEW</h3>
            <button onClick={onClose} aria-label="Close"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#CCC", fontSize: 16, cursor: "pointer", fontFamily: "monospace", lineHeight: 1, borderRadius: 6, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
          </div>
          <div data-gamepad-scroll="" className="wnscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
              {NEW_FEATURES.map((f, i) => (
                <div key={i} style={{ fontSize: 13, color: "#EEE", padding: "9px 12px", borderRadius: 6, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.14)", lineHeight: 1.4 }}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
