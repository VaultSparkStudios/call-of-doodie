/**
 * mutationResolution.js — App.jsx domain refactor, slice 7
 *
 * Pure functions for mutation challenge accept/skip logic.
 * App.jsx calls these and applies the returned state delta.
 */

/**
 * Accept a mutation challenge. Returns the state delta to apply.
 *
 * @param {{ coins?: number }} gameState
 * @param {{ id: string, reward?: number, apply: (gs: object) => void }} mutation
 * @returns {{ coins: number, floatingText: { text: string, color: string } }}
 */
export function acceptMutation(gameState, mutation) {
  if (!gameState || !mutation) return null;
  const reward = mutation.reward || 0;
  mutation.apply(gameState);
  const coins = (gameState.coins || 0) + reward;
  return {
    coins,
    floatingText: { text: `+${reward} 💩 CHALLENGE ACCEPTED!`, color: "#FFD700" },
  };
}

/**
 * Skip a mutation challenge. Returns null — no state change beyond clearing pending.
 */
export function skipMutation() {
  return null;
}

/**
 * Validate that a mutation object has the minimum shape required.
 * Prevents silent failures if the mutation pool changes.
 */
export function isValidMutation(mutation) {
  return (
    mutation != null &&
    typeof mutation.id === "string" &&
    typeof mutation.apply === "function"
  );
}
