import { describe, expect, it } from "vitest";
import { buildScenarioCartridge, buildSewerRelayUrl, decodeScenarioCartridge, encodeScenarioCartridge, validateScenarioCartridge } from "./scenarioCartridge.js";
import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";
import { DIFFICULTIES } from "../constants.js";

describe("scenario cartridges", () => {
  it.each(FULL_MODE_CATALOG.flatMap(({ id }) => Object.keys(DIFFICULTIES).map(difficulty => [id, difficulty])))("retains %s / %s without falling back", (mode, difficulty) => {
    const setup = { seed: 42, mode, difficulty, loadout: "tank" };
    expect(decodeScenarioCartridge(encodeScenarioCartridge(buildScenarioCartridge(setup)))).toMatchObject(setup);
  });

  it("rejects unsupported setups rather than substituting a different run", () => {
    expect(buildScenarioCartridge({ mode: "future-mode" })).toBeNull();
    expect(buildScenarioCartridge({ difficulty: "nightmare" })).toBeNull();
    expect(buildScenarioCartridge({ seed: 1000000000 })).toBeNull();
    expect(buildSewerRelayUrl(null)).toBeNull();
  });

  it("authenticates historical v1 bytes before migrating nightmare to insane", () => {
    const body = { schemaVersion: "sewer-scenario-v1", seed: 42, mode: "zombies", difficulty: "nightmare", loadout: "tank", targetScore: 0, rival: null };
    let hash = 2166136261;
    for (const char of JSON.stringify(body)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    const old = { ...body, checksum: (hash >>> 0).toString(36).padStart(7, "0") };
    expect(validateScenarioCartridge(old).cartridge).toMatchObject({ schemaVersion: "sewer-scenario-v2", mode: "zombies", difficulty: "insane", seed: 42 });
    expect(validateScenarioCartridge({ ...old, seed: 43 })).toMatchObject({ valid: false, reason: "integrity" });
  });
  it("round trips a bounded deterministic run contract", () => {
    const cartridge = buildScenarioCartridge({ seed: 7272, mode: "gauntlet", difficulty: "hard", loadout: "tank", targetScore: 9000, rival: "PlungerKing" });
    expect(validateScenarioCartridge(cartridge).valid).toBe(true);
    expect(decodeScenarioCartridge(encodeScenarioCartridge(cartridge))).toEqual(cartridge);
  });

  it("rejects tampering and creates an asynchronous Sewer Relay URL", () => {
    const cartridge = buildScenarioCartridge({ seed: 42 });
    expect(validateScenarioCartridge({ ...cartridge, seed: 43 }).reason).toBe("integrity");
    expect(buildSewerRelayUrl(cartridge, "https://callofdoodie.wtf/play/?old=1")).toMatch(/\/play\/\?scenario=/);
  });
});
