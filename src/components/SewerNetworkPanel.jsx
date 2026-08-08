import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCareerStats, loadCommunityStats, loadRunHistory } from "../storage.js";
import { getSupabaseClient } from "../supabase.js";
import { buildPersonalStats, formatStat, normalizeCommunityStats } from "../utils/gameStats.js";

const TABS = [
  { id: "you", label: "YOU" },
  { id: "community", label: "COMMUNITY" },
  { id: "live", label: "LIVE" },
];

function freshnessLabel(value) {
  if (!value) return "AWAITING FIRST VERIFIED RUN";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "UPDATED <1 MIN AGO";
  if (seconds < 3600) return `UPDATED ${Math.floor(seconds / 60)} MIN AGO`;
  return `UPDATED ${Math.floor(seconds / 3600)} HR AGO`;
}

function Stat({ label, value, suffix = "" }) {
  return (
    <div style={{ minWidth: 0, padding: "7px 8px", borderRadius: 7, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(127,230,255,0.13)" }}>
      <div style={{ color: "#7B8790", fontSize: 8, letterSpacing: 1.2, fontWeight: 900 }}>{label}</div>
      <div style={{ color: "#F3F7F8", fontSize: 15, lineHeight: 1.2, fontWeight: 900, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis" }}>{value}{suffix}</div>
    </div>
  );
}

export default function SewerNetworkPanel({ career: suppliedCareer = null, runHistory: suppliedHistory = null, compact = false }) {
  const [tab, setTab] = useState("you");
  const [community, setCommunity] = useState(() => normalizeCommunityStats());
  const [status, setStatus] = useState("connecting");
  const career = suppliedCareer || loadCareerStats();
  const history = suppliedHistory || loadRunHistory();
  const personal = useMemo(() => buildPersonalStats(career, history), [career, history]);

  const refresh = useCallback(async () => {
    const next = await loadCommunityStats();
    setCommunity(next);
    setStatus(next.runs > 0 ? "live" : "offline");
  }, []);

  useEffect(() => {
    let disposed = false;
    let channel = null;
    refresh();
    const timer = setInterval(() => { if (!disposed && document.visibilityState !== "hidden") refresh(); }, 15000);
    getSupabaseClient().then(client => {
      if (disposed || !client?.channel) return;
      channel = client.channel("cod-sewer-network")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leaderboard" }, refresh)
        .subscribe();
    }).catch(() => {});
    return () => {
      disposed = true;
      clearInterval(timer);
      if (channel) getSupabaseClient().then(client => client?.removeChannel?.(channel)).catch(() => {});
    };
  }, [refresh]);

  const shown = tab === "you" ? personal : community;
  const isLive = tab === "live";
  const stats = isLive
    ? [
        ["RUNS · 24H", formatStat(community.runs24h)],
        ["KILLS · 24H", formatStat(community.kills24h)],
        ["RUNNERS", formatStat(community.runners)],
        ["BEST WAVE", formatStat(community.bestWave)],
      ]
    : [
        ["RUNS", formatStat(shown.runs)],
        ["HOURS", shown.hours.toLocaleString(undefined, { maximumFractionDigits: 1 })],
        ["ENEMIES TERMINATED", formatStat(shown.kills)],
        ["TOTAL SCORE", formatStat(shown.score)],
        ["DAMAGE", formatStat(shown.damage)],
        ["ACCURACY", shown.accuracy == null ? "—" : shown.accuracy.toFixed(1), shown.accuracy == null ? "" : "%"],
        ["BOSSES", formatStat(shown.bosses)],
        ["BEST WAVE", formatStat(shown.bestWave)],
      ];

  return (
    <section data-testid="sewer-network" style={{ width: "100%", boxSizing: "border-box", padding: compact ? 10 : 12, borderRadius: 10, border: "1px solid rgba(127,230,255,0.28)", background: "linear-gradient(135deg,rgba(3,20,24,0.9),rgba(7,10,12,0.88))", boxShadow: "inset 0 0 28px rgba(0,229,255,0.035)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ color: "#7FE6FF", fontSize: 10, letterSpacing: 2.2, fontWeight: 900 }}>📡 SEWER NETWORK</div>
            <a href={`${import.meta.env.BASE_URL}stats/`} style={{ color: "#9CEBFF", fontSize: 8, letterSpacing: 1, textDecoration: "underline", textUnderlineOffset: 2 }}>FULL STATS</a>
          </div>
          <div style={{ color: "#748089", fontSize: 8, marginTop: 2, letterSpacing: 0.8 }}>VERIFIED RUN INTELLIGENCE · HEALTH CHECKS EXCLUDED</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id} style={{ padding: "4px 8px", borderRadius: 4, cursor: "pointer", border: tab === item.id ? "1px solid #7FE6FF" : "1px solid rgba(255,255,255,0.1)", color: tab === item.id ? "#7FE6FF" : "#717A80", background: tab === item.id ? "rgba(127,230,255,0.1)" : "rgba(255,255,255,0.025)", fontSize: 8, fontWeight: 900, letterSpacing: 1 }}>{item.label}</button>)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${compact ? 4 : 4},minmax(0,1fr))`, gap: 6, marginTop: 9 }}>
        {stats.map(([label, value, suffix]) => <Stat key={label} label={label} value={value} suffix={suffix} />)}
      </div>
      {tab === "community" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7, color: "#929DA3", fontSize: 8 }}>
          <span>🥱 TOO EASY {community.feedback.too_easy}</span><span>🎯 DIALED IN {community.feedback.dialed_in}</span><span>💀 BRUTAL {community.feedback.brutal}</span>
        </div>
      )}
      <div style={{ marginTop: 7, display: "flex", justifyContent: "space-between", gap: 8, color: status === "live" ? "#00C982" : "#C8A44D", fontSize: 8, letterSpacing: 0.8 }}>
        <span>{tab === "you" ? "THIS DEVICE" : status === "connecting" ? "CONNECTING…" : status === "live" ? "● LIVE + 15S FALLBACK" : "LOCAL FALLBACK · NETWORK UNAVAILABLE"}</span>
        <span style={{ color: "#68737A" }}>{tab === "you" ? `${history.length} RECENT RUNS RETAINED` : freshnessLabel(community.updatedAt)}</span>
      </div>
    </section>
  );
}
