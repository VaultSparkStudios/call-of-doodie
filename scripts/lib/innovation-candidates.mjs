function canonicalTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[`*_#[\]]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function dedupeInnovationCandidates(items = [], limit = 8) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = canonicalTitle(item?.title) || canonicalTitle(item?.slug);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}
