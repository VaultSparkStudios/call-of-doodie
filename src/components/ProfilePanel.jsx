import { useEffect, useState } from "react";
import { exportProgressBackup, importProgressBackup, loadCareerStats, loadDoctrineArchive, loadStash } from "../storage.js";
import { readPassport } from "../utils/obeliskPassport.js";
import { fetchCloudBackup, pushCloudBackup } from "../utils/cloudBackup.js";
import { getSquadCode, makeSquadCode, setSquadCode } from "../utils/squads.js";

// ProfilePanel — "Your Sewer Record" (S163). Guest-safe: everything works from
// browser storage; the Porcelain Passport adds cloud backup + sync when the
// profile service is deployed. Reached via /#profile.

const box = { padding: 12, border: "1px solid var(--cod-line)", borderRadius: 10, background: "var(--cod-panel)", marginBottom: 10 };
const h = { fontSize: 11, letterSpacing: 2, color: "var(--cod-orange)", fontWeight: 900, marginBottom: 6 };
const btn = { minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--cod-line-warm)", background: "transparent", color: "var(--cod-ink)", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" };

function fmt(n) { return Number(n || 0).toLocaleString(); }

export default function ProfilePanel({ onClose, username = null }) {
  const [career] = useState(() => loadCareerStats());
  const [doctrines] = useState(() => loadDoctrineArchive());
  const [stash] = useState(() => loadStash());
  const [passport] = useState(() => readPassport());
  const [notice, setNotice] = useState("");
  const [cloud, setCloud] = useState({ state: "idle", updatedAt: null });
  const [squad, setSquad] = useState(() => getSquadCode());
  const [squadInput, setSquadInput] = useState("");

  useEffect(() => {
    if (!passport?.subject) return;
    let alive = true;
    fetchCloudBackup(passport).then((r) => { if (alive) setCloud({ state: r.state, updatedAt: r.updatedAt || null }); }).catch(() => { if (alive) setCloud({ state: "unavailable", updatedAt: null }); });
    return () => { alive = false; };
  }, [passport]);

  const download = () => {
    const backup = exportProgressBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `call-of-doodie-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setNotice(`Backup downloaded · ${backup.keys} records.`);
  };
  const restore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = importProgressBackup(await file.text());
      setNotice(`Restored ${result.restored} records. Reload to apply everywhere.`);
    } catch (error) {
      setNotice(String(error.message || "Restore failed."));
    }
  };
  const cloudPush = async () => {
    setCloud((c) => ({ ...c, state: "saving" }));
    const r = await pushCloudBackup(passport, exportProgressBackup());
    setCloud({ state: r.state, updatedAt: r.updatedAt || null });
    setNotice(r.state === "saved" ? "Cloud backup saved." : r.message || "Cloud backup is not enabled yet.");
  };
  const cloudPull = async () => {
    const r = await fetchCloudBackup(passport);
    if (r.state === "found" && r.backup) {
      const result = importProgressBackup(r.backup);
      setNotice(`Restored ${result.restored} records from the cloud. Reload to apply everywhere.`);
    } else setNotice(r.message || "No cloud backup yet.");
  };

  const doctrineCount = Array.isArray(doctrines?.forged) ? doctrines.forged.length : Array.isArray(doctrines) ? doctrines.length : Object.keys(doctrines || {}).length;

  return (
    <div data-testid="profile-panel" role="dialog" aria-label="Your Sewer Record" style={{ position: "fixed", inset: 0, zIndex: 130, overflow: "auto", background: "rgba(2,4,8,0.92)", padding: "max(16px, env(safe-area-inset-top)) 12px 24px", color: "var(--cod-ink)", fontFamily: "var(--font-mono)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={h}>YOUR SEWER RECORD</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>{username ? `@${username}` : "Guest operative"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close profile" style={{ ...btn, minWidth: 48 }}>✕</button>
        </div>

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

        <section style={box} aria-label="Stash">
          <div style={h}>SEWER EXTRACTION STASH</div>
          <div style={{ fontSize: 13 }}>Banked loot <b style={{ color: "var(--cod-gold)" }}>{fmt(stash.total)}</b> · best haul <b>{fmt(stash.best)}</b> · extractions <b>{fmt(stash.runs)}</b></div>
        </section>

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
        </section>

        <section style={box} aria-label="Passport">
          <div style={h}>PORCELAIN PASSPORT</div>
          {passport?.subject ? (
            <>
              <div style={{ fontSize: 12, marginBottom: 8 }}>Verified identity on this device · cloud backup {cloud.state === "found" ? `saved ${cloud.updatedAt ? new Date(cloud.updatedAt).toLocaleString() : ""}` : cloud.state === "unavailable" || cloud.state === "disabled" ? "not enabled yet" : cloud.state}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={cloudPush} style={btn}>☁ Save to cloud</button>
                <button type="button" onClick={cloudPull} style={btn}>☁ Restore from cloud</button>
                <a href="/login" style={{ ...btn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Manage passport</a>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12 }}>Guest play needs no account. <a href="/login" style={{ color: "var(--cod-cyan)" }}>Verify a Porcelain Passport</a> to back up your record to the cloud.</div>
          )}
        </section>

        {notice && <div role="status" style={{ marginTop: 6, fontSize: 12, color: "var(--cod-gold)" }}>{notice}</div>}
      </div>
    </div>
  );
}
