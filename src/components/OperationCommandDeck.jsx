import { useMemo, useState } from "react";
import { OPERATIONS, getOperation } from "../systems/operationCampaign.js";
import { getOperationRouteIntel } from "../systems/operationDirector.js";
import { deriveOperationCampaignCarryIn, loadOperationCampaignProgress } from "../utils/operationCampaignProgress.js";

const FALLBACK_PALETTE = Object.freeze({
  accent: "#FF7A38",
  ink: "#F4F0E8",
  muted: "#B7B2AA",
  panel: "rgba(255,255,255,0.04)",
  line: "rgba(255,255,255,0.16)",
});

const SCREEN_READER_ONLY = Object.freeze({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

function readable(value, fallback) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

function routeLabel(operation) {
  const routeFork = operation.acts?.find((act) => act?.routeFork)?.routeFork;
  const authoredRoutes = routeFork?.routes
    ?.map((route) => readable(route?.label, ""))
    .filter(Boolean)
    .join(" / ");
  return readable(
    operation.routeLabel ?? operation.route?.label ?? operation.route?.name ?? operation.route ?? authoredRoutes,
    "Authored objective route",
  );
}

function scoringLabel(operation) {
  return readable(
    operation.scoringLabel ?? operation.scoring?.summary ?? operation.scoring?.label ?? operation.scoring,
    "Score the route, objectives, and extraction",
  );
}

function operationTitle(operation, index) {
  return readable(operation.title ?? operation.name, `Operation ${index + 1}`);
}

function operationSeed(operation) {
  if (operation.seed != null || operation.runSeed != null) return operation.seed ?? operation.runSeed;
  let hash = 2166136261;
  for (const char of String(operation.id)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function durationLabel(operation) {
  const duration = operation.durationMinutes;
  if (Array.isArray(duration) && duration.length >= 2) return `${duration[0]}–${duration[1]} MIN`;
  if (duration && typeof duration === "object" && duration.min != null && duration.max != null) {
    return `${duration.min}–${duration.max} MIN`;
  }
  if (typeof duration === "number") return `${duration} MIN`;
  return readable(operation.durationLabel, "12–18 MIN");
}

function routeOptions(operation) {
  if (Array.isArray(operation.routeOptions)) {
    return operation.routeOptions.map((id) => ({ id, label: String(id).split("-").map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`).join(" ") }));
  }
  return operation.acts?.find((act) => act?.routeFork)?.routeFork?.routes || [];
}

export default function OperationCommandDeck({ onStart, palette = FALLBACK_PALETTE }) {
  const colors = { ...FALLBACK_PALETTE, ...palette };
  const operations = OPERATIONS.slice(0, 3).map((entry) => getOperation(entry.id) || entry);
  const [selectedRoutes, setSelectedRoutes] = useState(() => Object.fromEntries(
    OPERATIONS.map((operation) => [
      operation.id,
      routeOptions(operation).find((route) => getOperationRouteIntel(operation.id, route.id))?.id || "",
    ]),
  ));
  const campaignProgress = useMemo(() => loadOperationCampaignProgress(), []);

  return (
    <section
      aria-labelledby="operation-command-title"
      data-testid="operation-command-deck"
      style={{
        margin: "18px auto 20px",
        scrollMarginTop: 84,
        maxWidth: 880,
        padding: 14,
        border: `1px solid ${colors.accent}`,
        borderRadius: 12,
        background: `linear-gradient(145deg, ${colors.panel}, transparent)`,
        color: colors.ink,
        boxShadow: "0 14px 38px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ color: colors.accent, fontSize: 10, fontWeight: 900, letterSpacing: 2.5 }}>
          PRIMARY DEPLOYMENT PATH
        </div>
        <h2 id="operation-command-title" style={{ margin: "5px 0 3px", fontSize: 22, letterSpacing: 1.5 }}>
          OPERATIONS
        </h2>
        <p style={{ color: colors.muted, fontSize: 11, lineHeight: 1.45, margin: 0 }}>
          3 AUTHORED OPERATIONS · 7 ENCOUNTERS EACH · 12–18 MIN
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        {operations.map((operation, index) => {
          const title = operationTitle(operation, index);
          const operationId = readable(operation.id, `operation-${index + 1}`);
          const seed = operationSeed(operation);
          const routes = routeOptions(operation);
          const routeEntries = routes.map((route) => ({
            ...route,
            intel: getOperationRouteIntel(operationId, route.id),
          }));
          const selectedIntel = getOperationRouteIntel(operationId, selectedRoutes[operationId]);
          const selectedPreviewId = `operation-route-preview-${operationId}`;
          const completion = campaignProgress.completions.findLast((entry) => entry.operationId === operationId);
          const carryIn = deriveOperationCampaignCarryIn(campaignProgress, operationId);
          return (
            <article
              key={operationId}
              data-operation-id={operationId}
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 250,
                padding: 14,
                border: `1px solid ${index === 0 ? colors.accent : colors.line}`,
                borderRadius: 10,
                background: index === 0 ? `${colors.accent}12` : colors.panel,
              }}
            >
              <div style={{ color: colors.accent, fontSize: 9, fontWeight: 900, letterSpacing: 1.6 }}>
                OP {String(index + 1).padStart(2, "0")} · 7 ENCOUNTERS · {completion ? "CLEARED" : "READY"}
              </div>
              <h3 style={{ color: colors.ink, fontSize: 16, margin: "6px 0 8px" }}>{title}</h3>
              <p style={{ color: colors.muted, fontSize: 10, lineHeight: 1.45, margin: "0 0 9px" }}>
                {readable(
                  operation.brief ?? operation.briefing ?? operation.description,
                  "Secure the route and reach extraction.",
                )}
              </p>
              <dl style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: "6px 8px", margin: "auto 0 12px", fontSize: 10 }}>
                <dt style={{ color: colors.muted }}>ROUTE</dt>
                <dd style={{ color: colors.ink, margin: 0 }}>{routeLabel(operation)}</dd>
                <dt style={{ color: colors.muted }}>SCORING</dt>
                <dd style={{ color: colors.ink, margin: 0 }}>{scoringLabel(operation)}</dd>
                <dt style={{ color: colors.muted }}>TIME</dt>
                <dd style={{ color: colors.ink, margin: 0 }}>{durationLabel(operation)}</dd>
              </dl>
              {carryIn && <p data-testid={`operation-carry-in-${operationId}`} style={{ margin: "0 0 9px", padding: 7, border: `1px solid ${colors.accent}55`, borderRadius: 7, color: colors.ink, fontSize: 9, lineHeight: 1.35 }}>
                ROUTE ECHO · {carryIn.description}
              </p>}
              <fieldset aria-label={`Choose route for ${title}`} style={{ margin: "5px 0 8px", padding: 0, border: 0 }}>
                <legend style={{ color: colors.muted, fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>CHOOSE ROUTE</legend>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 5 }}>
                  {routeEntries.map((route) => {
                    const intelId = `operation-route-intel-${operationId}-${route.id}`;
                    const selectable = Boolean(route.intel);
                    return <label key={route.id} style={{ minWidth: 0, minHeight: 58, display: "flex", alignItems: "flex-start", gap: 5, padding: 6, border: `1px solid ${selectedRoutes[operationId] === route.id ? colors.accent : colors.line}`, borderRadius: 7, color: colors.ink, fontSize: 9, cursor: selectable ? "pointer" : "not-allowed", opacity: selectable ? 1 : 0.65 }}>
                      <input
                        type="radio"
                        name={`operation-route-${operationId}`}
                        value={route.id}
                        checked={selectedRoutes[operationId] === route.id}
                        disabled={!selectable}
                        style={{ flex: "0 0 auto" }}
                        aria-describedby={intelId}
                        onChange={(event) => {
                          if (!getOperationRouteIntel(operationId, event.target.value)) return;
                          setSelectedRoutes((current) => ({ ...current, [operationId]: event.target.value }));
                        }}
                      />
                      <span style={{ display: "grid", minWidth: 0, gap: 3, overflowWrap: "anywhere" }}>
                        <strong style={{ lineHeight: 1.2 }}>{route.label || route.id}</strong>
                        <span aria-hidden="true" style={{ color: colors.muted, fontSize: 8, lineHeight: 1.3 }}>
                          {route.intel?.immediate.summary || "Route intel unavailable — selection blocked"}
                        </span>
                        <span id={intelId} style={SCREEN_READER_ONLY}>
                          {route.intel?.accessibleSummary || `${route.label || route.id}. Route intel unavailable; selection blocked.`}
                        </span>
                      </span>
                    </label>;
                  })}
                </div>
              </fieldset>
              <div
                id={selectedPreviewId}
                data-testid={`operation-route-preview-${operationId}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{ minHeight: 64, margin: "0 0 9px", padding: 7, border: `1px solid ${selectedIntel ? colors.accent : colors.line}`, borderRadius: 7, color: colors.ink, fontSize: 8, lineHeight: 1.35 }}
              >
                {selectedIntel ? <>
                  <span aria-hidden="true" style={{ display: "grid", gap: 3 }}>
                    <strong style={{ color: colors.accent, letterSpacing: 0.8 }}>SELECTED · {selectedIntel.routeLabel.toUpperCase()}</strong>
                    <span>IMMEDIATE · {selectedIntel.immediate.summary}</span>
                    {selectedIntel.nextOperationEcho && <span>
                      NEXT OPERATION ECHO · {selectedIntel.nextOperationEcho.targetOperationTitle} · {selectedIntel.nextOperationEcho.description}
                    </span>}
                  </span>
                  <span style={SCREEN_READER_ONLY}>Selected route. {selectedIntel.accessibleSummary}</span>
                </> : "ROUTE INTEL UNAVAILABLE — SELECT A VERIFIED ROUTE"}
              </div>
              <button
                aria-label={`Start operation ${title}`}
                aria-describedby={selectedPreviewId}
                disabled={!selectedIntel}
                onClick={() => {
                  if (!selectedIntel) return;
                  onStart?.(seed, { operationId, operationMode: true, operationRoute: selectedIntel.routeId });
                }}
                style={{
                  minHeight: 48,
                  width: "100%",
                  padding: "9px 12px",
                  border: `1px solid ${colors.accent}`,
                  borderRadius: 8,
                  background: index === 0 ? colors.accent : "transparent",
                  color: index === 0 ? "#FFFFFF" : colors.ink,
                  cursor: selectedIntel ? "pointer" : "not-allowed",
                  opacity: selectedIntel ? 1 : 0.65,
                  font: "900 12px 'Courier New', monospace",
                  letterSpacing: 1,
                  touchAction: "manipulation",
                }}
                type="button"
              >
                START OPERATION
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
