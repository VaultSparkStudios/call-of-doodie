import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const shared = fs.readFileSync(path.resolve("supabase/functions/_shared/http-trust.ts"), "utf8");
const issue = fs.readFileSync(path.resolve("supabase/functions/issue-run-token/index.ts"), "utf8");
const submit = fs.readFileSync(path.resolve("supabase/functions/submit-score/index.ts"), "utf8");

describe("public score API trust boundary", () => {
  it("uses explicit origins and never a wildcard", () => {
    expect(shared).toContain("https://callofdoodie.wtf");
    expect(shared).toContain("Vary");
    expect(`${shared}\n${issue}\n${submit}`).not.toContain('"Access-Control-Allow-Origin": "*"');
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
  });
});
