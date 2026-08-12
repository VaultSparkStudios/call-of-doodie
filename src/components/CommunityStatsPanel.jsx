import { useMemo, useState, useSyncExternalStore } from "react";
import { loadCareerStats, loadRunHistory } from "../storage.js";
import {
  getCommunityStatsSnapshot,
  getCommunityStatsStatus,
  getCommunityStatsTrend,
  refreshCommunityStatsNow,
  subscribeCommunityStats,
} from "../utils/communityStatsStore.js";
import { buildPersonalStats, formatStat } from "../utils/gameStats.js";

const TABS = [
  { id: "you", label: "YOU" },
  { id: "community", label: "COMMUNITY" },
  { id: "live", label: "LIVE" },
];

function freshnessLabel(value, prefix = "LAST RUN") {
  if (!value) return `${prefix} UNKNOWN`;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${prefix} <1 MIN AGO`;
  if (seconds < 3600) return `${prefix} ${Math.floor(seconds / 60)} MIN AGO`;
  if (seconds < 86400) return `${prefix} ${Math.floor(seconds / 3600)} HR AGO`;
  return `${prefix} ${Math.floor(seconds / 86400)}D AGO`;
}

// Inline SVG sparkline from the store's trend ring — no chart library.
function Sparkline({ points, width = 56, height = 16, color = "#7FE6FF" }) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${(height - 2 - ((value - min) / span) * (height - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ display: "block", opacity: 0.9 }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ label, value, suffix = "", spark = null }) {
  return (
    <div className="community-stats__stat">
      <div className="community-stats__stat-label" style={{ color: "#7B8790", fontSize: 8, letterSpacing: 1.2, fontWeight: 900 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 4 }}>
        <div className="community-stats__stat-value" style={{ color: "#F3F7F8", fontSize: 15, lineHeight: 1.2, fontWeight: 900, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis" }}>{value}{suffix}</div>
        {spark}
      </div>
    </div>
  );
}

// YOU-vs-COMMUNITY comparison bar: two horizontal bars on one axis.
function CompareRow({ label, you, community, format = formatStat }) {
  const max = Math.max(Number(you) || 0, Number(community) || 0) || 1;
  const youPct = Math.round(((Number(you) || 0) / max) * 100);
  const comPct = Math.round(((Number(community) || 0) / max) * 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 62px", gap: 6, alignItems: "center", fontSize: 8 }}>
      <span style={{ color: "#7B8790", fontWeight: 900, letterSpacing: 1 }}>{label}</span>
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: `${youPct}%`, height: "100%", borderRadius: 2, background: "#5EE68A" }} />
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: `${comPct}%`, height: "100%", borderRadius: 2, background: "#7FE6FF" }} />
        </div>
      </div>
      <span style={{ color: "#9AA7AE", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{format(you)} · {format(community)}</span>
    </div>
  );
}

function FeedbackBar({ feedback }) {
  const tooEasy = Number(feedback?.too_easy) || 0;
  const dialedIn = Number(feedback?.dialed_in) || 0;
  const brutal = Number(feedback?.brutal) || 0;
  const total = tooEasy + dialedIn + brutal;
  if (!total) return null;
  const seg = (count, color) => (
    <div style={{ width: `${(count / total) * 100}%`, background: color, height: "100%" }} />
  );
  return (
    <div style={{ marginTop: 7 }}>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        {seg(tooEasy, "#C8A44D")}{seg(dialedIn, "#00C982")}{seg(brutal, "#E8564B")}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, color: "#929DA3", fontSize: 8 }}>
        <span>🥱 TOO EASY {tooEasy}</span><span>🎯 DIALED IN {dialedIn}</span><span>💀 BRUTAL {brutal}</span>
      </div>
    </div>
  );
}

export default function CommunityStatsPanel({ career: suppliedCareer = null, runHistory: suppliedHistory = null, compact = false, defaultTab = "you", showcase = false }) {
  const [tab, setTab] = useState(defaultTab);
  const community = useSyncExternalStore(subscribeCommunityStats, getCommunityStatsSnapshot, getCommunityStatsSnapshot);
  const status = useSyncExternalStore(subscribeCommunityStats, getCommunityStatsStatus, getCommunityStatsStatus);
  const trend = useSyncExternalStore(subscribeCommunityStats, getCommunityStatsTrend, getCommunityStatsTrend);
  const career = suppliedCareer || loadCareerStats();
  const history = suppliedHistory || loadRunHistory();
  const personal = useMemo(() => buildPersonalStats(career, history), [career, history]);

  const shown = tab === "you" ? personal : community;
  const isLive = tab === "live";
  const sparkFor = (key) => trend.length >= 2
    ? <Sparkline points={trend.map((point) => point[key] ?? 0)} />
    : null;
  const stats = isLive
    ? [
        ["RUNS · 24H", formatStat(community.runs24h)],
        ["KILLS · 24H", formatStat(community.kills24h)],
        ["RUNNERS", formatStat(community.runners), "", sparkFor("runners")],
        ["BEST WAVE", formatStat(community.bestWave)],
      ]
    : [
        ["RUNS", formatStat(shown.runs), "", tab === "community" ? sparkFor("runs") : null],
        ["HOURS", shown.hours.toLocaleString(undefined, { maximumFractionDigits: 1 })],
        ["ENEMIES TERMINATED", formatStat(shown.kills), "", tab === "community" ? sparkFor("kills") : null],
        ["TOTAL SCORE", formatStat(shown.score), "", tab === "community" ? sparkFor("score") : null],
        ["DAMAGE", formatStat(shown.damage), "", tab === "community" ? sparkFor("damage") : null],
        ["ACCURACY", shown.accuracy == null ? "—" : shown.accuracy.toFixed(1), shown.accuracy == null ? "" : "%"],
        ["BOSSES", formatStat(shown.bosses)],
        ["BEST WAVE", formatStat(shown.bestWave)],
      ];
  const visibleStats = showcase ? stats.slice(0, 4) : stats;

  return (
    <section data-testid="community-stats" style={{ width: "100%", boxSizing: "border-box", padding: compact ? 10 : 12, borderRadius: 10, border: "1px solid rgba(127,230,255,0.28)", background: "linear-gradient(135deg,rgba(3,20,24,0.9),rgba(7,10,12,0.88))", boxShadow: "inset 0 0 28px rgba(0,229,255,0.035)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="community-stats__header" style={{ color: "#7FE6FF", fontSize: 10, letterSpacing: 2.2, fontWeight: 900 }}>● LIVE SEWER NETWORK</div>
            <a className="community-stats__full-link" href={`${import.meta.env.BASE_URL}stats/`} style={{ color: "#9CEBFF", fontSize: 8, letterSpacing: 1, textDecoration: "underline", textUnderlineOffset: 2 }}>VIEW ALL STATS →</a>
            {!showcase && <button type="button" onClick={refreshCommunityStatsNow} aria-label="Refresh Community Stats now" style={{ padding: 0, border: 0, background: "transparent", color: "#9CEBFF", fontSize: 8, letterSpacing: 1, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>REFRESH</button>}
          </div>
          <div style={{ color: "#748089", fontSize: 8, marginTop: 2, letterSpacing: 0.8 }}>VERIFIED PLAYER + RUN TOTALS · HEALTH CHECKS EXCLUDED</div>
        </div>
        {!showcase && <div className="community-stats__tabs" style={{ display: "flex", gap: 4 }}>
          {TABS.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id} style={{ padding: "4px 8px", borderRadius: 4, cursor: "pointer", border: tab === item.id ? "1px solid #7FE6FF" : "1px solid rgba(255,255,255,0.1)", color: tab === item.id ? "#7FE6FF" : "#717A80", background: tab === item.id ? "rgba(127,230,255,0.1)" : "rgba(255,255,255,0.025)", fontSize: 8, fontWeight: 900, letterSpacing: 1 }}>{item.label}</button>)}
        </div>}
      </div>
      <div className="community-stats__grid">
        {visibleStats.map(([label, value, suffix, spark]) => <Stat key={label} label={label} value={value} suffix={suffix} spark={spark || null} />)}
      </div>
      {tab === "community" && (
        <>
          {/* Records strip — community bests already carried by the aggregate */}
          {(community.bestWave > 0 || community.bestScore > 0 || community.bestKills > 0) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, padding: "5px 8px", borderRadius: 6, background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.16)", color: "#D8C27A", fontSize: 8, letterSpacing: 0.8, fontWeight: 700 }}>
              <span>🏆 RECORDS</span>
              <span>WAVE {formatStat(community.bestWave)}</span>
              <span>SCORE {formatStat(community.bestScore)}</span>
              <span>KILLS {formatStat(community.bestKills)}</span>
            </div>
          )}
          {/* YOU vs COMMUNITY — same axis, green = you, cyan = community */}
          {personal.runs > 0 && (
            <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
              <div style={{ color: "#7B8790", fontSize: 8, letterSpacing: 1.2, fontWeight: 900 }}>YOU (■ GREEN) VS COMMUNITY BEST (■ CYAN)</div>
              <CompareRow label="BEST WAVE" you={personal.bestWave} community={community.bestWave} />
              <CompareRow label="BEST SCORE" you={personal.bestScore} community={community.bestScore} />
              <CompareRow label="BEST KILLS" you={personal.bestKills} community={community.bestKills} />
            </div>
          )}
          <FeedbackBar feedback={community.feedback} />
          {community.coverage && (
            <div style={{ marginTop: 5, color: "#718089", fontSize: 8, lineHeight: 1.35 }}>
              ALL AVAILABLE HISTORY · {formatStat(community.coverage.richRuns)} FULL-DETAIL · {formatStat(community.coverage.legacyRuns)} LEGACY
            </div>
          )}
        </>
      )}
      <div style={{ marginTop: 7, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", color: status === "live" ? "#00C982" : "#C8A44D", fontSize: 8, letterSpacing: 0.8 }}>
        <span>{tab === "you" ? "THIS DEVICE" : status === "connecting" ? "CONNECTING…" : status === "live" ? "● LIVE · AUTO-REFRESH 15S" : status === "cached" ? "LAST KNOWN LIVE TOTALS · RETRYING" : "NETWORK UNAVAILABLE · RETRYING"}</span>
        <span style={{ color: "#68737A" }}>{tab === "you" ? `${history.length} RECENT RUNS RETAINED` : `${freshnessLabel(community.checkedAt, "CHECKED")} · ${freshnessLabel(community.updatedAt)}`}</span>
      </div>
    </section>
  );
}
