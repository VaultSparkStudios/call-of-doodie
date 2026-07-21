import { describe, expect, it } from "vitest";
import { assessDependencyTree } from "../scripts/lib/dependency-tree.mjs";

describe("dependency-tree truth", () => {
  it("accepts a clean declared root tree", () => {
    expect(assessDependencyTree({
      status: 0,
      declaredDependencies: ["react", "vite"],
      stdout: JSON.stringify({
        name: "call-of-doodie",
        dependencies: {
          react: { version: "19.2.7" },
          vite: { version: "7.3.5" },
        },
      }),
    })).toMatchObject({
      ok: true,
      dependencyCount: 2,
      problems: [],
      detail: "2 declared root dependencies match package.json + package-lock.json",
    });
  });

  it("fails closed on invalid, missing, and truly extraneous roots", () => {
    const result = assessDependencyTree({
      status: 1,
      declaredDependencies: ["package-a", "package-b"],
      stdout: JSON.stringify({
        problems: ["invalid: package-a@1.0.0", "extraneous: package-c@3.0.0"],
        dependencies: {
          "package-a": { version: "1.0.0", invalid: true },
          "package-c": { version: "3.0.0", extraneous: true },
        },
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual(expect.arrayContaining([
      "invalid: package-a@1.0.0",
      "missing: package-b",
      "extraneous: package-c@3.0.0",
    ]));
  });

  it("ignores only extraneous packages proven optional by the lockfile", () => {
    const result = assessDependencyTree({
      status: 1,
      declaredDependencies: ["sharp"],
      optionalLockedDependencies: ["@img/sharp-wasm32", "@emnapi/runtime"],
      stdout: JSON.stringify({
        problems: [
          "extraneous: @img/sharp-wasm32@0.35.3 C:/repo/node_modules/@img/sharp-wasm32",
          "extraneous: @emnapi/runtime@1.11.1 C:/repo/node_modules/@emnapi/runtime",
        ],
        dependencies: {
          sharp: { version: "0.35.3" },
          "@img/sharp-wasm32": { version: "0.35.3", extraneous: true },
          "@emnapi/runtime": { version: "1.11.1", extraneous: true },
        },
      }),
    });
    expect(result).toMatchObject({
      ok: true,
      problems: [],
      ignoredOptionalExtraneous: ["@img/sharp-wasm32", "@emnapi/runtime"],
    });
  });

  it("fails closed when npm output is not parseable", () => {
    expect(assessDependencyTree({ status: 1, stdout: "not json", stderr: "boom" })).toMatchObject({
      ok: false,
      problems: ["npm ls did not return parseable JSON"],
      stderr: "boom",
    });
  });

  it("fails closed when the npm process has no successful exit status", () => {
    expect(assessDependencyTree({
      status: null,
      declaredDependencies: ["react"],
      stdout: JSON.stringify({ dependencies: { react: { version: "19.2.7" } } }),
    })).toMatchObject({
      ok: false,
      problems: ["npm ls command failed (exit unknown)"],
    });
  });
});

