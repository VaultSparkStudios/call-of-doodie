// S145 — repo-authored SVG builders for the weapon and world-object atlases.
// Transparent background; every cell is centered art sized for gameplay scale.
// Weapons face +x (right) so the renderer can rotate them on the arm pivot.

const CELL = 256;

function cellGroup(column, row, body) {
  return `  <g transform="translate(${column * CELL + CELL / 2} ${row * CELL + CELL / 2})">${body}\n  </g>`;
}

function defs() {
  return `  <defs>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8B95A3"/><stop offset="45%" stop-color="#5A6472"/><stop offset="100%" stop-color="#2E343D"/>
    </linearGradient>
    <linearGradient id="darkmetal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4A515C"/><stop offset="100%" stop-color="#1B1F25"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A0653B"/><stop offset="100%" stop-color="#5C3317"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glowCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

// Shared weapon chassis: grip + trigger guard + body, barrel to the right.
function chassis({ bodyFill = "url(#metal)", accent = "#FFD700", bodyW = 120, bodyH = 34 }) {
  const bx = -70;
  return `
    <path d="M${bx + 18} ${bodyH / 2 - 2} l-16 44 q-4 12 8 14 l20 3 q10 2 13 -8 l14 -46 Z" fill="url(#darkmetal)" stroke="#14171C" stroke-width="4"/>
    <path d="M${bx + 34} ${bodyH / 2} q22 30 44 2" fill="none" stroke="#14171C" stroke-width="7" stroke-linecap="round"/>
    <rect x="${bx}" y="${-bodyH / 2}" width="${bodyW}" height="${bodyH}" rx="10" fill="${bodyFill}" stroke="#14171C" stroke-width="4"/>
    <rect x="${bx + 6}" y="${-bodyH / 2 + 5}" width="${bodyW - 12}" height="9" rx="4" fill="url(#shine)"/>
    <rect x="${bx + bodyW - 26}" y="-6" width="22" height="12" rx="4" fill="${accent}"/>`;
}

const WEAPON_BODIES = [
  // 0 Banana Blaster
  `
    ${chassis({ accent: "#FFE135", bodyW: 84, bodyH: 30 })}
    <path d="M10 -14 C 62 -34 102 -18 112 8 C 84 22 30 16 10 4 Z" fill="#FFE135" stroke="#8F7B00" stroke-width="5"/>
    <path d="M16 -12 C 60 -28 94 -16 104 4" fill="none" stroke="#FFF7B0" stroke-width="6" stroke-linecap="round"/>
    <rect x="104" y="-4" width="16" height="10" rx="4" fill="#6B4F1D"/>
    <circle cx="-58" cy="-24" r="7" fill="#FFE135" opacity="0.85"/>`,
  // 1 Rubber Chicken RPG
  `
    <rect x="-96" y="-16" width="180" height="34" rx="16" fill="url(#wood)" stroke="#2A1608" stroke-width="4"/>
    <rect x="-90" y="-11" width="168" height="8" rx="4" fill="url(#shine)"/>
    <rect x="-40" y="16" width="30" height="34" rx="8" fill="url(#darkmetal)"/>
    <path d="M84 -2 q30 -8 26 -26 q-4 -14 -22 -12 q-16 2 -18 16 l-8 2 Z" fill="#FFC24A" stroke="#8F5A00" stroke-width="4"/>
    <circle cx="96" cy="-26" r="4" fill="#14171C"/>
    <path d="M108 -22 l16 -4 -12 10 Z" fill="#E33D2E"/>
    <path d="M74 6 q10 16 30 12" fill="none" stroke="#FFC24A" stroke-width="9" stroke-linecap="round"/>
    <path d="M-96 -4 l-18 -10 v28 l18 -10 Z" fill="#E33D2E" stroke="#7A1408" stroke-width="4"/>`,
  // 2 Nerf Minigun
  `
    ${chassis({ accent: "#FF4444", bodyW: 96, bodyH: 44 })}
    <g stroke="#14171C" stroke-width="4">
      <rect x="22" y="-26" width="92" height="14" rx="7" fill="url(#metal)"/>
      <rect x="22" y="-7" width="92" height="14" rx="7" fill="url(#darkmetal)"/>
      <rect x="22" y="12" width="92" height="14" rx="7" fill="url(#metal)"/>
    </g>
    <circle cx="116" cy="-19" r="8" fill="#FF8A3C" stroke="#14171C" stroke-width="4"/>
    <circle cx="116" cy="0" r="8" fill="#FF8A3C" stroke="#14171C" stroke-width="4"/>
    <circle cx="116" cy="19" r="8" fill="#FF8A3C" stroke="#14171C" stroke-width="4"/>
    <rect x="-38" y="-40" width="34" height="14" rx="7" fill="#FF4444"/>`,
  // 3 Plunger Launcher
  `
    ${chassis({ accent: "#C47A36", bodyW: 100, bodyH: 34 })}
    <rect x="30" y="-9" width="66" height="18" rx="9" fill="url(#wood)" stroke="#2A1608" stroke-width="4"/>
    <path d="M96 -26 q34 -8 34 26 q0 34 -34 26 q-12 -4 -12 -26 q0 -22 12 -26 Z" fill="#B02418" stroke="#5E0E0E" stroke-width="5"/>
    <path d="M100 -18 q22 -4 22 18" fill="none" stroke="#E56C55" stroke-width="6" stroke-linecap="round"/>`,
  // 4 Sniper-ator 3000
  `
    ${chassis({ accent: "#00FFAA", bodyW: 150, bodyH: 26 })}
    <rect x="80" y="-7" width="66" height="14" rx="6" fill="url(#darkmetal)" stroke="#14171C" stroke-width="4"/>
    <rect x="146" y="-10" width="10" height="20" rx="3" fill="#00FFAA"/>
    <rect x="-20" y="-38" width="64" height="20" rx="10" fill="url(#darkmetal)" stroke="#14171C" stroke-width="4"/>
    <circle cx="44" cy="-28" r="12" fill="#0B2B22" stroke="#00FFAA" stroke-width="4"/>
    <circle cx="44" cy="-28" r="4" fill="#00FFAA"/>
    <path d="M-70 22 l-16 26 h18 l12 -22 Z" fill="url(#darkmetal)"/>`,
  // 5 Spicy Squirt Gun
  `
    ${chassis({ bodyFill: "#FF5500", accent: "#FFD23C", bodyW: 92, bodyH: 32 })}
    <rect x="-52" y="-46" width="52" height="30" rx="15" fill="#38B6FF" stroke="#0E5E8F" stroke-width="4"/>
    <rect x="-46" y="-42" width="40" height="9" rx="4" fill="url(#shine)"/>
    <rect x="40" y="-8" width="52" height="16" rx="8" fill="#FF7B33" stroke="#9C2E00" stroke-width="4"/>
    <circle cx="94" cy="0" r="7" fill="#FFD23C" stroke="#9C2E00" stroke-width="3"/>
    <path d="M-16 -30 q6 -12 0 -22 q14 6 10 22 Z" fill="#E33D2E"/>`,
  // 6 Confetti Cannon
  `
    <path d="M-84 -20 L64 -34 L64 34 L-84 20 Z" fill="#FF69B4" stroke="#8F1E56" stroke-width="5"/>
    <path d="M-78 -14 L56 -26" stroke="#FFC7E3" stroke-width="7" stroke-linecap="round"/>
    <path d="M64 -34 l22 -8 v84 l-22 -8 Z" fill="#FFD23C" stroke="#8F6A00" stroke-width="5"/>
    <g>
      <rect x="96" y="-38" width="12" height="12" rx="3" fill="#38B6FF" transform="rotate(18 102 -32)"/>
      <rect x="112" y="-8" width="12" height="12" rx="3" fill="#6BE66B" transform="rotate(-24 118 -2)"/>
      <rect x="98" y="22" width="12" height="12" rx="3" fill="#FF5500" transform="rotate(40 104 28)"/>
    </g>
    <rect x="-56" y="20" width="26" height="34" rx="9" fill="url(#darkmetal)"/>`,
  // 7 Shock Zapper
  `
    ${chassis({ accent: "#00E5FF", bodyW: 104, bodyH: 32 })}
    <g stroke="#14171C" stroke-width="4">
      <circle cx="52" cy="-24" r="10" fill="url(#metal)"/>
      <circle cx="78" cy="-24" r="10" fill="url(#metal)"/>
    </g>
    <path d="M52 -24 h26" stroke="#00E5FF" stroke-width="5"/>
    <rect x="34" y="-8" width="66" height="16" rx="8" fill="url(#darkmetal)" stroke="#14171C" stroke-width="4"/>
    <path d="M100 0 l18 -10 -8 10 8 10 Z" fill="#00E5FF"/>
    <circle cx="6" cy="0" r="10" fill="#0A2A30" stroke="#00E5FF" stroke-width="4"/>`,
  // 8 Boomerang Blaster
  `
    ${chassis({ accent: "#FFA500", bodyW: 96, bodyH: 34 })}
    <path d="M34 -14 q40 -34 76 -10 q-18 4 -28 18 q-10 -14 -30 -10 q-12 2 -18 2 Z" fill="#FFA500" stroke="#8F5A00" stroke-width="5"/>
    <path d="M42 -16 q34 -22 60 -8" fill="none" stroke="#FFD79A" stroke-width="5" stroke-linecap="round"/>
    <path d="M96 6 a34 34 0 0 1 -30 22" fill="none" stroke="#FFA500" stroke-width="4" stroke-dasharray="7 8" opacity="0.85"/>`,
  // 9 Railgun
  `
    ${chassis({ accent: "#00FFFF", bodyW: 92, bodyH: 36 })}
    <rect x="22" y="-22" width="112" height="12" rx="6" fill="url(#metal)" stroke="#14171C" stroke-width="4"/>
    <rect x="22" y="10" width="112" height="12" rx="6" fill="url(#metal)" stroke="#14171C" stroke-width="4"/>
    <rect x="30" y="-6" width="88" height="12" rx="6" fill="#062E33"/>
    <rect x="34" y="-4" width="80" height="8" rx="4" fill="#00FFFF" opacity="0.85"/>
    <circle cx="6" cy="0" r="13" fill="#062E33" stroke="#00FFFF" stroke-width="4"/>
    <circle cx="6" cy="0" r="5" fill="#00FFFF"/>`,
  // 10 Ricochet Pistol
  `
    ${chassis({ accent: "#7FFF00", bodyW: 82, bodyH: 30 })}
    <circle cx="-4" cy="-2" r="20" fill="#14171C" stroke="#3C4048" stroke-width="5"/>
    <circle cx="-4" cy="-2" r="9" fill="#F5F5F5"/>
    <text x="-4" y="3" text-anchor="middle" font-family="Courier New, monospace" font-size="13" font-weight="900" fill="#14171C">8</text>
    <path d="M42 -12 l52 0 14 12 -14 12 -52 0 Z" fill="url(#metal)" stroke="#14171C" stroke-width="4"/>
    <path d="M96 -20 l22 8 m0 24 l-22 8" stroke="#7FFF00" stroke-width="4" stroke-linecap="round"/>`,
  // 11 Nuclear Kazoo
  `
    <path d="M-92 -12 L52 -26 Q84 -20 84 0 Q84 20 52 26 L-92 12 Z" fill="#FF00FF" stroke="#71006B" stroke-width="5"/>
    <path d="M-84 -8 L48 -20" stroke="#FF9AFB" stroke-width="6" stroke-linecap="round"/>
    <circle cx="8" cy="-24" r="16" fill="#FFD23C" stroke="#8F6A00" stroke-width="4"/>
    <path d="M8 -24 m-9 0 a9 9 0 0 1 18 0 l-6 0 a3 3 0 0 0 -6 0 Z" fill="#14171C"/>
    <path d="M2 -30 l6 -10 6 10 Z" fill="#14171C"/>
    <path d="M84 0 l26 -12 v24 Z" fill="#FFD23C" stroke="#8F6A00" stroke-width="4"/>
    <path d="M104 -34 q10 4 4 14 M112 -20 q8 6 0 14" stroke="#FF00FF" stroke-width="4" fill="none" stroke-linecap="round"/>`,
];

export function buildWeaponAtlasSvg({ width = 1024, height = 768, columns = 4 } = {}) {
  // No ground shadow in weapon cells — they render held in-hand and in docks.
  const cells = WEAPON_BODIES.map((body, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return cellGroup(column, row, body);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs()}
${cells.join("\n")}
</svg>`;
}

// ── World objects ──────────────────────────────────────────────────────────

function pickupPuck(inner, ringColor) {
  return `
    <ellipse cx="0" cy="66" rx="58" ry="14" fill="#000" opacity="0.25"/>
    <circle cx="0" cy="0" r="62" fill="#111418" stroke="${ringColor}" stroke-width="7"/>
    <circle cx="0" cy="0" r="62" fill="url(#glowCore)" opacity="0.14"/>
    <circle cx="-20" cy="-24" r="16" fill="url(#shine)" opacity="0.5"/>${inner}`;
}

const WORLD_BODIES = {
  "pickup:health": pickupPuck(`
    <rect x="-34" y="-12" width="68" height="24" rx="12" fill="#E8F3EE" stroke="#0E7A4A" stroke-width="4"/>
    <rect x="-12" y="-34" width="24" height="68" rx="12" fill="#E8F3EE" stroke="#0E7A4A" stroke-width="4"/>
    <rect x="-12" y="-12" width="24" height="24" fill="#E8F3EE"/>
    <rect x="-26" y="-7" width="52" height="14" rx="7" fill="#27C878"/>
    <rect x="-7" y="-26" width="14" height="52" rx="7" fill="#27C878"/>`, "#27C878"),
  "pickup:ammo": pickupPuck(`
    <rect x="-38" y="-24" width="76" height="52" rx="8" fill="url(#wood)" stroke="#2A1608" stroke-width="4"/>
    <rect x="-38" y="-8" width="76" height="8" fill="#2A1608" opacity="0.5"/>
    <g stroke="#14171C" stroke-width="3">
      <rect x="-24" y="-40" width="10" height="24" rx="5" fill="#FFC24A"/>
      <rect x="-6" y="-44" width="10" height="28" rx="5" fill="#FFC24A"/>
      <rect x="12" y="-40" width="10" height="24" rx="5" fill="#FFC24A"/>
    </g>`, "#38B6FF"),
  "pickup:speed": pickupPuck(`
    <path d="M10 -44 L-26 8 h20 L-8 44 L34 -12 h-22 Z" fill="#FFE13C" stroke="#8F6A00" stroke-width="5"/>`, "#FFE13C"),
  "pickup:guardian_angel": pickupPuck(`
    <ellipse cx="0" cy="-38" rx="26" ry="8" fill="none" stroke="#FFD700" stroke-width="6"/>
    <path d="M-42 6 q-16 -26 8 -34 q6 16 12 20 M42 6 q16 -26 -8 -34 q-6 16 -12 20" fill="#F3F7FF" stroke="#9FB4D8" stroke-width="4"/>
    <circle cx="0" cy="4" r="26" fill="#FFE9C9" stroke="#C89A55" stroke-width="4"/>
    <circle cx="-9" cy="0" r="4" fill="#14171C"/><circle cx="9" cy="0" r="4" fill="#14171C"/>
    <path d="M-8 12 q8 7 16 0" fill="none" stroke="#14171C" stroke-width="3" stroke-linecap="round"/>`, "#FFD700"),
  "pickup:upgrade": pickupPuck(`
    <path d="M-34 24 L10 -20 l-8 -8 q16 -14 32 -4 q-6 2 -10 8 l10 10 q6 -4 8 -10 q10 16 -4 32 l-8 -8 L-14 44 q-10 8 -20 -2 q-8 -10 0 -18 Z" fill="#B98CFF" stroke="#5A2AA6" stroke-width="4"/>`, "#AA44FF"),
  "pickup:nuke": pickupPuck(`
    <circle cx="0" cy="0" r="40" fill="#FFD23C" stroke="#8F6A00" stroke-width="4"/>
    <circle cx="0" cy="0" r="9" fill="#14171C"/>
    <g fill="#14171C">
      <path d="M0 0 L-14 -34 A38 38 0 0 1 14 -34 Z"/>
      <path d="M0 0 L-34 14 A38 38 0 0 1 -20 -30 Z" transform="rotate(-6)"/>
      <path d="M0 0 L34 14 A38 38 0 0 0 20 -30 Z" transform="rotate(6)"/>
    </g>`, "#FF4030"),
  "pickup:rage": pickupPuck(`
    <path d="M0 -46 q22 22 12 38 q14 -6 16 -20 q14 30 -6 52 q-22 22 -44 0 q-20 -22 -4 -50 q4 14 12 18 q-8 -22 14 -38 Z" fill="#FF7B33" stroke="#9C2E00" stroke-width="5"/>
    <path d="M0 -12 q12 14 4 26 q-6 10 -16 6 q-10 -6 -4 -18 q4 -8 16 -14 Z" fill="#FFD23C"/>`, "#FF4400"),
  "pickup:magnet": pickupPuck(`
    <path d="M-34 -36 v36 a34 34 0 0 0 68 0 v-36 h-24 v36 a10 10 0 0 1 -20 0 v-36 Z" fill="#E33D2E" stroke="#7A1408" stroke-width="5"/>
    <rect x="-34" y="-36" width="24" height="16" fill="#F5F5F5" stroke="#7A1408" stroke-width="4"/>
    <rect x="10" y="-36" width="24" height="16" fill="#F5F5F5" stroke="#7A1408" stroke-width="4"/>
    <path d="M-46 24 l-10 8 M46 24 l10 8 M0 44 v12" stroke="#FF88FF" stroke-width="4" stroke-linecap="round"/>`, "#FF88FF"),
  "pickup:freeze": pickupPuck(`
    <g stroke="#9ADCFF" stroke-width="7" stroke-linecap="round">
      <path d="M0 -44 V44 M-38 -22 L38 22 M-38 22 L38 -22"/>
    </g>
    <g stroke="#E8F7FF" stroke-width="4" stroke-linecap="round">
      <path d="M0 -44 l-9 12 M0 -44 l9 12 M0 44 l-9 -12 M0 44 l9 -12"/>
      <path d="M-38 -22 l14 2 M38 22 l-14 -2 M-38 22 l14 -2 M38 -22 l-14 2"/>
    </g>`, "#88CCFF"),
  grenade: `
    <ellipse cx="0" cy="62" rx="48" ry="12" fill="#000" opacity="0.25"/>
    <circle cx="0" cy="10" r="48" fill="url(#darkmetal)" stroke="#14171C" stroke-width="5"/>
    <path d="M-30 -8 a48 48 0 0 1 60 0" fill="none" stroke="#6B7686" stroke-width="5" opacity="0.7"/>
    <circle cx="-16" cy="-4" r="12" fill="url(#shine)" opacity="0.5"/>
    <rect x="-14" y="-46" width="28" height="18" rx="5" fill="url(#metal)" stroke="#14171C" stroke-width="4"/>
    <path d="M14 -40 q26 -4 24 18" fill="none" stroke="#FFD23C" stroke-width="6" stroke-linecap="round"/>
    <circle cx="40" cy="-20" r="7" fill="#FFD23C" stroke="#8F6A00" stroke-width="3"/>`,
  "hazard:poison": `
    <ellipse cx="0" cy="60" rx="56" ry="13" fill="#000" opacity="0.25"/>
    <path d="M0 -54 L52 40 q6 14 -10 14 h-84 q-16 0 -10 -14 Z" fill="#B7E64A" stroke="#4C7A0E" stroke-width="6"/>
    <circle cx="0" cy="4" r="17" fill="#14171C"/>
    <circle cx="-7" cy="0" r="5" fill="#B7E64A"/><circle cx="7" cy="0" r="5" fill="#B7E64A"/>
    <path d="M-8 14 q8 6 16 0 M-14 24 h28" stroke="#14171C" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  "hazard:shock": `
    <ellipse cx="0" cy="60" rx="56" ry="13" fill="#000" opacity="0.25"/>
    <path d="M0 -54 L52 40 q6 14 -10 14 h-84 q-16 0 -10 -14 Z" fill="#FFD23C" stroke="#8F6A00" stroke-width="6"/>
    <path d="M8 -30 L-16 8 h14 L-6 38 L24 -2 h-14 Z" fill="#14171C"/>`,
  "hazard:rock": `
    <ellipse cx="0" cy="58" rx="60" ry="14" fill="#000" opacity="0.25"/>
    <path d="M-46 40 L-52 0 L-24 -34 L14 -44 L48 -16 L52 26 L28 44 Z" fill="url(#metal)" stroke="#14171C" stroke-width="5"/>
    <path d="M-24 -34 L-6 2 L52 26 M-6 2 L-46 40" fill="none" stroke="#14171C" stroke-width="4" opacity="0.55"/>
    <path d="M-18 -28 L8 -38" stroke="url(#shine)" stroke-width="6" stroke-linecap="round"/>`,
  "escort-cart": `
    <ellipse cx="0" cy="66" rx="76" ry="14" fill="#000" opacity="0.25"/>
    <rect x="-72" y="-30" width="110" height="58" rx="10" fill="#EAF6FF" stroke="#31536B" stroke-width="5"/>
    <path d="M38 -30 h30 l22 26 v32 h-52 Z" fill="#BFD8F5" stroke="#31536B" stroke-width="5"/>
    <rect x="48" y="-18" width="26" height="20" rx="4" fill="#0F2535"/>
    <rect x="-64" y="-20" width="94" height="12" rx="6" fill="#38B6FF" opacity="0.6"/>
    <circle cx="-38" cy="34" r="18" fill="#14171C" stroke="#3C4048" stroke-width="5"/>
    <circle cx="-38" cy="34" r="7" fill="#8B95A3"/>
    <circle cx="52" cy="34" r="18" fill="#14171C" stroke="#3C4048" stroke-width="5"/>
    <circle cx="52" cy="34" r="7" fill="#8B95A3"/>
    <path d="M-58 -10 h60" stroke="#31536B" stroke-width="4" opacity="0.4"/>`,
};

export function buildWorldObjectAtlasSvg({ width = 1024, height = 1024, columns = 4, cells }) {
  const groups = cells.map((cellId, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const body = WORLD_BODIES[cellId];
    if (!body) throw new Error(`world-object atlas: no art for cell ${cellId}`);
    return cellGroup(column, row, body);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs()}
${groups.join("\n")}
</svg>`;
}

// ── Theme props (S147) ──────────────────────────────────────────────────────
// Flat, low-detail ambient furniture — these render small at 0.24-0.42 alpha
// with no collision, so simple silhouettes read better than the more
// detailed pickup-puck treatment above.
const THEME_PROP_BODIES = {
  "office:chair": `
    <ellipse cx="0" cy="58" rx="42" ry="10" fill="#000" opacity="0.2"/>
    <rect x="-34" y="-46" width="68" height="10" rx="5" fill="url(#metal)"/>
    <rect x="-34" y="-4" width="68" height="34" rx="8" fill="url(#darkmetal)"/>
    <g stroke="#14171C" stroke-width="6" stroke-linecap="round">
      <path d="M-30 30 v22 M30 30 v22"/>
    </g>`,
  "office:monitor": `
    <ellipse cx="0" cy="46" rx="40" ry="9" fill="#000" opacity="0.2"/>
    <rect x="-44" y="-40" width="88" height="60" rx="6" fill="#14171C" stroke="url(#metal)" stroke-width="5"/>
    <rect x="-36" y="-32" width="72" height="44" rx="3" fill="#1E8FE0" opacity="0.55"/>
    <rect x="-10" y="20" width="20" height="14" fill="url(#darkmetal)"/>`,
  "bunker:crate": `
    <ellipse cx="0" cy="52" rx="44" ry="10" fill="#000" opacity="0.2"/>
    <rect x="-40" y="-30" width="80" height="76" rx="6" fill="url(#wood)" stroke="#2A1608" stroke-width="5"/>
    <path d="M-40 8 h80 M0 -30 v76" stroke="#2A1608" stroke-width="4" opacity="0.6"/>`,
  "bunker:helmet": `
    <ellipse cx="0" cy="30" rx="38" ry="9" fill="#000" opacity="0.2"/>
    <path d="M-36 14 a36 30 0 0 1 72 0 Z" fill="url(#metal)" stroke="#14171C" stroke-width="5"/>
    <rect x="-40" y="10" width="80" height="10" rx="5" fill="url(#darkmetal)"/>`,
  "factory:gear": `
    <ellipse cx="0" cy="50" rx="42" ry="9" fill="#000" opacity="0.2"/>
    <g fill="url(#metal)" stroke="#14171C" stroke-width="4">
      <circle cx="0" cy="0" r="40"/>
      <rect x="-6" y="-52" width="12" height="18"/><rect x="-6" y="34" width="12" height="18"/>
      <rect x="-52" y="-6" width="18" height="12"/><rect x="34" y="-6" width="18" height="12"/>
    </g>
    <circle cx="0" cy="0" r="16" fill="#14171C"/>`,
  "factory:barrel": `
    <ellipse cx="0" cy="52" rx="36" ry="9" fill="#000" opacity="0.2"/>
    <rect x="-34" y="-48" width="68" height="96" rx="14" fill="#8F6A00" stroke="#4A3600" stroke-width="5"/>
    <rect x="-34" y="-26" width="68" height="10" fill="#4A3600" opacity="0.7"/>
    <rect x="-34" y="16" width="68" height="10" fill="#4A3600" opacity="0.7"/>`,
  "ruins:rubble": `
    <ellipse cx="0" cy="46" rx="52" ry="10" fill="#000" opacity="0.2"/>
    <path d="M-46 30 L-40 -8 L-6 -32 L28 -20 L48 10 L36 34 Z" fill="url(#metal)" stroke="#14171C" stroke-width="4"/>
    <path d="M-6 -32 L2 6 L48 10 M-40 -8 L-6 -32" fill="none" stroke="#14171C" stroke-width="3" opacity="0.5"/>`,
  "ruins:skull": `
    <ellipse cx="0" cy="42" rx="34" ry="8" fill="#000" opacity="0.2"/>
    <path d="M0 -38 a34 34 0 0 1 34 34 q0 20 -14 26 h-40 q-14 -6 -14 -26 a34 34 0 0 1 34 -34 Z" fill="#E8E4D8" stroke="#8A8570" stroke-width="4"/>
    <circle cx="-13" cy="0" r="8" fill="#14171C"/><circle cx="13" cy="0" r="8" fill="#14171C"/>
    <path d="M-6 16 l-4 10 h20 l-4 -10 Z" fill="#8A8570"/>`,
  "desert:cactus": `
    <ellipse cx="0" cy="52" rx="30" ry="8" fill="#000" opacity="0.2"/>
    <path d="M-8 52 V-40 q0 -10 8 -10 q8 0 8 10 V52 Z" fill="#3E9B4F" stroke="#215A2A" stroke-width="4"/>
    <path d="M-8 -6 q-26 0 -26 -22 q0 -10 10 -10 q10 0 10 12 v20 M8 10 q26 0 26 -20 q0 -10 -10 -10 q-10 0 -10 12 v18" fill="none" stroke="#3E9B4F" stroke-width="12" stroke-linecap="round"/>`,
  "desert:scorpion": `
    <ellipse cx="0" cy="30" rx="40" ry="8" fill="#000" opacity="0.2"/>
    <ellipse cx="-6" cy="10" rx="28" ry="14" fill="#8F6A00" stroke="#4A3600" stroke-width="4"/>
    <path d="M18 4 q30 -6 34 -30 q2 -12 -8 -12 q-8 0 -10 10" fill="none" stroke="#8F6A00" stroke-width="7" stroke-linecap="round"/>
    <path d="M-30 6 l-18 -6 M-28 16 l-18 2" stroke="#4A3600" stroke-width="4" stroke-linecap="round"/>`,
  "forest:pine": `
    <ellipse cx="0" cy="54" rx="34" ry="9" fill="#000" opacity="0.2"/>
    <rect x="-7" y="24" width="14" height="26" fill="#5C3317"/>
    <path d="M0 -48 L34 6 H-34 Z" fill="#2E7D46" stroke="#164A28" stroke-width="4"/>
    <path d="M0 -20 L26 26 H-26 Z" fill="#3B9457" stroke="#164A28" stroke-width="4"/>`,
  "forest:mushroom": `
    <ellipse cx="0" cy="38" rx="26" ry="7" fill="#000" opacity="0.2"/>
    <rect x="-8" y="6" width="16" height="30" rx="6" fill="#F3E7D0"/>
    <path d="M-32 8 a32 22 0 0 1 64 0 Z" fill="#E33D2E" stroke="#7A1408" stroke-width="4"/>
    <circle cx="-14" cy="-4" r="5" fill="#F3E7D0"/><circle cx="10" cy="-8" r="4" fill="#F3E7D0"/><circle cx="4" cy="2" r="4" fill="#F3E7D0"/>`,
  "space:rocket": `
    <ellipse cx="0" cy="52" rx="24" ry="8" fill="#000" opacity="0.2"/>
    <path d="M0 -50 q22 20 22 60 h-44 q0 -40 22 -60 Z" fill="#E8F3EE" stroke="#31536B" stroke-width="4"/>
    <path d="M-22 20 l-16 24 h16 M22 20 l16 24 h-16" fill="#FF4444" stroke="#7A1408" stroke-width="3"/>
    <circle cx="0" cy="-8" r="10" fill="#38B6FF" stroke="#0E5E8F" stroke-width="3"/>`,
  "space:ufo": `
    <ellipse cx="0" cy="30" rx="46" ry="10" fill="#000" opacity="0.2"/>
    <ellipse cx="0" cy="6" rx="52" ry="14" fill="url(#metal)" stroke="#14171C" stroke-width="4"/>
    <path d="M-22 -6 a22 20 0 0 1 44 0 Z" fill="#7FE6FF" opacity="0.7" stroke="#14171C" stroke-width="3"/>
    <circle cx="-24" cy="10" r="5" fill="#FFE13C"/><circle cx="0" cy="14" r="5" fill="#FFE13C"/><circle cx="24" cy="10" r="5" fill="#FFE13C"/>`,
  "arctic:snowflake": `
    <g stroke="#E8F7FF" stroke-width="8" stroke-linecap="round">
      <path d="M0 -40 V40 M-34 -20 L34 20 M-34 20 L34 -20"/>
    </g>
    <g stroke="#B9E7FF" stroke-width="5" stroke-linecap="round">
      <path d="M0 -40 l-8 10 M0 -40 l8 10 M0 40 l-8 -10 M0 40 l8 -10"/>
      <path d="M-34 -20 l12 2 M34 20 l-12 -2 M-34 20 l12 -2 M34 -20 l-12 2"/>
    </g>`,
  "arctic:peak": `
    <ellipse cx="0" cy="44" rx="52" ry="9" fill="#000" opacity="0.2"/>
    <path d="M-50 40 L-14 -34 L10 -6 L24 -30 L50 40 Z" fill="#8FA8C0" stroke="#425A72" stroke-width="4"/>
    <path d="M-14 -34 L-2 -10 L10 -6 M24 -30 L14 -8 L26 4" fill="#F3F7FF" stroke="#8FA8C0" stroke-width="3"/>`,
};

export function buildThemePropAtlasSvg({ width = 1024, height = 1024, columns = 4, cells }) {
  const groups = cells.map((cellId, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const body = THEME_PROP_BODIES[cellId];
    if (!body) throw new Error(`theme-prop atlas: no art for cell ${cellId}`);
    return cellGroup(column, row, body);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs()}
${groups.join("\n")}
</svg>`;
}
