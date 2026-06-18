const MATERIALS = {
  porcelain: {
    base: "#F7FAFF",
    rim: "#BFD8F5",
    shadow: "rgba(40,70,110,0.45)",
    highlight: "rgba(255,255,255,0.72)",
    specular: "rgba(255,255,255,0.9)",
  },
  combatGreen: {
    base: "#3A6A3A",
    rim: "#183C18",
    shadow: "rgba(9,24,9,0.5)",
    highlight: "rgba(145,220,145,0.24)",
    specular: "rgba(255,255,255,0.16)",
  },
  enemyFlesh: {
    base: "#FF69B4",
    rim: "rgba(0,0,0,0.55)",
    shadow: "rgba(0,0,0,0.45)",
    highlight: "rgba(255,255,255,0.18)",
    specular: "rgba(255,255,255,0.32)",
  },
  rubber: {
    base: "#1E1E24",
    rim: "#050507",
    shadow: "rgba(0,0,0,0.58)",
    highlight: "rgba(255,255,255,0.18)",
    specular: "rgba(255,255,255,0.34)",
  },
  metal: {
    base: "#808893",
    rim: "#2F343A",
    shadow: "rgba(0,0,0,0.5)",
    highlight: "rgba(230,245,255,0.38)",
    specular: "rgba(255,255,255,0.7)",
  },
};

export function getMaterialStyle(material = "enemyFlesh", overrides = {}) {
  const style = MATERIALS[material] || MATERIALS.enemyFlesh;
  return { ...style, ...overrides };
}

export function buildWeaponAccent(weapon = {}) {
  const color = weapon.color || "#FFD740";
  const name = String(weapon.name || "").toLowerCase();
  const material = name.includes("plunger") || name.includes("rubber") ? "rubber"
    : name.includes("rail") || name.includes("zapper") ? "metal"
      : "combatGreen";
  return {
    color,
    material,
    muzzleGlow: color,
    barrelLength: name.includes("sniper") || name.includes("rail") ? 24 : 16,
    barrelWidth: name.includes("minigun") ? 7 : 5,
  };
}

export function drawShadedOrb(ctx, {
  radius,
  material = "enemyFlesh",
  baseColor,
  alpha = 1,
  squash = 1,
  rimWidth = 2,
} = {}) {
  const r = Math.max(1, Number(radius) || 1);
  const style = getMaterialStyle(material, baseColor ? { base: baseColor } : {});
  ctx.save();
  ctx.globalAlpha *= alpha;

  const grad = ctx.createRadialGradient(-r * 0.32, -r * 0.42, r * 0.1, 0, 0, r);
  grad.addColorStop(0, style.highlight);
  grad.addColorStop(0.28, style.base);
  grad.addColorStop(0.78, style.base);
  grad.addColorStop(1, style.shadow);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * squash, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha *= 0.34;
  ctx.strokeStyle = style.shadow;
  ctx.lineWidth = r * 0.28;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.62, r * 0.62 * squash, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = style.specular;
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.38 * squash, r * 0.28, r * 0.16, -0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = style.rim;
  ctx.lineWidth = rimWidth;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * squash, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawWeaponBarrel(ctx, accent = {}, { x = 13, y = -2.5 } = {}) {
  const style = getMaterialStyle(accent.material || "metal");
  const length = accent.barrelLength || 16;
  const width = accent.barrelWidth || 5;
  ctx.fillStyle = style.base;
  ctx.fillRect(x, y, length, width);
  ctx.fillStyle = style.rim;
  ctx.fillRect(x + length - 4, y - 1, 6, width + 2);
  ctx.fillStyle = accent.color || "#FFD740";
  ctx.fillRect(x + length + 2, y, 6, width);
  ctx.fillStyle = style.highlight;
  ctx.fillRect(x + 2, y + 0.7, Math.max(4, length - 5), 1);
}

export const VISUAL_PRIMITIVE_VERSION = "cod-visual-primitives-v1";
