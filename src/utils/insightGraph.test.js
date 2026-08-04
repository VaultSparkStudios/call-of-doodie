import { describe, expect, it } from "vitest";
import { buildInsightGraph, resolveInsightNodes } from "./insightGraph.js";

describe("run Insight Graph", () => {
  it("produces one evidence-ranked verdict, lesson, action, and agent projection", () => {
    const graph = buildInsightGraph({
      runCoach: { killedBy: "Likely overcommitment.", working: "Mobility held.", brain: { nextExperiment: "Dash before reloading." } },
      collapseCoaching: { primary: { statement: "84 observed damage landed in the final two seconds.", evidenceLevel: "observed", reasonCode: "observed_burst_finish" } },
      postRunIntel: { drill: "Save one dash.", cause: "pressure_conversion" },
      debrief: { identity: "mobile striker" },
      runTheFix: { target: "Enter the choke wave with one dash.", action: { type: "rematch", label: "Run the fix" }, focus: "tempo" },
    });
    expect(graph.verdict).toMatchObject({ evidenceLevel: "observed", reasonCode: "observed_burst_finish" });
    expect(graph.lesson).toContain("choke wave");
    expect(graph.action).toMatchObject({ type: "rematch" });
    expect(graph.agentProjection.evidence.length).toBeGreaterThan(2);
    expect(graph.fingerprint).toMatch(/^[0-9A-F]{8}$/);
  });

  it("deduplicates causes and penalizes contradictory evidence on the same topic", () => {
    const result = resolveInsightNodes([
      { id: "a", topic: "build", reasonCode: "range", confidence: .8, polarity: "risk" },
      { id: "b", topic: "build", reasonCode: "range", confidence: .5, polarity: "improve" },
      { id: "c", topic: "build", reasonCode: "pace", confidence: .7, polarity: "improve" },
    ]);
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(["a", "c"]));
    expect(result.nodes).toHaveLength(2);
    expect(result.contradictions).toHaveLength(1);
    expect(result.nodes.find((node) => node.id === "a").confidence).toBeCloseTo(.65);
  });
});
