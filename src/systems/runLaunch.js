import { getWeeklyGauntlet } from "../constants.js";
import { buildWeeklyGauntletLaunch } from "../utils/gauntletLaunch.js";
import { getOperation } from "./operationCampaign.js";
import { loadModeRuntime, needsModeRuntime } from "./modeRegistry.js";

export function resolveRunLaunch({ operationId, modeId = "standard", gauntlet = false } = {}) {
  const operation = operationId ? getOperation(operationId) : null;
  return {
    operation,
    modeId: operation ? "standard" : modeId,
    gauntlet: Boolean(gauntlet && !operation),
  };
}

export async function prepareRunDependencies({ launch, combatRuntime, loadCombatRuntime }) {
  const needsMode = needsModeRuntime(launch.modeId, { operation: Boolean(launch.operation) });
  const [modeRuntime, resolvedCombatRuntime] = await Promise.all([
    needsMode ? loadModeRuntime(launch.modeId, { operation: Boolean(launch.operation) }) : null,
    combatRuntime || loadCombatRuntime(),
  ]);
  return {
    modeRuntime,
    combatRuntime: resolvedCombatRuntime,
    gauntletLaunch: launch.gauntlet ? buildWeeklyGauntletLaunch(getWeeklyGauntlet()) : null,
  };
}
