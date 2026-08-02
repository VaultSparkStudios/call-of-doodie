function asHint(item) {
  if (!item) return null;
  return {
    title: item.title || item.id || item.slug,
    rationale: item.reason || item.rationale || item.insight || "",
    cmd: item.command || null,
  };
}

export function buildCloseoutNextHint(cache) {
  if (!cache || typeof cache !== "object") return null;

  const executable = Array.isArray(cache.items)
    ? cache.items.find((item) => item?.executable === true)
    : null;
  if (executable) return asHint(executable);

  if (cache.summary?.exhausted === true) {
    const deferred = Number(cache.summary.deferred) || 0;
    return {
      title: "Repo-executable Genius List exhausted",
      rationale: `${deferred} deferred item(s) remain visible behind evidence, credential, community, or product-decision gates.`,
      cmd: "node scripts/ops.mjs genius-list",
    };
  }

  return asHint(cache?.list?.ranked?.[0]);
}
