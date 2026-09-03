import { lazy, Suspense, useEffect, useState } from "react";

const loadRuntime = () => import("./App.jsx");
const GameRuntime = lazy(loadRuntime);
const DEFER_RUNTIME_MS = 900;

function RuntimeShell({ onEnter }) {
  return (
    <main className="runtime-shell" data-testid="runtime-shell">
      <section className="runtime-shell__card" aria-labelledby="runtime-title">
        <p className="runtime-shell__eyebrow">VaultSpark Studios presents</p>
        <h1 id="runtime-title">CALL OF <span>DOODIE</span></h1>
        <p className="runtime-shell__lede">A comedy-first browser roguelite. Deploy in seconds, improvise a ridiculous build, and turn every defeat into the next revenge run.</p>
        <button
          type="button"
          data-testid="runtime-enter"
          onPointerEnter={loadRuntime}
          onFocus={loadRuntime}
          onClick={onEnter}
        >
          Play now <span aria-hidden="true">→</span>
        </button>
        <nav className="runtime-shell__nav" aria-label="Explore Call of Doodie">
          <a href="/board/">Board</a>
          <a href="/modes/">Modes</a>
          <a href="/field-manual/">Field Manual</a>
          <a href="/bestiary/">Bestiary</a>
        </nav>
        <div className="runtime-shell__meta" aria-label="Game characteristics">
          <span>Free to play</span><span>Guest-first</span><span>Local progress</span><span>Keyboard · mouse · controller</span>
        </div>
      </section>
    </main>
  );
}

export function RuntimeBoundary() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Protect the first useful frame from the arena graph. The shell is a real
    // public front door while the playable home hydrates behind it.
    const activate = () => {
      if (document.visibilityState === "visible") {
        performance.mark?.("cod-runtime-activation");
        setActive(true);
      }
    };
    const timer = window.setTimeout(activate, DEFER_RUNTIME_MS);
    const onVisible = () => document.visibilityState === "visible" && activate();
    document.addEventListener("visibilitychange", onVisible, { once: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!active) return <RuntimeShell onEnter={() => setActive(true)} />;
  return <Suspense fallback={<RuntimeShell onEnter={() => {}} />}><GameRuntime /></Suspense>;
}
