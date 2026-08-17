import { describe, expect, it } from "vitest";
import { ENCOUNTER_VERBS } from "./operationCampaign.js";
import {
  OPERATION_ENCOUNTER_SCORE,
  OPERATION_OBJECTIVE_MOTIFS,
  buildOperationReinforcementCue,
  getOperationObjectiveMotif,
  normalizePlayerMusicVibe,
  resolveOperationEncounterScore,
} from "./operationAudioDirector.js";

describe("Operation audio director", () => {
  it("covers every canonical verb with a score decision and a distinct motif", () => {
    expect(Object.keys(OPERATION_ENCOUNTER_SCORE)).toEqual(ENCOUNTER_VERBS);
    expect(Object.keys(OPERATION_OBJECTIVE_MOTIFS)).toEqual(ENCOUNTER_VERBS);
    expect(new Set(ENCOUNTER_VERBS.map((verb) => getOperationObjectiveMotif(verb).notes.join("-"))).size).toBe(ENCOUNTER_VERBS.length);
  });

  it("turns the default Action choice into a multi-vibe chapter arc while leaving BOSS to runtime intensity", () => {
    const decisions = ENCOUNTER_VERBS.map((verb) => resolveOperationEncounterScore(verb, "action"));
    expect(new Set(decisions.map((decision) => decision.targetVibe).filter(Boolean)).size).toBeGreaterThanOrEqual(3);
    expect(decisions.at(-1)).toMatchObject({ verb: "BOSS", targetVibe: null, reasonCode: "BOSS_SCORE_OWNED_BY_RUNTIME" });
  });

  it.each(["chill", "intense", "retro", "spooky"])("preserves the explicit %s player preference", (playerVibe) => {
    expect(resolveOperationEncounterScore("BREACH", playerVibe)).toMatchObject({
      playerVibe,
      targetVibe: null,
      reasonCode: "PLAYER_VIBE_PRESERVED",
    });
  });

  it("uses Action as the safe fallback for missing or malformed preferences", () => {
    expect(normalizePlayerMusicVibe(null)).toBe("action");
    expect(normalizePlayerMusicVibe("unknown")).toBe("action");
    expect(resolveOperationEncounterScore("HUNT", null).targetVibe).toBe("spooky");
  });

  it("bounds reinforcement warnings to the objective contract ceiling", () => {
    expect(buildOperationReinforcementCue(0).count).toBe(1);
    expect(buildOperationReinforcementCue(99).count).toBe(6);
    expect(buildOperationReinforcementCue(6).startFrequency).toBeLessThan(buildOperationReinforcementCue(1).startFrequency);
  });
});
