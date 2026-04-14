import { useState, useEffect, useRef, useCallback } from "react";
import { SETTINGS_DEFAULTS, saveSettings, loadPresets, savePresets } from "../settings.js";
import { soundUIClose } from "../sounds.js";

const TABS = ["Gameplay", "Visual", "Controls"];

const META = {
  enemySpawnMult:      { label: "Enemy Spawn Rate",       desc: "How frequently enemies appear each wave",                   tab: "Gameplay", type: "slider",  min: 0.5,  max: 2.0,  step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  enemyHealthMult:     { label: "Enemy Health",            desc: "Scales all enemy HP — lower = faster kills",               tab: "Gameplay", type: "slider",  min: 0.5,  max: 2.0,  step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  enemySpeedMult:      { label: "Enemy Speed",             desc: "How fast enemies move toward you",                         tab: "Gameplay", type: "slider",  min: 0.5,  max: 1.5,  step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  playerSpeedMult:     { label: "Player Speed",            desc: "Your soldier's movement speed",                            tab: "Gameplay", type: "slider",  min: 0.75, max: 1.5,  step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  xpGainMult:          { label: "XP Gain Rate",            desc: "XP from kills — levels up faster at higher values",        tab: "Gameplay", type: "slider",  min: 0.5,  max: 2.0,  step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  pickupMagnet:        { label: "Pickup Magnet Range",     desc: "Auto-collect radius for health, ammo & upgrades",          tab: "Gameplay", type: "slider",  min: 1.0,  max: 4.0,  step: 0.5,  fmt: v => v === 1 ? "Normal" : `${v.toFixed(1)}×` },
  screenShakeMult:     { label: "Screen Shake",            desc: "Camera shake intensity on hits & explosions",              tab: "Visual",   type: "slider",  min: 0.0,  max: 2.0,  step: 0.25, fmt: v => v === 0 ? "Off" : v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  particlesMult:       { label: "Particles",               desc: "Explosion & death particle density — affects performance", tab: "Visual",   type: "options", options: [{v:0.25,l:"Low"},{v:0.5,l:"Med"},{v:1,l:"High"},{v:2,l:"Ultra"}] },
  crosshair:           { label: "Crosshair Style",         desc: "Visual style of your aiming cursor",                       tab: "Visual",   type: "options", options: [{v:"cross",l:"✛ Cross"},{v:"dot",l:"• Dot"},{v:"circle",l:"○ Circle"},{v:"none",l:"✕ None"}] },
  showDPS:             { label: "Show DPS Counter",        desc: "Display live damage-per-second on the canvas",             tab: "Visual",   type: "toggle" },
  showEnemyHealthBars: { label: "Enemy HP Bars",           desc: "Show health bars above all enemies at all times",           tab: "Visual",   type: "toggle" },
  reducedMotion:       { label: "Reduced Motion",           desc: "Disables screen shake, flashes & other intense effects",    tab: "Visual",   type: "toggle" },
  grenadeRadiusMult:   { label: "Grenade Blast Radius",    desc: "Explosion size — bigger = more enemies hit",               tab: "Controls", type: "slider",  min: 0.5,  max: 2.0,  step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  autoReload:          { label: "Auto Reload on Empty",    desc: "Automatically reload when magazine hits zero",             tab: "Controls", type: "toggle" },
  rumble:              { label: "Controller Rumble",       desc: "Haptic vibration feedback when using a gamepad",           tab: "Controls", type: "toggle" },
  controllerDeadZone:  { label: "Controller Dead Zone",   desc: "Analog stick dead zone — increase if your stick drifts",   tab: "Controls", type: "slider",  min: 0.05, max: 0.40, step: 0.05, fmt: v => v.toFixed(2) },
  aimAssist:           { label: "Aim Assist (Controller)", desc: "Gently snaps aim toward the nearest enemy when using RT to shoot", tab: "Controls", type: "toggle" },
};

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [w, setW]         = useState({ ...settings });
  const [tab, setTab]     = useState("Gameplay");
  const [presets, setPresets] = useState(() => loadPresets());
  const [nameInput, setNameInput] = useState("");
  const [showSave, setShowSave]   = useState(false);

  const set = (k, v) => setW(prev => ({ ...prev, [k]: v }));
  const val = k => w[k] ?? SETTINGS_DEFAULTS[k];

  const apply = useCallback(() => {
    saveSettings(w);
    onSave(w);
    soundUIClose();
    onClose();
  }, [onClose, onSave, w]);

  const doSavePreset = () => {
    const name = nameInput.trim(); if (!name) return;
    const updated = [...presets.filter(p => p.name !== name).slice(0, 2), { name, settings: { ...w } }];
    setPresets(updated); savePresets(updated); setShowSave(false); setNameInput("");
  };

  const tabEntries = Object.entries(META).filter(([, m]) => m.tab === tab);

  // ── Gamepad navigation ──────────────────────────────────────────────────
  // Items: [0..tabEntries.length-1] = settings rows, then Apply button
  const focusIdxRef  = useRef(0);
  const [focusIdx, setFocusIdxState] = useState(0);
  const setFocusIdx = (v) => { focusIdxRef.current = v; setFocusIdxState(v); };

  // Re-clamp when tab changes
  useEffect(() => { setFocusIdx(0); }, [tab]);

  const wRef = useRef(w);
  useEffect(() => { wRef.current = w; }, [w]);

  useEffect(() => {
    const DEAD          = 0.5;
    const INITIAL_DELAY = 350;
    const REPEAT_RATE   = 130;
    let activeDir = null;
    let repeatTimeout = null;
    let lastA = false, lastB = false, lastLB = false, lastRB = false;

    // Total items = tabEntries.length + 1 (Apply)
    const itemCount = () => Object.entries(META).filter(([, m]) => m.tab === tab).length + 1;

    const doMoveUD = (dir) => {
      const n = itemCount();
      const fi = focusIdxRef.current;
      const next = dir === "up" ? Math.max(0, fi - 1) : Math.min(n - 1, fi + 1);
      if (next !== fi) setFocusIdx(next);
    };

    const adjustLR = (dir) => {
      const entries = Object.entries(META).filter(([, m]) => m.tab === tab);
      const fi = focusIdxRef.current;
      if (fi >= entries.length) return; // Apply button
      const [key, meta] = entries[fi];
      const cur = wRef.current[key] ?? SETTINGS_DEFAULTS[key];
      if (meta.type === "slider") {
        const step = dir === "right" ? meta.step : -meta.step;
        const next = Math.round((cur + step) / meta.step) * meta.step;
        set(key, Math.max(meta.min, Math.min(meta.max, next)));
      } else if (meta.type === "options") {
        const opts = meta.options;
        const idx = opts.findIndex(o => o.v === cur);
        const nextIdx = (idx + (dir === "right" ? 1 : -1) + opts.length) % opts.length;
        set(key, opts[nextIdx].v);
      } else if (meta.type === "toggle") {
        set(key, !cur);
      }
    };

    const startDir = (dir) => {
      if (activeDir === dir) return;
      clearTimeout(repeatTimeout);
      activeDir = dir;
      if (dir === "up" || dir === "down") doMoveUD(dir);
      else adjustLR(dir);
      const tick = () => {
        if (activeDir !== dir) return;
        if (dir === "up" || dir === "down") doMoveUD(dir);
        else adjustLR(dir);
        repeatTimeout = setTimeout(tick, REPEAT_RATE);
      };
      repeatTimeout = setTimeout(tick, INITIAL_DELAY);
    };
    const stopDir = () => { clearTimeout(repeatTimeout); activeDir = null; };

    const id = setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      if (!gp) return;

      const dUp    = gp.buttons[12]?.pressed;
      const dDown  = gp.buttons[13]?.pressed;
      const dLeft  = gp.buttons[14]?.pressed;
      const dRight = gp.buttons[15]?.pressed;
      const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;

      const up    = dUp    || ly < -DEAD;
      const down  = dDown  || ly >  DEAD;
      const left  = dLeft  || lx < -DEAD;
      const right = dRight || lx >  DEAD;

      if      (up)    startDir("up");
      else if (down)  startDir("down");
      else if (left)  startDir("left");
      else if (right) startDir("right");
      else            stopDir();

      const aNow  = gp.buttons[0]?.pressed;
      const bNow  = gp.buttons[1]?.pressed;
      const lbNow = gp.buttons[4]?.pressed;
      const rbNow = gp.buttons[5]?.pressed;

      if (aNow && !lastA) {
        const entries = Object.entries(META).filter(([, m]) => m.tab === tab);
        const fi = focusIdxRef.current;
        if (fi >= entries.length) { apply(); } // Apply button
        else {
          const [key, meta] = entries[fi];
          if (meta.type === "toggle") set(key, !(wRef.current[key] ?? SETTINGS_DEFAULTS[key]));
          else if (meta.type === "options") adjustLR("right"); // cycle options with A
        }
      }
      if (bNow && !lastB) apply();
      if (lbNow && !lastLB) {
        const i = TABS.indexOf(tab);
        setTab(TABS[(i - 1 + TABS.length) % TABS.length]);
      }
      if (rbNow && !lastRB) {
        const i = TABS.indexOf(tab);
        setTab(TABS[(i + 1) % TABS.length]);
      }

      lastA = !!aNow; lastB = !!bNow; lastLB = !!lbNow; lastRB = !!rbNow;
    }, 50);

    return () => { clearInterval(id); clearTimeout(repeatTimeout); };
  }, [apply, tab]); // re-run when tab changes so doMoveUD has correct itemCount

  const base = { fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6, fontWeight: 700 };

  const focusStyle = { outline: "2px solid #FF6B35", outlineOffset: 2, boxShadow: "0 0 10px rgba(255,107,53,0.35)" };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) apply(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}
    >
      <div style={{ maxWidth: 480, width: "100%", background: "rgba(12,12,18,0.98)", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 12, color: "#fff", display: "flex", flexDirection: "column", maxHeight: "92dvh", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>
          <h3 style={{ color: "#FF6B35", margin: 0, fontSize: 16, letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>⚙ SETTINGS</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>🎮 LB/RB = tabs · D-pad navigates</span>
            <button onClick={apply} style={{ ...base, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#AAA", fontSize: 15, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...base, fontSize: 11, padding: "7px 14px", background: tab === t ? "rgba(255,107,53,0.18)" : "rgba(255,255,255,0.04)", border: tab === t ? "1px solid rgba(255,107,53,0.5)" : "1px solid rgba(255,255,255,0.1)", color: tab === t ? "#FF6B35" : "#777" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Settings list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tabEntries.map(([key, meta], i) => {
              const isFocused = focusIdx === i;
              return (
                <div key={key} style={{ ...(isFocused ? { borderRadius: 6, background: "rgba(255,107,53,0.06)", padding: "6px 8px", margin: "-6px -8px" } : {}) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: isFocused ? "#FF6B35" : "#CCC" }}>
                    <span>{meta.label}</span>
                    {meta.type === "slider" && <span style={{ color: "#FF6B35", fontWeight: 700, minWidth: 60, textAlign: "right", fontFamily: "monospace", fontSize: 11 }}>{meta.fmt(val(key))}</span>}
                  </div>
                  {meta.desc && <div style={{ fontSize: 10, color: "#aaa", marginBottom: 7, lineHeight: 1.3 }}>{meta.desc}</div>}
                  {meta.type === "slider" && (
                    <input type="range" min={meta.min} max={meta.max} step={meta.step} value={val(key)}
                      onChange={e => set(key, parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#FF6B35", cursor: "pointer", height: 4 }} />
                  )}
                  {meta.type === "options" && (
                    <div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {meta.options.map(opt => (
                          <button key={opt.v} onClick={() => set(key, opt.v)}
                            style={{ ...base, fontSize: 11, padding: "6px 12px", background: val(key) === opt.v ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.04)", border: val(key) === opt.v ? "1px solid rgba(255,107,53,0.55)" : "1px solid rgba(255,255,255,0.1)", color: val(key) === opt.v ? "#FF6B35" : "#bbb" }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                      {key === "crosshair" && (() => {
                        const cv = val("crosshair");
                        return (
                          <div style={{ marginTop: 8, width: 32, height: 32, background: "#111", borderRadius: 4, border: "1px solid rgba(255,255,255,0.12)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {cv === "cross" && (
                              <>
                                <div style={{ position: "absolute", width: 18, height: 2, background: "#FFF", borderRadius: 1 }} />
                                <div style={{ position: "absolute", width: 2, height: 18, background: "#FFF", borderRadius: 1 }} />
                              </>
                            )}
                            {cv === "dot" && (
                              <div style={{ width: 5, height: 5, background: "#FFF", borderRadius: "50%" }} />
                            )}
                            {cv === "circle" && (
                              <div style={{ width: 14, height: 14, border: "2px solid #FFF", borderRadius: "50%", background: "transparent" }} />
                            )}
                            {cv === "none" && (
                              <>
                                <div style={{ position: "absolute", width: 16, height: 2, background: "#888", borderRadius: 1, transform: "rotate(45deg)" }} />
                                <div style={{ position: "absolute", width: 16, height: 2, background: "#888", borderRadius: 1, transform: "rotate(-45deg)" }} />
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {meta.type === "toggle" && (
                    <button onClick={() => set(key, !val(key))}
                      style={{ ...base, fontSize: 11, padding: "8px 18px", background: val(key) ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.04)", border: val(key) ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,255,255,0.1)", color: val(key) ? "#00FF88" : "#aaa" }}>
                      {val(key) ? "✓ ON" : "OFF"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Presets */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "10px 16px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 1, marginBottom: 7 }}>PRESETS</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => setW({ ...SETTINGS_DEFAULTS })} style={{ ...base, fontSize: 11, padding: "5px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}>↩ Default</button>
            {presets.map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button onClick={() => setW({ ...SETTINGS_DEFAULTS, ...p.settings })} style={{ ...base, fontSize: 11, padding: "5px 10px", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700" }}>{p.name}</button>
                <button onClick={() => { const u = presets.filter(x => x.name !== p.name); setPresets(u); savePresets(u); }} style={{ padding: "3px 5px", cursor: "pointer", background: "transparent", border: "none", color: "#aaa", fontSize: 11 }}>✕</button>
              </div>
            ))}
            {presets.length < 3 && (
              showSave
                ? <div style={{ display: "flex", gap: 4 }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") doSavePreset(); if (e.key === "Escape") setShowSave(false); }}
                      placeholder="Name…" autoFocus
                      style={{ padding: "4px 8px", fontSize: 11, fontFamily: "monospace", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 5, color: "#EEE", outline: "none", width: 90 }} />
                    <button onClick={doSavePreset} style={{ ...base, fontSize: 11, padding: "4px 9px", background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.35)", color: "#00FF88" }}>✓</button>
                  </div>
                : <button onClick={() => setShowSave(true)} style={{ ...base, fontSize: 11, padding: "5px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#aaa" }}>+ Save</button>
            )}
          </div>
        </div>

        {/* Footer — Apply (gamepad-focusable) */}
        <div style={{ borderTop: "1px solid rgba(255,107,53,0.2)", padding: "10px 16px", flexShrink: 0 }}>
          <button
            onClick={apply}
            style={{
              width: "100%", padding: 11, background: "linear-gradient(180deg,#FF6B35,#CC4400)",
              border: "none", borderRadius: 7, color: "#FFF", fontSize: 14,
              fontWeight: 900, fontFamily: "'Courier New',monospace", cursor: "pointer", letterSpacing: 1,
              ...(focusIdx === tabEntries.length ? focusStyle : {}),
            }}
          >
            ✓ APPLY SETTINGS
          </button>
          <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 6 }}>Settings apply from the next game started · current run unaffected</div>
        </div>
      </div>
    </div>
  );
}
