import { useState } from "react";
import { WEAPONS } from "../constants.js";
import { track } from "../utils/analytics.js";
import { buildRunDnaSharePayload } from "../utils/runDnaShareCard.js";
import { buildStudioGameEvent } from "../utils/runIntelligence.js";
import { saveStudioGameEvent } from "../storage.js";
import { describeFormationPressure, describePressureArc } from "../systems/pressureArc.js";
import { describeDamageSequence } from "../systems/damageSequence.js";

export default function DeathScreenSecondaryAnalysis({ model }) {
  const {
    runModifier, card, buildGrade, weaponKills, leaderboard, wave, score, kills,
    level, bestStreak, fmtTime, timeSurvived, totalDamage, crits, grenades, insightGraph,
    runNarrative, replayProofPresenter, runCoach, experimentMatched, nextContract,
    fairnessReceipt, wavePlanReceipt, performanceReceipt, debrief, collapseCoaching,
    postRunIntel, runHistory, nextRunDrill, recordPlaytestChoice, mode,
    makeDrillLaunch, onStartGame,
  } = model;
  const [shareCardBusy, setShareCardBusy] = useState(false);
  const pressureSummary = describePressureArc(runHistory[0]?.pressureReceipt);
  const formationSummary = describeFormationPressure(runHistory[0]?.pressureReceipt);
  const damageSummary = describeDamageSequence(runHistory[0]?.damageReceipt);

  return (
    <>
        {runModifier && (
          <div style={{ marginBottom: 10, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,215,0,0.3)", background: "rgba(255,215,0,0.06)", display: "inline-block" }}>
            <span style={{ color: "var(--cod-gold)", fontSize: 11, fontWeight: 700 }}>{runModifier.emoji} {runModifier.name.toUpperCase()}</span>
            <span style={{ color: "#bbb", fontSize: 10, marginLeft: 8 }}>{runModifier.desc}</span>
          </div>
        )}

        <div style={{ ...card, marginBottom: 12, padding: "10px 12px", border: "1px solid rgba(255,215,0,0.24)", background: "linear-gradient(180deg,rgba(255,215,0,0.09),rgba(255,255,255,0.035))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 9, color: "#777", letterSpacing: 3 }}>BUILD GRADE</div>
              <div style={{ fontSize: 13, color: "#EEE", fontWeight: 900 }}>{buildGrade.label}</div>
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 6, display: "grid", placeItems: "center", color: "#111", background: buildGrade.grade === "A" ? "#FFD700" : buildGrade.grade === "B" ? "#00E5FF" : "#FF6B35", fontSize: 32, fontWeight: 900, boxShadow: "0 0 18px rgba(255,215,0,0.22)" }}>
              {buildGrade.grade}
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {buildGrade.breakdown.map(row => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "88px 1fr 28px", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 8, color: "#999", textAlign: "left", letterSpacing: 1 }}>{row.label}</div>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(6, Math.min(100, row.value))}%`, height: "100%", background: row.value >= 75 ? "#00FF88" : row.value >= 45 ? "#FFD700" : "#FF4444" }} />
                </div>
                <div style={{ fontSize: 9, color: "#CCC", textAlign: "right" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RUN DNA — weapon kill-distribution fingerprint */}
        {weaponKills && weaponKills.some(k => k > 0) && (() => {
          const _total = weaponKills.reduce((s, k) => s + (k || 0), 0);
          const _used = weaponKills.map((k, i) => ({ k: k || 0, i })).filter(w => w.k > 0).sort((a, b) => b.k - a.k);
          const _doShareCard = () => {
            if (shareCardBusy) return;
            setShareCardBusy(true);
            try {
              const worker = new Worker(new URL("../workers/shareCard.worker.js", import.meta.url), { type: "module" });
              worker.onmessage = (ev) => {
                worker.terminate();
                setShareCardBusy(false);
                if (ev.data?.blob) {
                  const url = URL.createObjectURL(ev.data.blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "run-dna.png"; a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                }
              };
              worker.onerror = () => { worker.terminate(); setShareCardBusy(false); };
              worker.postMessage(buildRunDnaSharePayload({
                weaponKills: weaponKills || [],
                weapons: WEAPONS,
                leaderboard,
                wave, score, kills,
                runNarrative,
                buildGrade,
                replayProofPresenter,
              }));
            } catch { setShareCardBusy(false); }
          };
          return (
            <div style={{ ...card, marginBottom: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>── RUN DNA ──</span>
                <button onClick={_doShareCard} disabled={shareCardBusy} style={{ fontSize: 8, background: "none", border: "1px solid #333", borderRadius: 4, color: shareCardBusy ? "#555" : "#AAA", padding: "2px 6px", cursor: "pointer" }}>
                  {shareCardBusy ? "…" : "📸 SAVE CARD"}
                </button>
              </div>
              <div style={{ height: 14, borderRadius: 7, overflow: "hidden", display: "flex", marginBottom: 8 }} title="Weapon kill distribution">
                {_used.map(({ k, i }) => (
                  <div key={i} style={{ width: `${(k / _total) * 100}%`, height: "100%", background: WEAPONS[i]?.color || "#888", opacity: 0.9 }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {_used.slice(0, 4).map(({ k, i }) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: WEAPONS[i]?.color || "#888", flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: "#AAA" }}>{WEAPONS[i]?.emoji} {Math.round((k / _total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          {[
            [score.toLocaleString(), "SCORE", "#FFD700"],
            [kills, "KILLS", "#0F0"],
            ["W" + wave, "WAVE", "#F44"],
            ["Lv " + level, "LEVEL", "#00FF88"],
            [bestStreak, "BEST STREAK", "#FF4500"],
            [fmtTime(timeSurvived), "SURVIVED", "#00BFFF"],
            [totalDamage.toLocaleString(), "TOTAL DMG", "#E040FB"],
            [crits || 0, "CRITS", "#FFD700"],
            [grenades || 0, "GRENADES", "#FF4500"],
          ].map(([val, label, color], i) => (
            <div key={i} style={{ ...card, padding: "8px 4px" }}>
              <div style={{ fontSize: 17, fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: 9, color: "#DDD", letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Inspectable evidence stays available without competing with the one-verdict card. */}
        <details data-testid="coach-evidence" style={{ ...card, marginBottom: 8, textAlign: "left", border: "1px solid rgba(0,229,255,0.25)", background: "linear-gradient(180deg,rgba(0,229,255,0.06),rgba(255,255,255,0.03))" }}>
          <summary style={{ color: "#9EDFF0", fontSize: 10, fontWeight: 900, letterSpacing: 1.6, cursor: "pointer" }}>WHY THIS VERDICT · {insightGraph.nodes.length} EVIDENCE NODES · {insightGraph.fingerprint}</summary>
          <div style={{ fontSize: 10, color: "#5CE6FF", letterSpacing: 2, fontWeight: 900, margin: "10px 0 6px" }}>🧠 RUN COACH EVIDENCE</div>
          <div style={{ fontSize: 11, color: "#FFB3B3", lineHeight: 1.45, marginBottom: 4 }}>
            <span style={{ color: "#FF6B6B", fontWeight: 700 }}>Killed by:</span> {runCoach.killedBy}
          </div>
          <div style={{ fontSize: 11, color: "#FFE5B3", lineHeight: 1.45, marginBottom: 4 }}>
            <span style={{ color: "var(--cod-gold)", fontWeight: 700 }}>Try next:</span> {runCoach.tryNext}
          </div>
          <div style={{ fontSize: 11, color: "#B3FFB3", lineHeight: 1.45, marginBottom: runCoach.weaponTip ? 4 : 0 }}>
            <span style={{ color: "#00FF88", fontWeight: 700 }}>Working:</span> {runCoach.working}
          </div>
          {runCoach.weaponTip && (
            <div style={{ fontSize: 11, color: "#E0D0FF", lineHeight: 1.45 }}>
              <span style={{ color: "#CC88FF", fontWeight: 700 }}>Weapon:</span> {runCoach.weaponTip}
            </div>
          )}
          {runCoach.weaponDeathTip && (
            <div style={{ fontSize: 11, color: "#FFD8B0", lineHeight: 1.45, marginTop: runCoach.weaponTip ? 4 : 0 }}>
              <span style={{ color: "#FF8844", fontWeight: 700 }}>Mismatch:</span> {runCoach.weaponDeathTip}
            </div>
          )}
          {runCoach.precisionTip && (
            <div style={{ fontSize: 11, color: "#FFD8FF", lineHeight: 1.45, marginTop: runCoach.weaponTip ? 4 : 0 }}>
              <span style={{ color: "#FF88FF", fontWeight: 700 }}>Precision:</span> {runCoach.precisionTip}
            </div>
          )}
          {runCoach.doctrineNearMissTip && (
            <div style={{ fontSize: 11, color: "#B0E0FF", lineHeight: 1.45, marginTop: 4 }}>
              <span style={{ color: "#5EC8FF", fontWeight: 700 }}>Doctrine:</span> {runCoach.doctrineNearMissTip}
            </div>
          )}
          {runCoach.crossRunTip && (
            <div style={{ fontSize: 11, color: "#FFE0A0", lineHeight: 1.45, marginTop: 4 }}>
              <span style={{ color: "#FF9900", fontWeight: 700 }}>Pattern:</span> {runCoach.crossRunTip}
            </div>
          )}
          {runCoach.enemyLab && (
            <div style={{ marginTop: 7, padding: "8px 9px", borderRadius: 6, border: "1px solid rgba(255,107,53,0.28)", background: "rgba(255,107,53,0.07)" }}>
              <div style={{ fontSize: 9, color: "#FFB38A", letterSpacing: 2, fontWeight: 900, marginBottom: 4 }}>
                ENEMY LAB · {runCoach.enemyLab.pressure.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: "#FFE1D5", lineHeight: 1.45 }}>
                <strong>{runCoach.enemyLab.emoji} {runCoach.enemyLab.name}</strong> ended {runCoach.enemyLab.deaths} of your last {runCoach.enemyLab.lookback} runs.
              </div>
              <div style={{ fontSize: 10, color: "#FFD0A6", lineHeight: 1.45, marginTop: 3 }}>
                {runCoach.enemyLab.drill}
              </div>
              <div style={{ fontSize: 10, color: "#BCA08E", lineHeight: 1.45, marginTop: 3 }}>
                {runCoach.enemyLab.nextRunCue}
              </div>
            </div>
          )}
          {runCoach.brain.chokeWarning && (
            <div style={{ marginTop: 7, padding: "6px 9px", borderRadius: 5, border: "1px solid rgba(255,140,0,0.35)", background: "rgba(255,140,0,0.08)", fontSize: 10, color: "#FFD080", lineHeight: 1.45 }}>
              <span style={{ color: "#FF9900", fontWeight: 700 }}>⚠ CHOKE POINT:</span> {runCoach.brain.chokeWarning.tip}
            </div>
          )}
          <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "#C8D7FF", lineHeight: 1.45 }}>
            <span style={{ color: "#9CB8FF", fontWeight: 700 }}>Run Brain:</span> {runCoach.brain.nextExperiment}
            {experimentMatched && (
              <div style={{ color: experimentMatched === "matched" ? "#88FF99" : "#FF9966", marginTop: 2 }}>
                🧪 Experiment {experimentMatched === "matched" ? "followed ✓" : "diverged — try it next run"}
              </div>
            )}
            <div style={{ color: "#88A", marginTop: 2 }}>Follow-through: {runCoach.brain.followThrough}</div>
          </div>
          <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "#FFE4B8", lineHeight: 1.45 }}>
            <span style={{ color: "#FFB36B", fontWeight: 800 }}>Next Contract:</span> {nextContract.title}
            <div style={{ color: "#C9A26F", marginTop: 2 }}>{nextContract.progress}</div>
          </div>
        </details>

        {fairnessReceipt?.seed > 0 && (
          <div data-testid="fairness-receipt" style={{ ...card, marginTop: 8, marginBottom: 12, textAlign: "left", border: "1px solid rgba(143,239,255,0.28)", background: "linear-gradient(180deg,rgba(0,229,255,0.07),rgba(255,255,255,0.035))" }}>
            <div style={{ fontSize: 10, color: "var(--cod-cyan)", letterSpacing: 2, fontWeight: 900 }}>FAIRNESS RECEIPT · {fairnessReceipt.fingerprint}</div>
            <div style={{ marginTop: 7, display: "flex", gap: 12, flexWrap: "wrap", color: "#E8F7FF", fontSize: 10 }}>
              <span>SEED #{fairnessReceipt.seed}</span>
              <span>{fairnessReceipt.streamCount} STREAMS</span>
              <span>{fairnessReceipt.totalCalls} DRAWS</span>
            </div>
            <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 5 }}>
              {fairnessReceipt.streams.map((stream) => (
                <div key={stream.key} style={{ padding: "5px 7px", borderRadius: 5, background: "rgba(0,0,0,0.24)", color: "#BFD3DE", fontSize: 9 }}>
                  W{stream.wave} {stream.name.toUpperCase()} · {stream.calls}
                </div>
              ))}
            </div>
            <p style={{ margin: "8px 0 0", color: "#91A4AE", fontSize: 9, lineHeight: 1.45 }}>
              This fingerprint proves the seeded decision streams used by this run. It is not a claim of full physics replay equivalence.
            </p>
          </div>
        )}

        {wavePlanReceipt?.count > 0 && (
          <div data-testid="wave-plan-receipt" style={{ ...card, marginTop: 8, marginBottom: 12, textAlign: "left", border: "1px solid rgba(180,140,255,0.42)", background: "linear-gradient(180deg,rgba(118,78,190,0.10),rgba(255,255,255,0.035))" }}>
            <div style={{ fontSize: 10, color: "#C8A8FF", letterSpacing: 2, fontWeight: 900 }}>PLANNED PRESSURE RECEIPT · {wavePlanReceipt.combinedFingerprint}</div>
            <div style={{ marginTop: 7, display: "flex", gap: 12, flexWrap: "wrap", color: "#EEE7FA", fontSize: 10 }}>
              <span>{wavePlanReceipt.count} WAVE PLAN{wavePlanReceipt.count === 1 ? "" : "S"}</span>
              <span>W{wavePlanReceipt.firstWave}{wavePlanReceipt.lastWave !== wavePlanReceipt.firstWave ? `–W${wavePlanReceipt.lastWave}` : ""}</span>
              <span>ADVISORY</span>
            </div>
            <p style={{ margin: "8px 0 0", color: "#B9AEC8", fontSize: 9, lineHeight: 1.45 }}>
              Fingerprints the pressure plans recorded during this run. It does not replay actual spawns, combat physics, pickups, or outcomes.
            </p>
          </div>
        )}

        {performanceReceipt?.assisted && (
          <div data-testid="performance-receipt" role="status" style={{ ...card, marginTop: 8, marginBottom: 12, textAlign: "left", border: "1px solid rgba(255,209,102,0.4)", background: "linear-gradient(180deg,rgba(255,209,102,0.09),rgba(255,255,255,0.035))" }}>
            <div style={{ fontSize: 10, color: "#FFD166", letterSpacing: 2, fontWeight: 900 }}>{performanceReceipt.label}</div>
            <div style={{ marginTop: 7, display: "flex", gap: 12, flexWrap: "wrap", color: "#FFF4D1", fontSize: 10 }}>
              <span>{performanceReceipt.slowPct}% SLOW FRAMES</span>
              <span>95TH PERCENTILE {performanceReceipt.p95Ms}ms</span>
              <span>{performanceReceipt.assistActivations} ADAPTATION{performanceReceipt.assistActivations === 1 ? "" : "S"}</span>
            </div>
            <p style={{ margin: "8px 0 0", color: "#C8BFA6", fontSize: 9, lineHeight: 1.45 }}>
              Reduced effects protected readability after sustained slow frames on this device. This local timing receipt does not claim a cause or change score validity.
            </p>
          </div>
        )}

        <div style={{ ...card, marginTop: 8, marginBottom: 12, textAlign: "left", border: "1px solid rgba(255,107,53,0.18)", background: "linear-gradient(180deg,rgba(255,107,53,0.08),rgba(255,255,255,0.04))" }}>
          <div style={{ fontSize: 10, color: "#FFB36B", letterSpacing: 2, fontWeight: 900, marginBottom: 6 }}>TACTICAL DEBRIEF</div>
          <div style={{ fontSize: 18, color: "#FFF", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>
            {debrief.verdict}
          </div>
          <div style={{ fontSize: 12, color: "#FFD7B8", marginTop: 4, marginBottom: 10 }}>
            Build identity: <span style={{ color: "#FFF", fontWeight: 700 }}>{debrief.identity}</span>
          </div>

          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>WHAT WORKED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {debrief.strengths.map((line, index) => (
              <div key={`strength-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                ✓ {line}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>NEXT BEST MOVES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {debrief.actions.map((line, index) => (
              <div key={`action-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                {index + 1}. {line}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginTop: 10, marginBottom: 5 }}>{collapseCoaching.primary.label}</div>
          <div style={{ fontSize: 11, color: "#DDD", lineHeight: 1.5, marginBottom: 10 }}>
            {collapseCoaching.primary.statement}
          </div>

          {debrief.missedValue.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>MISSED VALUE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {debrief.missedValue.map((line, index) => (
                  <div key={`missed-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                    • {line}
                  </div>
                ))}
              </div>
            </>
          )}

          {debrief.rematchPlan.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>CORRECTIVE REMATCH</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {debrief.rematchPlan.map((line, index) => (
                  <div key={`rematch-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                    {index + 1}. {line}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ ...card, marginBottom: 12, textAlign: "left", border: "1px solid rgba(0,229,255,0.18)", background: "linear-gradient(180deg,rgba(0,229,255,0.07),rgba(255,255,255,0.035))" }}>
          <div style={{ fontSize: 10, color: "var(--cod-cyan)", letterSpacing: 2, fontWeight: 900, marginBottom: 6 }}>RUN INTELLIGENCE</div>
          <div style={{ fontSize: 12, color: "#EAFBFF", lineHeight: 1.5 }}>
            {collapseCoaching.contributingFactor.label}: <span style={{ color: "#FFF", fontWeight: 700 }}>{collapseCoaching.contributingFactor.statement}</span>
          </div>
          <div style={{ fontSize: 11, color: "#DDD", lineHeight: 1.5, marginTop: 5 }}>
            {postRunIntel.drill}
          </div>
          {runHistory[0]?.pressureReceipt && (
            <div data-testid="pressure-arc-summary" style={{ fontSize: 10, color: "#A9D8FF", lineHeight: 1.45, marginTop: 6 }}>
              <strong style={{ color: "#6FC7FF" }}>Observed pressure arc:</strong> {pressureSummary}
            </div>
          )}
          {runHistory[0]?.pressureReceipt?.formationExposureCount > 0 && (
            <div data-testid="formation-pressure-summary" style={{ fontSize: 10, color: "#C8B7FF", lineHeight: 1.45, marginTop: 6 }}>
              <strong style={{ color: "#B79AFF" }}>Observed formation drill:</strong> {formationSummary}
            </div>
          )}
          {runHistory[0]?.damageReceipt && (
            <div data-testid="damage-sequence-summary" style={{ fontSize: 10, color: "#FFD3A8", lineHeight: 1.45, marginTop: 6 }}>
              <strong style={{ color: "#FFB36B" }}>Observed final damage:</strong> {damageSummary}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#FFB36B", lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>
            "{postRunIntel.callout}"
          </div>
          {postRunIntel.rivalry && (
            <div style={{ fontSize: 11, color: "var(--cod-cyan)", lineHeight: 1.5, marginTop: 6 }}>
              {postRunIntel.rivalry.prompt}
            </div>
          )}
          <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 8, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.28)" }}>
            <div style={{ fontSize: 10, color: "#FFB36B", letterSpacing: 1.5, fontWeight: 900 }}>NEXT DRILL</div>
            <div style={{ fontSize: 12, color: "#FFF", fontWeight: 900, marginTop: 3 }}>{nextRunDrill.title}</div>
            <div style={{ fontSize: 10, color: "#DDD", lineHeight: 1.45, marginTop: 3 }}>{nextRunDrill.detail}</div>
            <div style={{ marginTop: 8, padding: "7px 8px", borderRadius: 6, background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, color: "#FFD7B8", letterSpacing: 1.5, fontWeight: 900 }}>CONTRACT: {debrief.nextRunContract.focus}</div>
              <div style={{ fontSize: 10, color: "#EEE", lineHeight: 1.4, marginTop: 3 }}>{debrief.nextRunContract.target}</div>
              <div style={{ fontSize: 9, color: "var(--cod-cyan)", lineHeight: 1.4, marginTop: 3 }}>{debrief.nextRunContract.proof}</div>
            </div>
            <button
              onClick={() => {
                recordPlaytestChoice(nextRunDrill.action || "run_the_fix");
                track("next_run_drill_accept", { drillId: nextRunDrill.id, action: nextRunDrill.action, seed: nextRunDrill.seed || null, score, wave, mode });
                saveStudioGameEvent(buildStudioGameEvent("next_run_drill_accept", {
                  surface: "death_screen",
                  drillId: nextRunDrill.id,
                  action: nextRunDrill.action,
                  seed: nextRunDrill.seed || null,
                  mode,
                  score,
                  wave,
                }));
                const launchKind = nextRunDrill.action === "replay_seed" ? "replay_seed" : "new_run";
                const drill = makeDrillLaunch(launchKind);
                if (launchKind === "replay_seed" && nextRunDrill.seed > 0) onStartGame(nextRunDrill.seed, { drill });
                else onStartGame(undefined, { drill });
              }}
              style={{ marginTop: 8, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", background: "linear-gradient(180deg,#FF8A3D,#CC4400)", color: "#FFF", fontSize: 12, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Courier New',monospace" }}
            >
              {nextRunDrill.cta}
            </button>
          </div>
        </div>

    </>
  );
}
