export default function LeaderboardPanel({ leaderboard, lbLoading, username, onClose }) {
  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
      <div style={{ ...card, maxWidth: 560, width: "100%", maxHeight: "88vh", overflow: "auto", position: "relative", border: "1px solid rgba(255,215,0,0.2)", padding: "18px 14px", color: "#fff" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
        <h3 style={{ color: "#FFD700", margin: "0 0 4px", fontSize: 18, letterSpacing: 2 }}>HALL OF SHAME</h3>
        <p style={{ color: "#BBB", fontSize: 10, margin: "0 0 14px" }}>Top 100 · Local leaderboard</p>
        {lbLoading ? (
          <p style={{ color: "#DDD", fontSize: 13 }}>Loading...</p>
        ) : leaderboard.length === 0 ? (
          <p style={{ color: "#CCC", fontStyle: "italic", fontSize: 13 }}>No entries yet. Be the first to die gloriously!</p>
        ) : (
          <div style={{ fontSize: 11 }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 65px 36px 44px 1fr", gap: 4, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.15)", color: "#DDD", fontWeight: 700, fontSize: 9, letterSpacing: 1 }}>
              <span>#</span><span>PLAYER</span><span style={{ textAlign: "right" }}>SCORE</span><span style={{ textAlign: "right" }}>W</span><span style={{ textAlign: "right" }}>TIME</span><span style={{ textAlign: "right", paddingRight: 4 }}>LAST WORDS</span>
            </div>
            {leaderboard.map((e, i) => {
              const isMe = e.name === username;
              const medal = i < 3 ? ["🥇", "🥈", "🥉"][i] : String(i + 1);
              const rowColor = i < 3 ? ["#FFD700", "#E0E0E0", "#CD7F32"][i] : "#EEE";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 65px 36px 44px 1fr", gap: 4, padding: "7px 2px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: rowColor, background: isMe ? "rgba(255,107,53,0.12)" : "transparent", borderRadius: 4, alignItems: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: i < 3 ? 14 : 11 }}>{medal}</span>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 700 }}>{e.name}</span>
                    {e.level && <span style={{ color: "#BBB", fontSize: 9, marginLeft: 4 }}>Lv{e.level}</span>}
                  </div>
                  <span style={{ textAlign: "right", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{e.score?.toLocaleString()}</span>
                  <span style={{ textAlign: "right", color: "#CCC", fontSize: 10 }}>{e.wave}</span>
                  <span style={{ textAlign: "right", color: "#BBB", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{e.time || "--"}</span>
                  <span style={{ textAlign: "right", color: "#FF69B4", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, paddingRight: 4 }}>"{e.lastWords}"</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
