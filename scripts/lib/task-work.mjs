import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseSectionCheckboxItems } from "./task-board.mjs";

export const GENIUS_INPUTS = [
  "context/TASK_BOARD.md",
  "context/SELF_IMPROVEMENT_LOOP.md",
  "context/PROJECT_STATUS.json",
  "context/STUDIO_BRAIN.md",
  "context/GENOME_HISTORY.json",
];

const STATUS_REASONS = {
  unblocked: "Repo-owned work with no explicit external gate.",
  "credential-blocked": "Requires a named credential or provider-dashboard capability that is not proven ready.",
  "data-blocked": "Requires production or participant evidence that source code cannot fabricate.",
  "device-blocked": "Requires a physical browser, install, controller, or media pass.",
  "publication-blocked": "Requires an external publication action or launch surface.",
  "community-blocked": "Requires a real community destination to exist first.",
  "product-decision": "Requires an explicit product-scope decision before implementation.",
  "cross-repo-locked": "Owned by another repository and must travel through Studio Ark.",
  "human-blocked": "Explicitly retained in the Human Action Required lane after agent preflight.",
};

export function slugifyTask(value) {
  return String(value || "")
    .replace(/[`*_#[\]]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96) || "task";
}

export function classifyTaskTitle(title, section = "Now") {
  const text = String(title || "");
  const lower = text.toLowerCase();
  let status = "unblocked";

  if (/cross-repo|owned by another repo|\[ark\]/i.test(text)) status = "cross-repo-locked";
  else if (/\[human\/data\]|lighthouse|funnel data|production (?:metric|traffic|measurement)|human measurement/i.test(text)) status = "data-blocked";
  else if (/physical launch qa|real gamepad|pwa install|full-run media|physical-device/i.test(text)) status = "device-blocked";
  else if (/itch\.io|publish the prepared|publication|launch announcement/i.test(text)) status = "publication-blocked";
  else if (/discord invite|community (?:link|entry point).*ready/i.test(text)) status = "community-blocked";
  else if (/implementation decision|if .* (?:desired|chosen)|auth \/ studio membership|supabase auth.*(?:obelisk|account)|magic-link.*google|paid tier|traffic warrants|product decision/i.test(text)) status = "product-decision";
  else if (/\[blocker|credential-gated|github (?:repo )?settings.*secrets|posthog|sentry dsn|dashboard url allowlist/i.test(text)) status = "credential-blocked";
  if (status === "unblocked" && section === "Human Action Required") status = "human-blocked";

  const silLevel = Number.parseInt(text.match(/\[SIL:(\d+)/i)?.[1] || "0", 10);
  const axis = /protocol|script|startup|closeout|canon/i.test(text) ? "protocol"
    : /qa|input|gamepad|pwa|media/i.test(text) ? "launch-qa"
      : /replay|leaderboard|trust|score/i.test(text) ? "trust"
        : "product";
  const impact = Math.min(10, 7 + Math.min(2, silLevel) + (axis === "protocol" ? 1 : 0));
  const innovation = Math.min(10, 5 + Math.min(3, silLevel));
  const effortHours = /\[SIL:[23]/i.test(text) ? 3 : 2;
  const finalScore = Math.min(100, 68 + silLevel * 8 + (section === "Now" ? 4 : 0) + (status === "unblocked" ? 10 : 0));

  return {
    status,
    executable: status === "unblocked",
    reason: STATUS_REASONS[status],
    silLevel,
    axis,
    score: { impact, innovation, effortHours, finalScore },
    signals: {
      explicitBlocker: /\[blocker/i.test(lower),
      humanData: /\[human\/data\]/i.test(lower),
      section,
    },
  };
}

export function collectTaskWork(markdown, sections = ["Now", "Deferred"]) {
  const items = [];
  let sourceOrder = 0;
  for (const section of sections) {
    for (const node of parseSectionCheckboxItems(markdown, section)) {
      const title = node.body;
      const classification = classifyTaskTitle(title, section);
      items.push({
        slug: slugifyTask(title),
        title,
        line: node.line,
        source: `context/TASK_BOARD.md#${section.toLowerCase().replace(/\s+/g, "-")}`,
        section,
        sourceOrder: sourceOrder++,
        ...classification,
      });
    }
  }
  return items.sort((a, b) => b.score.finalScore - a.score.finalScore || a.sourceOrder - b.sourceOrder);
}

export function buildInputState(root, inputs = GENIUS_INPUTS) {
  return inputs.map((relativePath) => {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) return { path: relativePath, exists: false, bytes: 0, sha256: null };
    const content = fs.readFileSync(absolutePath);
    return {
      path: relativePath,
      exists: true,
      bytes: content.length,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
    };
  });
}

export function inputStateMatches(left = [], right = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function summarizeTaskWork(items = []) {
  const byStatus = {};
  for (const item of items) byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  const executable = items.filter((item) => item.executable).length;
  return { total: items.length, executable, deferred: items.length - executable, exhausted: executable === 0, byStatus };
}
