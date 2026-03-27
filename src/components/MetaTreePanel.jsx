import { useState } from "react";
import { META_TREE } from "../constants.js";
import { loadMetaTree, loadMetaProgress, unlockMetaNode } from "../storage.js";

export default function MetaTreePanel({ onClose }) {
  const [unlocked, setUnlocked] = useState(() => loadMetaTree());
  const [meta, setMeta] = useState(() => loadMetaProgress());
  const [toast, setToast] = useState(null);

  const points = meta.careerPoints || 0;

  function tryUnlock(node) {
    if (unlocked.has(node.id)) return;
    if (node.requires && !unlocked.has(node.requires)) return;
    const result = unlockMetaNode(node.id, node.cost);
    if (result.success) {
      setUnlocked(loadMetaTree());
      setMeta(loadMetaProgress());
      setToast(`✅ ${node.name} unlocked!`);
      setTimeout(() => setToast(null), 2000);
    } else if (result.reason === "insufficient_points") {
      setToast(`❌ Need ${node.cost} pts (you have ${points})`);
      setTimeout(() => setToast(null), 2000);
    }
  }

  const overlay = {
    position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.92)",
    display: "flex", flexDirection: "column", alignItems: "center",
    fontFamily: "'Courier New', monospace", overflowY: "auto",
  };
  const panel = {
    width: "100%", maxWidth: 780, padding: "24px 16px 40px",
    display: "flex", flexDirection: "column", gap: 24,
  };
  const header = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderBottom: "1px solid #333", paddingBottom: 12,
  };

  return (
    <div style={overlay} data-gamepad-scroll>
      <div style={panel}>
        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", letterSpacing: 2 }}>🌳 META PROGRESSION TREE</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>Spend career points to permanently upgrade your runs</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#FFD700", fontWeight: 700 }}>⭐ {points.toLocaleString()} pts</div>
            <button onClick={onClose} style={{ marginTop: 6, background: "transparent", border: "1px solid #444", color: "#888", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>✕ CLOSE</button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ textAlign: "center", fontSize: 12, color: "#FFD700", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 6, padding: "8px 16px" }}>
            {toast}
          </div>
        )}

        {/* Branches */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
          {Object.values(META_TREE).map(branch => (
            <div key={branch.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Branch header */}
              <div style={{ fontSize: 13, fontWeight: 700, color: branch.color, letterSpacing: 1, textAlign: "center", paddingBottom: 6, borderBottom: `1px solid ${branch.color}44` }}>
                {branch.emoji} {branch.label}
              </div>
              {/* Nodes */}
              {branch.nodes.map((node, i) => {
                const isUnlocked  = unlocked.has(node.id);
                const prereqMet   = !node.requires || unlocked.has(node.requires);
                const canAfford   = points >= node.cost;
                const clickable   = !isUnlocked && prereqMet;

                let bg = "rgba(255,255,255,0.03)";
                let border = "#333";
                let opacity = 1;
                if (isUnlocked) { bg = `${branch.color}22`; border = branch.color; }
                else if (!prereqMet) { opacity = 0.4; }
                else if (!canAfford) { border = "#555"; }

                return (
                  <button
                    key={node.id}
                    onClick={() => clickable && tryUnlock(node)}
                    disabled={!clickable}
                    style={{
                      background: bg, border: `1px solid ${border}`, borderRadius: 8,
                      padding: "10px 10px", textAlign: "left", cursor: clickable ? "pointer" : "default",
                      opacity, transition: "opacity 0.15s, border-color 0.15s",
                      position: "relative",
                    }}
                  >
                    {/* Connector line between nodes */}
                    {i > 0 && (
                      <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", width: 1, height: 9, background: prereqMet ? branch.color : "#444" }} />
                    )}
                    <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <span style={{ color: isUnlocked ? branch.color : "#ddd", fontWeight: 700, lineHeight: 1.3 }}>
                        {node.emoji} {node.name}
                      </span>
                      {isUnlocked
                        ? <span style={{ color: branch.color, fontSize: 11, flexShrink: 0 }}>✓</span>
                        : <span style={{ color: canAfford && prereqMet ? "#FFD700" : "#666", fontSize: 10, flexShrink: 0, fontWeight: 700 }}>⭐{node.cost}</span>
                      }
                    </div>
                    <div style={{ fontSize: 10, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{node.desc}</div>
                    {!isUnlocked && !prereqMet && (
                      <div style={{ fontSize: 9, color: "#FF6666", marginTop: 4 }}>🔒 Unlock previous tier first</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ textAlign: "center", fontSize: 10, color: "#555", letterSpacing: 1 }}>
          Career points earned: 1 pt per kill · Unlocks persist across all runs and prestige resets
        </div>
      </div>
    </div>
  );
}
