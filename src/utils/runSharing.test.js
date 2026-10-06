import { describe, expect, it, vi } from "vitest";
import { buildRunShareUrl, shareRunLink } from "./runSharing.js";
import { decodeScenarioCartridge } from "./scenarioCartridge.js";
import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";

describe("end-run sharing", () => {
  it.each(FULL_MODE_CATALOG.map(({ id }) => id))("preserves %s setup in a canonical playable link", (mode) => {
    const url = new URL(buildRunShareUrl({ seed: 987654321, mode, difficulty: "insane", starterLoadout: "tank" }));
    expect(url.origin).toBe("https://callofdoodie.wtf");
    expect(decodeScenarioCartridge(url.searchParams.get("scenario"))).toMatchObject({ seed: 987654321, mode, difficulty: "insane", loadout: "tank" });
  });
  it("calls native sharing before any clipboard work", async () => {
    const share = vi.fn().mockResolvedValue();
    const writeText = vi.fn();
    expect(await shareRunLink({ url: "https://example.com", text: "Score 42" }, { share, clipboard: { writeText } })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Call of Doodie run", text: "Score 42", url: "https://example.com" });
    expect(writeText).not.toHaveBeenCalled();
  });
  it("does not copy after a player cancels sharing", async () => {
    const writeText = vi.fn();
    expect(await shareRunLink({ url: "x", text: "score" }, { share: vi.fn().mockRejectedValue({ name: "AbortError" }), clipboard: { writeText } })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
  it("copies the score and link when native sharing fails", async () => {
    const writeText = vi.fn().mockResolvedValue();
    expect(await shareRunLink({ url: "x", text: "score" }, { share: vi.fn().mockRejectedValue(new Error("denied")), clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("score\nx");
  });
  it("returns a manual fallback for missing or denied clipboard access", async () => {
    expect(await shareRunLink({ url: "x", text: "score" }, {})).toBe("manual");
    expect(await shareRunLink({ url: "x", text: "score" }, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })).toBe("manual");
  });
});
