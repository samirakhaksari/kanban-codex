import { expect as baseExpect, test, type Page } from "@playwright/test";
import { createInitialBoard } from "../src/lib/board";
import { createInitialTeamDirectory } from "../src/lib/team-directory";

// Docker cold starts can take several seconds across login and board initialization.
const expect = baseExpect.configure({ timeout: 15_000 });
test.setTimeout(60_000);

async function signIn(page: Page, username = "user", password = "password") {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function openEnglishBoard(page: Page) {
  await signIn(page);
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
  await page.evaluate(async ({ board, teamDirectory }) => {
    const teamResponse = await fetch("/api/board/team-directory", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(teamDirectory),
    });
    const boardResponse = await fetch("/api/board", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(board),
    });
    if (!teamResponse.ok || !boardResponse.ok) throw new Error("Could not reset the test board");
  }, { board: createInitialBoard(), teamDirectory: createInitialTeamDirectory() });
  await page.reload();
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Website launch" })).toBeVisible();
}

test("requires sign-in, imports the first browser board, preserves the session, and logs out", async ({ page }) => {
  const importedBoard = createInitialBoard();
  importedBoard.cards[0] = { ...importedBoard.cards[0], title: "Imported browser card" };
  await page.addInitScript(({ board, teamDirectory }) => {
    localStorage.setItem("kanban-codex.board.v1", JSON.stringify(board));
    localStorage.setItem("kanban-codex.teams.v1", JSON.stringify(teamDirectory));
  }, { board: importedBoard, teamDirectory: createInitialTeamDirectory() });
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();

  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website launch" })).toHaveCount(0);

  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".auth-error")).toHaveText("The username or password is incorrect.");
  await expect(page.getByRole("heading", { name: "Website launch" })).toHaveCount(0);

  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Website launch" })).toBeVisible();
  await expect(page.getByText("Imported browser card")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Website launch" })).toBeVisible();
  await expect(page.getByText("Imported browser card")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "ورود" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website launch" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "ورود" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
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
  await newCard.getByLabel("Actions for Prepare the launch email", { exact: true }).click();
  await newCard.getByLabel("Move Prepare the launch email to another column").click();
  await newCard.getByRole("button", { name: "Move to In progress" }).click();
  await expect(inProgress.getByText("Prepare the launch email")).toBeVisible();

  await page.getByLabel("Column actions for Review", { exact: true }).click();
  await page.getByRole("button", { name: "Rename column Review" }).click();
  const columnName = page.getByRole("textbox", { name: "Column name" });
  await columnName.fill("Ready to share");
  await columnName.press("Enter");
  await expect(page.getByTestId("column-review")).toHaveAttribute("aria-label", "Ready to share");

  await inProgress.getByLabel("Actions for Prepare the launch email", { exact: true }).click();
  await inProgress.getByRole("button", { name: "Delete: Prepare the launch email" }).click();
  await expect(page.getByText("Prepare the launch email")).toHaveCount(0);
  await expect(page.locator(".board-controlbar")).toHaveAttribute("data-save-state", "saved");
});

test("assigns cards to team members and saves the assignment", async ({ page }) => {
  await openEnglishBoard(page);
  const card = page.getByTestId("card-brief");

  await expect(card.getByText("Sara Ahmadi")).toBeVisible();
  await card.getByLabel("Actions for Shape the launch story", { exact: true }).click();
  await card.getByRole("button", { name: "Edit details for Shape the launch story" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Sara Ahmadi" }).uncheck();
  await dialog.getByRole("checkbox", { name: "Arman Karimi" }).check();
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(card.getByText("Sara Ahmadi")).toHaveCount(0);
  await expect(card.getByText("Arman Karimi")).toBeVisible();
  await expect(page.locator(".board-controlbar")).toHaveAttribute("data-save-state", "saved");
  await page.reload();
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
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
  await expect(page.locator(".board-controlbar")).toHaveAttribute("data-save-state", "saved");
  await page.reload();
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText("Temporary card")).toBeVisible();
  await expect(page.getByText("Shape the launch story")).toBeVisible();
});


test("persists team member changes across reload", async ({ page }) => {
  await openEnglishBoard(page);
  await page.getByRole("button", { name: "Team members" }).click();
  await page.getByRole("button", { name: "Create a member" }).click();
  await page.getByLabel("Member name in Persian").fill("آزمایشگر");
  await page.getByLabel("Member name in English").fill("Test Member");
  await page.getByRole("button", { name: "Create member and add to team" }).click();
  await expect(page.getByRole("heading", { name: "Test Member" })).toBeVisible();
  await expect(page.getByText("Team changes saved to the database.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "خروج از حساب" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Team members" }).click();
  await expect(page.getByRole("heading", { name: "Test Member" })).toBeVisible();
});

test("sends chat history, applies the canonical AI board, and fits the responsive sidebar", async ({ page }) => {
  await openEnglishBoard(page);
  const canonicalBoard = createInitialBoard();
  canonicalBoard.cards = canonicalBoard.cards.map((card) => card.id === "brief" ? { ...card, title: "Brief updated by AI" } : card);
  let chatRequest: { question: string; history: Array<{ role: string; content: string }> } | null = null;
  await page.route("**/api/ai/chat", async (route) => {
    chatRequest = route.request().postDataJSON() as typeof chatRequest;
    await route.fulfill({ json: { reply: "The brief is updated.", board: canonicalBoard } });
  });

  await page.getByRole("button", { name: "AI assistant" }).click();
  await page.getByRole("textbox", { name: "Write a message" }).fill("Rename the brief.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("The brief is updated.")).toBeVisible();
  await expect(page.getByText("Brief updated by AI")).toBeVisible();
  expect(chatRequest).toEqual({ question: "Rename the brief.", history: [] });

  await page.getByRole("button", { name: "فارسی" }).click();
  await expect(page.getByRole("region", { name: "دستیار کانبان" })).toHaveAttribute("dir", "rtl");
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = page.getByRole("region", { name: "دستیار کانبان" });
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});
