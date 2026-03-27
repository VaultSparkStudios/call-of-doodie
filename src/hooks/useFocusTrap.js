// ===== FOCUS TRAP — keyboard accessibility for modal dialogs =====
// Traps Tab/Shift+Tab focus within a container while active.
// Restores focus to the previously active element on unmount.

import { useEffect } from "react";

const FOCUSABLE_SELECTORS = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Trap keyboard focus inside `ref.current` while `enabled` is true.
 * @param {React.RefObject} ref      - ref to the container element
 * @param {boolean}         enabled  - activate/deactivate the trap
 */
export function useFocusTrap(ref, enabled = true) {
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const container = ref.current;
    const previouslyFocused = document.activeElement;

    // Move initial focus into the modal
    const focusable = [...container.querySelectorAll(FOCUSABLE_SELECTORS)];
    if (focusable.length > 0) focusable[0].focus();

    function handleKeyDown(e) {
      if (e.key !== "Tab") return;
      const current = [...container.querySelectorAll(FOCUSABLE_SELECTORS)];
      if (current.length === 0) return;
      const first = current[0];
      const last  = current[current.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Restore focus to whatever had it before the modal opened
      try { previouslyFocused?.focus(); } catch { /* ignore */ }
    };
  }, [ref, enabled]);
}
