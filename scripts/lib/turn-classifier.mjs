/**
 * Minimal local turn classifier used by model-router.mjs.
 *
 * Studio Ops has a richer classifier; this public game repo only needs a
 * deterministic fallback so importing the router never breaks session scripts.
 */

export function classifyTurn({ prompt = '' } = {}) {
  const text = String(prompt).toLowerCase();
  if (/\b(audit|architect|architecture|strategy|threat model|deep review|cross-repo|portfolio)\b/.test(text)) {
    return { model: 'opus', reason: 'deep-reasoning-keyword' };
  }
  if (/\b(validate|check|list|count|show|summari[sz]e|format|lint|status)\b/.test(text) && text.length < 4000) {
    return { model: 'haiku', reason: 'short-transactional-keyword' };
  }
  return { model: 'sonnet', reason: 'default-implementation' };
}

export default { classifyTurn };
