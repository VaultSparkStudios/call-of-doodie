const TOP_LEVEL_SESSION = /^# (?:Active Session|Latest Completed Handoff|Previous Handoff|Latest Handoff)\s+[—-]\s+Session \d+\s*$/gm;

export function splitHandoffSessions(raw = "") {
  const normalized = String(raw).replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(TOP_LEVEL_SESSION)];
  if (matches.length > 0) {
    const header = normalized.slice(0, matches[0].index);
    const sessions = matches.map((match, index) => normalized.slice(
      match.index,
      matches[index + 1]?.index ?? normalized.length,
    ));
    return { header, sessions };
  }

  // Backward compatibility for handoffs written before top-level session labels.
  const sections = normalized.split(/\n(?=## Where We Left Off)/);
  const header = sections[0].trimStart().startsWith("## Where We Left Off") ? "" : sections.shift();
  return { header, sessions: sections };
}
