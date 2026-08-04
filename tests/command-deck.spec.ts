import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output = path.resolve("output/playwright/implement-s138/command-deck");
fs.mkdirSync(output, { recursive: true });

for (const profile of [
  { name: "desktop-dark", width: 1440, height: 1000, theme: "sewer-night" },
  { name: "desktop-light", width: 1440, height: 1000, theme: "porcelain-day" },
  { name: "mobile-dark", width: 390, height: 844, theme: "sewer-night" },
  { name: "mobile-light", width: 390, height: 844, theme: "porcelain-day" },
]) {
  test(`command deck ${profile.name}`, async ({ page }) => {
    await page.setViewportSize({ width: profile.width, height: profile.height });
    await page.goto(`/?theme=${profile.theme}`);
    await page.getByRole("button", { name: /Enter command deck/i }).click();
    await expect(page.getByTestId("home-v2-shell")).toBeVisible();
    await expect(page.getByText(/ORDERS ·/)).toBeVisible();
    await expect(page.getByText("OPERATIONS", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /PROGRESS TOOLS/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings", exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: /FIELD MANUAL/ }).click();
    await expect(page.getByTestId("field-manual-truth")).toBeVisible();
    await expect(page.getByText("Advisory", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, `${profile.name}.png`), fullPage: true });
  });
}

test("loads a Scenario Cartridge only after integrity validation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Enter command deck/i }).click();
  await page.getByRole("button", { name: /Change mode or difficulty/i }).click();
  await expect(page.getByTestId("scenario-cartridge")).toBeVisible();
  await page.getByLabel("Scenario Cartridge code").fill("tampered");
  await page.getByTestId("scenario-cartridge").getByRole("button", { name: "LOAD" }).click();
  await expect(page.getByText(/Cartridge rejected/)).toBeVisible();
});
