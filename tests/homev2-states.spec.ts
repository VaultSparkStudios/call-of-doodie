import { expect, test } from "@playwright/test";

// Storage keys matching storage.js constants
const CALLSIGN_KEY = "cod-callsign-v1";
const CAREER_KEY = "cod-career-v1";

test("first-run: callsign screen shown, transitions to HomeV2 with onboarding panel", async ({ page }) => {
  // No localStorage seeded — pure first-run state
  await page.goto("/");

  // UsernameScreen should appear first
  await expect(page.getByRole("textbox")).toBeVisible();
  await expect(page.getByText(/choose your callsign/i)).toBeVisible();

  // Enter a callsign and lock in
  await page.getByRole("textbox").fill("TestRecruit");
  await page.getByRole("button", { name: /lock in/i }).click();

  // HomeV2 now: DEPLOY button and callsign chip visible
  await expect(page.getByRole("button", { name: /deploy/i }).first()).toBeVisible();
  await expect(page.getByText(/@TestRecruit/)).toBeVisible();

  // Onboarding block shown for zero-run account (career.totalRuns = 0 < 3)
  await expect(page.getByText(/first 3 runs/i)).toBeVisible();
});

test("returning player: skips callsign screen, no onboarding panel", async ({ page }) => {
  await page.addInitScript((keys) => {
    localStorage.setItem(keys.callsign, "VaultVet");
    localStorage.setItem(
      keys.career,
      JSON.stringify({ totalRuns: 7, totalKills: 350, totalScore: 120000 }),
    );
  }, { callsign: CALLSIGN_KEY, career: CAREER_KEY });

  await page.goto("/");

  // Should land directly on HomeV2 — no callsign screen
  await expect(page.getByRole("button", { name: /deploy/i }).first()).toBeVisible();
  await expect(page.getByText(/@VaultVet/)).toBeVisible();

  // Onboarding panel absent for totalRuns >= 3
  await expect(page.getByText(/first 3 runs/i)).not.toBeVisible();
});

test("ops-debug: BALANCE LAB and MEASUREMENT STATUS cards visible", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "OpsAgent");
  }, CALLSIGN_KEY);

  // ?debug=ops activates opsDebugEnabled in HomeV2
  await page.goto("/?debug=ops");

  // Both ops panels render (MEASUREMENT STATUS always shows when PostHog key absent)
  await expect(page.getByText(/balance lab:/i)).toBeVisible();
  await expect(page.getByText(/measurement status:/i)).toBeVisible();
});

test("mobile: DEPLOY button reachable and no horizontal overflow", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "MobileSoldier");
  }, CALLSIGN_KEY);

  await page.goto("/");

  // Core CTA is accessible on every viewport
  await expect(page.getByRole("button", { name: /deploy/i }).first()).toBeVisible();

  // No content causes horizontal scroll (CANON-041 mobile parity)
  const overflows = await page.evaluate(
    () => document.body.scrollWidth > document.body.clientWidth,
  );
  expect(overflows).toBe(false);
});
