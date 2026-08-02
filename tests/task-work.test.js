import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "../scripts/lib/safe-spawn.mjs";
import {
  buildInputState,
  classifyTaskTitle,
  collectTaskWork,
  inputStateMatches,
  summarizeTaskWork,
} from "../scripts/lib/task-work.mjs";

const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("task work classification", () => {
  it.each([
    ["[SIL:2] Implement a repo-owned architecture extraction", "unblocked"],
    ["[BLOCKER S61] Update PostHog dashboard allowlist", "credential-blocked"],
    ["[Human/Data] Capture production Lighthouse evidence", "data-blocked"],
    ["Physical launch QA - verify one real gamepad", "device-blocked"],
    ["Create Itch.io listing and publish the prepared package", "publication-blocked"],
    ["Discord invite when the community entry point is ready", "community-blocked"],
    ["Supabase Auth / Studio membership implementation decision", "product-decision"],
    ["Supabase Auth + Obelisk account bridge - trigger when traffic warrants", "product-decision"],
    ["Fix missing test coverage in the local router", "unblocked"],
  ])("classifies %s as %s", (title, status) => {
    expect(classifyTaskTitle(title).status).toBe(status);
  });

  it("keeps blocked work visible while proving executable exhaustion", () => {
    const markdown = `## Now\n- [ ] [BLOCKER] Add provider key\n- [ ] Ship local fix\n\n## Deferred\n- [ ] [Human/Data] Measure production\n`;
    const items = collectTaskWork(markdown);
    expect(items.map((item) => item.status)).toContain("unblocked");
    expect(summarizeTaskWork(items)).toMatchObject({ total: 3, executable: 1, deferred: 2, exhausted: false });
  });

  it("fingerprints declared inputs instead of trusting cache age", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-genius-inputs-"));
    tempRoots.push(root);
    fs.mkdirSync(path.join(root, "context"));
    fs.writeFileSync(path.join(root, "context", "TASK_BOARD.md"), "## Now\n", "utf8");
    const before = buildInputState(root, ["context/TASK_BOARD.md"]);
    expect(inputStateMatches(before, buildInputState(root, ["context/TASK_BOARD.md"]))).toBe(true);
    fs.appendFileSync(path.join(root, "context", "TASK_BOARD.md"), "- [ ] New work\n", "utf8");
    expect(inputStateMatches(before, buildInputState(root, ["context/TASK_BOARD.md"]))).toBe(false);
  });

  it("renders schema v2 cache status and invalidates when an input changes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-genius-cache-"));
    tempRoots.push(root);
    fs.mkdirSync(path.join(root, "context"));
    fs.writeFileSync(path.join(root, "context", "TASK_BOARD.md"), "## Now\n- [ ] [Human/Data] Measure production LCP\n- [ ] Ship local boundary\n\n## Deferred\n", "utf8");
    const script = path.resolve("scripts/cache-genius-list.mjs");
    const write = spawnSync(process.execPath, [script, "--write", "--top", "12"], { cwd: root, encoding: "utf8" });
    expect(write.status).toBe(0);
    const payload = JSON.parse(write.stdout);
    expect(payload.schemaVersion).toBe("2.0");
    expect(payload.summary).toMatchObject({ total: 2, executable: 1, deferred: 1 });
    expect(payload.items.find((item) => item.status === "data-blocked")?.executable).toBe(false);
    expect(spawnSync(process.execPath, [script, "--check"], { cwd: root }).status).toBe(0);
    fs.appendFileSync(path.join(root, "context", "TASK_BOARD.md"), "- [ ] Another local boundary\n", "utf8");
    expect(spawnSync(process.execPath, [script, "--check"], { cwd: root }).status).toBe(1);
  });
});
