import { buildInputDebugRows } from "./inputDebugRows.js";

export default function InputDebugOverlay({ data }) {
  const rows = buildInputDebugRows(data);
  return (
    <div
      data-testid="input-debug-hud"
      style={{
        position: "absolute", top: 42, right: 8, width: 260,
        maxWidth: "calc(100vw - 16px)", zIndex: 80, pointerEvents: "none",
        background: "rgba(0,0,0,0.78)", border: "1px solid rgba(0,229,255,0.45)",
        borderRadius: 8, padding: "8px 10px", color: "#DDFBFF",
        fontFamily: "'Courier New',monospace", fontSize: 10, lineHeight: 1.45,
        boxShadow: "0 0 18px rgba(0,229,255,0.16)",
      }}
    >
      <div style={{ color: "#00E5FF", fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>INPUT DIAGNOSTICS</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 6 }}>
          <span style={{ color: "#7FE6FF", fontWeight: 900 }}>{label}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
