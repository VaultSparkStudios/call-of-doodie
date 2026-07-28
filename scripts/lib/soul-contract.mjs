import { createHash } from "node:crypto";

export const SOUL_REQUIRED_SECTIONS = [
  "Player Promise", "Audience Pact", "Design Pillars", "Emotional Arc",
  "Tone Rules", "Proof Ethos", "Anti-Pillars", "Public Boundary",
];

function headings(markdown) {
  return [...String(markdown || "").matchAll(/^## (.+?)\s*$/gm)].map((match) => ({
    title: match[1].trim(),
    index: match.index,
    end: match.index + match[0].length,
  }));
}

export function validateSoulContract(markdown) {
  const source = String(markdown || "");
  const found = headings(source);
  const errors = [];
  const counts = new Map();
  for (const heading of found) counts.set(heading.title, (counts.get(heading.title) || 0) + 1);
  for (const required of SOUL_REQUIRED_SECTIONS) {
    const count = counts.get(required) || 0;
    if (count === 0) errors.push(`missing required section: ${required}`);
    if (count > 1) errors.push(`duplicate required section: ${required}`);
    const position = found.findIndex((heading) => heading.title === required);
    if (position >= 0) {
      const body = source.slice(found[position].end, found[position + 1]?.index ?? source.length)
        .replace(/<!--[\s\S]*?-->/g, "").trim();
      if (!body) errors.push(`empty required section: ${required}`);
    }
  }
  const ordered = found.filter((heading) => SOUL_REQUIRED_SECTIONS.includes(heading.title)).map((heading) => heading.title);
  if (ordered.join("|") !== SOUL_REQUIRED_SECTIONS.join("|")) errors.push("required sections are out of canonical order");
  if (/\bSession\s+\d+\b/i.test(source) || /\bDONE\s+S\d+\b/i.test(source)) {
    errors.push("session-ledger syntax belongs in context/CURRENT_STATE.md");
  }
  return {
    ok: errors.length === 0,
    schemaVersion: "soul-contract-v1",
    sourceDigest: createHash("sha256").update(source).digest("hex"),
    requiredSections: SOUL_REQUIRED_SECTIONS.length,
    presentSections: SOUL_REQUIRED_SECTIONS.filter((section) => counts.get(section) === 1).length,
    errors,
  };
}
