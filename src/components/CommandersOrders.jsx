export default function CommandersOrders({
  order,
  onAction,
  onDismiss,
  palette,
}) {
  if (!order) return null;
  const isLight = palette.colorScheme === "light";
  const accent = isLight ? palette.accent : (order.action?.accent || palette.accent);
  const supporting = palette.cyan;
  return (
    <section
      aria-label="Commander's Orders"
      data-testid="commanders-orders"
      data-order-kind={order.kind}
      data-reason-code={order.reasonCode}
      style={{
        margin: "12px auto 0",
        maxWidth: 640,
        padding: "11px 12px",
        background: palette.panelSoft,
        border: `1px solid ${order.kind === "input-proof" ? "rgba(255,211,77,0.48)" : palette.line}`,
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: accent, fontSize: 13, fontWeight: 900, letterSpacing: 1.2 }}>{order.label}</div>
          <div style={{ color: palette.ink, fontSize: 18, fontWeight: 900, marginTop: 7 }}>{order.title}</div>
          <div style={{ color: palette.muted, fontSize: 15, lineHeight: 1.55, marginTop: 5 }}>{order.detail}</div>
          {order.supporting && <div style={{ color: supporting, fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{order.supporting}</div>}
        </div>
        {order.dismissible && (
          <button type="button" aria-label="Dismiss carried order" onClick={onDismiss} style={{ background: "none", border: 0, color: palette.muted, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
        )}
      </div>

      {order.steps?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 6, marginTop: 9 }}>
          {order.steps.map((step) => (
            <div key={step.label} style={{ minHeight: 58, padding: "7px 8px", borderRadius: 7, background: step.active ? (isLight ? "rgba(184,60,0,0.10)" : "rgba(255,107,53,0.13)") : step.complete ? (isLight ? "rgba(0,100,66,0.08)" : "rgba(0,255,136,0.08)") : palette.panel, border: `1px solid ${step.active ? (isLight ? "rgba(184,60,0,0.42)" : "rgba(255,107,53,0.4)") : step.complete ? (isLight ? "rgba(0,100,66,0.28)" : "rgba(0,255,136,0.22)") : palette.line}` }}>
              <div style={{ color: step.active ? (isLight ? palette.accent : "#FFB36B") : step.complete ? (isLight ? "#006442" : "#8CFFB8") : palette.muted, fontSize: 12, fontWeight: 900, letterSpacing: 0.8 }}>{step.complete ? "DONE" : step.label}</div>
              <div style={{ color: palette.ink, fontSize: 14, fontWeight: 900, marginTop: 4 }}>{step.title}</div>
            </div>
          ))}
        </div>
      )}

      {order.masteryProjection && (
        <div
          data-testid="mastery-command-brief"
          data-mastery-source={order.masteryProjection.source}
          aria-label={`Weapon mastery target from ${order.masteryProjection.source}`}
          style={{ marginTop: 9, padding: "8px 9px", borderRadius: 7, background: isLight ? "rgba(0,100,66,0.06)" : "rgba(127,230,255,0.07)", border: `1px solid ${isLight ? "rgba(0,100,66,0.22)" : "rgba(127,230,255,0.22)"}` }}
        >
          <div style={{ color: supporting, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>
            MASTERY · {order.masteryProjection.complete ? "ARSENAL COMPLETE" : order.masteryProjection.weaponName.toUpperCase()}
          </div>
          <div style={{ color: palette.ink, fontSize: 13, lineHeight: 1.4, marginTop: 3, fontWeight: 900 }}>
            {order.masteryProjection.complete
              ? `${order.masteryProjection.detail} · ALL OPEN`
              : `${order.masteryProjection.currentTierLabel} → ${order.masteryProjection.nextTierLabel} · ${order.masteryProjection.killsRemaining} KILL${order.masteryProjection.killsRemaining === 1 ? "" : "S"} · ALL OPEN`}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
        {order.action && (
          <button
            type="button"
            onClick={() => onAction?.(order.action)}
            style={{ minHeight: 48, padding: "10px 15px", borderRadius: 7, border: `1px solid ${accent}88`, background: `${accent}18`, color: accent, font: "inherit", fontSize: 15, fontWeight: 900, letterSpacing: 0.5, cursor: "pointer" }}
          >
            {String(order.action.cta).toUpperCase()}
          </button>
        )}
        <span aria-live="polite" style={{ color: palette.muted, fontSize: 12 }}>
          Evidence: {order.evidence?.kind || "local-state"} · {order.reasonCode}
        </span>
        {order.briefLines?.length > 0 && (
          <details style={{ marginLeft: "auto", color: supporting, fontSize: 14 }}>
            <summary style={{ cursor: "pointer" }}>COMMAND BRIEF</summary>
            <ol style={{ color: palette.muted, paddingLeft: 18, margin: "7px 0 0" }}>
              {order.briefLines.map((line) => <li key={line} style={{ marginTop: 3 }}>{line}</li>)}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}
