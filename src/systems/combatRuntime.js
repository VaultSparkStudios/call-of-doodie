// combatRuntime — per-frame combat systems loaded as one dynamic chunk when a
// run starts (S163 bundle diet). App.jsx keeps a ref to this namespace; the
// headless kernel imports the same modules statically.
export { stepEnemyFrame, pickTarget } from "./enemyFrame.js";
export { stepProjectileFrame } from "./projectileFrame.js";
