// Input handlers, deferred shots and simulation ticks share live blocker refs.
export function createGameplayBarrier(blockers) {
  const refs = Object.values(blockers);
  return () => refs.some((ref) => Boolean(ref.current));
}
