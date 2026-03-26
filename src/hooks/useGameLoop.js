import { useEffect, useRef } from "react";

/**
 * Drives a requestAnimationFrame loop.
 * - Calls `callback` every frame while `active` is true.
 * - Always uses the latest version of `callback` (via ref), so callers
 *   don't need to pass it as a dependency.
 * - Cleans up on unmount or when `active` becomes false.
 *
 * @param {Function} callback  Called once per animation frame.
 * @param {boolean}  active    When false the loop is stopped.
 * @param {React.MutableRefObject} [rafRef]  Optional external ref that will
 *   be kept in sync with the current rAF handle (for external cancellation).
 */
export function useGameLoop(callback, active, rafRef) {
  const cbRef = useRef(callback);
  cbRef.current = callback; // always latest — never stale

  useEffect(() => {
    if (!active) {
      if (rafRef?.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    let handle;
    const loop = () => {
      cbRef.current();
      handle = requestAnimationFrame(loop);
      if (rafRef) rafRef.current = handle;
    };
    handle = requestAnimationFrame(loop);
    if (rafRef) rafRef.current = handle;
    return () => {
      cancelAnimationFrame(handle);
      if (rafRef) rafRef.current = null;
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
}
