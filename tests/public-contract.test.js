import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("public human and agent contract", () => {
  it("passes the source contract validator", () => {
    const output = execFileSync(process.execPath, [
      path.join(root, "scripts", "validate-public-contract.mjs"),
      "--json",
    ], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(JSON.parse(output)).toMatchObject({
      ok: true,
      errors: [],
      checkedFiles: 28,
    });
  });

  it("keeps a clear on-domain email fallback", () => {
    const contact = fs.readFileSync(path.join(root, "public", "contact", "index.html"), "utf8");
    expect(contact).toContain("hello@callofdoodie.wtf");
    expect(contact).toContain("EMAIL SUPPORT");
    expect(contact).toContain("founder@vaultsparkstudios.com");
    expect(contact).toContain("If the game address is unavailable");
  });
});
