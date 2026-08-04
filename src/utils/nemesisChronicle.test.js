import { describe, expect, it } from "vitest";
import { buildNemesisChronicle } from "./nemesisChronicle.js";

describe("nemesis chronicle", () => {
  it("turns repeated local defeats into a bounded three-chapter dossier", () => {
    const result = buildNemesisChronicle({ career: { recentDeathsByEnemy: [{ t: 1 }, { t: 1 }, { t: 1 }, { t: 2 }] }, enemyTypes: [{ name: "A" }, { name: "Karen", tip: "Break line of sight." }] });
    expect(result).toMatchObject({ threat: "ARCH-NEMESIS", chapter: 3, title: "Karen", losses: 3 });
    expect(result.agentProjection).toEqual(expect.objectContaining({ type: "1", losses: 3 }));
  });
});
