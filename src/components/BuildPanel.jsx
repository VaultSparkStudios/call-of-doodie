import { useState } from "react";
import { STARTER_LOADOUTS, WEAPONS } from "../constants.js";
import DialogShell from "./DialogShell.jsx";

const card = { padding: 14, border: "1px solid var(--cod-line)", borderRadius: 10, background: "var(--cod-panel)", marginBottom: 10 };
const button = { minHeight: 44, padding: "9px 14px", border: "1px solid var(--cod-line-warm)", borderRadius: 8, background: "var(--cod-panel-strong)", color: "var(--cod-ink)", font: "inherit", fontWeight: 800, cursor: "pointer" };

export default function BuildPanel({ onClose, activeTab, onTabChange, meta, accountLevel, starterLoadout, primaryWeaponIndex, onOpenUpgrades, onOpenMetaTree, onOpenLoadouts }) {
  const [localTab, setLocalTab] = useState("earned");
  const tab = ["earned", "setup"].includes(activeTab) ? activeTab : localTab;
  const selectTab = (id) => { setLocalTab(id); onTabChange?.(id); };
  const loadout = STARTER_LOADOUTS.find((entry) => entry.id === starterLoadout) || STARTER_LOADOUTS[0];
  const weapon = WEAPONS[primaryWeaponIndex] || WEAPONS[0];
  return <DialogShell title="Build" onClose={onClose} surface="site" fullScreen zIndex={130} style={{ color: "var(--cod-ink)", padding: "max(16px, env(safe-area-inset-top)) 12px max(24px, env(safe-area-inset-bottom))" }}>
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: "var(--font-mono)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ color: "var(--cod-orange)", fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>PREPARE YOUR NEXT RUN</div><h2 style={{ margin: "4px 0 14px", fontFamily: "var(--font-display)" }}>Your Build</h2></div><button type="button" onClick={onClose} aria-label="Close Build" style={button}>✕</button></div>
      <nav aria-label="Build sections" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[["earned", "Earned upgrades"], ["setup", "Run setup"]].map(([id, label]) => <button key={id} type="button" onClick={() => selectTab(id)} aria-current={tab === id ? "page" : undefined} style={{ ...button, borderColor: tab === id ? "var(--cod-orange)" : "var(--cod-line)", color: tab === id ? "var(--cod-orange)" : "var(--cod-ink)", boxShadow: tab === id ? "inset 0 -3px var(--cod-orange)" : "none" }}>{label}</button>)}
      </nav>
      {tab === "earned" && <>
        <section style={card}><h3 style={{ margin: "0 0 8px" }}>Career upgrades</h3><p>{Number(meta?.careerPoints || 0).toLocaleString()} career points · prestige {Number(meta?.prestige || 0)} · account level {accountLevel}</p><p>Spend earned points on persistent upgrades. Your saved progression stays on this device unless you export it.</p><button type="button" style={button} onClick={onOpenUpgrades}>Manage upgrades</button></section>
        <section style={card}><h3 style={{ margin: "0 0 8px" }}>Progression tree</h3><p>See branches and requirements before investing in a direction.</p><button type="button" style={button} onClick={onOpenMetaTree}>Explore tree</button></section>
      </>}
      {tab === "setup" && <>
        <section style={card}><h3 style={{ margin: "0 0 8px" }}>Starting kit</h3><p>{loadout.emoji} {loadout.name} · current loadout for the next run</p><button type="button" style={button} onClick={onOpenLoadouts}>Configure loadout</button></section>
        <section style={card}><h3 style={{ margin: "0 0 8px" }}>Primary weapon</h3><p>{weapon.emoji} {weapon.name} · choose from the weapon selector below the play console.</p><button type="button" style={button} onClick={onClose}>Return to play console</button></section>
      </>}
    </div>
  </DialogShell>;
}
