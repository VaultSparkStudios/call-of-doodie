export const SIGNATURE_VISUAL_ASSETS = [
  { id: "cod-porcelain-throne", label: "Porcelain Throne", role: "objective prop", src: "/visual-assets/cod-porcelain-throne.png", accent: "#BFE7FF" },
  { id: "cod-plunger-rocket", label: "Plunger Launcher", role: "weapon identity", src: "/visual-assets/cod-plunger-rocket.png", accent: "#FF7A30" },
  { id: "cod-doodie-operative", label: "Doodie Operative", role: "player silhouette", src: "/visual-assets/cod-doodie-operative-v2.png", accent: "#5EE68A" },
  { id: "cod-karen-nemesis", label: "Karen Nemesis", role: "boss read", src: "/visual-assets/cod-karen-nemesis-v2.png", accent: "#FF69B4" },
];

export function getSignatureVisualAsset(id) {
  return SIGNATURE_VISUAL_ASSETS.find((asset) => asset.id === id) || null;
}

const RUNTIME_CHARACTER_ASSETS = Object.freeze({
  player: "/visual-assets/cod-doodie-operative-v2.png",
  karen: "/visual-assets/cod-karen-nemesis-v2.png",
});

export const ENEMY_ATLASES = Object.freeze({
  core: { src: "/visual-assets/enemy-atlas-core.png", columns: 4, rows: 2 },
  specialists: { src: "/visual-assets/enemy-atlas-specialists.png", columns: 4, rows: 2 },
  bosses: { src: "/visual-assets/enemy-atlas-bosses.png", columns: 3, rows: 2 },
});

const ENEMY_ATLAS_SLOTS = new Map([
  [0, ["core", 0]], [1, ["core", 1]], [2, ["core", 2]], [3, ["core", 3]],
  [5, ["core", 4]], [6, ["core", 5]], [7, ["core", 6]], [8, ["core", 7]],
  [9, ["specialists", 0]], [10, ["specialists", 1]], [11, ["specialists", 2]], [12, ["specialists", 3]],
  [13, ["specialists", 4]], [14, ["specialists", 5]], [15, ["specialists", 6]], [16, ["specialists", 7]],
  [4, ["bosses", 0]], [17, ["bosses", 1]], [18, ["bosses", 2]],
  [19, ["bosses", 3]], [20, ["bosses", 4]], [21, ["bosses", 5]],
]);

const imageCache = new Map();

function getCachedImage(src, ImageCtor = globalThis.Image) {
  if (!src || typeof ImageCtor !== "function") return null;
  if (!imageCache.has(src)) {
    const image = new ImageCtor();
    image.decoding = "async";
    image.src = src;
    imageCache.set(src, image);
  }
  const image = imageCache.get(src);
  return image?.complete && image.naturalWidth > 0 ? image : null;
}

export function getRuntimeCharacterAsset(kind) {
  return RUNTIME_CHARACTER_ASSETS[kind] || null;
}

export function getRuntimeCharacterSprite(kind, ImageCtor = globalThis.Image) {
  return getCachedImage(getRuntimeCharacterAsset(kind), ImageCtor);
}

export function getEnemyAtlasSlot(typeIndex) {
  const slot = ENEMY_ATLAS_SLOTS.get(typeIndex);
  if (!slot) return null;
  const [atlasId, cell] = slot;
  return { atlasId, cell, ...ENEMY_ATLASES[atlasId] };
}

export function getRuntimeEnemySprite(typeIndex, ImageCtor = globalThis.Image) {
  const slot = getEnemyAtlasSlot(typeIndex);
  if (!slot) return null;
  const image = getCachedImage(slot.src, ImageCtor);
  if (!image) return null;
  const sourceWidth = image.naturalWidth / slot.columns;
  const sourceHeight = image.naturalHeight / slot.rows;
  return {
    image,
    sourceX: (slot.cell % slot.columns) * sourceWidth,
    sourceY: Math.floor(slot.cell / slot.columns) * sourceHeight,
    sourceWidth,
    sourceHeight,
  };
}
