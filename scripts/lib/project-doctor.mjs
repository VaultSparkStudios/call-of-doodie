import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "./safe-spawn.mjs";
import { updateProjectStatus } from "./write-project-status.mjs";

// These package-script groups are local deterministic checks, not release or
// service-health coverage. Startup acceptance is excluded to avoid recursion.
export const DOCTOR_GROUPS = ["schema:lint", "protocol:drift", "canon:adoption-check", "runtime:boundary", "public:contract"];
const JSON_CHECKS = new Set(["scripts/check-canon-adoption-ledger.mjs", "scripts/check-runtime-boundary.mjs", "scripts/validate-public-contract.mjs"]);

export function parseDoctorOptions(args) {
  const allowed = new Set(["--json", "--quiet", "--update-json", "--fix", "--help"]);
  for (const arg of args) if (!allowed.has(arg)) throw new Error(`Unknown doctor option: ${arg}`);
  return { json: args.includes("--json"), quiet: args.includes("--quiet"), updateJson: args.includes("--update-json"), fix: args.includes("--fix"), help: args.includes("--help") };
}

export function projectDoctorManifest(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const manifest = [];
  for (const group of DOCTOR_GROUPS) {
    if (typeof pkg.scripts?.[group] !== "string") throw new Error(`Missing doctor group: ${group}`);
    for (const command of pkg.scripts[group].split(/\s*&&\s*/)) {
      // No shell, arbitrary interpreter, path traversal, installs, or network
      // commands. A changed package script must remain in this narrow grammar.
      const match = command.match(/^node (scripts\/[\w/-]+\.mjs)((?: --[\w-]+)*)$/);
      if (!match) throw new Error(`Unsupported doctor command in ${group}: ${command}`);
      const script = match[1];
      const args = match[2].trim() ? match[2].trim().split(/\s+/) : [];
      const json = JSON_CHECKS.has(script) || script === "scripts/protocol-drift-check.mjs";
      if (json && !args.includes("--json")) args.push("--json");
      manifest.push({ id: `${group}:${script}`, group, script, args, json });
    }
  }
  return { slug: pkg.name, manifest };
}

export function runProjectDoctor(root, options = {}) {
  root = fs.realpathSync(root);
  const invoke = (bin, args, timeout = 120000) => spawnSync(bin, args, { cwd: root, encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024 });
  const ranAt = new Date().toISOString();
  const checks = [];
  const subject = { slug: null, head: null, scope: "recipient-native", groups: DOCTOR_GROUPS };
  let manifest = [];
  try {
    const loaded = projectDoctorManifest(root);
    subject.slug = loaded.slug;
    manifest = loaded.manifest;
    const top = invoke("git", ["rev-parse", "--show-toplevel"]);
    const head = invoke("git", ["rev-parse", "HEAD"]);
    const worktree = invoke("git", ["status", "--porcelain"]);
    if (top.status !== 0 || head.status !== 0 || worktree.status !== 0 || fs.realpathSync(top.stdout.trim()) !== root || !/^[a-f0-9]{40,64}$/.test(head.stdout.trim())) throw new Error("Doctor subject must be the current repository root with a valid Git HEAD and readable worktree status");
    subject.head = head.stdout.trim();
    subject.worktreeDirty = worktree.stdout.trim().length > 0;
    subject.manifestDigest = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  } catch (error) {
    checks.push({ id: "doctor-subject-manifest", pass: false, blocking: true, exitCode: null, detail: error.message.split(root).join("<project>") });
  }
  // An unresolved subject never executes checks or reuses an old receipt.
  if (checks.length === 0) for (const check of manifest) {
    const started = Date.now();
    const result = invoke(process.execPath, [path.join(root, check.script), ...check.args]);
    let pass = result.status === 0 && !result.error && !result.signal;
    let detail = (result.stderr || result.stdout || result.error?.message || "No check output").trim();
    let warning = false;
    if (check.json) {
      try {
        const parsed = JSON.parse(result.stdout);
        const valid = check.script === "scripts/protocol-drift-check.mjs"
          ? ["ok", "warning"].includes(parsed.status) && parsed.summary?.missingRequired === 0
          : parsed.ok === true;
        pass = pass && valid;
        warning = pass && parsed.status === "warning";
        if (!valid) detail = `Check JSON did not prove success: ${detail}`;
      } catch { pass = false; detail = `Invalid check JSON: ${detail}`; }
    }
    detail = detail.split(root).join("<project>").split(root.replaceAll("\\", "/")).join("<project>");
    checks.push({ ...check, pass, warn: warning, blocking: !pass, exitCode: result.status, signal: result.signal || null, elapsedMs: Date.now() - started, detail: detail.slice(0, 2000) });
  }
  const failing = checks.filter(check => !check.pass).length;
  const receipt = { schemaVersion: "project-doctor-v1", date: ranAt.slice(0, 10), ranAt, generatedAt: ranAt, subject, coverage: "Recipient-native schema, protocol, adoption, runtime boundary and public contract checks; excludes Studio Ops infrastructure, network health, gameplay tests and launch approval.", persisted: Boolean(options.updateJson), overallPass: failing === 0 && checks.length > 0, passing: checks.filter(check => check.pass).length, warning: checks.filter(check => check.warn).length, failing, blockingFailing: failing, advisoryFailing: 0, skipped: 0, ran: checks.length, total: checks.length, score: checks.length ? Math.round(checks.filter(check => check.pass).length / checks.length * 100) : 0, checks, ...(options.fix ? { fix: "No automatic fixes configured; checks were measured without remediation." } : {}) };
  fs.mkdirSync(path.join(root, ".cache"), { recursive: true });
  fs.writeFileSync(path.join(root, ".cache", "doctor-last.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  if (options.updateJson) {
    // Public status carries measured counts and check outcomes only. Detailed
    // diagnostics and the executable check manifest stay in the ignored cache.
    const publicScore = { ...receipt, checks: checks.map(({ id, pass, warn, blocking, exitCode }) => ({ id, pass, ...(warn !== undefined ? { warn } : {}), blocking, exitCode })) };
    updateProjectStatus(root, status => ({ ...status, doctorScore: publicScore }), { touchLastUpdated: false });
  }
  return receipt;
}
