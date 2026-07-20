import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, nextTheme, readTheme, resolveTheme, THEME_STORAGE_KEY } from "./theme.js";

describe("theme contract", () => {
  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute("data-cod-theme");
    document.documentElement.style.colorScheme = "";
    window.history.replaceState({}, "", "/");
  });

  it("resolves explicit URL over storage and otherwise defaults to Sewer Night", () => {
    expect(resolveTheme({ query: "?theme=porcelain-day", stored: "sewer-night" })).toBe("porcelain-day");
    expect(resolveTheme({ stored: "porcelain-day" })).toBe("porcelain-day");
    expect(resolveTheme({ stored: "broken", prefersLight: true })).toBe("sewer-night");
    expect(resolveTheme({ prefersLight: true })).toBe("sewer-night");
    expect(resolveTheme()).toBe("sewer-night");
  });

  it("applies, persists, reads, and rotates the project theme", () => {
    applyTheme("porcelain-day");
    expect(document.documentElement.dataset.codTheme).toBe("porcelain-day");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("porcelain-day");
    expect(readTheme(window)).toBe("porcelain-day");
    expect(nextTheme("porcelain-day")).toBe("sewer-night");
  });
});
