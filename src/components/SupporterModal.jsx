// ===== SUPPORTER MODAL =====
// Cosmetic-only supporter pack. Links to Ko-fi. No gameplay impact.
// Badge is stored in localStorage (Option A) — no backend required.
// Future Option B: sync to Supabase callsign_claims.supporter column.

import { useState, useRef, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { isSupporter, setSupporter } from "../utils/supporter.js";

const KOFI_URL = "https://ko-fi.com/vaultsparkstudios";

const PERKS = [
  { icon: "⭐", label: "Gold star badge on leaderboard rows" },
  { icon: "🏅", label: "Doodie OG title on your profile" },
  { icon: "💛", label: "Genuine appreciation from the dev" },
];

export default function SupporterModal({ onClose }) {
  const [claimed, setClaimed] = useState(() => isSupporter());
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);

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
    alignItems: "center", justifyContent: "center",
    padding: 16, backdropFilter: "blur(8px)",
  };
  const panel = {
    background: "rgba(20,15,30,0.97)",
    border: "1px solid rgba(255,215,0,0.35)",
    borderRadius: 14, padding: "28px 24px",
    maxWidth: 420, width: "100%",
    color: "#fff", fontFamily: "'Courier New',monospace",
    position: "relative",
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
              You&apos;re a Supporter!
            </p>
            <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>
              Thank you — the ⭐ badge will appear on your leaderboard entries.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              onClick={() => { setSupporter(); setClaimed(true); }}
              style={{ ...btnBase, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#aaa", fontSize: 13 }}
            >
              I already supported — claim my badge
            </button>
          </div>
        )}

        <p style={{ color: "#555", fontSize: 10, margin: "16px 0 0", textAlign: "center" }}>
          Badge is stored locally. Cloud sync coming soon.
        </p>
      </div>
    </div>
  );
}
