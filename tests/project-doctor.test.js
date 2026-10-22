import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../scripts/lib/safe-spawn.mjs";
import { DOCTOR_GROUPS, parseDoctorOptions, projectDoctorManifest, runProjectDoctor } from "../scripts/lib/project-doctor.mjs";

const temporary = [];
afterEach(() => { for (const root of temporary.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture({ fail = false, invalidJson = false } = {}) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cod-doctor-"));
  temporary.push(parent);
  const root = path.join(parent, "recipient");
  const sibling = path.join(parent, "vaultspark-studio-ops");
  for (const dir of [root, sibling]) fs.mkdirSync(path.join(dir, "context"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(sibling, "context", "PROJECT_STATUS.json"), JSON.stringify({ doctorScore: { overallPass: false, failing: 99 } }));
  fs.writeFileSync(path.join(root, "context", "PROJECT_STATUS.json"), JSON.stringify({ name: "recipient", doctorScore: { subject: { slug: "foreign" }, overallPass: true } }));
  fs.writeFileSync(path.join(root, "context", "PROJECT_STATUS.schema.json"), JSON.stringify({ type: "object" }));
  const scripts = Object.fromEntries(DOCTOR_GROUPS.map(group => [group, "node scripts/check-canon-adoption-ledger.mjs"]));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "recipient", scripts }));
  fs.writeFileSync(path.join(root, "scripts", "check-canon-adoption-ledger.mjs"), `import fs from 'node:fs'; fs.appendFileSync('observed-cwd.txt', process.cwd()+'\\n'); console.log(${JSON.stringify(invalidJson ? "not json" : JSON.stringify({ ok: !fail }))}); process.exit(${fail ? 7 : 0});`);
  const git = args => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  git(["init", "--quiet"]);
  git(["add", "."]);
  git(["-c", "user.name=Doctor Fixture", "-c", "user.email=doctor@example.invalid", "commit", "--quiet", "-m", "fixture"]);
  return { root, sibling, head: git(["rev-parse", "HEAD"]) };
}

describe("recipient-native project doctor", () => {
  // Real Git and child-process fixtures can exceed 30s under Windows scanning.
  it("measures the recipient and persists only its own status when requested", { timeout: 90000 }, () => {
    const { root, sibling, head } = fixture();
    const localStatus = path.join(root, "context", "PROJECT_STATUS.json");
    const siblingStatus = path.join(sibling, "context", "PROJECT_STATUS.json");
    const before = fs.readFileSync(localStatus, "utf8");
    const siblingBefore = fs.readFileSync(siblingStatus, "utf8");
    const measured = runProjectDoctor(root);
    expect(measured.overallPass).toBe(true);
    expect(measured.subject).toMatchObject({ slug: "recipient", head, scope: "recipient-native" });
    expect(measured.checks).toHaveLength(DOCTOR_GROUPS.length);
    expect(fs.readFileSync(localStatus, "utf8")).toBe(before);
    const persisted = runProjectDoctor(root, { updateJson: true, fix: true });
    expect(persisted.fix).toContain("No automatic fixes configured");
    const publicScore = JSON.parse(fs.readFileSync(localStatus, "utf8")).doctorScore;
    expect(publicScore.subject).toEqual(persisted.subject);
    expect(publicScore.checks).toEqual(persisted.checks.map(({ id, pass, warn, blocking, exitCode }) => ({ id, pass, warn, blocking, exitCode })));
    expect(publicScore.checks.every(check => check.detail === undefined && check.script === undefined && check.args === undefined)).toBe(true);
    expect(JSON.stringify(publicScore)).not.toContain(root);
    expect(measured.subject.worktreeDirty).toBe(false);
    expect(persisted.subject.worktreeDirty).toBe(true);
    expect(fs.readFileSync(siblingStatus, "utf8")).toBe(siblingBefore);
    expect(fs.readFileSync(path.join(root, "observed-cwd.txt"), "utf8").trim().split("\n")).toEqual(Array(10).fill(fs.realpathSync(root)));
  });

  it.each([{ fail: true }, { invalidJson: true }])("never converts a failed or unparseable check into green: %j", { timeout: 60000 }, flags => {
    const { root } = fixture(flags);
    const result = runProjectDoctor(root, { updateJson: true });
    expect(result.overallPass).toBe(false);
    expect(result.blockingFailing).toBe(5);
    expect(result.checks.every(check => check.pass === false)).toBe(true);
    expect(result.checks.every(check => check.exitCode === (flags.fail ? 7 : 0))).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(path.join(root, "context", "PROJECT_STATUS.json"), "utf8")).doctorScore;
    expect(persisted.subject.slug).toBe("recipient");
    expect(persisted.overallPass).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(root, ".cache", "doctor-last.json"), "utf8"))).toEqual(result);
  });

  it("fails closed on malformed manifests before executing a check", () => {
    const { root } = fixture();
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    pkg.scripts["schema:lint"] = "node ../vaultspark-studio-ops/scripts/run-doctor.mjs";
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg));
    const receipt = runProjectDoctor(root);
    expect(receipt.overallPass).toBe(false);
    expect(receipt.checks[0].id).toBe("doctor-subject-manifest");
    expect(fs.existsSync(path.join(root, "observed-cwd.txt"))).toBe(false);
  });

  it("rejects unknown CLI flags before launching checks", () => {
    expect(() => parseDoctorOptions(["--project", "../other"])).toThrow("Unknown doctor option");
    expect(parseDoctorOptions(["--json", "--quiet", "--update-json", "--fix"])).toMatchObject({ json: true, quiet: true, updateJson: true, fix: true });
    const result = spawnSync(process.execPath, [path.resolve("scripts/project-doctor.mjs"), "--unknown"], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown doctor option");
  });

  it("keeps the real manifest local and free of startup/doctor recursion", () => {
    const { manifest } = projectDoctorManifest(process.cwd());
    expect(manifest.length).toBeGreaterThan(DOCTOR_GROUPS.length);
    expect(manifest.every(check => check.script.startsWith("scripts/"))).toBe(true);
    expect(manifest.some(check => /(?:doctor|startup-acceptance|health-check)/.test(check.script))).toBe(false);
  });
});
