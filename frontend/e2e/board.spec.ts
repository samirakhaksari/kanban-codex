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
  await backlog.getByRole("button", { name: "Add a card" }).click();

  const newCard = page.getByTestId(/^card-card-/).filter({ hasText: "Prepare the launch email" });
  await expect(newCard).toBeVisible();
  await newCard.getByLabel("Move Prepare the launch email to another column").click();
  await newCard.getByRole("button", { name: "Move to In progress" }).click();
  await expect(inProgress.getByText("Prepare the launch email")).toBeVisible();

  await page.getByRole("button", { name: "Rename column Review" }).click();
  const columnName = page.getByRole("textbox", { name: "Column name" });
  await columnName.fill("Ready to share");
  await columnName.press("Enter");
  await expect(page.getByTestId("column-review")).toHaveAttribute("aria-label", "Ready to share");

  await inProgress.getByRole("button", { name: "Delete: Prepare the launch email" }).click();
  await expect(page.getByText("Prepare the launch email")).toHaveCount(0);
});

test("assigns cards to team members and saves the assignment", async ({ page }) => {
  await openEnglishBoard(page);
  const card = page.getByTestId("card-brief");

  await expect(card.getByText("Sara Ahmadi")).toBeVisible();
  await card.getByRole("button", { name: "Edit details for Shape the launch story" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Sara Ahmadi" }).uncheck();
  await dialog.getByRole("checkbox", { name: "Arman Karimi" }).check();
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(card.getByText("Sara Ahmadi")).toHaveCount(0);
  await expect(card.getByText("Arman Karimi")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByTestId("card-brief").getByText("Arman Karimi")).toBeVisible();
});
test("preserves board changes across reload", async ({ page }) => {
  await openEnglishBoard(page);
  const backlog = page.getByTestId("column-backlog");
  await backlog.getByRole("button", { name: "Add a card" }).click();
  await page.getByRole("textbox", { name: "Card title" }).fill("Temporary card");
  await backlog.getByRole("button", { name: "Add a card" }).click();
  await expect(page.getByText("Temporary card")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText("Temporary card")).toBeVisible();
  await expect(page.getByText("Shape the launch story")).toBeVisible();
});
