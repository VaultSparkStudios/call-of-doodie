import { ACHIEVEMENTS, ACHIEVEMENT_PROGRESS } from "../constants.js";
import { loadCareerStats } from "../storage.js";
import DialogShell from "./DialogShell.jsx";

export default function AchievementsPanel({ achievementsUnlocked, onClose, runStats = null }) {
  const card = { background: "var(--cod-panel-strong)", borderRadius: 10, border: "1px solid var(--cod-line)", padding: 16 };
  const tierColors = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", legendary: "#FF44FF" };
  const tierNames  = { bronze: "BRONZE",   silver: "SILVER",   gold: "GOLD",   legendary: "LEGENDARY" };
  const unlocked = achievementsUnlocked.length;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked / total) * 100);

  // Use run stats if provided (in-run panel), otherwise use career best
  const career = loadCareerStats();
  const stats = runStats || { kills: career.totalKills, bestStreak: career.bestStreak, totalDamage: career.totalDamage };

  return (
    <DialogShell title="Career Achievements" onClose={onClose} zIndex={110}>
      <div style={{ ...card, maxWidth: 520, width: "100%", overflow: "visible", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "18px 14px", color: "#fff", margin: "auto 0" }}>
        <button onClick={onClose} aria-label="Close achievements" style={{ position: "absolute", top: 4, right: 4, width: 44, height: 44, background: "none", border: "none", color: "var(--cod-ink)", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>×</button>
        <h3 style={{ color: "var(--cod-gold)", margin: "0 0 2px", fontSize: 18, letterSpacing: 2 }}>🏅 CAREER ACHIEVEMENTS</h3>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#CCC", marginBottom: 3 }}>
            <span>{unlocked}/{total} UNLOCKED</span><span>{pct}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg,var(--cod-orange),var(--cod-gold))", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>
        {["legendary", "gold", "silver", "bronze"].map(tier => {
          const tierAchs = ACHIEVEMENTS.filter(a => a.tier === tier);
          if (tierAchs.length === 0) return null;
          return (
            <div key={tier} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: tierColors[tier], fontWeight: 900, letterSpacing: 2, marginBottom: 6, borderBottom: "1px solid " + tierColors[tier] + "44", paddingBottom: 4 }}>
                {tierNames[tier]} ({tierAchs.filter(a => achievementsUnlocked.includes(a.id)).length}/{tierAchs.length})
              </div>
              {tierAchs.map(a => {
                const isUnlocked = achievementsUnlocked.includes(a.id);
                const progressDef = !isUnlocked ? ACHIEVEMENT_PROGRESS[a.id] : null;
                const current = progressDef ? Math.min(progressDef[1], stats[progressDef[0]] || 0) : 0;
                const progressPct = progressDef ? Math.round((current / progressDef[1]) * 100) : 0;
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderRadius: 6, marginBottom: 2, background: isUnlocked ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.025)", borderLeft: isUnlocked ? "2px solid var(--cod-gold)" : "2px solid #4F5660" }}>
                    <span style={{ fontSize: 20, filter: isUnlocked ? "none" : "grayscale(1)" }}>{a.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isUnlocked ? tierColors[tier] : "#D0D0D0" }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: isUnlocked ? "#CCC" : "#A9A9A9" }}>{a.desc}</div>
                      {progressDef && progressPct > 0 && (
                        <div style={{ marginTop: 3 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#A9A9A9", marginBottom: 1 }}>
                            <span>{current.toLocaleString()} / {progressDef[1].toLocaleString()}</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: progressPct + "%", height: "100%", background: progressPct >= 75 ? "#00CC88" : progressPct >= 40 ? "#FFD700" : "#FF6600", borderRadius: 2 }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {isUnlocked && <span style={{ fontSize: 10, color: "#0F0", fontWeight: 900 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </DialogShell>
  );
}
