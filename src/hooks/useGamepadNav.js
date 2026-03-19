import { useState, useEffect, useRef } from "react";

/**
 * Gamepad D-pad / left-stick menu navigation.
 *
 * Up/down (and optionally left/right) move focus.
 * Button 0 (A / Cross)  → onConfirm(focusedIdx)
 * Button 1 (B / Circle) → onBack()
 *
 * @param {object}   opts
 * @param {number}   opts.count         total navigable items
 * @param {number}   [opts.cols=1]      columns for 2-D grid layouts
 * @param {boolean}  [opts.enabled=true]
 * @param {boolean}  [opts.disableLR=false]  suppress left/right movement (for slider panels)
 * @param {function} [opts.onConfirm]   called with focused idx when A pressed
 * @param {function} [opts.onBack]      called when B pressed
 * @returns {number} focusedIdx
 */
export function useGamepadNav({
  count,
  cols = 1,
  enabled = true,
  disableLR = false,
  onConfirm,
  onBack,
}) {
  const [focusIdx, setFocusIdx] = useState(0);
  const r = useRef({ focusIdx: 0, onConfirm, onBack, count, cols });

  // Keep mutable ref in sync on every render (avoids stale closures)
  r.current.onConfirm = onConfirm;
  r.current.onBack    = onBack;
  r.current.count     = count;
  r.current.cols      = cols;

  useEffect(() => { r.current.focusIdx = focusIdx; }, [focusIdx]);

  // Clamp when count shrinks
  useEffect(() => {
    if (count > 0) setFocusIdx(i => Math.min(i, count - 1));
  }, [count]);

  useEffect(() => {
    if (!enabled || count === 0) return;

    const DEAD          = 0.5;
    const INITIAL_DELAY = 380; // ms before auto-repeat starts
    const REPEAT_RATE   = 140; // ms between repeats

    let lastA = false, lastB = false;
    let activeDir = null;
    let repeatTimeout = null;

    const doMove = (dir) => {
      const { focusIdx: fi, count: ct, cols: cl } = r.current;
      let next = fi;
      if (dir === "up")    next = Math.max(0,      fi - cl);
      if (dir === "down")  next = Math.min(ct - 1, fi + cl);
      if (dir === "left")  next = Math.max(0,      fi - 1);
      if (dir === "right") next = Math.min(ct - 1, fi + 1);
      if (next !== fi) { r.current.focusIdx = next; setFocusIdx(next); }
    };

    const startDir = (dir) => {
      if (activeDir === dir) return;
      clearTimeout(repeatTimeout);
      activeDir = dir;
      doMove(dir);
      const tick = () => {
        if (activeDir !== dir) return;
        doMove(dir);
        repeatTimeout = setTimeout(tick, REPEAT_RATE);
      };
      repeatTimeout = setTimeout(tick, INITIAL_DELAY);
    };

    const stopDir = () => { clearTimeout(repeatTimeout); activeDir = null; };

    const id = setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      if (!gp) return;

      const dUp    = gp.buttons[12]?.pressed;
      const dDown  = gp.buttons[13]?.pressed;
      const dLeft  = gp.buttons[14]?.pressed;
      const dRight = gp.buttons[15]?.pressed;
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;

      const up    = dUp    || ly < -DEAD;
      const down  = dDown  || ly >  DEAD;
      const left  = !disableLR && (dLeft  || lx < -DEAD);
      const right = !disableLR && (dRight || lx >  DEAD);

      if      (up)    startDir("up");
      else if (down)  startDir("down");
      else if (left)  startDir("left");
      else if (right) startDir("right");
      else            stopDir();

      const aNow = gp.buttons[0]?.pressed;
      const bNow = gp.buttons[1]?.pressed;
      if (aNow && !lastA) r.current.onConfirm?.(r.current.focusIdx);
      if (bNow && !lastB) r.current.onBack?.();
      lastA = !!aNow;
      lastB = !!bNow;
    }, 50);

    return () => { clearInterval(id); clearTimeout(repeatTimeout); };
  }, [enabled, count, disableLR]); // callbacks kept in r.current, no deps needed

  return focusIdx;
}
