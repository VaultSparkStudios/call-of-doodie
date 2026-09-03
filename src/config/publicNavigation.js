export const PRIMARY_PUBLIC_NAV = Object.freeze([
  { id: "home", href: "/", label: "Home" },
  { id: "play", href: "/#deploy", label: "Play" },
  { id: "modes", href: "/modes/", label: "Modes" },
  { id: "stats", href: "/stats/", label: "Stats" },
  { id: "leaderboard", href: "/leaderboard/", label: "Leaderboard" },
  { id: "arsenal", href: "/arsenal/", label: "Arsenal" },
]);

export const MORE_PUBLIC_NAV = Object.freeze([
  { id: "how-to-play", href: "/how-to-play/", label: "How to Play" },
  { id: "enemies", href: "/enemies/", label: "Enemies" },
  { id: "accessibility", href: "/accessibility/", label: "Accessibility" },
  { id: "changelog", href: "/changelog/", label: "What’s New" },
  { id: "roadmap", href: "/roadmap/", label: "Roadmap" },
  { id: "support", href: "/support/", label: "Support" },
  { id: "contact", href: "/contact/", label: "Contact" },
]);

export const FOOTER_PUBLIC_NAV = Object.freeze([
  ...PRIMARY_PUBLIC_NAV.filter((item) => item.id !== "home"),
  ...MORE_PUBLIC_NAV,
  { id: "about", href: "/about/", label: "About" },
  { id: "press-kit", href: "/press-kit/", label: "Press Kit" },
  { id: "status", href: "/status/", label: "Status" },
]);

// S155: legal/agent link truth and the parody disclaimer moved here from
// SiteFooter.jsx (and a duplicate disclaimer string in the route registry) so
// the React footer, the generated static footers, and footer-manifest.json
// all draw from one module.
export const LEGAL_PUBLIC_NAV = Object.freeze([
  { id: "privacy", href: "/privacy/", label: "Privacy" },
  { id: "terms", href: "/terms/", label: "Terms" },
  { id: "ip", href: "/ip/", label: "Rights & IP" },
]);

export const AGENT_PUBLIC_NAV = Object.freeze([
  { id: "agents", href: "/agents.json", label: "Agents" },
  { id: "llms", href: "/.well-known/llms.txt", label: "LLMS" },
]);

export const PARODY_DISCLAIMER =
  "Call of Doodie is a parody game and is not affiliated with, endorsed by, or associated with Activision, the Call of Duty franchise, or any related entity.";

// S163: footer grouping shared by SiteFooter.jsx (React) and the generated
// static footers (scripts/lib/public-route-registry.mjs). Ids reference nav ids.
export const FOOTER_GROUPS = Object.freeze([
  { id: "play", label: "Play", ids: ["play", "modes", "leaderboard", "stats"] },
  { id: "learn", label: "Learn", ids: ["how-to-play", "enemies", "arsenal", "changelog", "roadmap", "accessibility"] },
  { id: "studio", label: "Studio", ids: ["about", "press-kit", "support", "contact", "status", "privacy", "terms", "ip"] },
]);

export function groupFooterLinks(items = FOOTER_PUBLIC_NAV, { groups = FOOTER_GROUPS } = {}) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const used = new Set();
  const out = groups.map((group) => ({
    ...group,
    links: group.ids.map((id) => byId.get(id)).filter(Boolean).map((item) => { used.add(item.id); return item; }),
  }));
  const rest = items.filter((item) => !used.has(item.id));
  if (rest.length) out[out.length - 1].links.push(...rest);
  return out;
}
