import { expect, test } from "@playwright/test";

test("pointer aim sweep reaches all four calibration buckets", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("cod-seen-new-player-guide-v1", "1");
  });
  await page.goto("/?debug=input");

  // New players now enter through the play-first menu; identity is optional.
  await page.getByTestId("front-door-deploy").click();
  await page.getByRole("button", { name: /skip.*go in clean/i }).click();

  const skipTraining = page.getByRole("button", { name: /skip training/i });
  if (await skipTraining.isVisible().catch(() => false)) await skipTraining.click();

  const canvas = page.locator("#game-canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const radiusX = box.width * 0.32;
  const radiusY = box.height * 0.32;
  const points = [
    [cx + radiusX, cy],
    [cx, cy + radiusY],
    [cx - radiusX, cy],
    [cx, cy - radiusY],
    [cx + radiusX, cy],
  ];

  for (const [x, y] of points) {
    await page.mouse.move(x, y, { steps: 12 });
    await page.waitForTimeout(80);
  }

  await expect(page.getByTestId("input-debug-hud")).toContainText(/pointer:4\/4/i);
  expect(["chromium", "mobile-chrome"]).toContain(testInfo.project.name);
});
