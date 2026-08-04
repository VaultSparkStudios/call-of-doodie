import { describe, expect, it } from "vitest";
import { buildScenarioCartridge, buildSewerRelayUrl, decodeScenarioCartridge, encodeScenarioCartridge, validateScenarioCartridge } from "./scenarioCartridge.js";

describe("scenario cartridges", () => {
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
