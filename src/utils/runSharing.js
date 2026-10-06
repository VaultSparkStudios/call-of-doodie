import { CANONICAL_SITE_URL } from "../config/site.js";
import { buildScenarioCartridge, buildSewerRelayUrl } from "./scenarioCartridge.js";

export function buildRunShareUrl({ seed, mode, difficulty, starterLoadout }) {
  const cartridge = buildScenarioCartridge({ seed, mode, difficulty, loadout: starterLoadout });
  return cartridge ? buildSewerRelayUrl(cartridge, `${CANONICAL_SITE_URL}play/`) : CANONICAL_SITE_URL;
}

// Call native sharing directly from the click; asynchronous image generation
// can consume the browser's transient user activation before a share sheet opens.
export async function shareRunLink({ url, text }, browser = navigator) {
  if (typeof browser.share === "function") {
    try {
      await browser.share({ title: "Call of Doodie run", text, url });
      return "shared";
    } catch (error) {
      if (error.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (typeof browser.clipboard?.writeText !== "function") return "manual";
    await browser.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "manual";
  }
}
