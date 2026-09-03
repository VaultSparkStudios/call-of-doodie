/* global __COD_COPYRIGHT_YEAR__ */
import { AGENT_PUBLIC_NAV, FOOTER_PUBLIC_NAV, LEGAL_PUBLIC_NAV, PARODY_DISCLAIMER, groupFooterLinks } from "../config/publicNavigation.js";

// Shared footer consumed by every game home. Link truth lives in
// publicNavigation.js (S155); the © year is injected at build time.
// S163: three labelled columns (Play / Learn / Studio) replace the flat wrap so
// eighteen links read as a map instead of noise; the static page footer
// mirrors the same grouping from footer-manifest.json.

const LEGAL_LINKS = LEGAL_PUBLIC_NAV;
const AGENT_LINKS = AGENT_PUBLIC_NAV;
const COPYRIGHT_YEAR = typeof __COD_COPYRIGHT_YEAR__ !== "undefined" ? __COD_COPYRIGHT_YEAR__ : String(new Date().getFullYear());

/**
 * @param {object} props
 * @param {(href: string) => void} [props.onSupporterClick] — omit to hide the supporter button
 * @param {boolean} [props.isSupporterActive]
 * @param {number|null} [props.onlinePlayers] — shows a "● N ONLINE" chip when set
 * @param {{line?: string, quiet?: string}} [props.palette] — theme colors; falls back to tokens
 * @param {string} [props.linkColor]
 * @param {object} [props.style] — extra wrapper style overrides
 */
export default function SiteFooter({
  onSupporterClick,
  isSupporterActive = false,
  onlinePlayers = null,
  palette = {},
  linkColor,
  style = {},
}) {
  const line = palette.line || "var(--cod-line)";
  const quiet = palette.quiet || "var(--cod-quiet)";
  const resolvedLinkColor = linkColor || quiet;
  const groups = groupFooterLinks([...FOOTER_PUBLIC_NAV, ...LEGAL_LINKS]);

  const linkStyle = { fontSize: 14, color: resolvedLinkColor, letterSpacing: 0.35, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 4px" };
  const headingStyle = { fontSize: 11, letterSpacing: 2, color: "var(--cod-orange)", fontWeight: 900, marginBottom: 2 };
  const buttonStyle = {
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
    fontSize: 14, letterSpacing: 0.35, textDecoration: "underline dotted", minHeight: 44,
    color: isSupporterActive ? "var(--cod-gold)" : resolvedLinkColor,
  };

  return (
    <footer
      data-testid="site-footer"
      style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${line}`, ...style }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px 18px", textAlign: "left", maxWidth: 760, margin: "0 auto" }}>
        {groups.map((group) => (
          <nav key={group.id} aria-label={`${group.label} links`} style={{ display: "flex", flexDirection: "column" }}>
            <div style={headingStyle}>{group.label.toUpperCase()}</div>
            {group.links.map((item) => <a key={item.href} href={item.href} style={linkStyle}>{item.label}</a>)}
          </nav>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ fontSize: 14, color: quiet, letterSpacing: 0.35 }}>
          A <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{ color: resolvedLinkColor, textDecoration: "none" }}>VaultSpark Studios</a> Game
        </span>
        {onlinePlayers !== null && (
          <span style={{ fontSize: 14, color: "var(--cod-green)", letterSpacing: 0.35 }}>● {onlinePlayers} ONLINE</span>
        )}
        {onSupporterClick && (
          <button type="button" aria-label="Support the developer" onClick={onSupporterClick} style={buttonStyle}>
            {isSupporterActive ? "⭐ SUPPORTER" : "❤️ SUPPORT THE DEV"}
          </button>
        )}
        {AGENT_LINKS.map((item) => <a key={item.href} href={item.href} style={{ ...linkStyle, fontSize: 12 }}>{item.label.toUpperCase()}</a>)}
        <span style={{ fontSize: 13, color: quiet }}>© {COPYRIGHT_YEAR} VaultSpark Studios LLC. All rights reserved.</span>
      </div>
      <p style={{
        margin: "6px 0 0", padding: "0 8px", fontSize: 12, lineHeight: 1.6,
        color: quiet, textAlign: "center", maxWidth: 720, marginLeft: "auto", marginRight: "auto",
      }}>
        {PARODY_DISCLAIMER}
      </p>
    </footer>
  );
}
