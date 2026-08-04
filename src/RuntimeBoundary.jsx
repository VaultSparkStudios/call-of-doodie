import { lazy, Suspense, useEffect, useState } from "react";

const loadRuntime = () => import("./App.jsx");
const GameRuntime = lazy(loadRuntime);
const DEFER_RUNTIME_MS = 2200;

function RuntimeShell({ onEnter }) {
  return (
    <main className="runtime-shell" data-testid="runtime-shell">
      <section className="runtime-shell__card" aria-labelledby="runtime-title">
        <p className="runtime-shell__eyebrow">VaultSpark Studios presents</p>
        <h1 id="runtime-title">CALL OF <span>DOODIE</span></h1>
        <p className="runtime-shell__lede">A comedy-first browser roguelite. The command deck is loading behind this lightweight first frame—enter immediately whenever you’re ready.</p>
        <button
          type="button"
          data-testid="runtime-enter"
          onPointerEnter={loadRuntime}
          onFocus={loadRuntime}
          onClick={onEnter}
        >
          Enter command deck <span aria-hidden="true">→</span>
        </button>
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
    // Protect the first useful frame from the 700KB+ arena graph. A visible
    // player can always enter immediately; otherwise the full command deck
    // replaces this shell after the good-LCP budget has elapsed.
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
