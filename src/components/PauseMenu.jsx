import { useState, useRef, useEffect } from "react";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { WEAPONS, ENEMY_TYPES, ACHIEVEMENTS } from "../constants.js";
import { MUSIC_VIBES, soundUIOpen } from "../sounds.js";
import AchievementsPanel from "./AchievementsPanel.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import LeaderboardPanel from "./LeaderboardPanel.jsx";

export default function PauseMenu({ wave, timeSurvived, score, isMobile, achievementsUnlocked, fmtTime, onResume, onLeave, musicMuted, onToggleMute, musicVibe, onSetMusicVibe, colorblindMode, onToggleColorblind, gameSettings, onSaveSettings, gamepadConnected, controllerType, leaderboard, lbLoading, lbHasMore, onLoadMore, onRefreshLeaderboard, username, gsSnapshot }) {
  const [view, setView] = useState("main");
  const [showAch, setShowAch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLb, setShowLb] = useState(false);

  // ── Gamepad nav (main view only) ─────────────────────────────────────────
  const mainItems = [
    { key: "resume",      action: onResume },
    { key: "rules",       action: () => setView("rules") },
    { key: "controls",    action: () => setView("controls") },
    { key: "bestiary",    action: () => setView("bestiary") },
    { key: "achievements",action: () => setShowAch(true) },
    { key: "leaderboard", action: () => { onRefreshLeaderboard?.(); setShowLb(true); } },
    { key: "settings",    action: () => { soundUIOpen(); setShowSettings(true); } },
    { key: "music",       action: onToggleMute },
    ...(musicMuted ? [] : MUSIC_VIBES.map(v => ({ key: `vibe_${v.id}`, action: () => onSetMusicVibe(v.id) }))),
    { key: "colorblind",  action: onToggleColorblind },
    { key: "ragequit",    action: onLeave },
  ];
  const mainItemsRef = useRef(mainItems);
  mainItemsRef.current = mainItems;

  const isMainView = view === "main" && !showAch && !showSettings;
  const navFocusIdx = useGamepadNav({
    count: mainItems.length, cols: 1, enabled: isMainView,
    disableLR: false,
    onConfirm: (idx) => mainItemsRef.current[idx]?.action(),
    onBack: onResume,
  });
  const gfocus = (key) => {
    if (!isMainView) return false;
    const idx = mainItems.findIndex(i => i.key === key);
    return navFocusIdx === idx;
  };
  const focusRing = { outline: "2px solid #FF6B35", outlineOffset: 2, boxShadow: "0 0 12px rgba(255,107,53,0.45)" };

  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };
  const pBtn = { padding: "12px 24px", fontSize: 15, fontWeight: 900, fontFamily: "'Courier New',monospace", background: "rgba(255,255,255,0.08)", color: "#FFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer", width: "100%", maxWidth: 300 };
  const backBtn = { ...pBtn, marginTop: 16, background: "linear-gradient(180deg,#FF6B35,#CC4400)", border: "none" };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(6px)" };
  const panel = { ...card, maxWidth: 460, width: "100%", padding: "24px 20px", color: "#fff", border: "1px solid rgba(255,215,0,0.25)", maxHeight: "90vh", overflowY: "auto" };

  // ── Mini-map ref + effect — MUST be before any early returns (Rules of Hooks) ──
  const mapRef = useRef(null);
  useEffect(() => {
    const gs = gsSnapshot;
    const canvas = mapRef.current;
    if (!canvas || !gs) return;
    const ctx = canvas.getContext("2d");
    const MW = 200, MH = 150;
    canvas.width = MW; canvas.height = MH;
    const GW = gs.arenaW || 1200;
    const GH = gs.arenaH || 900;
    const sx = MW / GW, sy = MH / GH;
    ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, MW, MH);
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.strokeRect(0, 0, MW, MH);
    ctx.fillStyle = "#333";
    (gs.obstacles || []).forEach(ob => { ctx.fillRect(ob.x * sx, ob.y * sy, ob.w * sx, ob.h * sy); });
    (gs.enemies || []).forEach(en => {
      ctx.fillStyle = en.isBossEnemy ? "#FF4400" : en.elite ? "#FFD700" : en.color || "#FF8888";
      ctx.beginPath(); ctx.arc(en.x * sx, en.y * sy, Math.max(2, (en.size || 16) * sx * 0.5), 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#00FF88";
    (gs.pickups || []).forEach(pk => { ctx.fillRect(pk.x * sx - 2, pk.y * sy - 2, 4, 4); });
    const p = gs.player;
    if (p) {
      ctx.fillStyle = "#00FFFF"; ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#00FFFF"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(p.x * sx, p.y * sy);
      ctx.lineTo((p.x + Math.cos(p.angle) * 30) * sx, (p.y + Math.sin(p.angle) * 30) * sy);
      ctx.stroke();
    }
  }, [gsSnapshot]);

  if (showAch) return <AchievementsPanel achievementsUnlocked={achievementsUnlocked} onClose={() => setShowAch(false)} />;
  if (showSettings && gameSettings) return <SettingsPanel settings={gameSettings} onSave={s => onSaveSettings(s)} onClose={() => setShowSettings(false)} />;
  if (showLb) return <LeaderboardPanel leaderboard={leaderboard || []} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLb(false)} />;

  if (view === "rules") return (
    <div style={overlay}>
      <div style={panel}>
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
        </div>
        <button onClick={() => setView("main")} style={backBtn}>← BACK</button>
      </div>
    </div>
  );

  if (view === "controls") return (
    <div style={overlay}>
      <div style={panel}>
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
            <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Pause button</span> — This menu</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2.2 }}>
            <div>🏃 <span style={{ color: "#FF6B35", fontWeight: 800 }}>W/A/S/D</span> — Move</div>
            <div>🖱 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Mouse</span> — Aim</div>
            <div>🔫 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left Click</span> — Shoot</div>
            <div>🔄 <span style={{ color: "#FFD700", fontWeight: 800 }}>R</span> — Reload</div>
            <div>🔢 <span style={{ color: "#FFD700", fontWeight: 800 }}>1 / 2 / 3 / 4</span> — Switch weapons</div>
            <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>Q / G</span> — Throw grenade</div>
            <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>Space / Shift</span> — Dash</div>
            <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Escape</span> — Pause / Resume</div>
          </div>
        )}
        {/* Controller bindings */}
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
            <div>🔭 <span style={{ color: "#00E5FF", fontWeight: 800 }}>LT / L2</span> — ADS Zoom</div>
            <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>R3</span> — Dash</div>
            <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>LB / L1</span> — Grenade</div>
            <div>🔄 <span style={{ color: "#FFD700", fontWeight: 800 }}>X / ☐</span> — Reload</div>
            <div>💣 <span style={{ color: "#888", fontWeight: 800 }}>B / ○</span> — Grenade (alt)</div>
            <div>◀▶ <span style={{ color: "#FFD700", fontWeight: 800 }}>D-pad L/R</span> — Prev/Next weapon</div>
            <div>▶ <span style={{ color: "#FFD700", fontWeight: 800 }}>RB / R1</span> — Next weapon</div>
            <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Start / Options</span> — Pause</div>
            <div>⬆⬇ <span style={{ color: "#AAA", fontWeight: 800 }}>D-pad U/D</span> — Navigate menus</div>
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
        <button onClick={() => setView("main")} style={backBtn}>← BACK</button>
      </div>
    </div>
  );

  if (view === "bestiary") return (
    <div style={overlay}>
      <div style={panel}>
        <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>👾 MOST WANTED LIST</h3>
        {ENEMY_TYPES.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 6, marginBottom: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 24 }}>{e.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: e.color }}>{e.name}</div>
              <div style={{ fontSize: 10, color: "#CCC" }}>HP: {e.health} · Speed: {e.speed} · Points: {e.points}{e.ranged ? " · RANGED ⚡" : ""}</div>
              <div style={{ fontSize: 10, color: "#FF69B4", fontStyle: "italic" }}>"{e.deathQuote}"</div>
            </div>
          </div>
        ))}
        <button onClick={() => setView("main")} style={backBtn}>← BACK</button>
      </div>
    </div>
  );

  // Main pause view
  return (
    <div style={overlay}>
      <div style={{ textAlign: "center", maxWidth: 320, width: "100%" }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>⏸</div>
        <h2 style={{ color: "#FFD700", fontSize: 28, margin: "0 0 4px", letterSpacing: 3, fontFamily: "'Courier New',monospace" }}>PAUSED</h2>
        <p style={{ color: "#CCC", fontSize: 12, margin: "0 0 20px", fontFamily: "'Courier New',monospace" }}>
          Wave {wave} · {fmtTime(timeSurvived)} · Score: {score.toLocaleString()}
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <button onClick={onResume} style={{ ...pBtn, background: "linear-gradient(180deg,#FF6B35,#CC4400)", border: "none", fontSize: 18, ...(gfocus("resume") ? focusRing : {}) }}>▶ RESUME</button>
          <button onClick={() => setView("rules")} style={{ ...pBtn, ...(gfocus("rules") ? focusRing : {}) }}>📜 RULES</button>
          <button onClick={() => setView("controls")} style={{ ...pBtn, ...(gfocus("controls") ? focusRing : {}) }}>⌨ CONTROLS</button>
          <button onClick={() => setView("bestiary")} style={{ ...pBtn, ...(gfocus("bestiary") ? focusRing : {}) }}>👾 MOST WANTED LIST</button>
          <button onClick={() => setShowAch(true)} style={{ ...pBtn, ...(gfocus("achievements") ? focusRing : {}) }}>🏅 ACHIEVEMENTS ({achievementsUnlocked.length}/{ACHIEVEMENTS.length})</button>
          <button onClick={() => { onRefreshLeaderboard?.(); setShowLb(true); }} style={{ ...pBtn, color: "#00E5FF", borderColor: "rgba(0,229,255,0.25)", ...(gfocus("leaderboard") ? focusRing : {}) }}>⚔️ LEADERBOARD</button>
          <button onClick={() => { soundUIOpen(); setShowSettings(true); }} style={{ ...pBtn, ...(gfocus("settings") ? focusRing : {}) }}>⚙ SETTINGS</button>
          <button onClick={onToggleMute} style={{ ...pBtn, color: musicMuted ? "#888" : "#0EF", ...(gfocus("music") ? focusRing : {}) }}>
            {musicMuted ? "🔇 MUSIC: OFF" : "🔊 MUSIC: ON"}
          </button>
          {!musicMuted && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", maxWidth: 320 }}>
                {MUSIC_VIBES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => onSetMusicVibe(v.id)}
                    style={{ padding: "6px 11px", borderRadius: 6, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", background: musicVibe === v.id ? "rgba(0,229,255,0.18)" : "rgba(255,255,255,0.05)", border: musicVibe === v.id ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(255,255,255,0.12)", color: musicVibe === v.id ? "#0EF" : "#888", fontWeight: musicVibe === v.id ? 900 : 400, ...(gfocus(`vibe_${v.id}`) ? focusRing : {}) }}
                  >
                    {v.emoji} {v.name}
                  </button>
                ))}
              </div>
              {gamepadConnected && !musicMuted && (
                <div style={{ fontSize: 9, color: "#555", fontFamily: "'Courier New',monospace" }}>
                  ◀ D-pad · A to select ▶
                </div>
              )}
            </div>
          )}
          <button onClick={onToggleColorblind} style={{ ...pBtn, color: colorblindMode ? "#FFD700" : "#AAA", ...(gfocus("colorblind") ? focusRing : {}) }}>
            {colorblindMode ? "🎨 COLORBLIND: ON" : "🎨 COLORBLIND: OFF"}
          </button>
          <button onClick={onLeave} style={{ ...pBtn, color: "#F66", borderColor: "rgba(255,100,100,0.3)", marginTop: 4, ...(gfocus("ragequit") ? focusRing : {}) }}>🚪 RAGE QUIT</button>
        </div>
        {/* Mini-map */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 6, fontFamily: "'Courier New',monospace" }}>── ARENA MAP ──</div>
          <canvas ref={mapRef} style={{ border: "1px solid #222", borderRadius: 4, display: "block", maxWidth: "100%" }} />
          <div style={{ fontSize: 8, color: "#444", marginTop: 4 }}>🔵 YOU  🔴 BOSS  🟡 ELITE</div>
        </div>
      </div>
    </div>
  );
}
