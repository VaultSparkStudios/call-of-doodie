import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildEdgeHealthReceipt, onRequest, onRequestGet } from "../functions/_health.js";

describe("edge runtime truth contract", () => {
  it("builds a bounded edge-only receipt without inventing backend health", () => {
    expect(buildEdgeHealthReceipt({ CF_PAGES_COMMIT_SHA: "a".repeat(40) }, new Date("2026-07-22T00:00:00.000Z"))).toEqual({
      contract: "edge-health-v1",
      status: "edge-ready",
      service: "call-of-doodie",
      scope: "cloudflare-pages-edge-only",
      deploy: "aaaaaaaaaaaa",
      checkedAt: "2026-07-22T00:00:00.000Z",
    });
  });

  it("serves typed no-store JSON and rejects non-GET methods", async () => {
    const response = onRequestGet({ env: {} });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ contract: "edge-health-v1", status: "edge-ready" });

    const routedGet = onRequest({ request: { method: "GET" }, env: {} });
    expect(routedGet.status).toBe(200);
    expect((await routedGet.json()).contract).toBe("edge-health-v1");

    const rejected = onRequest({ request: { method: "POST" } });
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("allow")).toBe("GET");
  });

  it("makes HSTS and the endpoint mandatory static release evidence", () => {
    const headers = fs.readFileSync("public/_headers", "utf8");
    const gate = fs.readFileSync("scripts/security-release-gate.mjs", "utf8");
    expect(headers).toMatch(/Strict-Transport-Security: max-age=31536000; includeSubDomains/);
    expect(gate).toContain("edge-health-endpoint-present");
    expect(gate).toContain("hsts-policy");
  });
});
