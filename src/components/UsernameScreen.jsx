export default function UsernameScreen({ username, setUsername, onContinue }) {
  const btnP = { padding: "14px 40px", fontSize: 18, fontWeight: 900, fontFamily: "'Courier New',monospace", background: "linear-gradient(180deg,#FF6B35,#CC4400)", color: "#FFF", border: "none", borderRadius: 6, cursor: "pointer", letterSpacing: 2 };
  const base = { width: "100%", height: "100dvh", margin: 0, overflow: "hidden", background: "#0a0a0a", fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column", position: "relative", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" };

  return (
    <div style={{ ...base, alignItems: "center", justifyContent: "center", color: "#fff", padding: 20, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
        <h1 style={{ fontSize: "clamp(32px,8vw,56px)", fontWeight: 900, margin: 0, background: "linear-gradient(180deg,#FFD700,#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>
          CALL OF DOODIE
        </h1>
        <p style={{ color: "#DDD", fontSize: 14, margin: "12px 0 28px" }}>Enter your callsign, soldier</p>
        <input
          type="text"
          value={username}
          maxLength={20}
          onChange={e => setUsername(e.target.value)}
          placeholder="xX_N00bSlayer_Xx"
          style={{ width: "100%", padding: "14px 16px", fontSize: 18, fontFamily: "'Courier New',monospace", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#FFD700", textAlign: "center", outline: "none", letterSpacing: 1, boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#FF6B35"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
          onKeyDown={e => { if (e.key === "Enter" && username.trim().length >= 2) onContinue(); }}
        />
        <div style={{ fontSize: 11, color: "#BBB", margin: "8px 0 20px" }}>2–20 characters, any text allowed</div>
        <button
          onClick={onContinue}
          disabled={username.trim().length < 2}
          style={{ ...btnP, opacity: username.trim().length < 2 ? 0.4 : 1, width: "100%", maxWidth: 240 }}
        >
          LOCK IN
        </button>
      </div>
    </div>
  );
}
