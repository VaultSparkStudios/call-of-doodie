import { expect, test } from "@playwright/test";

test("retro command center exposes and carries the chosen primary into combat", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("cod-seen-new-player-guide-v1", "1");
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /call of doodie/i })).toBeVisible();
  await expect(page.getByText(/insert courage/i)).toBeVisible();
  const primarySelector = page.getByRole("group", { name: "Choose primary weapon" });
  await expect(primarySelector.getByRole("button")).toHaveCount(12);
  await primarySelector.getByRole("button", { name: /equip rubber chicken rpg/i }).click();
  await expect(primarySelector.getByRole("button", { name: /equipped rubber chicken rpg/i })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("arcade-command-center.png"), fullPage: true });
  await page.getByTestId("front-door-deploy").click();
  await page.getByRole("button", { name: /skip.*go in clean/i }).click();
  const skipTraining = page.getByRole("button", { name: /skip training/i });
  if (await skipTraining.isVisible().catch(() => false)) await skipTraining.click();

  await expect(page.locator("#game-canvas")).toBeVisible();
  if (testInfo.project.name === "mobile-chrome") {
    const mobileDock = page.getByTestId("mobile-weapon-dock");
    await expect(mobileDock).toContainText("Rubber Chicken RPG");
    await mobileDock.getByRole("button", { name: /rubber chicken rpg/i }).click();
    await expect(page.getByRole("group", { name: "Choose weapon" }).getByRole("button")).toHaveCount(12);
  } else {
    const desktopDock = page.getByTestId("desktop-weapon-dock");
    await expect(desktopDock).toContainText("Rubber Chicken RPG");
    await expect(desktopDock.getByRole("group", { name: "Weapons" }).getByRole("button")).toHaveCount(12);
  }
  await page.screenshot({ path: testInfo.outputPath("combat-weapon-dock.png"), fullPage: true });
});
