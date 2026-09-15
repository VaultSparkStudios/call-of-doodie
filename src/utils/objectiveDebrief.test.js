import { describe, expect, it } from "vitest";
import { buildRunDebrief } from "./runDebrief.js";
import { buildNextRunDrill } from "./drillDirector.js";
import { buildInsightGraph } from "./insightGraph.js";
import { buildRunTheFixContract } from "../systems/deathFlow.js";
describe("objective result coaching", () => {
  for (const modeId of ["boss_gauntlet", "sewer_extraction", "bot_royale", "hold_the_throne"]) for (const victory of [false, true]) {
    it(modeId + (victory ? " celebrates completion" : " targets its objective"), () => {
      const headline = victory ? "OBJECTIVE COMPLETE" : "OBJECTIVE MISSED";
      const debrief = buildRunDebrief({ wave: 7, kills: 2, missionsSummary: [{ completed: false }], modeOutcome: { modeId, victory, headline }, runSeed: 123 });
      const nextRunDrill = buildNextRunDrill({ debrief, runSeed: 123, runCoach: { brain: { chokeWarning: { wave: 2, tip: "OLD RUN" } } } });
      const collapseCoaching = { primary: { statement: "Died to OLD RUN", evidenceLevel: "observed" } };
      const fix = buildRunTheFixContract({ debrief, nextRunDrill, collapseCoaching, runSeed: 123, wave: 7, rematchWave: 5 });
      const graph = buildInsightGraph({ debrief, runTheFix: fix, collapseCoaching, runCoach: { killedBy: "OLD RUN" }, postRunIntel: { drill: "finish a daily mission" } });
      expect(debrief.objective).toBe(true); expect(debrief.victory).toBe(victory);
      expect(fix.action.type).toBe("replay_seed"); expect(fix.action.startWave).toBeUndefined();
      expect(fix.action.label).toBe(victory ? "PLAY AGAIN" : "RETRY OBJECTIVE");
      expect(graph.verdict.statement).toBe(headline);
      expect(JSON.stringify({ debrief, nextRunDrill, fix, graph })).not.toMatch(/OLD RUN|daily mission|stabilize|rebuild run/i);
    });
  }
  it("keeps Classic coaching intact", () => expect(buildRunDebrief({ wave: 1 }).objective).toBeUndefined());
});
