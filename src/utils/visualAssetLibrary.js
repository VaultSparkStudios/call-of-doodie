import { ENEMY_ATLAS_CONTRACT, getIntegerGridRect } from "./enemyAtlasContract.js";

export const SIGNATURE_VISUAL_ASSETS = [
  { id: "cod-porcelain-throne", label: "Porcelain Throne", role: "objective prop", src: "/visual-assets/cod-porcelain-throne.png", accent: "#BFE7FF" },
  { id: "cod-plunger-rocket", label: "Plunger Launcher", role: "weapon identity", src: "/visual-assets/cod-plunger-rocket.png", accent: "#FF7A30" },
  { id: "cod-doodie-operative", label: "Doodie Operative", role: "player silhouette", src: "/visual-assets/cod-doodie-operative-v3.png", accent: "#5EE68A" },
  { id: "cod-karen-nemesis", label: "Karen Nemesis", role: "boss read", src: "/visual-assets/cod-karen-nemesis-v2.png", accent: "#FF69B4" },
];

export function getSignatureVisualAsset(id) {
  return SIGNATURE_VISUAL_ASSETS.find((asset) => asset.id === id) || null;
}

const RUNTIME_CHARACTER_ASSETS = Object.freeze({
  player: "/visual-assets/cod-doodie-operative-v3.png",
  karen: "/visual-assets/cod-karen-nemesis-v2.png",
});

export const ENEMY_ATLASES = ENEMY_ATLAS_CONTRACT;

const ENEMY_ATLAS_SLOTS = new Map(Object.entries(ENEMY_ATLASES).flatMap(([atlasId, atlas]) => (
  atlas.typeIndices.map((typeIndex, cell) => [typeIndex, [atlasId, cell]])
)));

const imageCache = new Map();
const imageStatus = new Map();

function getCachedImage(src, ImageCtor = globalThis.Image) {
  if (!src || typeof ImageCtor !== "function") return null;
  if (!imageCache.has(src)) {
    const image = new ImageCtor();
    image.decoding = "async";
    imageStatus.set(src, "loading");
    image.onload = () => imageStatus.set(src, "ready");
    image.onerror = () => imageStatus.set(src, "fallback");
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

export function preloadEnemyAtlasesForTypes(typeIndices, ImageCtor = globalThis.Image, limit = 2) {
  const boundedLimit = Math.max(0, Math.min(2, Math.floor(Number(limit) || 0)));
  const atlasIds = [];
  for (const typeIndex of Array.isArray(typeIndices) ? typeIndices : []) {
    const slot = getEnemyAtlasSlot(typeIndex);
    if (slot && !atlasIds.includes(slot.atlasId)) atlasIds.push(slot.atlasId);
    if (atlasIds.length >= boundedLimit) break;
  }
  for (const atlasId of atlasIds) getCachedImage(ENEMY_ATLASES[atlasId].src, ImageCtor);
  return {
    requestedTypes: Array.isArray(typeIndices) ? [...typeIndices] : [],
    atlasIds,
    boundedLimit,
  };
}

export function getRuntimeEnemySprite(typeIndex, ImageCtor = globalThis.Image) {
  const slot = getEnemyAtlasSlot(typeIndex);
  if (!slot) return null;
  const image = getCachedImage(slot.src, ImageCtor);
  if (!image) return null;
  const rect = getIntegerGridRect(image.naturalWidth, image.naturalHeight, slot.columns, slot.rows, slot.cell);
  if (!rect) return null;
  return { image, ...rect };
}

export function getEnemyAtlasLoadReceipt() {
  return Object.fromEntries(Object.values(ENEMY_ATLASES).map((atlas) => [
    atlas.id,
    imageStatus.get(atlas.src) || "idle",
  ]));
}
