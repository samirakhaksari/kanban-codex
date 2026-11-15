import { expect, test } from "@playwright/test";
import path from "node:path";

test.setTimeout(60_000);
const screenshots = "C:/Users/samira/.codex/visualizations/2026/11/15/01a1dea3-7c2e-7910-9524-4af2b7aef91c";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("user");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in to your board", exact: true }).click();
  await expect(page.getByRole("button", { name: "بازکردن پروفایل من", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "English", exact: true }).click();
}

test("profile identity, photo and names persist after reload and a new login", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await signIn(page);
  await page.getByRole("button", { name: "Open my profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("سارا");
  await page.getByLabel("Last name", { exact: true }).fill("احمدی");
  await page.locator('input[type="file"]').setInputFiles(path.resolve("e2e/fixtures/profile.webp"));
  await expect(page.getByText("Preparing photo…", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Profile updated.", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".account-button")).toContainText("سارا احمدی");
  await expect(page.locator(".account-button img")).toHaveAttribute("src", /^data:image\/webp;base64,/);
  await page.reload();
  await expect(page.locator(".account-button")).toContainText("سارا احمدی", { timeout: 15_000 });
  await page.getByRole("button", { name: "بازکردن پروفایل من", exact: true }).click();
  await expect(page.getByLabel("نام", { exact: true })).toHaveValue("سارا");
  await expect(page.getByLabel("نام خانوادگی", { exact: true })).toHaveValue("احمدی");
  await page.screenshot({ path: `${screenshots}/profile-dark.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "تغییر به حالت روشن", exact: true }).click();
  await page.screenshot({ path: `${screenshots}/profile-light.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "برد پروژه", exact: true }).click();
  await page.screenshot({ path: `${screenshots}/workspace-light.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "تغییر به حالت تیره", exact: true }).click();
  await page.screenshot({ path: `${screenshots}/workspace-dark.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await signIn(page);
  await expect(page.locator(".account-button")).toContainText("سارا احمدی");
});

test("failed save keeps the previous identity; cancel restores saved fields", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  const original = await page.getByLabel("First name", { exact: true }).inputValue();
  await page.route("**/api/profile", async (route) => {
    if (route.request().method() === "PUT") await route.fulfill({ status: 500, json: { detail: "Unavailable" } });
    else await route.continue();
  });
  await page.getByLabel("First name", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".profile-error")).toContainText("Your profile could not be saved");
  await expect(page.locator(".account-button")).not.toContainText("Unsaved");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Project board", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My profile", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(original);
  await page.locator('input[type="file"]').setInputFiles({ name: "not-an-image.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.locator(".profile-error")).toContainText("Choose a PNG, JPG or WebP");
});

test("profile and board remain usable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: `${screenshots}/profile-mobile.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
});
