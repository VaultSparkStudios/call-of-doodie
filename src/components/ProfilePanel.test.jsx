import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import ProfilePanel from "./ProfilePanel.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.restoreAllMocks());

it("keeps guest Record tabs and save failure notices usable with denied storage", async () => {
  for (const key of ["localStorage", "sessionStorage"]) vi.spyOn(globalThis, key, "get").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); });
  const host = document.createElement("div"); document.body.appendChild(host);
  const tree = createRoot(host);
  const scroll = vi.fn();
  const oldScroll = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = scroll;
  const button = name => [...document.querySelectorAll("button")].find(b => b.textContent === name);
  try {
    await act(async () => tree.render(<ProfilePanel onClose={vi.fn()} />));
    expect(document.body.textContent).toContain("Guest operative");
    for (const tab of ["Runs", "Collection", "Save & Identity"]) {
      await act(async () => button(tab).click());
      expect(button(tab).getAttribute("aria-current")).toBe("page");
    }
    await act(async () => button("⬇ Download backup").click());
    expect(document.body.textContent).toContain("Backup unavailable");
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
    expect(document.body.textContent).not.toContain("Backup downloaded");
    const input = document.querySelector('input[type="file"]');
    Object.defineProperty(input, "files", { configurable: true, value: [{ text: async () => JSON.stringify({ schema: "cod-progress-backup-v2", entries: { "cod-career-v1": '{"bestScore":42}' } }) }] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await act(async () => button("Apply restore").click());
    expect(document.body.textContent).toContain("Restore unavailable");
    expect(button("Cancel")).toBeTruthy();
  } finally { await act(async () => tree.unmount()); host.remove(); Element.prototype.scrollIntoView = oldScroll; }
});
