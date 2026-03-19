import { useState } from "react";
import { SETTINGS_DEFAULTS, saveSettings, loadPresets, savePresets } from "../settings.js";
import { soundUIClose } from "../sounds.js";

const TABS = ["Gameplay", "Visual", "Controls"];

const META = {
  enemySpawnMult:    { label: "Enemy Spawn Rate",     desc: "How frequently enemies appear each wave",          tab: "Gameplay", type: "slider", min: 0.5,  max: 2.0, step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  enemyHealthMult:   { label: "Enemy Health",          desc: "Scales all enemy HP — lower = faster kills",      tab: "Gameplay", type: "slider", min: 0.5,  max: 2.0, step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  enemySpeedMult:    { label: "Enemy Speed",           desc: "How fast enemies move toward you",                tab: "Gameplay", type: "slider", min: 0.5,  max: 1.5, step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  playerSpeedMult:   { label: "Player Speed",          desc: "Your soldier's movement speed",                   tab: "Gameplay", type: "slider", min: 0.75, max: 1.5, step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  xpGainMult:        { label: "XP Gain Rate",          desc: "XP from kills — levels up faster at higher values",tab: "Gameplay", type: "slider", min: 0.5,  max: 2.0, step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  pickupMagnet:      { label: "Pickup Magnet Range",   desc: "Auto-collect radius for health, ammo & upgrades", tab: "Gameplay", type: "slider", min: 1.0,  max: 4.0, step: 0.5,  fmt: v => v === 1 ? "Normal" : `${v.toFixed(1)}×` },
  screenShakeMult:   { label: "Screen Shake",          desc: "Camera shake intensity on hits & explosions",     tab: "Visual",   type: "slider", min: 0.0,  max: 2.0, step: 0.25, fmt: v => v === 0 ? "Off" : v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  particlesMult:     { label: "Particles",             desc: "Explosion & death particle density — affects performance", tab: "Visual", type: "options", options: [{v:0.25,l:"Low"},{v:0.5,l:"Med"},{v:1,l:"High"},{v:2,l:"Ultra"}] },
  crosshair:         { label: "Crosshair Style",       desc: "Visual style of your aiming cursor",              tab: "Visual",   type: "options", options: [{v:"cross",l:"✛ Cross"},{v:"dot",l:"• Dot"},{v:"circle",l:"○ Circle"},{v:"none",l:"✕ None"}] },
  showDPS:           { label: "Show DPS Counter",      desc: "Display live damage-per-second on the canvas",    tab: "Visual",   type: "toggle" },
  grenadeRadiusMult: { label: "Grenade Blast Radius",  desc: "Explosion size — bigger = more enemies hit",      tab: "Controls", type: "slider", min: 0.5,  max: 2.0, step: 0.25, fmt: v => v === 1 ? "Normal" : `${Math.round(v*100)}%` },
  autoReload:        { label: "Auto Reload on Empty",  desc: "Automatically reload when magazine hits zero",    tab: "Controls", type: "toggle" },
};

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [w, setW] = useState({ ...settings });
  const [tab, setTab] = useState("Gameplay");
  const [presets, setPresets] = useState(() => loadPresets());
  const [nameInput, setNameInput] = useState("");
  const [showSave, setShowSave] = useState(false);

  const set = (k, v) => setW(prev => ({ ...prev, [k]: v }));
  const val = k => w[k] ?? SETTINGS_DEFAULTS[k];

  const apply = () => { saveSettings(w); onSave(w); soundUIClose(); onClose(); };

  const doSavePreset = () => {
    const name = nameInput.trim(); if (!name) return;
    const updated = [...presets.filter(p => p.name !== name).slice(0, 2), { name, settings: { ...w } }];
    setPresets(updated); savePresets(updated); setShowSave(false); setNameInput("");
  };

  const base = { fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6, fontWeight: 700 };
  const tabEntries = Object.entries(META).filter(([, m]) => m.tab === tab);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) apply(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}
    >
      <div style={{ maxWidth: 480, width: "100%", background: "rgba(12,12,18,0.98)", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 12, color: "#fff", display: "flex", flexDirection: "column", maxHeight: "92dvh", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>
          <h3 style={{ color: "#FF6B35", margin: 0, fontSize: 16, letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>⚙ SETTINGS</h3>
          <button onClick={apply} style={{ ...base, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#AAA", fontSize: 15, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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
            {tabEntries.map(([key, meta]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: "#CCC" }}>
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
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {meta.options.map(opt => (
                      <button key={opt.v} onClick={() => set(key, opt.v)}
                        style={{ ...base, fontSize: 11, padding: "6px 12px", background: val(key) === opt.v ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.04)", border: val(key) === opt.v ? "1px solid rgba(255,107,53,0.55)" : "1px solid rgba(255,255,255,0.1)", color: val(key) === opt.v ? "#FF6B35" : "#bbb" }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                )}
                {meta.type === "toggle" && (
                  <button onClick={() => set(key, !val(key))}
                    style={{ ...base, fontSize: 11, padding: "8px 18px", background: val(key) ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.04)", border: val(key) ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,255,255,0.1)", color: val(key) ? "#00FF88" : "#aaa" }}>
                    {val(key) ? "✓ ON" : "OFF"}
                  </button>
                )}
              </div>
            ))}
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

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,107,53,0.2)", padding: "10px 16px", flexShrink: 0 }}>
          <button onClick={apply} style={{ width: "100%", padding: 11, background: "linear-gradient(180deg,#FF6B35,#CC4400)", border: "none", borderRadius: 7, color: "#FFF", fontSize: 14, fontWeight: 900, fontFamily: "'Courier New',monospace", cursor: "pointer", letterSpacing: 1 }}>
            ✓ APPLY SETTINGS
          </button>
          <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 6 }}>Settings apply from the next game started · current run unaffected</div>
        </div>
      </div>
    </div>
  );
}
