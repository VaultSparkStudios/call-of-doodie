// ===== SUPPORTER MODAL =====
// Cosmetic-only supporter pack. Links to Ko-fi. No gameplay impact.
// Supabase callsign_claims is authoritative; local storage only caches verified status.


import { useState, useRef, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { isSupporter, supporterVerificationStatus, verifySupporterCallsign } from "../utils/supporter.js";
import { COSMETICS, currentTrackWeek, reconcileOwnership } from "../utils/cosmeticTrack.js";
import { loadCareerStats } from "../storage.js";

const KOFI_URL = "https://ko-fi.com/vaultsparkstudios";

const PERKS = [
  { icon: "⭐", label: "Gold star badge on leaderboard rows" },
  { icon: "🏅", label: "Doodie OG title on your profile" },
  { icon: "💛", label: "Genuine appreciation from the dev" },
];

export default function SupporterModal({ callsign, onClose }) {
  const [verification, setVerification] = useState(() => supporterVerificationStatus(callsign));
  const [checking, setChecking] = useState(false);
  const claimed = verification.verified;
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    setVerification(supporterVerificationStatus(callsign));
  }, [callsign]);

  async function refreshVerification() {
    if (!callsign || checking) return;
    setChecking(true);
    const result = await verifySupporterCallsign(callsign);
    setVerification(result);
    setChecking(false);
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const overlay = {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.88)",
    zIndex: 200, display: "flex",
    alignItems: "flex-start", justifyContent: "center",
    padding: "max(16px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))",
    overflowY: "auto", WebkitOverflowScrolling: "touch", backdropFilter: "blur(8px)",
  };
  const panel = {
    background: "rgba(20,15,30,0.97)",
    border: "1px solid rgba(255,215,0,0.35)",
    borderRadius: 14, padding: "28px 24px",
    maxWidth: 420, width: "100%",
    color: "#fff", fontFamily: "'Courier New',monospace",
    position: "relative", margin: "auto 0",
  };
  const btnBase = {
    width: "100%", padding: "12px 0", borderRadius: 8,
    fontSize: 15, fontWeight: 900, cursor: "pointer",
    border: "none", fontFamily: "'Courier New',monospace",
  };

  return (
    <div
      style={overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="supporter-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} style={panel}>
        <button
          onClick={onClose}
          aria-label="Close supporter modal"
          style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
        >✕</button>

        <h2 id="supporter-title" style={{ color: "#FFD700", margin: "0 0 4px", fontSize: 22 }}>
          ⭐ Supporter Pack
        </h2>
        <p style={{ color: "#aaa", fontSize: 12, margin: "0 0 20px" }}>
          100% cosmetic. No pay-to-win. Just love for the game.
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {PERKS.map(({ icon, label }) => (
            <li key={label} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <span style={{ color: "#ddd" }}>{label}</span>
            </li>
          ))}
        </ul>

        {claimed ? (
          <div style={{ textAlign: "center", padding: "14px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
            <p style={{ color: "#FFD700", fontWeight: 900, fontSize: 16, margin: "0 0 6px" }}>
              Supporter verified for {verification.callsign}
            </p>
            <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>
              This browser cached the backend-verified status. Online leaderboard entries independently re-check it.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.18)", color: "#D8C98A", fontSize: 11, lineHeight: 1.5 }}>
              Put the exact callsign <strong style={{ color: "#FFF" }}>{callsign || "you play under"}</strong> in your Ko-fi message. The webhook—not this browser—grants the badge.
            </div>
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support on Ko-fi (opens new tab)"
              style={{ ...btnBase, display: "block", textAlign: "center", background: "linear-gradient(135deg,#FF5E5B,#FF9F43)", color: "#fff", textDecoration: "none", padding: "12px 0" }}
            >
              ☕ Support on Ko-fi
            </a>
            <button
              onClick={refreshVerification}
              disabled={!callsign || checking}
              style={{ ...btnBase, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: callsign ? "#DDD" : "#777", fontSize: 13, cursor: callsign && !checking ? "pointer" : "not-allowed" }}
            >
              {checking ? "CHECKING BACKEND…" : "REFRESH VERIFIED STATUS"}
            </button>
            {verification.status === "stale" && <p role="status" style={{ color: "#FFCC66", fontSize: 11, margin: 0 }}>Cached proof is over seven days old. Refresh it before the badge is shown again.</p>}
            {verification.status === "pending" && <p role="status" style={{ color: "#FFCC66", fontSize: 11, margin: 0 }}>Not verified yet. Confirm the Ko-fi message uses this exact callsign, then retry.</p>}
            {verification.status === "offline" && <p role="status" style={{ color: "#AAA", fontSize: 11, margin: 0 }}>Verification needs the online service. Your status was not changed.</p>}
            {verification.status === "unavailable" && <p role="status" style={{ color: "#FF9B80", fontSize: 11, margin: 0 }}>Verification is temporarily unavailable. No badge was granted.</p>}
          </div>
        )}
        <p style={{ color: "#555", fontSize: 10, margin: "16px 0 0", textAlign: "center" }}>
          Verification source: callsign_claims · local storage is cache only.
        </p>

        {/* Doodie Pass Lite — cosmetic track */}
        <CosmeticTrackBlock callsign={callsign} />
      </div>
    </div>
  );
}

function CosmeticTrackBlock({ callsign }) {
  const [career] = useState(() => loadCareerStats());
  const [reco]   = useState(() => reconcileOwnership(career, callsign));
  const week     = currentTrackWeek();
  const owned    = new Set(reco.owned);
  const supporter = isSupporter(callsign);
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,215,0,0.18)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ color: "#FFD700", fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>🎟 DOODIE PASS LITE</div>
        <div style={{ fontSize: 10, color: "#888" }}>Week {week + 1} of 4 · {supporter ? "Supporter" : "Free"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {COSMETICS.map(c => {
          const have = owned.has(c.id);
          const lockedByWeek = c.week > week || (!supporter && c.week >= week);
          return (
            <div key={c.id} title={c.name + (have ? " — owned" : lockedByWeek ? " — drops later" : c.milestone ? ` — ${c.milestone.kind}: ${c.milestone.n}` : " — supporter only")} style={{
              padding: "6px 4px", borderRadius: 6, textAlign: "center",
              background: have ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)",
              border: have ? "1px solid rgba(255,215,0,0.45)" : "1px solid rgba(255,255,255,0.08)",
              opacity: have ? 1 : (lockedByWeek ? 0.35 : 0.7),
            }}>
              <div style={{ fontSize: 18 }}>{c.emoji}</div>
              <div style={{ fontSize: 8, color: have ? "#FFD700" : "#888", marginTop: 2, lineHeight: 1.2 }}>{c.name}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#666", marginTop: 8, textAlign: "center" }}>
        Free unlocks via career milestones. Supporters unlock everything + early access.
      </div>
    </div>
  );
}
