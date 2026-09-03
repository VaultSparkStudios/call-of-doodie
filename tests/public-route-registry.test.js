import { describe, expect, it } from "vitest";
import { buildPublicGameplayContract } from "../scripts/lib/public-gameplay-contract.mjs";
import {
  buildAgentsManifest,
  buildFooterManifest,
  buildLlmsText,
  buildRouteContractProof,
  buildSitemapXml,
  getGeneratedCompanionPages,
  getPublicRouteRegistry,
  getVisualAuditRoutes,
} from "../scripts/lib/public-route-registry.mjs";

describe("public route truth graph", () => {
  it("owns every human route once and sends each route through visual verification", () => {
    const routes = getPublicRouteRegistry();
    expect(routes).toHaveLength(18);
    expect(new Set(routes.map((route) => route.id)).size).toBe(routes.length);
    expect(new Set(routes.map((route) => route.path)).size).toBe(routes.length);
    expect(getGeneratedCompanionPages()).toHaveLength(13);
    expect(getVisualAuditRoutes().map((route) => route.id)).toEqual([
      ...routes.map((route) => route.id),
      "login",
      "auth-callback",
    ]);
  });

  it("makes the footer a complete index of header and public destinations", () => {
    const manifest = buildFooterManifest();
    const footer = new Set(manifest.footerLinks.map((link) => link.href));
    expect(manifest.headerLinks).toHaveLength(5); // S163: /play/ retired; Play is the in-app deploy anchor
    expect(manifest.footerLinks).toHaveLength(18);
    for (const link of [...manifest.headerLinks, ...manifest.legalPages.map((href) => ({ href }))]) {
      expect(footer.has(link.href)).toBe(true);
    }
  });

  it("derives player and agent mechanics summaries from the gameplay contract", () => {
    const gameplay = buildPublicGameplayContract();
    const pages = getGeneratedCompanionPages();
    const enemyCopy = JSON.stringify(pages.find((page) => page.id === "enemies"));
    const arsenalCopy = JSON.stringify(pages.find((page) => page.id === "arsenal"));
    const modesCopy = JSON.stringify(pages.find((page) => page.id === "modes"));
    for (const enemy of gameplay.enemies) expect(enemyCopy).toContain(enemy.name);
    for (const weapon of gameplay.weapons) expect(arsenalCopy).toContain(weapon.name);
    for (const mode of gameplay.modes) expect(modesCopy).toContain(mode.label);
    expect(buildAgentsManifest().description).toContain(`${gameplay.enemies.length} distinct enemies`);
    expect(buildLlmsText()).toContain(`${gameplay.weapons.length} weapons`);
  });

  it("generates discovery surfaces from the same canonical route set", () => {
    const routes = getPublicRouteRegistry();
    const sitemap = buildSitemapXml();
    const agents = buildAgentsManifest();
    for (const route of routes) {
      expect(sitemap).toContain(`<loc>${route.canonicalUrl}</loc>`);
      expect(agents.resources).toContainEqual(expect.objectContaining({ href: route.canonicalUrl }));
    }
  });

  it("publishes a deterministic proof ledger for every route consumer", () => {
    const first = buildRouteContractProof();
    const second = buildRouteContractProof();
    expect(first).toEqual(second);
    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.coverage).toMatchObject({ routes: 18, headerRoutes: 5, footerRoutes: 18, visualAuditRoutes: 20, generatedPages: 13 });
    expect(first.consumers).toEqual(expect.arrayContaining(["sitemap", "agents", "llms", "visual-audit"]));
    expect(buildAgentsManifest().resources).toContainEqual(expect.objectContaining({ rel: "route-contract" }));
    expect(buildAgentsManifest().resources).toContainEqual(expect.objectContaining({ rel: "game-stats", href: "https://callofdoodie.wtf/stats-surface.json" }));
  });
});
