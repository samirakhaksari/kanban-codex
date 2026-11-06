import { describe, expect, it } from "vitest";
import {
  addCard,
  createInitialBoard,
  deleteCard,
  moveCard,
  renameColumn,
} from "./board";

describe("board state", () => {
  it("starts with five named columns and sample cards", () => {
    const board = createInitialBoard();

    expect(board.columns).toHaveLength(5);
    expect(board.columns.map((column) => column.title)).toEqual([
      "Backlog", "Up next", "In progress", "Review", "Done",
    ]);
    expect(board.cards.length).toBeGreaterThan(0);
  });

  it("renames a column without changing the other columns", () => {
    const board = createInitialBoard();
    const renamed = renameColumn(board, "review", "Ready to ship");

    expect(renamed.columns.find((column) => column.id === "review")?.title).toBe("Ready to ship");
    expect(renamed.columns.filter((column) => column.id !== "review")).toEqual(
      board.columns.filter((column) => column.id !== "review"),
    );
  });

  it("adds a card with only its board fields and trims user input", () => {
    const board = createInitialBoard();
    const next = addCard(board, "backlog", "  Draft copy  ", "  Write the first pass.  ", "draft");

    expect(next.cards.at(-1)).toEqual({
      id: "draft", columnId: "backlog", title: "Draft copy", details: "Write the first pass.",
    });
    expect(board.cards).toHaveLength(8);
  });

  it("does not add a card without a title", () => {
    const board = createInitialBoard();
    expect(addCard(board, "backlog", "   ", "Details", "empty")).toBe(board);
  });

  it("moves a card to another column", () => {
    const board = createInitialBoard();
    const moved = moveCard(board, "brief", "in-progress");

    expect(moved.cards.find((card) => card.id === "brief")?.columnId).toBe("in-progress");
  });

  it("deletes only the selected card", () => {
    const board = createInitialBoard();
    const next = deleteCard(board, "brief");

    expect(next.cards).toHaveLength(board.cards.length - 1);
    expect(next.cards.some((card) => card.id === "brief")).toBe(false);
    expect(next.cards.some((card) => card.id === "research")).toBe(true);
  });
});
