import { buildRunNarrative } from "../utils/runNarrative.js";

export default function DeathScreenRunArcPanel({
  wave,
  score,
  kills,
  bestStreak,
  nearDeathEvents,
  precisionPeakStreak,
  bossKillCount,
  flowStateFired,
  timeSurvived,
  waveScoreLog,
  peakMoment,
  card,
}) {
  const runNarrative = buildRunNarrative({
    wave, score, kills, bestStreak, nearDeathEvents,
    precisionPeakStreak, bossKillCount, flowStateFired, timeSurvived,
  });

  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>── RUN ARC ──</span>
        {waveScoreLog.length >= 2 && (() => {
          const maxS = Math.max(...waveScoreLog, 1);
          const W2 = 120, H2 = 20;
          const pts = waveScoreLog.map((s, i) => {
            const x = (i / (waveScoreLog.length - 1)) * W2;
            const y = H2 - (s / maxS) * H2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");
          const peak = Math.max(...waveScoreLog);
          const peakIdx = waveScoreLog.lastIndexOf(peak);
          const px = (peakIdx / (waveScoreLog.length - 1)) * W2;
          const py = H2 - (peak / maxS) * H2;
          return (
            <svg width={W2} height={H2} style={{ overflow: "visible" }}>
              <polyline points={pts} fill="none" stroke="#88FF99" strokeWidth="1.5" opacity="0.7" />
              <circle cx={px} cy={py} r="2.5" fill="#FFD700" />
            </svg>
          );
        })()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, color: "#EEE", letterSpacing: 2, marginBottom: 4 }}>{runNarrative.act}</div>
      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5, marginBottom: runNarrative.moments.length > 0 ? 10 : 0 }}>{runNarrative.actDesc}</div>
      {runNarrative.moments.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", borderTop: "1px solid #1A1A1A" }}>
          <div style={{ fontSize: 8, color: "var(--cod-gold)", letterSpacing: 2, fontFamily: "'Courier New',monospace", whiteSpace: "nowrap", marginTop: 2 }}>{m.label}</div>
          <div style={{ fontSize: 10, color: "#AAA", lineHeight: 1.5 }}>{m.desc}</div>
        </div>
      ))}
      {peakMoment && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderTop: "1px solid #1A1A1A" }}>
          <div style={{ fontSize: 8, color: "#FF8800", letterSpacing: 2, fontFamily: "'Courier New',monospace", whiteSpace: "nowrap" }}>PEAK MOMENT</div>
          <div style={{ fontSize: 10, color: "#AAA", lineHeight: 1.5 }}>{peakMoment.label} ×{peakMoment.count} on wave {peakMoment.wave}{peakMoment.enemiesAlive > 0 ? ` (${peakMoment.enemiesAlive} left standing)` : ""}.</div>
        </div>
      )}
    </div>
  );
}
