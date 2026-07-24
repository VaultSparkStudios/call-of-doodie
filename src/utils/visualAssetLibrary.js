export const SIGNATURE_VISUAL_ASSETS = [
  {
    id: "cod-porcelain-throne",
    label: "Porcelain Throne",
    role: "objective prop",
    src: "/visual-assets/cod-porcelain-throne.png",
    accent: "#BFE7FF",
  },
  {
    id: "cod-plunger-rocket",
    label: "Plunger Launcher",
    role: "weapon identity",
    src: "/visual-assets/cod-plunger-rocket.png",
    accent: "#FF7A30",
  },
  {
    id: "cod-doodie-operative",
    label: "Doodie Operative",
    role: "player silhouette",
    src: "/visual-assets/cod-doodie-operative-v2.png",
    accent: "#5EE68A",
  },
  {
    id: "cod-karen-nemesis",
    label: "Karen Nemesis",
    role: "boss read",
    src: "/visual-assets/cod-karen-nemesis-v2.png",
    accent: "#FF69B4",
  },
];

export function getSignatureVisualAsset(id) {
  return SIGNATURE_VISUAL_ASSETS.find((asset) => asset.id === id) || null;
}

const RUNTIME_CHARACTER_ASSETS = Object.freeze({
  player: "/visual-assets/cod-doodie-operative-v2.png",
  karen: "/visual-assets/cod-karen-nemesis-v2.png",
});
const imageCache = new Map();

export function getRuntimeCharacterAsset(kind) {
  return RUNTIME_CHARACTER_ASSETS[kind] || null;
}

export function getRuntimeCharacterSprite(kind, ImageCtor = globalThis.Image) {
  const src = getRuntimeCharacterAsset(kind);
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
