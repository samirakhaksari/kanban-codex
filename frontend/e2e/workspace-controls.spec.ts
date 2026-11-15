import { expect, test, type Page } from "@playwright/test";
import { createInitialBoard } from "../src/lib/board";
import { createInitialTeamDirectory } from "../src/lib/team-directory";

test.setTimeout(60_000);
const screenshots = "C:/Users/samira/.codex/visualizations/2026/11/15/01a1dea3-7c2e-7910-9524-4af2b7aef91c";

async function openBoard(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("user");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in to your board", exact: true }).click();
  await expect(page.locator(".shell.workspace")).toBeVisible({ timeout: 15_000 });
  await page.evaluate(async ({ board, directory }) => {
    for (const [url, body] of [["/api/board/team-directory", directory], ["/api/board", board]] as const) {
      const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`Reset failed: ${url}`);
    }
  }, { board: createInitialBoard(), directory: createInitialTeamDirectory() });
  await page.reload();
  await expect(page.locator(".shell.workspace")).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.mouse.move(500, 20);
}

test("navigation opens on hover or keyboard focus, can be pinned, and puts Reports below the board", async ({ page }) => {
  await openBoard(page);
  const shell = page.locator(".shell.workspace");
  const sidebar = page.locator("aside.sidebar");
  await expect(shell).toHaveAttribute("data-sidebar-expanded", "false");
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(76);
  await sidebar.hover();
  await expect(shell).toHaveAttribute("data-sidebar-expanded", "true");
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(236);
  await expect(page.locator(".sidebar-nav-item").nth(1)).toHaveAccessibleName("Project board");
  await expect(page.locator(".sidebar-nav-item").nth(2)).toHaveAccessibleName("Reports");
  await page.mouse.move(500, 20);
  await expect(shell).toHaveAttribute("data-sidebar-expanded", "false");
  await page.getByRole("button", { name: "English", exact: true }).focus();
  for (let step = 0; step < 4; step++) await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeFocused();
  await expect(shell).toHaveAttribute("data-sidebar-expanded", "true");
  await page.getByRole("button", { name: "Pin navigation", exact: true }).click();
  await page.mouse.move(500, 20);
  await expect(shell).toHaveAttribute("data-sidebar-expanded", "true");
  await page.getByRole("button", { name: "Unpin navigation", exact: true }).click();
  await page.mouse.move(500, 20);
  await expect(shell).toHaveAttribute("data-sidebar-expanded", "false");
});

test("controls occupy one desktop row and Reports always describe the whole project", async ({ page }) => {
  await openBoard(page);
  const controls = page.locator(".board-controlbar");
  const boxes = await Promise.all([".board-summary", ".filter-search", ".filter-controls"].map((selector) => controls.locator(selector).boundingBox()));
  const centers = boxes.map((box) => box!.y + box!.height / 2);
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(2);
  expect((await controls.boundingBox())!.height).toBeLessThanOrEqual(65);
  for (const select of await controls.locator("select").all()) expect((await select.boundingBox())!.width).toBeLessThanOrEqual(126);
  await expect(page.getByText("All changes saved", { exact: true })).toHaveCount(0);
  await expect(page.locator("#board-analytics")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search cards" }).fill("Shape the launch story");
  await expect(page.getByTestId(/^card-/)).toHaveCount(1);
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await expect(page.locator(".stat-total .stat-value")).toHaveText(String(createInitialBoard().cards.length));
  await expect(page.locator(".chart-bar-group")).toHaveCount(5);
  await page.getByRole("button", { name: "فارسی", exact: true }).click();
  await page.mouse.move(500, 20);
  await page.screenshot({ path: `${screenshots}/reports-dark.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "تغییر به حالت روشن", exact: true }).click();
  await page.screenshot({ path: `${screenshots}/reports-light.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "برد پروژه", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "جست‌وجوی تسک‌ها" })).toHaveValue("Shape the launch story");
  await page.getByRole("button", { name: "پاک‌کردن فیلترها", exact: true }).click();
  await expect(page.getByRole("button", { name: "تسک جدید", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "کار جدید", exact: true })).toHaveCount(0);
  await page.mouse.move(500, 20);
  await page.screenshot({ path: `${screenshots}/board-controls-light.jpg`, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "تغییر به حالت تیره", exact: true }).click();
  await page.screenshot({ path: `${screenshots}/board-controls-dark.jpg`, animations: "disabled", type: "jpeg", quality: 88 });
  await page.locator("aside.sidebar").hover();
  await expect.poll(async () => (await page.locator("aside.sidebar").boundingBox())!.width).toBe(236);
  await page.screenshot({ path: `${screenshots}/board-menu-expanded.jpg`, animations: "disabled", type: "jpeg", quality: 88 });
});

test("a new column can immediately be renamed by blur or Enter, cancelled, and deleted", async ({ page }) => {
  await openBoard(page);
  await page.getByRole("button", { name: "Add column", exact: true }).click();
  const column = page.getByTestId(/^column-column-/);
  await expect(column).toBeVisible();
  await expect(column.getByRole("textbox", { name: "Column name" })).toHaveCount(0);
  await column.getByLabel("Column actions for New column", { exact: true }).click();
  await column.getByRole("button", { name: "Rename column New column", exact: true }).click();
  await column.getByRole("textbox", { name: "Column name" }).fill("Ready for release");
  await page.getByRole("searchbox", { name: "Search cards" }).click();
  await expect(column).toHaveAttribute("aria-label", "Ready for release");
  await column.getByLabel("Column actions for Ready for release", { exact: true }).click();
  await column.getByRole("button", { name: "Rename column Ready for release", exact: true }).click();
  await column.getByRole("textbox", { name: "Column name" }).fill("Cancelled title");
  await column.getByRole("textbox", { name: "Column name" }).press("Escape");
  await expect(column).toHaveAttribute("aria-label", "Ready for release");
  await column.getByLabel("Column actions for Ready for release", { exact: true }).click();
  await column.getByRole("button", { name: "Rename column Ready for release", exact: true }).click();
  await column.getByRole("textbox", { name: "Column name" }).fill("Release");
  await column.getByRole("textbox", { name: "Column name" }).press("Enter");
  await expect(column).toHaveAttribute("aria-label", "Release");
  await column.getByLabel("Column actions for Release", { exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await column.getByRole("button", { name: "Delete column Release", exact: true }).click();
  await expect(column).toHaveCount(0);
  await expect(page.locator(".board-controlbar")).toHaveAttribute("data-save-state", "saved");
});

test("chat stays within the right sidebar on desktop and pushes the board below it on mobile", async ({ page }) => {
  await openBoard(page);
  await page.getByRole("button", { name: "AI assistant", exact: true }).click();
  const panel = page.getByRole("region", { name: "AI assistant", exact: true });
  await expect(panel).toBeVisible();
  await expect.poll(async () => (await page.locator("aside.sidebar").boundingBox())!.width).toBe(360);
  const sidebar = (await page.locator("aside.sidebar").boundingBox())!;
  const chat = (await panel.boundingBox())!;
  const board = (await page.locator(".board-grid").boundingBox())!;
  expect(chat.x).toBeGreaterThanOrEqual(sidebar.x);
  expect(chat.x + chat.width).toBeLessThanOrEqual(sidebar.x + sidebar.width);
  expect(board.x + board.width).toBeLessThanOrEqual(sidebar.x);
  expect(await panel.evaluate((element) => getComputedStyle(element).position)).toBe("static");
  await page.getByRole("button", { name: "فارسی", exact: true }).click();
  await page.mouse.move(500, 20);
  await page.screenshot({ path: `${screenshots}/board-chat-docked.jpg`, animations: "disabled", type: "jpeg", quality: 88 });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileSidebar = (await page.locator("aside.sidebar").boundingBox())!;
  const mobileBoard = (await page.locator(".board-grid").boundingBox())!;
  expect(mobileBoard.y).toBeGreaterThanOrEqual(mobileSidebar.y + mobileSidebar.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: `${screenshots}/board-chat-mobile.jpg`, fullPage: true, animations: "disabled", type: "jpeg", quality: 88 });
  await page.getByRole("button", { name: "بستن دستیار", exact: true }).click();
  await page.mouse.move(0, 843);
  await expect(page.locator(".shell.workspace")).toHaveAttribute("data-chat-open", "false");
  await page.getByRole("button", { name: "باز نگه داشتن منو", exact: true }).click();
  await expect(page.locator(".sidebar-nav-label").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
