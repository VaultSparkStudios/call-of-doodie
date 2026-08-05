export const REPLAY_METHODS = Object.freeze({
  stateStepper: Object.freeze({
    method: "deterministic_replay_state_stepper_v1",
    coverage: "movement_aim_only",
  }),
  combatSlice: Object.freeze({
    method: "deterministic_replay_combat_slice_v1",
    coverage: "trace_movement_actions_no_enemies",
  }),
  contactEnemySlice: Object.freeze({
    method: "deterministic_contact_enemy_slice_v1",
    coverage: "trace_movement_one_contact_enemy_derived",
  }),
});

export function buildReplayCoveragePassport() {
  return {
    schemaVersion: "replay-coverage-v1",
    confidenceCeiling: "advisory",
    claim: "Deterministic slices reproduce declared command and derived-state lanes; they do not reproduce the full played fight.",
    covered: [
      {
        id: "movement-aim",
        label: "Movement + aim",
        method: REPLAY_METHODS.stateStepper.method,
        coverage: REPLAY_METHODS.stateStepper.coverage,
        evidence: "Steps bounded movement vectors, aim buckets, canvas bounds, and command checkpoints from the recorded trace.",
      },
      {
        id: "combat-actions",
        label: "Combat actions",
        method: REPLAY_METHODS.combatSlice.method,
        coverage: REPLAY_METHODS.combatSlice.coverage,
        evidence: "Steps dash, shoot, reload, grenade, ammunition, reserve, and cooldown state without enemies.",
      },
      {
        id: "derived-contact-enemy",
        label: "One derived contact enemy",
        method: REPLAY_METHODS.contactEnemySlice.method,
        coverage: REPLAY_METHODS.contactEnemySlice.coverage,
        evidence: "Derives one basic seeded chase/contact model; it is not the enemy history from the played run.",
      },
    ],
    excluded: [
      { id: "full-wave-state", label: "Actual wave spawns, formations, elites, bosses, and objective state" },
      { id: "full-combat-physics", label: "Projectile paths, enemy attacks, hit resolution, pickups, perks, shops, and damage parity" },
      { id: "authoritative-outcome", label: "Exact played score, wave, health, deaths, or leaderboard authority" },
    ],
    nextFrontier: "Capture versioned enemy/projectile state and prove physics parity before raising the advisory ceiling.",
    source: "src/utils/replayResim.js",
  };
}
