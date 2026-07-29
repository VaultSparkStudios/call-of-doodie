export const ENEMY_ATLAS_TOTAL_BYTE_BUDGET = 1_500_000;

export const ENEMY_ATLAS_CONTRACT = Object.freeze({
  core: Object.freeze({
    id: "enemy-atlas-core",
    src: "/visual-assets/enemy-atlas-core-v3.webp",
    sourcePath: "assets/source/runtime-sprites/enemy-atlas-core-v3-source.png",
    runtimePath: "public/visual-assets/enemy-atlas-core-v3.webp",
    columns: 4,
    rows: 2,
    slots: 8,
    typeIndices: Object.freeze([0, 1, 2, 3, 5, 6, 7, 8]),
    maxBytes: 550_000,
  }),
  specialists: Object.freeze({
    id: "enemy-atlas-specialists",
    src: "/visual-assets/enemy-atlas-specialists.webp",
    sourcePath: "assets/source/runtime-sprites/enemy-atlas-specialists-source.png",
    runtimePath: "public/visual-assets/enemy-atlas-specialists.webp",
    columns: 4,
    rows: 2,
    slots: 8,
    typeIndices: Object.freeze([9, 10, 11, 12, 13, 14, 15, 16]),
    maxBytes: 500_000,
  }),
  bosses: Object.freeze({
    id: "enemy-atlas-bosses",
    src: "/visual-assets/enemy-atlas-bosses.webp",
    sourcePath: "assets/source/runtime-sprites/enemy-atlas-bosses-source.png",
    runtimePath: "public/visual-assets/enemy-atlas-bosses.webp",
    columns: 3,
    rows: 2,
    slots: 6,
    typeIndices: Object.freeze([4, 17, 18, 19, 20, 21]),
    maxBytes: 600_000,
  }),
});

export function getIntegerGridRect(width, height, columns, rows, cell) {
  const safeWidth = Math.max(0, Math.floor(Number(width) || 0));
  const safeHeight = Math.max(0, Math.floor(Number(height) || 0));
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1));
  const safeRows = Math.max(1, Math.floor(Number(rows) || 1));
  const maxCell = safeColumns * safeRows;
  const safeCell = Math.floor(Number(cell));
  if (safeWidth === 0 || safeHeight === 0 || !Number.isInteger(safeCell) || safeCell < 0 || safeCell >= maxCell) return null;

  const column = safeCell % safeColumns;
  const row = Math.floor(safeCell / safeColumns);
  const left = Math.round((column * safeWidth) / safeColumns);
  const right = Math.round(((column + 1) * safeWidth) / safeColumns);
  const top = Math.round((row * safeHeight) / safeRows);
  const bottom = Math.round(((row + 1) * safeHeight) / safeRows);
  return {
    sourceX: left,
    sourceY: top,
    sourceWidth: right - left,
    sourceHeight: bottom - top,
  };
}

export function getAtlasGridCoverage(width, height, atlas) {
  const rects = Array.from({ length: atlas.slots }, (_, cell) => (
    getIntegerGridRect(width, height, atlas.columns, atlas.rows, cell)
  ));
  const area = rects.reduce((sum, rect) => sum + (rect?.sourceWidth || 0) * (rect?.sourceHeight || 0), 0);
  return {
    rects,
    area,
    expectedArea: Math.floor(width) * Math.floor(height),
    complete: rects.every(Boolean) && area === Math.floor(width) * Math.floor(height),
  };
}
