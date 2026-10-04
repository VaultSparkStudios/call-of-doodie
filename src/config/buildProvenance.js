export function normalizeBuildProvenance(value) {
  return {
    sourceSha: typeof value?.sourceSha === "string" && /^[a-f0-9]{40}$/.test(value.sourceSha) ? value.sourceSha : null,
    workingTreeDirty: typeof value?.workingTreeDirty === "boolean" ? value.workingTreeDirty : null,
  };
}

export const BUILD_PROVENANCE = Object.freeze(normalizeBuildProvenance(
  typeof __COD_BUILD_PROVENANCE__ === "undefined" ? null : __COD_BUILD_PROVENANCE__,
));
