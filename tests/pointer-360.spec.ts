import { expect, test } from "@playwright/test";

test("pointer aim sweep reaches all four calibration buckets", async ({ page }, testInfo) => {
  await page.goto("/?debug=input");

  const callsign = page.getByRole("textbox").first();
  await callsign.fill("Pointer360");
  await page.getByRole("button", { name: /lock in/i }).click();
  await page.getByRole("button", { name: /deploy/i }).first().click();
  await page.getByRole("button", { name: /skip/i }).click();

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
