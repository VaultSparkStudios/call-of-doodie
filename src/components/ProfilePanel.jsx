import { useEffect, useState } from "react";
import { exportProgressBackup, importProgressBackup, previewProgressBackup, loadCareerStats, loadDoctrineArchive, loadStash, loadRunHistory, loadMetaProgress, getDailyMissions, loadMissionProgress, countIncompleteMissions } from "../storage.js";
import { ACHIEVEMENTS, ACHIEVEMENT_PROGRESS } from "../constants.js";
import { readPassport } from "../utils/obeliskPassport.js";
import { clearCloudSession } from "../utils/cloudSession.js";
import { describeAccountState, revalidateAccountSession } from "../utils/accountSession.js";
import { fetchCloudBackup, pushCloudBackup } from "../utils/cloudBackup.js";
import { getSquadCode, makeSquadCode, setSquadCode } from "../utils/squads.js";
import { capability } from "../content/capabilities.js";
import DialogShell from "./DialogShell.jsx";
import MasteryTrailPanel from "./MasteryTrailPanel.jsx";
import { evaluateMasteryTrail, loadMasteryTrail } from "../utils/masteryTrail.js";

// ProfilePanel — "Your Sewer Record" (S163). Guest-safe: everything works from
// browser storage; the Porcelain Passport adds cloud backup + sync when the
// profile service is deployed. Reached via /#profile.

const box = { padding: 12, border: "1px solid var(--cod-line)", borderRadius: 10, background: "var(--cod-panel)", marginBottom: 10 };
const h = { fontSize: 11, letterSpacing: 2, color: "var(--cod-orange)", fontWeight: 900, marginBottom: 6 };
const btn = { minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--cod-line-warm)", background: "transparent", color: "var(--cod-ink)", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" };
const cloudAvailable = capability("cloud-backup").availability === "live";

function fmt(n) { return Number(n || 0).toLocaleString(); }

const RECORD_TABS = Object.freeze([
  ["overview", "Overview"], ["runs", "Runs"], ["collection", "Collection"], ["save", "Save & Identity"],
]);

export default function ProfilePanel({ onClose, username = null, activeTab, onTabChange, onOpenRuns, onOpenCareerStats, onOpenAchievements, onOpenMissions, onOpenBuild, nemesisChronicle }) {
  const [localTab, setLocalTab] = useState("overview");
  const tab = RECORD_TABS.some(([id]) => id === activeTab) ? activeTab : localTab;
  const [career] = useState(() => loadCareerStats());
  const [history] = useState(() => { const runs = loadRunHistory(); return Array.isArray(runs) ? runs : []; });
  const [meta] = useState(() => loadMetaProgress());
  const [missions] = useState(() => getDailyMissions());
  const [missionProgress] = useState(() => loadMissionProgress());
  const [doctrines] = useState(() => loadDoctrineArchive());
  const [stash] = useState(() => loadStash());
  const [passport] = useState(() => readPassport());
  const [identity, setIdentity] = useState({ state: passport ? "checking" : "guest", cloudCapability: false });
  const [notice, setNotice] = useState("");
  const [pendingRestore, setPendingRestore] = useState(null);
  const [cloud, setCloud] = useState({ state: "idle", updatedAt: null });
  const [squad, setSquad] = useState(() => getSquadCode());
  const [squadInput, setSquadInput] = useState("");
  const [masteryTrail, setMasteryTrail] = useState(() => loadMasteryTrail());

  useEffect(() => {
    if (!passport?.subject) return;
    let alive = true;
    revalidateAccountSession(passport).then((result) => { if (alive) setIdentity(result); });
    return () => { alive = false; };
  }, [passport]);

  useEffect(() => {
    if (!passport?.subject || !cloudAvailable || identity.state !== "verified" || !identity.cloudCapability) return;
    let alive = true;
    fetchCloudBackup(passport).then((r) => {
      if (!alive) return;
      setCloud({ state: r.state, updatedAt: r.updatedAt || null });
      if (r.state === "reauth") { clearCloudSession(); setIdentity({ state: "expired", cloudCapability: false }); }
    }).catch(() => { if (alive) setCloud({ state: "unavailable", updatedAt: null }); });
    return () => { alive = false; };
  }, [passport, identity.state, identity.cloudCapability]);

  const download = () => {
    const backup = exportProgressBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `call-of-doodie-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setNotice(`Backup downloaded · ${backup.keys} records${backup.skipped.length ? ` · ${backup.skipped.length} invalid or oversized records omitted` : ""}.`);
  };
  const restore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const preview = previewProgressBackup(text);
      setPendingRestore({ backup: text, preview });
      setNotice("Review the save preview, then choose Apply restore.");
    } catch (error) {
      setNotice(String(error.message || "Restore failed."));
    } finally {
      event.target.value = "";
    }
  };
  const applyRestore = () => {
    if (!pendingRestore) return;
    try {
      const result = importProgressBackup(pendingRestore.backup);
      setNotice(`Restored ${result.restored} game records. Reload to apply everywhere.${result.ignored.length ? ` Ignored ${result.ignored.length} non-game records.` : ""}`);
      setPendingRestore(null);
    } catch (error) { setNotice(String(error.message || "Restore failed.")); }
  };
  const cloudPush = async () => {
    setCloud((c) => ({ ...c, state: "saving" }));
    const r = await pushCloudBackup(passport, exportProgressBackup());
    setCloud({ state: r.state, updatedAt: r.updatedAt || null });
    if (r.state === "reauth") { clearCloudSession(); setIdentity({ state: "expired", cloudCapability: false }); }
    setNotice(r.state === "saved" ? "Cloud backup saved." : r.message || "Cloud backup is not enabled yet.");
  };
  const cloudPull = async () => {
    const r = await fetchCloudBackup(passport);
    if (r.state === "reauth") { clearCloudSession(); setIdentity({ state: "expired", cloudCapability: false }); }
    if (r.state === "found" && r.backup) {
      try {
        const preview = previewProgressBackup(r.backup);
        setPendingRestore({ backup: r.backup, preview });
        setNotice("Review the cloud save preview, then choose Apply restore.");
      } catch (error) { setNotice(String(error.message || "Cloud restore failed.")); }
    } else setNotice(r.message || "No cloud backup yet.");
  };

  const doctrineCount = Array.isArray(doctrines?.forged) ? doctrines.forged.length : Array.isArray(doctrines) ? doctrines.length : Object.keys(doctrines || {}).length;
  const latestRun = history[0] || null;
  const masteryProgress = evaluateMasteryTrail(masteryTrail, { runs: history, doctrines, career });
  const unlocked = Array.isArray(career?.achievementsEver) ? career.achievementsEver : [];
  const nextAchievement = ACHIEVEMENTS.filter((achievement) => !unlocked.includes(achievement.id))
    .map((achievement) => {
      const rule = ACHIEVEMENT_PROGRESS[achievement.id];
      const current = rule ? Number(career?.[rule[0]] || 0) : 0;
      return { ...achievement, current, target: rule?.[1] || null, progress: rule ? current / rule[1] : -1 };
    })
    .filter((achievement) => achievement.target)
    .sort((a, b) => b.progress - a.progress)[0];
  const chooseTab = (id) => { setLocalTab(id); onTabChange?.(id); };
  const account = describeAccountState(passport, identity.state, cloudAvailable && identity.cloudCapability && ["found", "empty", "saved"].includes(cloud.state));
  const cloudEnabled = account.state === "cloud-available";

  return (
    <DialogShell data-testid="profile-panel" title="Your Sewer Record" onClose={onClose} surface="site" fullScreen zIndex={130} style={{ padding: "max(16px, env(safe-area-inset-top)) 12px max(24px, env(safe-area-inset-bottom))", color: "var(--cod-ink)", fontFamily: "var(--font-mono)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={h}>YOUR SEWER RECORD</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>{username ? `@${username}` : "Guest operative"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close profile" style={{ ...btn, minWidth: 48 }}>✕</button>
        </div>

        <nav aria-label="Player Record sections" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
          {RECORD_TABS.map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => chooseTab(id)} style={{ ...btn, background: tab === id ? "var(--cod-panel-strong)" : "transparent", borderColor: tab === id ? "var(--cod-orange)" : "var(--cod-line)", color: tab === id ? "var(--cod-orange)" : "var(--cod-ink)", boxShadow: tab === id ? "inset 0 -3px var(--cod-orange)" : "none" }}>{label}</button>)}
        </nav>

        {tab === "overview" && <>
        {latestRun && <section style={box} aria-label="Last run"><div style={h}>LAST RUN</div><div>Wave {latestRun.wave ?? "?"} · {fmt(latestRun.score)} score · {fmt(latestRun.kills)} kills</div><button type="button" onClick={() => chooseTab("runs")} style={{ ...btn, marginTop: 8 }}>See your runs</button></section>}
        {nextAchievement && <section style={box} aria-label="Next achievement"><div style={h}>NEXT ACHIEVEMENT TO UNLOCK</div><div><strong>{nextAchievement.emoji} {nextAchievement.name}</strong> · {fmt(nextAchievement.current)} / {fmt(nextAchievement.target)}</div><button type="button" onClick={() => chooseTab("collection")} style={{ ...btn, marginTop: 8 }}>See collection</button></section>}
        {(!masteryTrail || !masteryTrail.hidden) && <section style={box} aria-label="Mastery Trail"><div style={h}>MASTERY TRAIL · OPTIONAL</div><div>{masteryProgress ? <><strong>{masteryProgress.focus.icon} {masteryProgress.focus.label}</strong> · {masteryProgress.completed ? "3 / 3 steps earned" : `${1 + Number(Boolean(masteryProgress.practiceRun)) + Number(Boolean(masteryProgress.earnedId))} / 3 steps observed`}{masteryTrail.weeklyFocus ? " · this week's focus" : ""}</> : "Choose a practice focus and expressive build milestone from your saved runs."}</div><button type="button" onClick={() => chooseTab("collection")} style={{ ...btn, marginTop: 8 }}>{masteryTrail ? "Revisit trail" : "Choose a trail"}</button></section>}

        <section style={box} aria-label="Career">
          <div style={h}>CAREER</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
            {[["Best score", career.bestScore], ["Best wave", career.bestWave], ["Total kills", career.totalKills], ["Runs", career.runs ?? career.totalRuns], ["Bosses", career.bossKills ?? career.bossesKilled], ["Doctrines forged", doctrineCount]].map(([label, value]) => (
              <div key={label} style={{ padding: 8, borderRadius: 8, background: "var(--cod-panel-soft)" }}>
                <div style={{ fontSize: 10, color: "var(--cod-quiet)", letterSpacing: 1 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cod-gold)" }}>{fmt(value)}</div>
              </div>
            ))}
          </div>
        </section>

        <button type="button" style={{ ...btn, marginBottom: 14 }} onClick={onOpenCareerStats}>Full career stats</button>

        <section style={box} aria-label="Stash">
          <div style={h}>SEWER EXTRACTION STASH</div>
          <div style={{ fontSize: 13 }}>Banked loot <b style={{ color: "var(--cod-gold)" }}>{fmt(stash.total)}</b> · best haul <b>{fmt(stash.best)}</b> · extractions <b>{fmt(stash.runs)}</b></div>
        </section>
        {nemesisChronicle && <section style={box} aria-label="Nemesis chronicle"><div style={h}>NEMESIS CHRONICLE · CHAPTER {nemesisChronicle.chapter}/3</div><strong>{nemesisChronicle.title}</strong><p>{nemesisChronicle.detail}</p><p>Countermove: {nemesisChronicle.counterMove}</p></section>}

        </>}

        {tab === "runs" && <section style={box} aria-label="Recent runs"><div style={h}>RECENT RUNS</div>
          {history.length ? history.slice(0, 3).map((run, index) => <div key={`${run.ts || "run"}-${index}`} style={{ padding: "9px 0", borderBottom: "1px solid var(--cod-line)" }}>Wave {run.wave ?? "?"} · {fmt(run.score)} score · {fmt(run.kills)} kills{typeof run.mode === "string" ? ` · ${run.mode.replaceAll("_", " ")}` : ""}</div>) : <p>No runs yet. Your first attempt will appear here.</p>}
          <button type="button" style={{ ...btn, marginTop: 12 }} onClick={onOpenRuns}>Full run history, replays &amp; rivalries</button>
        </section>}

        {tab === "collection" && <>
          <section style={box} aria-label="Achievements"><div style={h}>ACHIEVEMENTS</div><p>{unlocked.length} / {ACHIEVEMENTS.length} unlocked{nextAchievement ? ` · next: ${nextAchievement.name}` : ""}</p>{unlocked.length > 0 && <p><span className="mastery-trail__stamp" style={{ marginRight: 12 }}>EARNED!</span>{ACHIEVEMENTS.find((entry) => entry.id === unlocked[unlocked.length - 1])?.name || "Achievement unlocked"}</p>}<button type="button" style={btn} onClick={onOpenAchievements}>View all achievements</button></section>
          <MasteryTrailPanel trail={masteryTrail} progress={masteryProgress} lastRun={latestRun} doctrines={doctrines} career={career} onChange={setMasteryTrail} onOpenBuild={onOpenBuild} onPlay={onClose} />
          <section style={box} aria-label="Missions"><div style={h}>DAILY MISSIONS</div><p>{countIncompleteMissions(missions, missionProgress)} remaining today</p><button type="button" style={btn} onClick={onOpenMissions}>View missions</button></section>
          <section style={box} aria-label="Doctrines"><div style={h}>DOCTRINES &amp; BUILD</div><p>{doctrineCount} forged · {fmt(meta?.careerPoints)} career points</p><button type="button" style={btn} onClick={onOpenBuild}>Open Build screen</button></section>
        </>}

        {tab === "save" && <>

        <section style={box} aria-label="Squad">
          <div style={h}>SQUAD CODE</div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--cod-muted)" }}>Share one code with friends. Every verified run you submit carries it, and the board's SQUAD tab shows your crew's best.</p>
          {squad ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span data-testid="squad-code" style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 4, color: "var(--cod-gold)" }}>{squad}</span>
              <button type="button" style={btn} onClick={() => { navigator.clipboard?.writeText?.(squad); setNotice("Squad code copied."); }}>Copy</button>
              <button type="button" style={btn} onClick={() => { setSquadCode(""); setSquad(""); setNotice("Left the squad."); }}>Leave</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input aria-label="Squad code" value={squadInput} onChange={(e) => setSquadInput(e.target.value.toUpperCase())} placeholder="JOIN A CODE" maxLength={12} style={{ ...btn, minWidth: 140, background: "var(--cod-bg-deep)" }} />
              <button type="button" style={btn} onClick={() => { const code = setSquadCode(squadInput); setSquad(code); setNotice(code ? "Joined the squad." : "Codes are 4 to 12 letters or digits."); }}>Join</button>
              <button type="button" style={btn} onClick={() => { const code = setSquadCode(makeSquadCode()); setSquad(code); setNotice("New squad created. Share the code."); }}>Create new</button>
            </div>
          )}
        </section>

        <section style={box} aria-label="Backup">
          <div style={h}>BACKUP</div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--cod-muted)" }}>Progress lives in this browser. Download a backup before clearing site data or switching devices.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={download} style={btn}>⬇ Download backup</button>
            <label style={{ ...btn, display: "inline-flex", alignItems: "center" }}>⬆ Restore backup<input type="file" accept="application/json" onChange={restore} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} /></label>
          </div>
          {pendingRestore && <div style={{ marginTop: 12, padding: 10, border: "1px solid var(--cod-line-warm)", borderRadius: 8 }}>
            <strong>Restore preview:</strong> {pendingRestore.preview.restored} game records will be replaced.
            {pendingRestore.preview.legacy ? " Legacy format; identity data will not be restored." : ""}
            {pendingRestore.preview.ignored.length ? ` ${pendingRestore.preview.ignored.length} non-game records will be ignored.` : ""}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" style={btn} onClick={applyRestore}>Apply restore</button>
              <button type="button" style={btn} onClick={() => setPendingRestore(null)}>Cancel</button>
            </div>
          </div>}
        </section>

        <section style={box} aria-label="Passport">
          <div style={h}>PORCELAIN PASSPORT</div>
          {passport?.subject ? (
            <>
              <div role="status" style={{ fontSize: 12, marginBottom: 8 }}>{identity.state === "checking" ? "Checking your Obelisk session…" : account.label}</div>
              <p style={{ fontSize: 12, margin: "0 0 8px" }}>A saved receipt is a local identity note, not proof of an active session. Its export checksum checks file integrity only.</p>
              <p style={{ fontSize: 12, margin: "0 0 8px" }}>{cloudEnabled ? `Cloud backup ${cloud.state === "found" ? `saved ${cloud.updatedAt ? new Date(cloud.updatedAt).toLocaleString() : ""}` : cloud.state}` : "Cross-device game saves are not available here. Your browser save remains playable."}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cloudEnabled && <button type="button" onClick={cloudPush} style={btn}>☁ Save to cloud</button>}
                {cloudEnabled && <button type="button" onClick={cloudPull} style={btn}>☁ Restore from cloud</button>}
                <button type="button" onClick={async () => { setIdentity({ state: "checking", cloudCapability: false }); setIdentity(await revalidateAccountSession(passport)); }} style={btn}>Recheck session</button>
                {identity.state === "verified" && <button type="button" onClick={() => { clearCloudSession(); setIdentity({ state: "receipt", cloudCapability: false }); setNotice("Session ended on this tab. Your local game save remains."); }} style={btn}>End session</button>}
                <a href="/login?next=%2F%23profile%2Fsave" style={{ ...btn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Verify with Obelisk</a>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12 }}>Guest play needs no account. Your game progress stays in this browser. <a href="/login?next=%2F%23profile%2Fsave" style={{ color: "var(--cod-cyan)" }}>Porcelain Passport</a> verifies identity separately; cross-device game saves are not active.</div>
          )}
        </section>

        </>}

        {notice && <div role="status" style={{ marginTop: 6, fontSize: 12, color: "var(--cod-gold)" }}>{notice}</div>}
      </div>
    </DialogShell>
  );
}
