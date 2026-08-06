import { extractSessionId } from "./session-reference.mjs";

function normalizeLines(text) {
  return String(text || "").replace(/\r\n/g, "\n").split("\n");
}

export function findRepeatedSessionBlocks(text, { minimumLines = 3 } = {}) {
  const lines = normalizeLines(text);
  const anchors = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^- Session\s+\d+\b/i.test(lines[index])) anchors.push(index);
  }

  const duplicates = [];
  for (let leftIndex = 0; leftIndex < anchors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < anchors.length; rightIndex += 1) {
      const firstLine = anchors[leftIndex];
      const repeatedLine = anchors[rightIndex];
      if (extractSessionId(lines[firstLine]) !== extractSessionId(lines[repeatedLine])) continue;

      let matchingLines = 0;
      while (
        firstLine + matchingLines < lines.length
        && repeatedLine + matchingLines < lines.length
        && lines[firstLine + matchingLines] === lines[repeatedLine + matchingLines]
      ) {
        matchingLines += 1;
      }

      if (matchingLines >= minimumLines) {
        duplicates.push({
          session: extractSessionId(lines[firstLine]),
          firstLine: firstLine + 1,
          repeatedLine: repeatedLine + 1,
          matchingLines,
        });
      }
    }
  }
  return duplicates;
}

export function evaluateCurrentStateCoherence(text, options) {
  const duplicates = findRepeatedSessionBlocks(text, options);
  return {
    ok: duplicates.length === 0,
    schemaVersion: "current-state-coherence-v1",
    duplicates,
  };
}
