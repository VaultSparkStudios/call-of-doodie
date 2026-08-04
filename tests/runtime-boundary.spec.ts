import { expect, test } from "@playwright/test";

test("first frame stays independent from the arena and data plane until intent or budget", async ({ page }) => {
  const earlyRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase\.co|\/src\/App\.jsx|\/assets\/App-/.test(request.url())) earlyRequests.push(request.url());
  });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("cod-seen-new-player-guide-v1", "1");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("runtime-shell")).toBeVisible();
  await page.waitForTimeout(1600);
  expect(earlyRequests).toEqual([]);

  await page.getByTestId("runtime-enter").click();
  await expect(page.getByTestId("front-door-deploy")).toBeVisible();
});
