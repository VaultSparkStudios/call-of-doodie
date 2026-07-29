import { expect, test } from "@playwright/test";

async function enterRun(page) {
  await page.getByTestId("front-door-deploy").click();
  await page.getByRole("button", { name: /skip.*go in clean/i }).click();
  const skipTraining = page.getByRole("button", { name: /skip training/i });
  if (await skipTraining.isVisible().catch(() => false)) await skipTraining.click();
  await expect(page.locator("#game-canvas")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("cod-reliability-e2e-ready") !== "1") {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("cod-reliability-e2e-ready", "1");
      localStorage.setItem("cod-seen-new-player-guide-v1", "1");
    }
  });
});

test("Retro Original is opt-in, persists, and reaches combat", async ({ page }, testInfo) => {
  await page.goto("/");
  const selector = page.getByTestId("visual-pack-selector");
  const modern = selector.getByRole("button", { name: /modern atlas/i });
  const retro = selector.getByRole("button", { name: /retro original/i });

  await expect(modern).toHaveAttribute("aria-pressed", "true");
  await retro.click();
  await expect(retro).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByTestId("visual-pack-selector").getByRole("button", { name: /retro original/i }))
    .toHaveAttribute("aria-pressed", "true");

  await enterRun(page);
  await page.screenshot({ path: testInfo.outputPath("retro-combat.png"), fullPage: true });
});

test("focus loss pauses and releases held movement", async ({ page }) => {
  await page.goto("/?debug=input");
  await enterRun(page);

  await page.keyboard.down("w");
  await expect(page.getByTestId("input-debug-hud")).toContainText(/MOVEkeyboard/i);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByText(/AUTO-PAUSED · FOCUS LOST/i)).toBeVisible();
  await page.keyboard.up("w");
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("input-debug-hud")).toContainText(/MOVEidle/i);
});
