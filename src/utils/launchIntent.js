import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";
import { getOperation } from "../systems/operationCampaign.js";

// Public discovery links select a launch; they never auto-start or overwrite
// difficulty, loadout, seed, or a higher-priority replay/scenario invitation.
export function parseLaunchIntent(search = "") {
  const params = new URLSearchParams(search);
  if (["scenario", "replay", "seed"].some((key) => params.has(key))) return null;
  const operation = getOperation(params.get("operation"));
  if (operation) {
    const requestedRoute = params.get("route");
    return {
      kind: "operation",
      id: operation.id,
      route: operation.routeOptions.includes(requestedRoute) ? requestedRoute : operation.routeOptions[0],
    };
  }
  const id = params.get("mode");
  return FULL_MODE_CATALOG.some((mode) => mode.id === id) ? { kind: "mode", id } : null;
}
