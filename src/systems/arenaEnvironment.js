import { THEME_PROP_EMOJI_TO_CELL } from "../utils/objectAtlasContract.js";

export const ARENA_LAYOUT_NAMES = Object.freeze([
  "Pillars",
  "Corridors",
  "Cross-Rooms",
  "Bunker",
]);

export const ARENA_HAZARD_TYPES = Object.freeze(["acid", "electro", "rubble"]);

const SPAWN_SAFE = 115;

const THEME_PROPS = Object.freeze([
  Object.freeze(["🪑", "💻", "☕", "🌿", "📋", "📁", "🗑️", "🖥️", "📎", "🖨️", "📞", "🗃️"]),
  Object.freeze(["📦", "🪖", "🔦", "⛽", "🪝", "🗝️", "🧱", "🪜", "🪤", "🔒", "💣", "🪃"]),
  Object.freeze(["⚙️", "🔧", "🔩", "⛽", "📦", "🪛", "🏭", "🔌", "🪚", "🛢️", "🔋", "⚗️"]),
  Object.freeze(["🪨", "💀", "🏚️", "🪵", "⚰️", "🕸️", "🌑", "🦴", "🧟", "🕯️", "📜", "🗡️"]),
  Object.freeze(["🌵", "🏜️", "🦂", "🪨", "⛺", "🐍", "🦎", "☀️", "🌡️", "🪬", "🌾", "🐪"]),
  Object.freeze(["🌲", "🌿", "🍄", "🦊", "🐾", "🌱", "🪵", "🦋", "🐸", "🌳", "🍃", "🦝"]),
  Object.freeze(["🚀", "🛸", "🌙", "⭐", "🪐", "🌌", "👾", "🌟", "🛰️", "🌠", "🔭", "👽"]),
  Object.freeze(["❄️", "🏔️", "🐧", "🌨️", "🦭", "⛷️", "🐻‍❄️", "🧊", "🌬️", "🏂", "🎿", "🦌"]),
]);

/**
 * Builds every deterministic, seed-owned arena decoration used at run start.
 *
 * The arithmetic and random-call order are a replay compatibility contract.
 * In particular, the floor-zone and prop loop limits intentionally re-roll on
 * every condition check because that is how the original inline generator ran.
 */
export function buildArenaEnvironment({ seed, width, height }) {
  const w = width;
  const h = height;
  let worldSeed = seed;
  const random = () => {
    worldSeed = Math.abs((Math.imul(worldSeed, 1664525) + 1013904223) | 0);
    return (worldSeed >>> 0) / 0xFFFFFFFF;
  };

  const layouts = [
    () => {
      const points = [[.18, .22], [.50, .12], [.82, .22], [.12, .50], [.88, .50], [.18, .78], [.50, .88], [.82, .78]];
      return points.map(([rx, ry]) => ({ x: w * rx - 15, y: h * ry - 15, w: 30, h: 30 }))
        .filter((obstacle) => Math.hypot(obstacle.x + 15 - w / 2, obstacle.y + 15 - h / 2) > SPAWN_SAFE);
    },
    () => [
      { x: w * .07, y: h * .34, w: w * .36, h: 18 },
      { x: w * .57, y: h * .34, w: w * .36, h: 18 },
      { x: w * .07, y: h * .63, w: w * .36, h: 18 },
      { x: w * .57, y: h * .63, w: w * .36, h: 18 },
      { x: w * .08, y: h * .10, w: 18, h: h * .22 },
      { x: w * .74, y: h * .10, w: 18, h: h * .22 },
      { x: w * .08, y: h * .68, w: 18, h: h * .22 },
      { x: w * .74, y: h * .68, w: 18, h: h * .22 },
    ],
    () => [
      { x: w * .05, y: h * .05, w: w * .20, h: 14 }, { x: w * .05, y: h * .05, w: 14, h: h * .22 },
      { x: w * .75, y: h * .05, w: w * .20, h: 14 }, { x: w * .81, y: h * .05, w: 14, h: h * .22 },
      { x: w * .05, y: h * .81, w: w * .20, h: 14 }, { x: w * .05, y: h * .73, w: 14, h: h * .22 },
      { x: w * .75, y: h * .81, w: w * .20, h: 14 }, { x: w * .81, y: h * .73, w: 14, h: h * .22 },
    ],
    () => [
      { x: w * .34, y: h * .28, w: w * .32, h: 18 },
      { x: w * .34, y: h * .54, w: w * .32, h: 18 },
      { x: w * .10, y: h * .18, w: 16, h: h * .28 },
      { x: w * .74, y: h * .18, w: 16, h: h * .28 },
      { x: w * .10, y: h * .54, w: 16, h: h * .28 },
      { x: w * .74, y: h * .54, w: 16, h: h * .28 },
    ],
  ];

  const layoutIndex = Math.floor(random() * layouts.length);
  const obstacles = layouts[layoutIndex]();

  const terrainCount = 22 + Math.floor(random() * 14);
  const terrain = [];
  for (let index = 0; index < terrainCount; index += 1) {
    terrain.push({
      x: w * 0.03 + random() * w * 0.94,
      y: h * 0.03 + random() * h * 0.94,
      type: Math.floor(random() * 4),
      size: 14 + random() * 40,
      rot: random() * Math.PI * 2,
    });
  }

  const mapTheme = Math.floor(random() * 8);
  const floorZones = [];
  for (let index = 0; index < 4 + Math.floor(random() * 4); index += 1) {
    floorZones.push({
      x: w * 0.04 + random() * w * 0.92,
      y: h * 0.04 + random() * h * 0.92,
      rx: 55 + random() * 120,
      ry: 35 + random() * 80,
      rot: random() * Math.PI,
      alpha: 0.04 + random() * 0.05,
    });
  }

  const propsPool = THEME_PROPS[mapTheme];
  const props = [];
  for (let index = 0; index < 12 + Math.floor(random() * 6); index += 1) {
    const x = w * 0.06 + random() * w * 0.88;
    const y = h * 0.06 + random() * h * 0.88;
    const onWall = obstacles.some((obstacle) => x > obstacle.x - 10 && x < obstacle.x + obstacle.w + 10 && y > obstacle.y - 10 && y < obstacle.y + obstacle.h + 10);
    const nearCenter = Math.hypot(x - w / 2, y - h / 2) < 90;
    if (!onWall && !nearCenter) {
      const emoji = propsPool[Math.floor(random() * propsPool.length)];
      props.push({
        x,
        y,
        emoji,
        spriteKey: THEME_PROP_EMOJI_TO_CELL[emoji] || null,
        rot: random() * Math.PI * 2,
        scale: 0.7 + random() * 0.5,
      });
    }
  }

  const hazardCount = 3 + Math.floor(random() * 4);
  const hazards = [];
  for (let index = 0; index < hazardCount; index += 1) {
    const type = ARENA_HAZARD_TYPES[Math.floor(random() * ARENA_HAZARD_TYPES.length)];
    const x = 80 + random() * (w - 160);
    const y = 80 + random() * (h - 160);
    const radius = 35 + random() * 30;
    hazards.push({ x, y, radius, type, pulseTimer: Math.floor(random() * 120) });
  }

  return {
    layoutName: ARENA_LAYOUT_NAMES[layoutIndex],
    obstacles,
    terrain,
    mapTheme,
    floorZones,
    props,
    hazards,
  };
}
