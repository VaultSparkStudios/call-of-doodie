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
