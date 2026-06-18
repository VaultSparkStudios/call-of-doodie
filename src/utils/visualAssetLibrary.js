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
    src: "/visual-assets/cod-doodie-operative.png",
    accent: "#5EE68A",
  },
  {
    id: "cod-karen-nemesis",
    label: "Karen Nemesis",
    role: "boss read",
    src: "/visual-assets/cod-karen-nemesis.png",
    accent: "#FF69B4",
  },
];

export function getSignatureVisualAsset(id) {
  return SIGNATURE_VISUAL_ASSETS.find((asset) => asset.id === id) || null;
}
