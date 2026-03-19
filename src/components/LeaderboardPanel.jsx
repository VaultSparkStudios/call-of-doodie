import { useState } from "react";

// ── Input device badge ────────────────────────────────────────────────────────
function InputDeviceBadge({ device }) {
  if (!device) return null;
  if (device === "xbox") return (
    <span title="Xbox Controller" style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "rgba(16,124,16,0.18)", border: "1px solid #107C10", color: "#4DBD61", fontWeight: 900, letterSpacing: 0.5, flexShrink: 0 }}>Xbox</span>
  );
  if (device === "ps") return (
    <span title="PlayStation Controller" style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "rgba(0,55,145,0.22)", border: "1px solid #2255BB", color: "#6699FF", fontWeight: 900, letterSpacing: 0.5, flexShrink: 0 }}>PS</span>
  );
  if (device === "controller" || device === "generic") return (
    <span title="Controller" style={{ fontSize: 10, flexShrink: 0 }}>🎮</span>
  );
  if (device === "mobile") return (
    <span title="Mobile / Touch" style={{ fontSize: 10, flexShrink: 0 }}>📱</span>
  );
  // "mouse" or anything else
  return (
    <span title="Mouse & Keyboard" style={{ fontSize: 10, flexShrink: 0 }}>🖱️</span>
  );
}

// ── Account level badge ───────────────────────────────────────────────────────
const LEVEL_TIERS = [
  { min: 100, color: "#CC44FF", bg: "rgba(160,0,255,0.18)", border: "#AA22FF", label: "👑" },
  { min: 50,  color: "#FFD700", bg: "rgba(255,215,0,0.18)",  border: "#CC9900", label: "★" },
  { min: 25,  color: "#C0C0C0", bg: "rgba(200,200,200,0.15)", border: "#A0A0A0", label: "◈" },
  { min: 10,  color: "#CD7F32", bg: "rgba(160,90,40,0.2)",   border: "#A05820", label: "◆" },
  { min: 1,   color: "#888888", bg: "rgba(120,120,120,0.12)", border: "#555",   label: "·" },
];

function AccountLevelBadge({ level }) {
  if (!level || level < 1) return null;
  const tier = LEVEL_TIERS.find(t => level >= t.min) || LEVEL_TIERS[LEVEL_TIERS.length - 1];
  return (
    <span
      title={`Account Level ${level}`}
      style={{
        fontSize: 8, padding: "1px 4px", borderRadius: 3,
        background: tier.bg, border: `1px solid ${tier.border}`,
        color: tier.color, fontWeight: 900, letterSpacing: 0.5, flexShrink: 0,
        fontFamily: "'Courier New', monospace",
      }}
    >
      {tier.label}{level}
    </span>
  );
}

const DIFF_TABS = [
  { key: null,     label: "ALL",    emoji: "🌐", color: "#AAA" },
  { key: "easy",   label: "EASY",   emoji: "🟢", color: "#44CC44" },
  { key: "normal", label: "NORMAL", emoji: "🟡", color: "#FFD700" },
  { key: "hard",   label: "HARD",   emoji: "🔴", color: "#FF4444" },
  { key: "insane", label: "INSANE", emoji: "💀", color: "#FF00FF" },
];

const LOADOUT_EMOJI = { standard: "⚖️", cannon: "💀", tank: "🛡️", speedster: "⚡" };

export default function LeaderboardPanel({ leaderboard, lbLoading, lbHasMore, onLoadMore, username, onClose }) {
  const [activeDiff, setActiveDiff] = useState(null);

  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };

  const filtered = activeDiff
    ? leaderboard.filter(e => e.difficulty === activeDiff)
    : leaderboard;

  const activeTab = DIFF_TABS.find(t => t.key === activeDiff);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
      <div style={{ ...card, maxWidth: 820, width: "100%", maxHeight: "92vh", overflow: "auto", position: "relative", border: "1px solid rgba(255,215,0,0.2)", padding: "18px 16px", color: "#fff" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>

        <h3 style={{ color: "#FFD700", margin: "0 0 2px", fontSize: 18, letterSpacing: 2 }}>GLOBAL LEADERBOARD</h3>
        <p style={{ color: "#BBB", fontSize: 10, margin: "0 0 10px" }}>Global leaderboard · showing {leaderboard.length}</p>

        {/* Difficulty filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          {DIFF_TABS.map(tab => {
            const isActive = activeDiff === tab.key;
            return (
              <button
                key={String(tab.key)}
                onClick={() => setActiveDiff(tab.key)}
                style={{
                  padding: "4px 10px", fontSize: 10, fontWeight: 700,
                  fontFamily: "'Courier New', monospace", letterSpacing: 1,
                  cursor: "pointer", borderRadius: 4,
                  background: isActive ? `rgba(${hexToRgb(tab.color)},0.18)` : "rgba(255,255,255,0.04)",
                  border: isActive ? `1px solid ${tab.color}` : "1px solid rgba(255,255,255,0.12)",
                  color: isActive ? tab.color : "#888",
                  transition: "all 0.15s",
                }}
              >
                {tab.emoji} {tab.label}
                {tab.key !== null && (
                  <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>
                    ({leaderboard.filter(e => e.difficulty === tab.key).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {lbLoading ? (
          <p style={{ color: "#DDD", fontSize: 13 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#CCC", fontStyle: "italic", fontSize: 13 }}>
            {activeDiff
              ? `No ${activeTab?.label} entries yet. Be the first!`
              : "No entries yet. Be the first to die gloriously!"}
          </p>
        ) : (
          <div style={{ fontSize: 11 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 62px 46px 44px 38px 50px", gap: 4, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.15)", color: "#DDD", fontWeight: 700, fontSize: 9, letterSpacing: 1 }}>
              <span>#</span>
              <span>PLAYER</span>
              <span style={{ textAlign: "right" }}>SCORE</span>
              <span style={{ textAlign: "right" }}>KILLS</span>
              <span style={{ textAlign: "right" }} title="Wave reached">WAVE</span>
              <span style={{ textAlign: "right" }}>TIME</span>
              <span style={{ textAlign: "right", paddingRight: 4 }}>DIFF</span>
            </div>
            {filtered.map((e, i) => {
              const isMe = e.name === username;
              const medal = i < 3 ? ["🥇", "🥈", "🥉"][i] : String(i + 1);
              const rowColor = i < 3 ? ["#FFD700", "#E0E0E0", "#CD7F32"][i] : "#EEE";
              const diffTab = DIFF_TABS.find(t => t.key === e.difficulty);
              const loadoutEmoji = LOADOUT_EMOJI[e.starterLoadout] || "";
              return (
                <div
                  key={i}
                  style={{ display: "grid", gridTemplateColumns: "26px 1fr 62px 46px 44px 38px 50px", gap: 4, padding: "7px 2px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: rowColor, background: isMe ? "rgba(255,107,53,0.12)" : "transparent", borderRadius: 4, alignItems: "center" }}
                  title={e.lastWords ? `"${e.lastWords}"` : ""}
                >
                  <span style={{ fontWeight: 900, fontSize: i < 3 ? 14 : 11 }}>{medal}</span>
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    {/* Top row: badges + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "nowrap", overflow: "hidden" }}>
                      {e.accountLevel > 0 && <AccountLevelBadge level={e.accountLevel} />}
                      <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                      {e.level && <span style={{ color: "#bbb", fontSize: 9, flexShrink: 0 }} title="In-run XP level">⬆{e.level}</span>}
                      {loadoutEmoji && <span style={{ fontSize: 9, flexShrink: 0 }} title={e.starterLoadout}>{loadoutEmoji}</span>}
                      {e.customSettings && <span style={{ fontSize: 9, flexShrink: 0 }} title="Custom settings used">⚙️</span>}
                      <span style={{ flexShrink: 0 }}><InputDeviceBadge device={e.inputDevice || "mouse"} /></span>
                    </div>
                    {/* Bottom row: seed */}
                    {e.seed > 0 && (
                      <div style={{ fontSize: 8, color: "#666", marginTop: 1, fontFamily: "'Courier New', monospace", letterSpacing: 0.5 }}>
                        seed #{e.seed}
                      </div>
                    )}
                  </div>
                  <span style={{ textAlign: "right", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{e.score?.toLocaleString()}</span>
                  <span style={{ textAlign: "right", color: "#00FF88", fontVariantNumeric: "tabular-nums" }}>{e.kills ?? "—"}</span>
                  <span style={{ textAlign: "right", color: "#CCC", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{e.wave ?? "—"}</span>
                  <span style={{ textAlign: "right", color: "#BBB", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{e.time || "--"}</span>
                  <span style={{ textAlign: "right", paddingRight: 4, fontSize: 9, color: diffTab?.color || "#888", fontWeight: 700 }}>
                    {diffTab ? diffTab.emoji : ""} {e.difficulty?.toUpperCase() || "?"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {(lbHasMore || lbLoading) && !lbLoading && filtered.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={onLoadMore}
              style={{ padding: "7px 24px", fontSize: 11, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 1, cursor: "pointer", borderRadius: 4, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700" }}
            >
              LOAD MORE ↓
            </button>
          </div>
        )}
        {lbLoading && leaderboard.length > 0 && (
          <p style={{ textAlign: "center", color: "#bbb", fontSize: 11, marginTop: 10 }}>Loading…</p>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
