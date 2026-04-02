import { useState, useEffect, useRef } from "react";
import { compareLeaderboardEntries, getDailyChallengeSeed, loadLeaderboardToday, searchLeaderboard } from "../storage.js";

const MODE_TABS = [
  { key: null,              label: "ALL",          color: "#AAA" },
  { key: "normal",          label: "🎯 NORMAL",     color: "#FFD700" },
  { key: "score_attack",    label: "⏱ SCORE ATK",  color: "#FF6600" },
  { key: "daily_challenge", label: "📅 DAILY",      color: "#00E5FF" },
  { key: "boss_rush",       label: "☠ BOSS RUSH",  color: "#FF3333" },
  { key: "cursed",          label: "☠ CURSED",      color: "#CC00FF" },
  { key: "speedrun",        label: "🏃 SPEEDRUN",   color: "#00FF88" },
  { key: "gauntlet",        label: "🏋️ GAUNTLET",   color: "#AA44FF" },
  { key: "__today__",       label: "🌅 TODAY",      color: "#00FF88" },
];

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

function SupporterBadge({ supporter }) {
  if (!supporter) return null;
  return (
    <span
      title="Supporter"
      style={{
        fontSize: 8, padding: "1px 4px", borderRadius: 3,
        background: "rgba(255,215,0,0.15)",
        border: "1px solid rgba(255,215,0,0.5)",
        color: "#FFD700", fontWeight: 900, flexShrink: 0,
        fontFamily: "'Courier New', monospace",
      }}
    >⭐</span>
  );
}

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
  const [activeMode, setActiveMode] = useState(null);
  const [bossRushDiff, setBossRushDiff] = useState(null);
  const [gauntletDiff, setGauntletDiff] = useState(null);
  const [copiedRow, setCopiedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searchLoading, setSearchLoading] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const searchTimeout = useRef(null);
  const todaySeed = getDailyChallengeSeed();

  // Load today's data when Today tab is selected
  useEffect(() => {
    if (activeMode === "__today__" && todayData === null && !todayLoading) {
      setTodayLoading(true);
      loadLeaderboardToday().then(data => { setTodayData(data); setTodayLoading(false); });
    }
  }, [activeMode, todayData, todayLoading]);

  // Debounced search — local filter first, remote search on demand
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults(null); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await searchLeaderboard(val);
      setSearchResults(results);
      setSearchLoading(false);
    }, 400);
  };

  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };

  // Source data: search results > today data > normal filtered
  const isToday = activeMode === "__today__";
  const sourceData = searchResults !== null
    ? searchResults
    : isToday
      ? (todayData || [])
      : leaderboard;

  const modeFiltered = (isToday || searchResults !== null) ? sourceData : (
    activeMode === "score_attack"    ? leaderboard.filter(e => e.mode === "score_attack")
    : activeMode === "daily_challenge" ? leaderboard.filter(e => e.mode === "daily_challenge")
    : activeMode === "boss_rush"       ? leaderboard.filter(e => e.mode === "boss_rush")
    : activeMode === "cursed"          ? leaderboard.filter(e => e.mode === "cursed")
    : activeMode === "speedrun"        ? leaderboard.filter(e => e.mode === "speedrun")
    : activeMode === "gauntlet"        ? leaderboard.filter(e => e.mode === "gauntlet")
    : activeMode === "normal"          ? leaderboard.filter(e => !e.mode || e.mode === "normal")
    : leaderboard
  );

  const filtered = activeMode === "boss_rush" && bossRushDiff
    ? modeFiltered.filter(e => e.difficulty === bossRushDiff)
    : activeMode === "gauntlet" && gauntletDiff
      ? modeFiltered.filter(e => e.difficulty === gauntletDiff)
      : activeDiff
        ? modeFiltered.filter(e => e.difficulty === activeDiff)
        : modeFiltered;
  const sorted = [...filtered].sort((a, b) => compareLeaderboardEntries(a, b, activeMode === "__today__" ? null : activeMode));

  const activeTab = DIFF_TABS.find(t => t.key === activeDiff);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
      <div style={{ ...card, maxWidth: 820, width: "100%", maxHeight: "92vh", overflow: "auto", position: "relative", border: "1px solid rgba(255,215,0,0.2)", padding: "18px 16px", color: "#fff" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>

        <h3 style={{ color: "#FFD700", margin: "0 0 2px", fontSize: 18, letterSpacing: 2 }}>GLOBAL LEADERBOARD</h3>
        <p style={{ color: "#BBB", fontSize: 10, margin: "0 0 8px" }}>Global leaderboard · showing {leaderboard.length}</p>

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <input
            type="text"
            placeholder="🔍  Search player name..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6, padding: "7px 36px 7px 12px",
              color: "#FFF", fontSize: 12, fontFamily: "'Courier New', monospace",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
            >×</button>
          )}
          {searchLoading && (
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 10 }}>...</span>
          )}
        </div>

        {/* Mode filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
          {MODE_TABS.map(tab => {
            const isActive = activeMode === tab.key;
            return (
              <button
                key={String(tab.key)}
                onClick={() => { setActiveMode(tab.key); if (tab.key !== "boss_rush") setBossRushDiff(null); if (tab.key !== "gauntlet") setGauntletDiff(null); }}
                style={{
                  padding: "3px 10px", fontSize: 10, fontWeight: 700,
                  fontFamily: "'Courier New', monospace", letterSpacing: 1,
                  cursor: "pointer", borderRadius: 4,
                  background: isActive ? `rgba(${hexToRgb(tab.color)},0.18)` : "rgba(255,255,255,0.04)",
                  border: isActive ? `1px solid ${tab.color}` : "1px solid rgba(255,255,255,0.1)",
                  color: isActive ? tab.color : "#666",
                  transition: "all 0.15s",
                }}
              >{tab.label}</button>
            );
          })}
        </div>

        {/* Boss Rush difficulty sub-tabs */}
        {activeMode === "boss_rush" && (
          <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap", paddingLeft: 4 }}>
            <span style={{ fontSize: 8, color: "#FF3333", fontWeight: 700, letterSpacing: 1, alignSelf: "center", marginRight: 2 }}>BR DIFF:</span>
            {[{ key: null, label: "ALL" }, { key: "easy", label: "EASY" }, { key: "normal", label: "NRM" }, { key: "hard", label: "HARD" }, { key: "insane", label: "INS" }].map(st => {
              const isActive = bossRushDiff === st.key;
              return (
                <button
                  key={String(st.key)}
                  onClick={() => setBossRushDiff(st.key)}
                  style={{
                    padding: "2px 7px", fontSize: 9, fontWeight: 700,
                    fontFamily: "'Courier New', monospace", letterSpacing: 0.5,
                    cursor: "pointer", borderRadius: 3,
                    background: isActive ? "rgba(255,51,51,0.2)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1px solid rgba(255,51,51,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    color: isActive ? "#FF3333" : "#666",
                  }}
                >{st.label}</button>
              );
            })}
          </div>
        )}

        {/* Gauntlet difficulty sub-tabs */}
        {activeMode === "gauntlet" && (
          <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap", paddingLeft: 4 }}>
            <span style={{ fontSize: 8, color: "#FFC800", fontWeight: 700, letterSpacing: 1, alignSelf: "center", marginRight: 2 }}>GT DIFF:</span>
            {[{ key: null, label: "ALL" }, { key: "easy", label: "EASY" }, { key: "normal", label: "NRM" }, { key: "hard", label: "HARD" }, { key: "insane", label: "INS" }].map(st => {
              const isActive = gauntletDiff === st.key;
              return (
                <button
                  key={String(st.key)}
                  onClick={() => setGauntletDiff(st.key)}
                  style={{
                    padding: "2px 7px", fontSize: 9, fontWeight: 700,
                    fontFamily: "'Courier New', monospace", letterSpacing: 0.5,
                    cursor: "pointer", borderRadius: 3,
                    background: isActive ? "rgba(255,200,0,0.2)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1px solid rgba(255,200,0,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    color: isActive ? "#FFC800" : "#666",
                  }}
                >{st.label}</button>
              );
            })}
          </div>
        )}

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

        {(lbLoading && !isToday && searchResults === null) || (isToday && todayLoading) || (searchResults === null && searchLoading) ? (
          <p style={{ color: "#DDD", fontSize: 13 }}>Loading...</p>
        ) : sorted.length === 0 ? (
          <p style={{ color: "#CCC", fontStyle: "italic", fontSize: 13 }}>
            {searchResults !== null
              ? `No players found matching "${searchQuery}".`
              : isToday
                ? "No runs submitted today yet. Be the first!"
                : activeDiff
                  ? `No ${activeTab?.label} entries yet. Be the first!`
                  : "No entries yet. Be the first to die gloriously!"}
          </p>
        ) : (
          <div style={{ fontSize: 11 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 62px 46px 44px 38px 50px 28px", gap: 4, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.15)", color: "#DDD", fontWeight: 700, fontSize: 9, letterSpacing: 1 }}>
              <span>#</span>
              <span>PLAYER</span>
              <span style={{ textAlign: "right" }}>SCORE</span>
              <span style={{ textAlign: "right" }}>KILLS</span>
              <span style={{ textAlign: "right" }} title="Wave reached">WAVE</span>
              <span style={{ textAlign: "right" }}>TIME</span>
              <span style={{ textAlign: "right", paddingRight: 4 }}>DIFF</span>
              <span></span>
            </div>
            {sorted.map((e, i) => {
              const isMe = e.name === username;
              const medal = i < 3 ? ["🥇", "🥈", "🥉"][i] : String(i + 1);
              const rowColor = i < 3 ? ["#FFD700", "#E0E0E0", "#CD7F32"][i] : "#EEE";
              const diffTab = DIFF_TABS.find(t => t.key === e.difficulty);
              const loadoutEmoji = LOADOUT_EMOJI[e.starterLoadout] || "";
              const handleCopyChallenge = () => {
                const params = new URLSearchParams();
                if (e.seed > 0) params.set("seed", e.seed);
                if (e.difficulty) params.set("diff", e.difficulty);
                params.set("vs", e.score);
                if (e.name) params.set("vsName", e.name);
                const url = `${location.origin}${location.pathname}?${params.toString()}`;
                navigator.clipboard?.writeText?.(url);
                setCopiedRow(i);
                setTimeout(() => setCopiedRow(r => r === i ? null : r), 1500);
              };
              return (
                <div
                  key={i}
                  style={{ display: "grid", gridTemplateColumns: "26px 1fr 62px 46px 44px 38px 50px 28px", gap: 4, padding: "7px 2px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: rowColor, background: isMe ? "rgba(255,107,53,0.12)" : "transparent", borderRadius: 4, alignItems: "center" }}
                  title={e.lastWords ? `"${e.lastWords}"` : ""}
                >
                  <span style={{ fontWeight: 900, fontSize: i < 3 ? 14 : 11 }}>{medal}</span>
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    {/* Top row: badges + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "nowrap", overflow: "hidden" }}>
                      {e.accountLevel > 0 && <AccountLevelBadge level={e.accountLevel} />}
                      <SupporterBadge supporter={e.supporter} />
                      {(e.prestige > 0) && (
                        <span style={{
                          fontSize: 9, fontWeight: 900, marginRight: 4,
                          color: e.prestige >= 5 ? "#FF44FF" : e.prestige >= 3 ? "#FFD700" : "#888",
                          letterSpacing: 0,
                        }}>
                          {"★".repeat(Math.min(e.prestige, 5))}
                        </span>
                      )}
                      <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                      {e.level && <span style={{ color: "#bbb", fontSize: 9, flexShrink: 0 }} title="In-run XP level">⬆{e.level}</span>}
                      {loadoutEmoji && <span style={{ fontSize: 9, flexShrink: 0 }} title={e.starterLoadout}>{loadoutEmoji}</span>}
                      {e.customSettings && <span style={{ fontSize: 9, flexShrink: 0 }} title="Custom settings used">⚙️</span>}
                      {e.mode === "boss_rush" && <span style={{ fontSize: 8, padding: "0px 4px", borderRadius: 3, background: "rgba(255,51,51,0.18)", border: "1px solid rgba(255,51,51,0.5)", color: "#FF3333", fontWeight: 900, flexShrink: 0 }}>☠BR</span>}
                      {e.mode === "cursed"    && <span style={{ fontSize: 8, padding: "0px 4px", borderRadius: 3, background: "rgba(204,0,255,0.18)", border: "1px solid rgba(204,0,255,0.5)", color: "#CC00FF", fontWeight: 900, flexShrink: 0 }}>☠CU</span>}
                      {e.mode === "speedrun"  && <span style={{ fontSize: 8, padding: "0px 4px", borderRadius: 3, background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.5)", color: "#00FF88", fontWeight: 900, flexShrink: 0 }}>🏃SR</span>}
                      {e.mode === "gauntlet"  && <span style={{ fontSize: 8, padding: "0px 4px", borderRadius: 3, background: "rgba(170,68,255,0.18)", border: "1px solid rgba(170,68,255,0.5)", color: "#AA44FF", fontWeight: 900, flexShrink: 0 }}>🏋GT</span>}
                      <span style={{ flexShrink: 0 }}><InputDeviceBadge device={e.inputDevice || "mouse"} /></span>
                    </div>
                    {/* Bottom row: seed + today badge + prestige label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                      {e.seed > 0 && (
                        <span style={{ fontSize: 8, color: "#666", fontFamily: "'Courier New', monospace", letterSpacing: 0.5 }}>seed #{e.seed}</span>
                      )}
                      {activeMode === "daily_challenge" && e.seed === todaySeed && (
                        <span style={{ fontSize: 8, padding: "0px 4px", borderRadius: 3, background: "rgba(0,229,255,0.18)", border: "1px solid rgba(0,229,255,0.5)", color: "#00E5FF", fontWeight: 900, letterSpacing: 0.5 }}>TODAY</span>
                      )}
                      {e.prestige > 0 && (
                        <span style={{ fontSize: 8, color: e.prestige >= 5 ? "#FF44FF" : e.prestige >= 3 ? "#FFD700" : "#888", fontWeight: 700, letterSpacing: 0.5 }}>Prestige {e.prestige}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ textAlign: "right", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{e.score?.toLocaleString()}</span>
                  <span style={{ textAlign: "right", color: "#00FF88", fontVariantNumeric: "tabular-nums" }}>{e.kills ?? "—"}</span>
                  <span style={{ textAlign: "right", color: "#CCC", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{e.wave ?? "—"}</span>
                  <span style={{ textAlign: "right", color: "#BBB", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{e.time || "--"}</span>
                  <span style={{ textAlign: "right", paddingRight: 4, fontSize: 9, color: diffTab?.color || "#888", fontWeight: 700 }}>
                    {diffTab ? diffTab.emoji : ""} {e.difficulty?.toUpperCase() || "?"}
                  </span>
                  <button
                    onClick={handleCopyChallenge}
                    title="Copy challenge link"
                    style={{ padding: "3px 5px", fontSize: 10, cursor: "pointer", background: copiedRow === i ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.05)", border: copiedRow === i ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: copiedRow === i ? "#00FF88" : "#888", fontFamily: "'Courier New',monospace", lineHeight: 1 }}
                  >{copiedRow === i ? "✓" : "⚔️"}</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More — hidden during search / today tab */}
        {(lbHasMore || lbLoading) && !lbLoading && sorted.length > 0 && !isToday && searchResults === null && (
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
