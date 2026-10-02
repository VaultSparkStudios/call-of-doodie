import { describe, expect, it } from "vitest";
import { STARTER_LOADOUTS } from "../constants.js";
import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";
import { buildChallengeParams, CHALLENGE_LOADOUTS, CHALLENGE_MODES, parseChallengeInvite } from "./challengePayload.js";

const now = Date.parse("2026-10-02T12:00:00Z");

describe("bounded friendly challenge invite", () => {
  it("tracks live mode and loadout IDs and parses an intact invite", () => {
    expect(CHALLENGE_MODES).toEqual(FULL_MODE_CATALOG.map((mode) => mode.id));
    expect(CHALLENGE_LOADOUTS).toEqual(STARTER_LOADOUTS.map((loadout) => loadout.id));
    const params = buildChallengeParams({ seed: 42, difficulty: "hard", mode: "zombies", loadout: "cannon", vsScore: 12000, vsName: "Rival" }, now);
    expect(parseChallengeInvite(params.toString(), now)).toMatchObject({ ok: true, invite: { seed: 42, difficulty: "hard", mode: "zombies", loadout: "cannon", vsScore: 12000 } });
  });

  it("rejects changed, repeated, excessive and expired payloads before any state write", () => {
    const params = buildChallengeParams({ seed: 42, vsScore: 12000 }, now);
    const original = params.toString();
    expect(parseChallengeInvite(original, now + 7 * 86400000 + 1000).reason).toContain("expired");
    expect(parseChallengeInvite(`${original}&seed=99`, now).ok).toBe(false);
    expect(parseChallengeInvite(`${original}&noise=${"x".repeat(600)}`, now).ok).toBe(false);
    params.set("vs", "999999");
    expect(parseChallengeInvite(params.toString(), now).reason).toContain("changed");
    expect(buildChallengeParams({ seed: 9999999999 }, now)).toBeNull();
  });
});
