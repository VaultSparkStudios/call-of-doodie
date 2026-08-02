import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("protocol reference drift", () => {
  it("keeps every arc phase anchor and the Oracle proxy locally reachable", () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "protocol-drift-check.mjs"), "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    const receipt = JSON.parse(result.stdout);
    expect(result.status).toBe(0);
    expect(receipt.status).toBe("ok");
    for (const anchor of ["#§1", "#§2B", "#§2C", "#§3"]) {
      expect(receipt.checks.find((check) => check.rel.endsWith(anchor))?.ok).toBe(true);
    }
    expect(receipt.checks.find((check) => check.rel === "scripts/studio-oracle.mjs")?.ok).toBe(true);
    expect(receipt.checks.find((check) => check.rel === "behavior:ops-router-suggest")?.status).toBe("verified");
    expect(["verified", "isolated"]).toContain(
      receipt.checks.find((check) => check.rel === "behavior:secrets-audit-map")?.status,
    );
  });

  it("routes Oracle calls through the Windows-hidden Studio Ops proxy", () => {
    const source = fs.readFileSync(path.join(ROOT, "scripts", "studio-oracle.mjs"), "utf8");
    expect(source).toContain('script: "studio-oracle.mjs"');
    expect(source).toContain("runStudioScript");
    expect(source).toContain("projectBound: false");
  });

  it("reports the intentional private-map boundary explicitly in isolated CI", () => {
    const isolatedSecrets = fs.mkdtempSync(path.join(os.tmpdir(), "cod-protocol-ci-"));
    try {
      const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "protocol-drift-check.mjs"), "--json"], {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: {
          ...process.env,
          CI: "true",
          VAULTSPARK_SECRETS_DIR_OVERRIDE: isolatedSecrets,
          STUDIO_OPS_SECRETS_DIR: isolatedSecrets,
        },
      });
      const receipt = JSON.parse(result.stdout);
      const capabilityProbe = receipt.checks.find((check) => check.rel === "behavior:secrets-audit-map");
      expect(result.status).toBe(0);
      expect(receipt.status).toBe("ok");
      expect(capabilityProbe).toMatchObject({
        ok: true,
        status: "isolated",
        detail: "isolated: private capability map intentionally absent from public CI checkout",
      });
    } finally {
      fs.rmSync(isolatedSecrets, { recursive: true, force: true });
    }
  });

  it("routes Pages previews through the broker-native fallback boundary", () => {
    const source = fs.readFileSync(path.join(ROOT, "scripts", "deploy-staging-preview.mjs"), "utf8");
    expect(source).toContain("withPagesDeployEnv");
    expect(source).toContain("windowsHide: true");
    expect(source).not.toContain('getSecret("CLOUDFLARE_API_TOKEN"');
    expect(source).not.toContain('getSecret("CLOUDFLARE_ACCOUNT_ID"');
  });
});
