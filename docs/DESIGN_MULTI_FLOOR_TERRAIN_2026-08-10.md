# Design: Multi-Floor Terrain (Houses, Towers, Stairs) — Session 148 Scoping

## Why this is a design doc, not a diff

The current game world (`App.jsx` game loop, `drawGame.js` renderer) is a single flat
2D plane: every entity (player, enemies, bullets, pickups, walls) has only `x, y`.
Collision (`gameHelpers.js`), pathing (enemy movement toward the player), and
rendering (`drawGame.js` draw order by `y` for pseudo-depth) all assume that plane.
Adding real multi-floor structures — a second story you walk up into via stairs,
with separate floor collision and enemies that can be on a different level than you —
is an architecture change across collision, rendering, AI targeting, and camera, not
a bounded feature addition. Freehanding it risks silently breaking core combat
feel (hit detection, enemy pathing) with no way to visually verify the result in
this environment. This doc scopes the change so it can be built and reviewed
incrementally in a future session.

## Current terrain model (for reference)

- Walls/obstacles are axis-aligned rects generated per-seed (`gameHelpers.js`
  wall generation), collision-checked in the main loop via simple AABB/circle tests.
- World "props" (theme decorations) are non-colliding decals drawn via
  `THEME_PROP_EMOJI_TO_CELL` / the theme-prop atlas — visual only, no interaction.
- There is no concept of elevation, layers, or occlusion by height.

## Proposed data model

Add a `level` (integer, 0 = ground) field to every entity that needs floor
awareness: player, enemies, bullets, pickups. Two entities can only collide /
target each other when `a.level === b.level`. Introduce `Structure` objects
(house/tower) as a new world-object type:

```js
{
  id, kind: "house" | "tower",
  footprint: { x, y, w, h },       // ground-floor collision footprint
  floors: [
    { level: 0, walkableMask: /* rect or polygon */ },
    { level: 1, walkableMask: /* ... */ },
  ],
  stairs: [
    { x, y, fromLevel: 0, toLevel: 1, facing: "n"|"s"|"e"|"w" },
  ],
}
```

## Stairs mechanic

A stair is a trigger volume, not a new physics system: when an entity's `x,y`
enters a stair's footprint while moving in the stair's `facing` direction, its
`level` flips and its render `y` gets a small offset for the climb animation.
No true 3D — this is the same trick top-down RPGs (Zelda-likes) use: stairs are
teleport-with-visual-transition, not simulated verticality.

## Rendering approach

Keep the existing single canvas / 2D draw-by-y-order pipeline. Render floor 0
first, then floor 1 entities on top, each pass clipped to that structure's
footprint so a floor-1 room occludes floor-0 entities visually beneath it (a
static "roof" sprite over the footprint when viewing from outside, removed/
transparent when the player is on that floor — same trick as isometric-lite
tools like RPG Maker's "upper layer" tiles). No camera/projection changes
needed; this stays a top-down renderer.

## AI / combat implications (the actual risk)

- Enemy pathing (`gameHelpers.js` spawn/movement) must only target the player
  when `enemy.level === player.level` — otherwise enemies on the wrong floor
  either freeze uselessly or path through walls trying to reach a player they
  can't reach. This needs its own pass: either enemies path to the nearest
  stair to their floor-target's level, or (simpler v1) enemies never spawn on
  upper floors and the mechanic is player-optional vertical cover/sniper nests.
- Ranged enemies and player weapons must not hit across floors (bullet
  `level` must match target `level` in collision checks).
- Replay/ghost-path determinism (`ghostPath.js`, seeded RNG) needs `level` in
  recorded state or ghosts will visually clip through floors on playback.

## Recommended incremental build plan

1. **v0 (safe, ships value fast):** static single-structure "watchtower" prop —
   walkable interior + one stair, no enemies ever go upstairs, purely player
   vertical cover/sniper nest. Proves the render/collision approach with the
   smallest possible AI blast radius.
2. **v1:** add `level` to enemy targeting so a subset of ranged/patrol enemies
   can use upper floors.
3. **v2:** multi-structure procedural placement per seed (houses scattered in
   the arena like today's walls), tuned for the Zombies-mode "escalating
   swarm" ask specifically — e.g. a "last stand" rooftop against a horde.

## Estimate

v0 is a real, scoped feature — roughly one focused session (new Structure
data model + stair trigger + floor-clipped render pass + one hand-placed
watchtower per zombies-mode arena). v1/v2 are each their own session given the
AI-pathing and seeded-determinism surface area touched. Recommend greenlighting
v0 specifically rather than the full ask, then reassessing after it ships and
plays.
