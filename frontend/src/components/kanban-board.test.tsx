import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanBoard } from "./kanban-board";

function renderEnglishBoard() {
  render(<KanbanBoard />);
  fireEvent.click(screen.getByRole("button", { name: "English" }));
}

describe("KanbanBoard", () => {
  it("shows exactly five seeded columns", () => {
    renderEnglishBoard();

    expect(screen.getAllByTestId(/^column-/)).toHaveLength(5);
    expect(screen.getByText("Shape the launch story")).toBeInTheDocument();
  });

  it("adds and deletes a card", () => {
    renderEnglishBoard();
    const backlog = screen.getByTestId("column-backlog");

    fireEvent.click(within(backlog).getByRole("button", { name: "Add a card" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Card title" }), { target: { value: "Write release notes" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Card details" }), { target: { value: "Keep it short." } });
    fireEvent.click(within(backlog).getByRole("button", { name: "Add card" }));

    expect(screen.getByText("Write release notes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete: Write release notes" }));
    expect(screen.queryByText("Write release notes")).not.toBeInTheDocument();
  });

  it("renames a column", () => {
    renderEnglishBoard();
    fireEvent.click(screen.getByRole("button", { name: "Rename column Review" }));
    const input = screen.getByRole("textbox", { name: "Column name" });
    fireEvent.change(input, { target: { value: "Ready to ship" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByTestId("column-review")).toHaveAttribute("aria-label", "Ready to ship");
  });

  it("moves a card between columns using drag and drop", () => {
    renderEnglishBoard();
    const card = screen.getByTestId("card-brief");
    const inProgress = screen.getByTestId("column-in-progress");
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(type: string, value: string) { this.data[type] = value; },
      getData(type: string) { return this.data[type] ?? ""; },
      effectAllowed: "",
    };

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(inProgress, { dataTransfer });

    expect(within(inProgress).getByText("Shape the launch story")).toBeInTheDocument();
    expect(within(screen.getByTestId("column-backlog")).queryByText("Shape the launch story")).not.toBeInTheDocument();
  });

  it("moves a card with the accessible move menu", () => {
    renderEnglishBoard();
    fireEvent.click(screen.getByRole("button", { name: "Move Shape the launch story to another column" }));
    fireEvent.click(screen.getByRole("button", { name: "Move to In progress" }));

    expect(within(screen.getByTestId("column-in-progress")).getByText("Shape the launch story")).toBeInTheDocument();
  });
});
