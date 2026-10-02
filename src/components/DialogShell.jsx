import { useEffect, useRef } from "react";
import "./dialog-shell.css";

const activeDialogs = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** One keyboard boundary for player tools and end-of-run dialogs. */
export default function DialogShell({
  children,
  title,
  titleId,
  onClose,
  onBackdrop,
  surface = "game",
  fullScreen = false,
  zIndex,
  className = "",
  style,
  ...rest
}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    activeDialogs.push(node);
    if (!node.contains(document.activeElement)) node.focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (activeDialogs.at(-1) !== node) return;
      if (event.key === "Escape" && closeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const entries = [...node.querySelectorAll(FOCUSABLE)].filter((element) => element.getClientRects().length && !element.closest('[inert]'));
      if (!entries.length) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = entries[0];
      const last = entries.at(-1);
      if (!node.contains(document.activeElement) || document.activeElement === node || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
      window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      const index = activeDialogs.lastIndexOf(node);
      if (index >= 0) activeDialogs.splice(index, 1);
      if (previous?.isConnected && typeof previous.focus === "function") previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      {...rest}
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={titleId ? undefined : title}
      aria-labelledby={titleId}
      tabIndex={-1}
      data-cod-surface={surface === "game" ? "game" : undefined}
      className={`cod-dialog${fullScreen ? " cod-dialog--full" : ""} ${className}`.trim()}
      style={{ zIndex, ...style }}
      onClick={onBackdrop ? (event) => { if (event.target === event.currentTarget) onBackdrop(); } : undefined}
    >
      {children}
    </div>
  );
}
