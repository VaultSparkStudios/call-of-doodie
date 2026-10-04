import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";
import { getOperation } from "../systems/operationCampaign.js";
import { DIFFICULTIES } from "../constants.js";

// Public discovery links select a launch; they never auto-start or overwrite
// saved setup unless an explicit seed/difficulty is supplied. Invitations win.
export function parseLaunchIntent(search = "") {
  const params = new URLSearchParams(search);
  if (["scenario", "replay"].some((key) => params.has(key))) return null;
  const setup = {};
  const seed = params.get("seed");
  if (seed && /^\d{1,9}$/.test(seed)) setup.seed = Number(seed);
  const difficulty = params.get("diff");
  if (Object.hasOwn(DIFFICULTIES, difficulty)) setup.difficulty = difficulty;
  const operation = getOperation(params.get("operation"));
  if (operation) {
    const requestedRoute = params.get("route");
    return {
      kind: "operation",
      id: operation.id,
      route: operation.routeOptions.includes(requestedRoute) ? requestedRoute : operation.routeOptions[0],
      ...setup,
    };
  }
  const id = params.get("mode");
  return FULL_MODE_CATALOG.some((mode) => mode.id === id) ? { kind: "mode", id, ...setup } : null;
}
