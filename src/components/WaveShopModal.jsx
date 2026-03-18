export default function WaveShopModal({ options, wave, onSelect }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(8px)",
      fontFamily: "'Courier New',monospace", color: "#fff",
    }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>📦</div>
        <h2 style={{ fontSize: "clamp(16px,4vw,24px)", fontWeight: 900, margin: "0 0 4px", color: "#FFD700", letterSpacing: 2 }}>
          WAVE {wave - 1} CLEAR!
        </h2>
        <p style={{ color: "#AAA", fontSize: 12, margin: "0 0 18px" }}>Choose your reward — one pick only.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", borderRadius: 10, cursor: "pointer",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,215,0,0.25)",
                color: "#fff", fontFamily: "'Courier New',monospace",
                textAlign: "left", width: "100%",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,215,0,0.12)"; e.currentTarget.style.borderColor = "rgba(255,215,0,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,215,0,0.25)"; }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{opt.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD700", marginBottom: 2 }}>{opt.name}</div>
                <div style={{ fontSize: 12, color: "#CCC" }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
