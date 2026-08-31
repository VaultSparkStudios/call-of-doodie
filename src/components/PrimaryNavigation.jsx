import { useEffect, useRef, useState } from "react";
import { MORE_PUBLIC_NAV, PRIMARY_PUBLIC_NAV } from "../config/publicNavigation.js";

const iconById = { play: "▶", stats: "▥", progress: "◆", loadout: "⚙", more: "•••" };

// Primary pages not in the mobile bottom bar — added to the More drawer so
// mobile users reach the same destinations as desktop (CANON-041 parity).
const MOBILE_PRIMARY_NAV = PRIMARY_PUBLIC_NAV.filter(
  (item) => !["home", "play", "stats"].includes(item.id),
);

export default function PrimaryNavigation({ palette, onOpenProgress, onOpenLoadout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const closeRef = useRef(null);
  const priorFocus = useRef(null);

  useEffect(() => {
    if (!moreOpen) return undefined;
    priorFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMoreOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      priorFocus.current?.focus?.();
    };
  }, [moreOpen]);

  const closeMore = () => setMoreOpen(false);
  const action = (callback) => () => { closeMore(); callback?.(); };

  return (
    <>
      <header className="home-nav" data-testid="primary-navigation">
        <a className="home-nav__brand" href="/" aria-label="Call of Doodie home">
          <span aria-hidden="true">💩</span><span>CALL OF <b>DOODIE</b></span>
        </a>
        <nav className="home-nav__desktop" aria-label="Main navigation">
          {PRIMARY_PUBLIC_NAV.filter((item) => item.id !== "home").map((item) => <a key={item.id} href={item.href}>{item.label}</a>)}
          <button type="button" aria-expanded={moreOpen} aria-controls="home-more-menu" onClick={() => setMoreOpen(true)}>More</button>
        </nav>
      </header>

      <nav className="home-mobile-nav" aria-label="Game navigation">
        <a href="#deploy"><span aria-hidden="true">{iconById.play}</span>Play</a>
        <a href="#live-stats"><span aria-hidden="true">{iconById.stats}</span>Stats</a>
        <button type="button" onClick={onOpenProgress}><span aria-hidden="true">{iconById.progress}</span>Progress</button>
        <button type="button" onClick={onOpenLoadout}><span aria-hidden="true">{iconById.loadout}</span>Loadout</button>
        <button type="button" aria-expanded={moreOpen} aria-controls="home-more-menu" onClick={() => setMoreOpen(true)}><span aria-hidden="true">{iconById.more}</span>More</button>
      </nav>

      {moreOpen && (
        <div className="home-more-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeMore()}>
          <section id="home-more-menu" className="home-more-menu" role="dialog" aria-modal="true" aria-labelledby="home-more-title" data-color-scheme={palette?.colorScheme || "dark"}>
            <div className="home-more-menu__head">
              <div><span>NAVIGATE</span><h2 id="home-more-title">More from the sewer</h2></div>
              <button ref={closeRef} type="button" aria-label="Close navigation" onClick={closeMore}>✕</button>
            </div>
            <p className="home-section-label home-more-menu__section-label">GAME</p>
            <div className="home-more-menu__grid">
              {MOBILE_PRIMARY_NAV.map((item) => <a key={item.id} href={item.href}>{item.label}<span aria-hidden="true">→</span></a>)}
              <a href="/stats/">Full Stats<span aria-hidden="true">→</span></a>
              <button type="button" onClick={action(onOpenProgress)}>Player Progress<span aria-hidden="true">→</span></button>
              <button type="button" onClick={action(onOpenLoadout)}>Loadouts<span aria-hidden="true">→</span></button>
            </div>
            <p className="home-section-label home-more-menu__section-label">EXPLORE</p>
            <div className="home-more-menu__grid">
              {MORE_PUBLIC_NAV.map((item) => <a key={item.id} href={item.href}>{item.label}<span aria-hidden="true">→</span></a>)}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
