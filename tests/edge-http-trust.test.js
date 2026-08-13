import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const shared = fs.readFileSync(path.resolve("supabase/functions/_shared/http-trust.ts"), "utf8");
const issue = fs.readFileSync(path.resolve("supabase/functions/issue-run-token/index.ts"), "utf8");
const submit = fs.readFileSync(path.resolve("supabase/functions/submit-score/index.ts"), "utf8");
const syncRun = fs.readFileSync(path.resolve("supabase/functions/sync-game-run/index.ts"), "utf8");
const syncEvents = fs.readFileSync(path.resolve("supabase/functions/sync-studio-events/index.ts"), "utf8");

describe("public score API trust boundary", () => {
  it("uses explicit origins and never a wildcard", () => {
    expect(shared).toContain("https://callofdoodie.wtf");
    expect(shared).toContain('url.protocol === "https:"');
    expect(shared).toContain('url.hostname.endsWith(".call-of-doodie.pages.dev")');
    expect(shared).not.toContain('url.hostname.endsWith("pages.dev")');
    expect(shared).toContain("Vary");
    expect(`${shared}\n${issue}\n${submit}\n${syncRun}\n${syncEvents}`).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("gates both public functions with hashed minute and day budgets", () => {
    for (const source of [issue, submit]) {
      expect(source).toContain("requestBucket");
      expect(source).toContain("consumeRateLimit");
      expect(source).toContain(":minute");
      expect(source).toContain(":day");
      expect(source).toContain("status: 429");
    }
    expect(shared).toContain('digest("SHA-256"');
    expect(syncEvents).toContain("requestBucket");
    expect(syncEvents).toContain("consumeRateLimit");
    expect(syncEvents).toContain("status: 429");
  });

  it("keeps run-sync signature reconstruction aligned with the token issuer", () => {
    for (const source of [issue, submit, syncRun]) {
      expect(source).toContain('.join("|")');
      expect(source).toContain("canonicalSummary");
    }
    expect(syncRun).not.toContain("const serialized = JSON.stringify");
  });
});
