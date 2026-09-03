import { describe, expect, it, vi } from "vitest";

const client = { from: vi.fn() };
vi.mock("../supabase.js", () => ({ getSupabaseClient: async () => client }));

const { createDuel, duelHoursLeft, duelStatus, isDuelId, loadDuel, respondDuel } = await import("./duels.js");
const { loadSquadBoard, makeSquadCode, normalizeSquadCode, setSquadCode, getSquadCode } = await import("./squads.js");

function chain(result) {
  const q = {};
  for (const m of ["insert", "select", "eq", "is", "update", "order", "limit"]) q[m] = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve) => Promise.resolve(result).then(resolve);
  return q;
}

describe("duels (S163)", () => {
  it("validates ids and derives status and hours left", () => {
    expect(isDuelId("6f1e2d3c-4b5a-4c6d-8e9f-0a1b2c3d4e5f")).toBe(true);
    expect(isDuelId("nope")).toBe(false);
    const soon = new Date(Date.now() + 3600000 * 5).toISOString();
    expect(duelStatus({ challenger_score: 100, responder_score: null, expires_at: soon })).toBe("open");
    expect(duelHoursLeft({ expires_at: soon })).toBe(5);
    expect(duelStatus({ challenger_score: 100, responder_score: 150, expires_at: soon })).toBe("responder_won");
    expect(duelStatus({ challenger_score: 100, responder_score: 50, expires_at: soon })).toBe("challenger_won");
    expect(duelStatus({ challenger_score: 100, responder_score: null, expires_at: new Date(Date.now() - 1000).toISOString() })).toBe("expired");
  });

  it("creates, loads, and responds through the client", async () => {
    client.from.mockReturnValueOnce(chain({ data: { id: "6f1e2d3c-4b5a-4c6d-8e9f-0a1b2c3d4e5f", expires_at: "x" }, error: null }));
    const created = await createDuel({ seed: 42, name: "Ann", score: 900, wave: 7 });
    expect(created.id).toMatch(/^6f1e/);
    client.from.mockReturnValueOnce(chain({ data: { id: created.id, challenger_score: 900 }, error: null }));
    expect((await loadDuel(created.id)).challenger_score).toBe(900);
    client.from.mockReturnValueOnce(chain({ data: { id: created.id, challenger_score: 900, responder_score: 1200, expires_at: "2099-01-01T00:00:00Z" }, error: null }));
    const r = await respondDuel(created.id, { name: "Bob", score: 1200, wave: 9 });
    expect(r.ok).toBe(true);
    expect(r.status).toBe("responder_won");
    client.from.mockReturnValueOnce(chain({ data: null, error: null }));
    expect((await respondDuel(created.id, { name: "Bob", score: 1, wave: 1 })).reason).toBe("already_answered_or_expired");
    expect((await respondDuel("bad", {})).ok).toBe(false);
  });
});

describe("squads (S163)", () => {
  it("normalizes, persists, and generates codes", () => {
    expect(normalizeSquadCode("sew-er 07!")).toBe("SEWER07");
    expect(normalizeSquadCode("ab")).toBe("");
    localStorage.clear();
    expect(setSquadCode("plunger")).toBe("PLUNGER");
    expect(getSquadCode()).toBe("PLUNGER");
    expect(makeSquadCode(() => 0.5)).toHaveLength(6);
  });

  it("collapses the board to the best verified score per member", async () => {
    client.from.mockReturnValueOnce(chain({ data: [
      { name: "Ann", score: 900, wave: 7, mode: "standard", difficulty: "normal", ts: 1 },
      { name: "Bob", score: 700, wave: 5, mode: "zombies", difficulty: "normal", ts: 2 },
      { name: "Ann", score: 400, wave: 3, mode: "standard", difficulty: "normal", ts: 3 },
    ], error: null }));
    const board = await loadSquadBoard("plunger");
    expect(board.code).toBe("PLUNGER");
    expect(board.members.map((m) => [m.name, m.score, m.runs])).toEqual([["Ann", 900, 2], ["Bob", 700, 1]]);
    expect(board.total).toBe(1600);
    expect((await loadSquadBoard("x")).members).toEqual([]);
  });
});
