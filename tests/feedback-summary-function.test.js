import { describe, expect, it, vi } from "vitest";
import { readFeedbackSummary } from "../functions/api/feedback-summary.js";

const request = (origin = "https://callofdoodie.wtf") => new Request("https://callofdoodie.wtf/api/feedback-summary", { headers: { origin, "cf-connecting-ip": "198.51.100.193" } });
const env = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "public-key" };

describe("public feedback aggregate", () => {
  it("forwards only a fixed aggregate RPC and accepts a real zero sample", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      schemaVersion: "field-report-summary-v1", responses: 0, reporters: 0, returningReporters: 0,
      runnerSample: 0, sentiments: {}, reasons: {}, modes: {}, latestAt: null,
    }), { status: 200 }));
    const response = await readFeedbackSummary({ request: request(), env, fetchImpl, now: () => 1000 });
    expect(response.status).toBe(200);
    expect((await response.json()).summary.responses).toBe(0);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://db.example/rest/v1/rpc/get_cod_field_report_summary");
    expect(fetchImpl.mock.calls[0][1].body).toBe("{}");
  });

  it("fails closed for foreign origins and invalid upstream contracts", async () => {
    const foreign = await readFeedbackSummary({ request: request("https://evil.example"), env, fetchImpl: vi.fn() });
    expect(foreign.status).toBe(403);
    const bad = await readFeedbackSummary({ request: request(), env, fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify({ responses: 8 }), { status: 200 })) });
    expect(bad.status).toBe(502);
  });
});
