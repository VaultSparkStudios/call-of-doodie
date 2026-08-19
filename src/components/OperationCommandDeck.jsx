import { useMemo, useState } from "react";
import { OPERATIONS, getOperation } from "../systems/operationCampaign.js";
import { bestOperationScore, deriveOperationCampaignCarryIn, loadOperationCampaignProgress } from "../utils/operationCampaignProgress.js";

const FALLBACK_PALETTE = Object.freeze({
  accent: "#FF7A38",
  ink: "#F4F0E8",
  muted: "#B7B2AA",
  panel: "rgba(255,255,255,0.04)",
  line: "rgba(255,255,255,0.16)",
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
    OPERATIONS.map((operation) => [operation.id, routeOptions(operation)[0]?.id || ""]),
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
          const completion = campaignProgress.completions.findLast((entry) => entry.operationId === operationId);
          const best = bestOperationScore(campaignProgress, operationId);
          const carryIn = deriveOperationCampaignCarryIn(campaignProgress, operationId);
          const encounters = Array.isArray(operation.encounters) ? operation.encounters : [];
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
                OP {String(index + 1).padStart(2, "0")} · 7 ENCOUNTERS
                {completion
                  ? <> · <span data-testid={`operation-status-${operationId}`}>CLEARED</span>{best != null && <> · <span data-testid={`operation-best-score-${operationId}`}>BEST {best.toLocaleString()}</span></>}</>
                  : <> · <span data-testid={`operation-status-${operationId}`}>READY</span></>}
              </div>
              <h3 style={{ color: colors.ink, fontSize: 16, margin: "6px 0 8px" }}>{title}</h3>
              <p style={{ color: colors.muted, fontSize: 10, lineHeight: 1.45, margin: "0 0 9px" }}>
                {readable(
                  operation.brief ?? operation.briefing ?? operation.description,
                  "Secure the route and reach extraction.",
                )}
              </p>
              {encounters.length > 0 && (
                <div
                  aria-label="Encounter spine"
                  data-testid={`operation-encounter-spine-${operationId}`}
                  style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "0 0 10px" }}
                >
                  {encounters.map((enc, encIndex) => {
                    const isBoss = enc.verb === "BOSS";
                    return (
                      <span
                        key={enc.id || encIndex}
                        title={readable(enc.title, enc.verb)}
                        style={{
                          padding: "2px 5px",
                          borderRadius: 4,
                          border: `1px solid ${isBoss ? colors.accent : colors.line}`,
                          background: isBoss ? `${colors.accent}22` : "transparent",
                          color: isBoss ? colors.accent : colors.muted,
                          fontSize: 8,
                          fontWeight: 900,
                          letterSpacing: 0.8,
                          cursor: "default",
                          userSelect: "none",
                        }}
                      >
                        {enc.verb}
                      </span>
                    );
                  })}
                </div>
              )}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {routes.map((route) => <label key={route.id} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 5, padding: 6, border: `1px solid ${selectedRoutes[operationId] === route.id ? colors.accent : colors.line}`, borderRadius: 7, color: colors.ink, fontSize: 9, cursor: "pointer" }}>
                    <input type="radio" name={`operation-route-${operationId}`} value={route.id} checked={selectedRoutes[operationId] === route.id} onChange={(event) => setSelectedRoutes((current) => ({ ...current, [operationId]: event.target.value }))} />
                    {route.label || route.id}
                  </label>)}
                </div>
              </fieldset>
              <button
                aria-label={`Start operation ${title}`}
                onClick={() => onStart?.(seed, { operationId, operationMode: true, operationRoute: selectedRoutes[operationId] || routes[0]?.id })}
                style={{
                  minHeight: 48,
                  width: "100%",
                  padding: "9px 12px",
                  border: `1px solid ${colors.accent}`,
                  borderRadius: 8,
                  background: index === 0 ? colors.accent : "transparent",
                  color: index === 0 ? "#FFFFFF" : colors.ink,
                  cursor: "pointer",
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
