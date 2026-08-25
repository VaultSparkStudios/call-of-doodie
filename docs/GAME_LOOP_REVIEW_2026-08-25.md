# Game Loop Review — Session 161

No consented participant corpus exists under `docs/PLAYTESTS/`. These scores describe executable design structure, not measured fun, balance, satisfaction, or retention.

| Axis | Score | Evidence-bound assessment |
|---|---:|---|
| Loop tightness | 9.1/10 | Operations now bind authored actions, proximity, consequence, scoring, and rematch evidence; standard combat still loses its edge compass under aim-down-sights transforms. |
| Progression curve | 8.9/10 | Build archetypes, capstones, doctrines, mastery, and route continuity are deep, but the perk decision does not preview the milestone it will cross. |
| Session engagement | 8.8/10 | Seven authored Operation verbs and mature Arcade variants give strong shape; off-screen pressure can become unreadable during zoom or burst spawns. |
| Retention hooks | 8.7/10 | Seeds, ghosts, coaching, receipts, doctrines, and Operation rivals are broad; doctrine progress is visible after commitment rather than at the choice point. |
| Soul fidelity | 9.3/10 | Guest-first play and evidence-bearing revenge align strongly; world-transformed threat cues and stale loop documentation conflict with readable chaos and proof over posture. |

Overall structural score: **9.0/10**.

## Prioritized findings

1. **The threat compass is not screen/player authoritative.** Arrows are projected from viewport center and drawn inside the aim-down-sights/world transform. Zoom can displace them, and one arrow per burst enemy can create edge noise.
2. **Perk doctrine consequences are post-choice knowledge.** The modal names matching archetypes but does not show whether a candidate advances, activates, forges, or masters the player's current doctrine.
3. **The protocol-readable loop source predates Operations.** Both Game Loop files describe only standard waves, so future design review begins from incomplete evidence.

## Next three design moves

1. Make a bounded player-relative threat compass that transforms enemy positions into screen space, aggregates burst directions, and renders after world/zoom transforms.
2. Preview exact doctrine count and milestone crossings on each perk choice using the existing pure archetype authority.
3. Update both Game Loop sources around the standard/Operation split, evidence contracts, and current failure/recovery paths.
