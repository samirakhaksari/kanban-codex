import { expect, test } from "@playwright/test";

const screenshots = "C:/Users/samira/.codex/visualizations/2026/11/15/01a1dea3-7c2e-7910-9524-4af2b7aef91c";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { authenticated: false } }));
});

for (const [width, height] of [[1440, 900], [1280, 720], [1920, 1080], [390, 844], [375, 667], [360, 640]]) {
  test(`login fits ${width}x${height} in both themes and languages`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "خوش برگشتید" })).toBeVisible();

    for (const theme of ["dark", "light"] as const) {
      if (theme === "light") await page.getByRole("button", { name: "تغییر به حالت روشن" }).click();
      const dimensions = await page.evaluate(() => {
        const panel = document.querySelector(".auth-panel")!;
        const title = document.querySelector(".auth-title")!;
        const box = panel.getBoundingClientRect();
        return {
          pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
          innerWidth, innerHeight, panelOverflow: panel.scrollHeight - panel.clientHeight,
          panelBottom: box.bottom, titleColor: getComputedStyle(title).color,
          sceneVisible: getComputedStyle(document.querySelector(".auth-scene")!).display !== "none",
        };
      });
      expect(dimensions.pageWidth).toBeLessThanOrEqual(width);
      expect(dimensions.pageHeight).toBeLessThanOrEqual(height);
      expect(dimensions.panelOverflow).toBeLessThanOrEqual(1);
      expect(dimensions.panelBottom).toBeLessThanOrEqual(height);
      expect(dimensions.titleColor).toBe(theme === "light" ? "rgb(20, 36, 61)" : "rgb(241, 246, 252)");
      expect(dimensions.sceneVisible).toBe(width >= 900);
      await expect(page.getByRole("button", { name: "ثبت‌نام", exact: true })).toBeInViewport();

      if (width === 1440 || width === 390) {
        await page.screenshot({ path: `${screenshots}/login-${width >= 900 ? "desktop" : "mobile"}-${theme}.jpg`, animations: "disabled", type: "jpeg", quality: 88 });
      }

      await page.getByRole("button", { name: "English", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      const englishSize = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
      expect(englishSize.width).toBeLessThanOrEqual(width);
      expect(englishSize.height).toBeLessThanOrEqual(height);
      await page.getByRole("button", { name: "فارسی", exact: true }).click();
    }
  });
}

test("decorative motion runs without a pause button and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "خوش برگشتید" })).toBeVisible();
  const initialTransform = await page.locator(".auth-note-yellow").evaluate((e) => getComputedStyle(e).transform);
  await expect.poll(() => page.locator(".auth-note-yellow").evaluate((e) => getComputedStyle(e).transform)).not.toBe(initialTransform);
  await expect(page.locator(".auth-motion-toggle")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".auth-note-yellow").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");

});
