import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(
  path.resolve(import.meta.dirname, "..", ".github", "workflows", "deploy-cloudflare.yml"),
  "utf8",
);
const fallbackWorkflow = fs.readFileSync(
  path.resolve(import.meta.dirname, "..", ".github", "workflows", "deploy.yml"),
  "utf8",
);

describe("Cloudflare staging workflow", () => {
  it("deploys main to production and session branches to isolated Pages previews", () => {
    expect(workflow).toContain('branches: ["main", "session-*"]');
    expect(workflow).toContain("--branch=${{ github.ref_name }}");
    expect(workflow).toContain("github.ref_name == 'main'");
    expect(workflow).toContain("call-of-doodie.pages.dev");
  });

  it("checks out full history anywhere deterministic public content is built or validated", () => {
    expect(workflow.match(/fetch-depth: 0/g)).toHaveLength(2);
    expect(fallbackWorkflow.match(/fetch-depth: 0/g)).toHaveLength(2);
  });
});
