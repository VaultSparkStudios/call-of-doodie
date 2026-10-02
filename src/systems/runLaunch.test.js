import { describe, expect, it, vi } from "vitest";
import { prepareRunDependencies, resolveRunLaunch } from "./runLaunch.js";

describe("run launch seam", () => {
  it("keeps ordinary play on the light mode path and reuses a warm combat module", async () => {
    const launch = resolveRunLaunch({ modeId: "standard" });
    const warmCombat = { ready: true };
    const loadCombatRuntime = vi.fn();
    const result = await prepareRunDependencies({ launch, combatRuntime: warmCombat, loadCombatRuntime });
    expect(launch.operation).toBeNull();
    expect(result).toEqual({ modeRuntime: null, combatRuntime: warmCombat, gauntletLaunch: null });
    expect(loadCombatRuntime).not.toHaveBeenCalled();
  });

  it("gives an Operation sole authority over arcade and weekly rules", async () => {
    const launch = resolveRunLaunch({ operationId: "blacksite-flush", modeId: "zombies", gauntlet: true });
    const loadCombatRuntime = vi.fn(async () => ({ ready: true }));
    const result = await prepareRunDependencies({ launch, combatRuntime: null, loadCombatRuntime });
    expect(launch.modeId).toBe("standard");
    expect(launch.operation.id).toBe("blacksite-flush");
    expect(launch.gauntlet).toBe(false);
    expect(result.modeRuntime).toHaveProperty("getModeDefinition");
    expect(result.gauntletLaunch).toBeNull();
    expect(loadCombatRuntime).toHaveBeenCalledTimes(1);
  });

  it("preserves a fixed weekly opening for a non-Operation run", async () => {
    const launch = resolveRunLaunch({ modeId: "standard", gauntlet: true });
    const result = await prepareRunDependencies({ launch, combatRuntime: {}, loadCombatRuntime: vi.fn() });
    expect(result.gauntletLaunch).toMatchObject({ schemaVersion: "weekly-gauntlet-launch-v1", noShop: true, noPerkChoice: true });
  });
});
