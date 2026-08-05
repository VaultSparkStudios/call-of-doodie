import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findLatestAuditSidecar } from "../scripts/lib/audit-sidecar.mjs";

const temporaryRoots = [];

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-audit-sidecar-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, "docs"));
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("audit sidecar selection", () => {
  it("uses semantic date and ordinal ordering instead of checkout mtimes", () => {
    const root = makeRoot();
    const docs = path.join(root, "docs");
    const names = [
      "AUDIT_2026-08-03_9.json",
      "AUDIT_2026-08-04.json",
      "AUDIT_2026-08-04_2.json",
    ];
    for (const name of names) fs.writeFileSync(path.join(docs, name), "{}\n");
    fs.utimesSync(path.join(docs, names[0]), new Date("2030-01-01"), new Date("2030-01-01"));
    fs.utimesSync(path.join(docs, names[2]), new Date("2020-01-01"), new Date("2020-01-01"));

    expect(findLatestAuditSidecar(root)?.name).toBe("AUDIT_2026-08-04_2.json");
  });
});
