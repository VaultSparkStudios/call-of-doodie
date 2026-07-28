import { describe, expect, it } from "vitest";
import {
  buildSchedulePolicyReceipt,
  inspectWorkflowSource,
} from "./lib/schedule-policy.mjs";

describe("schedule-policy-receipt-v1", () => {
  it("accepts hosted event CI with explicit manual dispatch", () => {
    const workflow = inspectWorkflowSource(`
on:
  push:
  pull_request:
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
`, "event.yml");

    expect(buildSchedulePolicyReceipt([workflow])).toMatchObject({
      pass: true,
      summary: { workflows: 1, scheduled: 0, selfHosted: 0, scheduledGitWriters: 0 },
    });
  });

  it("rejects block-style and inline schedules", () => {
    const block = inspectWorkflowSource(`
on:
  schedule:
    - cron: "17 13 * * *"
`, "block.yml");
    const inline = inspectWorkflowSource("on: { schedule: [{ cron: '0 * * * *' }] }\n", "inline.yml");

    expect(buildSchedulePolicyReceipt([block, inline])).toMatchObject({
      pass: false,
      summary: { scheduled: 2 },
      findings: { scheduled: ["block.yml", "inline.yml"] },
    });
  });

  it("rejects self-hosted runners under the live Studio Canon", () => {
    const workflow = inspectWorkflowSource(`
on: [push]
jobs:
  check:
    runs-on: [self-hosted, linux, x64]
`, "self-hosted.yml");

    expect(buildSchedulePolicyReceipt([workflow])).toMatchObject({
      pass: false,
      summary: { selfHosted: 1 },
      findings: { selfHosted: ["self-hosted.yml"] },
    });
  });

  it("separately identifies a scheduled Git writer", () => {
    const workflow = inspectWorkflowSource(`
on:
  schedule:
    - cron: "0 0 * * *"
jobs:
  write:
    runs-on: ubuntu-latest
    steps:
      - run: git commit -am update && git push
`, "writer.yml");

    expect(buildSchedulePolicyReceipt([workflow])).toMatchObject({
      pass: false,
      summary: { scheduled: 1, scheduledGitWriters: 1 },
      findings: { scheduledGitWriters: ["writer.yml"] },
    });
  });
});
