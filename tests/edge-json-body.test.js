// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

// http-trust.ts is plain TypeScript with no Deno access at import time, so strip
// the types and run the real module instead of asserting on its source text.
async function loadTrust() {
  const { code } = transformSync(read("supabase/functions/_shared/http-trust.ts"), { loader: "ts", format: "esm" });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const post = (body) => new Request("https://callofdoodie.wtf/fn", { method: "POST", body });
const cors = { "Access-Control-Allow-Origin": "https://callofdoodie.wtf" };

describe("readJsonObject", () => {
  it("returns the parsed object for a valid body", async () => {
    const { readJsonObject } = await loadTrust();
    const result = await readJsonObject(post('{"runToken":"abc","n":1}'), cors);
    expect(result).toEqual({ ok: true, body: { runToken: "abc", n: 1 } });
  });

  it.each([["null", "null"], ["a bare string", '"x"'], ["a number", "7"], ["an array", "[1]"], ["non-JSON", "not json"], ["empty", ""]])(
    "answers %s with a fixed 400 that carries CORS and leaks no parser text",
    async (_label, raw) => {
      const { readJsonObject } = await loadTrust();
      const result = await readJsonObject(post(raw), cors);
      expect(result.ok).toBe(false);
      expect(result.response.status).toBe(400);
      expect(result.response.headers.get("Access-Control-Allow-Origin")).toBe("https://callofdoodie.wtf");
      expect(result.response.headers.get("Content-Type")).toBe("application/json");
      expect(await result.response.json()).toEqual({ error: "Invalid JSON body." });
    },
  );

  it("rejects an oversized body with 413 when a cap is given, and applies no cap by default", async () => {
    const { readJsonObject } = await loadTrust();
    const big = JSON.stringify({ pad: "A".repeat(5000) });
    const capped = await readJsonObject(post(big), cors, 1000);
    expect(capped.ok).toBe(false);
    expect(capped.response.status).toBe(413);
    expect((await readJsonObject(post(big), cors)).ok).toBe(true);
  });
});

describe("edge functions use the shared body guard", () => {
  it.each(["submit-score", "sync-game-run", "validate-replay"])("%s no longer calls req.json() directly", (name) => {
    const source = read(`supabase/functions/${name}/index.ts`);
    expect(source).toContain("readJsonObject(req, corsHeaders");
    expect(source).not.toMatch(/await req\.json\(\)/);
  });

  it("validate-replay caps the request, stores no trace body, and does not echo error text", () => {
    const source = read("supabase/functions/validate-replay/index.ts");
    expect(source).toContain("MAX_REQUEST_BYTES");
    expect(source).toContain("payload: anomalyPayload(body)");
    expect(source).not.toContain("payload: body");
    expect(source).not.toMatch(/"internal: "\s*\+/);
    const fn = source.slice(source.indexOf("function anomalyPayload"), source.indexOf("const VALID_MODES"));
    expect(fn).toContain("traceBodyBytes");
    expect(fn).not.toMatch(/kept\.traceBody\s*=/);
  });
});
