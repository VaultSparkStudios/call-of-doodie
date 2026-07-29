const FULL_TURN = Math.PI * 2;

export function getPlayerRenderPose(aimAngle) {
  const numericAngle = Number(aimAngle);
  const finiteAngle = Number.isFinite(numericAngle) ? numericAngle : 0;
  const weaponAngle = ((finiteAngle + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
  return Object.freeze({
    bodyAngle: 0,
    weaponAngle,
  });
}
