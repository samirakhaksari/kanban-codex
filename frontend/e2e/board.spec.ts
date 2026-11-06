import { expect, test, type Page } from "@playwright/test";

async function openEnglishBoard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
}

test("loads one seeded board with five columns", async ({ page }) => {
  await openEnglishBoard(page);
  await expect(page.getByRole("heading", { name: "Website launch" })).toBeVisible();
  await expect(page.getByTestId(/^column-/)).toHaveCount(5);
  await expect(page.getByText("Shape the launch story")).toBeVisible();
});

test("adds, moves, renames, and deletes a card", async ({ page }) => {
  await openEnglishBoard(page);
  const backlog = page.getByTestId("column-backlog");
  const inProgress = page.getByTestId("column-in-progress");

  await backlog.getByRole("button", { name: "Add a card" }).click();
  await page.getByRole("textbox", { name: "Card title" }).fill("Prepare the launch email");
  await page.getByRole("textbox", { name: "Card details" }).fill("Draft, review, and schedule the message.");
  await backlog.getByRole("button", { name: "Add card" }).click();

  const newCard = page.getByTestId(/^card-card-/).filter({ hasText: "Prepare the launch email" });
  await expect(newCard).toBeVisible();
  await newCard.dragTo(inProgress);
  await expect(inProgress.getByText("Prepare the launch email")).toBeVisible();

  await page.getByRole("button", { name: "Rename column Review" }).click();
  const columnName = page.getByRole("textbox", { name: "Column name" });
  await columnName.fill("Ready to share");
  await columnName.press("Enter");
  await expect(page.getByTestId("column-review")).toHaveAttribute("aria-label", "Ready to share");

  await inProgress.getByRole("button", { name: "Delete: Prepare the launch email" }).click();
  await expect(page.getByText("Prepare the launch email")).toHaveCount(0);
});

test("returns to sample data on reload", async ({ page }) => {
  await openEnglishBoard(page);
  const backlog = page.getByTestId("column-backlog");
  await backlog.getByRole("button", { name: "Add a card" }).click();
  await page.getByRole("textbox", { name: "Card title" }).fill("Temporary card");
  await backlog.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText("Temporary card")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Temporary card")).toHaveCount(0);
  await expect(page.getByText("Shape the launch story")).toBeVisible();
});
