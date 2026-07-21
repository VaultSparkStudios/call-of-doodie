import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./safe-spawn.mjs";

function cleanProblems(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function problemPackageName(problem, kind) {
  const match = String(problem || "").match(new RegExp(`^${kind}:\\s+((?:@[^/\\s]+/)?[^@\\s]+)@`));
  return match?.[1] || null;
}

function isAllowedOptionalExtraneous(problem, optionalLocked) {
  const name = problemPackageName(problem, "extraneous");
  return Boolean(name && optionalLocked.has(name));
}

export function assessDependencyTree({
  status = null,
  stdout = "",
  stderr = "",
  declaredDependencies = [],
  optionalLockedDependencies = [],
} = {}) {
  let parsed;
  try {
    parsed = JSON.parse(String(stdout || "").trim());
  } catch {
    return {
      ok: false,
      status,
      dependencyCount: 0,
      problems: ["npm ls did not return parseable JSON"],
      ignoredOptionalExtraneous: [],
      detail: `unparseable dependency tree (exit ${status ?? "unknown"})`,
      stderr: String(stderr || "").trim().slice(0, 500),
    };
  }

  const dependencies = parsed?.dependencies && typeof parsed.dependencies === "object"
    ? parsed.dependencies
    : {};
  const declared = new Set(declaredDependencies);
  const optionalLocked = new Set(optionalLockedDependencies);
  const ignoredOptionalExtraneous = [];

  const reportedProblems = Array.isArray(parsed?.problems) ? parsed.problems : [];
  const problems = [];
  for (const problem of reportedProblems) {
    if (isAllowedOptionalExtraneous(problem, optionalLocked)) {
      ignoredOptionalExtraneous.push(problemPackageName(problem, "extraneous"));
    } else {
      problems.push(problem);
    }
  }

  for (const name of declared) {
    const dependency = dependencies[name];
    if (!dependency || dependency.missing) problems.push(`missing: ${name}`);
    if (dependency?.invalid) problems.push(`invalid: ${name}@${dependency.version || "unknown"}`);
  }

  for (const [name, dependency] of Object.entries(dependencies)) {
    if (dependency?.extraneous) {
      if (optionalLocked.has(name)) ignoredOptionalExtraneous.push(name);
      else problems.push(`extraneous: ${name}@${dependency.version || "unknown"}`);
    }
  }

  const ignored = cleanProblems(ignoredOptionalExtraneous);
  const uniqueProblems = cleanProblems(problems);
  const optionalOnlyNpmExit = status === 1
    && reportedProblems.length > 0
    && uniqueProblems.length === 0
    && ignored.length > 0;
  if (status !== 0 && !optionalOnlyNpmExit) {
    uniqueProblems.push(`npm ls command failed (exit ${status ?? "unknown"})`);
  }
  const dependencyCount = declared.size || Object.values(dependencies).filter((value) => !value?.extraneous).length;
  const ok = uniqueProblems.length === 0 && (status === 0 || optionalOnlyNpmExit);
  return {
    ok,
    status,
    dependencyCount,
    problems: uniqueProblems,
    ignoredOptionalExtraneous: ignored,
    detail: ok
      ? `${dependencyCount} declared root dependencies match package.json + package-lock.json${ignored.length ? `; ${ignored.length} lockfile-optional package${ignored.length === 1 ? "" : "s"} ignored` : ""}`
      : `${uniqueProblems.length || 1} dependency-tree problem${uniqueProblems.length === 1 ? "" : "s"} (exit ${status ?? "unknown"})`,
    stderr: String(stderr || "").trim().slice(0, 500),
  };
}

function readDependencyContract(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
  const declaredDependencies = Object.keys({
    ...(manifest.dependencies || {}),
    ...(manifest.devDependencies || {}),
    ...(manifest.optionalDependencies || {}),
  });
  const optionalLockedDependencies = Object.entries(lock.packages || {})
    .filter(([key, value]) => key.startsWith("node_modules/") && value?.optional)
    .map(([key]) => key.slice("node_modules/".length));
  return { declaredDependencies, optionalLockedDependencies };
}

export function runDependencyTreeCheck(root = process.cwd()) {
  let contract;
  try {
    contract = readDependencyContract(root);
  } catch (error) {
    return {
      ok: false,
      status: null,
      dependencyCount: 0,
      problems: [`dependency contract unreadable: ${error.message}`],
      ignoredOptionalExtraneous: [],
      detail: "package.json/package-lock.json dependency contract unreadable",
      stderr: "",
    };
  }

  const command = process.platform === "win32" ? "cmd" : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npm ls --depth=0 --json"]
    : ["ls", "--depth=0", "--json"];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return assessDependencyTree({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    ...contract,
  });
}

