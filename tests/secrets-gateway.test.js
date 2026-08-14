import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "../scripts/lib/safe-spawn.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-secrets-gateway-"));
  roots.push(root);
  const local = path.join(root, "local");
  const shared = path.join(root, "shared");
  fs.mkdirSync(local);
  fs.mkdirSync(shared);
  fs.writeFileSync(path.join(shared, "CAPABILITY_MAP.json"), JSON.stringify({ capabilities: { "demo.ready": { env: ["DEMO_KEY"] } } }));
  fs.writeFileSync(path.join(shared, "demo.env"), "DEMO_KEY=redacted-fixture-value\n");
  return { local, shared };
}

function runAudit(local, shared) {
  return spawnSync(process.execPath, [path.resolve("scripts/check-secrets.mjs"), "--audit", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    // These fixtures assert developer-host fail-closed behavior. Pin CI=false
    // so a hosted runner's ambient CI=true cannot silently change the contract
    // under test; the isolated-public-CI allowance has its own explicit court in
    // protocol-reference-drift.test.js.
    env: { ...process.env, CI: "false", VAULTSPARK_SECRETS_DIR_OVERRIDE: local, STUDIO_OPS_SECRETS_DIR: shared },
  });
}

describe("shared secrets capability map", () => {
  it("falls back to Studio Ops definitions while keeping values redacted", () => {
    const { local, shared } = fixture();
    const result = runAudit(local, shared);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("redacted-fixture-value");
    expect(JSON.parse(result.stdout)).toEqual([
      expect.objectContaining({ capability: "demo.ready", ok: true, mapSource: "studio-ops" }),
    ]);
  });

  it("gives an explicit local override precedence", () => {
    const { local, shared } = fixture();
    fs.writeFileSync(path.join(local, "CAPABILITY_MAP.json"), JSON.stringify({ capabilities: { "local.only": { env: ["LOCAL_KEY"] } } }));
    fs.writeFileSync(path.join(local, "local.env"), "LOCAL_KEY=another-redacted-fixture\n");
    const rows = JSON.parse(runAudit(local, shared).stdout);
    expect(rows).toEqual([expect.objectContaining({ capability: "local.only", ok: true, mapSource: "local" })]);
  });

  it("reports corrupt definitions loudly instead of fabricating readiness", () => {
    const { local, shared } = fixture();
    fs.writeFileSync(path.join(shared, "CAPABILITY_MAP.json"), "{not-json");
    const result = runAudit(local, shared);
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toEqual([]);
    expect(result.stderr).toContain("UNPARSEABLE");
    expect(result.stderr).toContain("resolved 0 capabilities");
  });

  it("fails closed on an empty capability universe outside isolated CI", () => {
    const { local, shared } = fixture();
    fs.writeFileSync(path.join(shared, "CAPABILITY_MAP.json"), JSON.stringify({ capabilities: {} }));
    const result = runAudit(local, shared);
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toEqual([]);
    expect(result.stderr).toContain("resolved 0 capabilities");
  });
});
