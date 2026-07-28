import crypto from "node:crypto";

const SCHEDULE_TOKEN = /(^|[\s[{,])schedule\s*:/i;
const CRON_TOKEN = /(^|\s)cron\s*:/i;
const SELF_HOSTED_TOKEN = /runs-on\s*:[^\n]*(?:self-hosted|\[\s*self-hosted)/i;
const GIT_WRITER_TOKEN = /\bgit\s+(?:commit|push)\b/i;

export function inspectWorkflowSource(source, file = "workflow.yml") {
  const text = String(source ?? "");
  const activeLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, ""))
    .filter((line) => line.trim() && !line.trimStart().startsWith("#"));
  const activeText = activeLines.join("\n");
  const hasSchedule = SCHEDULE_TOKEN.test(activeText) || CRON_TOKEN.test(activeText);
  const usesSelfHostedRunner = SELF_HOSTED_TOKEN.test(activeText);
  const writesGit = GIT_WRITER_TOKEN.test(activeText);

  return {
    file,
    sha256: crypto.createHash("sha256").update(text).digest("hex"),
    hasSchedule,
    usesSelfHostedRunner,
    writesGit,
    scheduledGitWriter: hasSchedule && writesGit,
  };
}

export function buildSchedulePolicyReceipt(workflows) {
  const rows = [...workflows].sort((a, b) => a.file.localeCompare(b.file));
  const scheduled = rows.filter((row) => row.hasSchedule);
  const selfHosted = rows.filter((row) => row.usesSelfHostedRunner);
  const scheduledGitWriters = rows.filter((row) => row.scheduledGitWriter);
  const pass = scheduled.length === 0
    && selfHosted.length === 0
    && scheduledGitWriters.length === 0;

  return {
    contract: "schedule-policy-receipt-v1",
    policy: {
      hostedScheduledJobsAllowed: false,
      githubSelfHostedRunnersAllowed: false,
      eventCi: "github-actions-hosted",
      rationale: "Studio Canon forbids self-hosted GitHub runners; code checks run on events or explicit manual dispatch, never timers.",
    },
    summary: {
      workflows: rows.length,
      scheduled: scheduled.length,
      selfHosted: selfHosted.length,
      scheduledGitWriters: scheduledGitWriters.length,
    },
    findings: {
      scheduled: scheduled.map(({ file }) => file),
      selfHosted: selfHosted.map(({ file }) => file),
      scheduledGitWriters: scheduledGitWriters.map(({ file }) => file),
    },
    workflows: rows,
    pass,
  };
}
