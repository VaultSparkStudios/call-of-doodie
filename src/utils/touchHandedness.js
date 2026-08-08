/**
 * touchHandedness.js — resolves which virtual stick a touch on-screen half
 * should drive, honoring the player's controlHandedness setting.
 * Default ("right"): left half moves, right half aims/shoots.
 * "left": mirrored — right half moves, left half aims/shoots.
 */
export function resolveTouchStick(clientX, midX, controlHandedness) {
  const onLeftHalf = clientX < midX;
  const moveOnLeft = controlHandedness !== "left";
  return onLeftHalf === moveOnLeft ? "move" : "aim";
}
