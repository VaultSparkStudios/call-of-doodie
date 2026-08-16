/* global __COD_COPYRIGHT_YEAR__ */
import { AGENT_PUBLIC_NAV, FOOTER_PUBLIC_NAV, LEGAL_PUBLIC_NAV, PARODY_DISCLAIMER } from "../config/publicNavigation.js";

// Shared footer consumed by every game home. Link truth lives in
// publicNavigation.js (S155); the © year is injected at build time.

const LEGAL_LINKS = LEGAL_PUBLIC_NAV;
const AGENT_LINKS = AGENT_PUBLIC_NAV;
const COPYRIGHT_YEAR = typeof __COD_COPYRIGHT_YEAR__ !== "undefined" ? __COD_COPYRIGHT_YEAR__ : String(new Date().getFullYear());

/**
 * @param {object} props
 * @param {(href: string) => void} [props.onSupporterClick] — omit to hide the supporter button
 * @param {boolean} [props.isSupporterActive]
 * @param {number|null} [props.onlinePlayers] — shows a "● N ONLINE" chip when set
 * @param {{line?: string, quiet?: string}} [props.palette] — theme colors; falls back to a neutral dark palette
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
  const line = palette.line || "rgba(255,255,255,0.07)";
  const quiet = palette.quiet || "#999";
  const resolvedLinkColor = linkColor || quiet;

  const linkStyle = { fontSize: 14, color: resolvedLinkColor, letterSpacing: 0.35, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 4px" };
  const buttonStyle = {
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
    fontSize: 14, letterSpacing: 0.35, textDecoration: "underline dotted", minHeight: 44,
    color: isSupporterActive ? "#FFD700" : resolvedLinkColor,
  };

  return (
    <footer
      data-testid="site-footer"
      style={{
        marginTop: 16, paddingTop: 12, borderTop: `1px solid ${line}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 12, flexWrap: "wrap", ...style,
      }}
    >
      <span style={{ fontSize: 14, color: quiet, letterSpacing: 0.35 }}>
        A <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{ color: resolvedLinkColor, textDecoration: "none" }}>VaultSpark Studios</a> Game
      </span>
      {onlinePlayers !== null && (
        <span style={{ fontSize: 14, color: "#0F0", letterSpacing: 0.35 }}>● {onlinePlayers} ONLINE</span>
      )}
      {onSupporterClick && (
        <button type="button" aria-label="Support the developer" onClick={onSupporterClick} style={buttonStyle}>
          {isSupporterActive ? "⭐ SUPPORTER" : "❤️ SUPPORT THE DEV"}
        </button>
      )}
      {FOOTER_PUBLIC_NAV.map((item) => <a key={item.href} href={item.href} style={linkStyle}>{item.label}</a>)}
      {LEGAL_LINKS.map((item) => <a key={item.href} href={item.href} style={linkStyle}>{item.label.toUpperCase()}</a>)}
      {AGENT_LINKS.map((item) => <a key={item.href} href={item.href} style={linkStyle}>{item.label.toUpperCase()}</a>)}
      <span style={{ fontSize: 13, color: quiet }}>© {COPYRIGHT_YEAR} VaultSpark Studios LLC. All rights reserved.</span>
      <p style={{
        flexBasis: "100%", margin: "6px 0 0", padding: "0 8px", fontSize: 12, lineHeight: 1.6,
        color: "#666", textAlign: "center", maxWidth: 720, marginLeft: "auto", marginRight: "auto",
      }}>
        {PARODY_DISCLAIMER}
      </p>
    </footer>
  );
}
