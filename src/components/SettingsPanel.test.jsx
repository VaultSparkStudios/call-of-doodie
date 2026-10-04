import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import SettingsPanel from "./SettingsPanel.jsx";
import { SETTINGS_DEFAULTS } from "../settings.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it("names every setting and exposes values and selected states in both tabs", async () => {
  const host = document.createElement("div"); document.body.appendChild(host);
  const tree = createRoot(host);
  try {
    await act(async () => tree.render(<SettingsPanel settings={SETTINGS_DEFAULTS} onSave={vi.fn()} onClose={vi.fn()} />));
    let sliders = 0;
    for (const tab of ["Quick", "Advanced"]) {
      await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === tab).click());
      for (const input of host.querySelectorAll('input[type="range"]')) {
        sliders++;
        expect(document.getElementById(input.getAttribute('aria-labelledby'))?.textContent).toBeTruthy();
        expect(input.getAttribute('aria-valuetext')).toBeTruthy();
      }
      for (const toggle of [...host.querySelectorAll('button')].filter(b => /^(✓ ON|OFF)$/.test(b.textContent))) {
        expect(toggle.hasAttribute('aria-pressed')).toBe(true);
        expect(toggle.getAttribute('aria-label') || document.getElementById(toggle.getAttribute('aria-labelledby'))?.textContent).toBeTruthy();
      }
    }
    expect(sliders).toBe(14);
  } finally { await act(async () => tree.unmount()); host.remove(); }
});
