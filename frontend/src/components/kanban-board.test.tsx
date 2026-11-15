import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialBoard } from "@/lib/board";
import { createInitialTeamDirectory } from "@/lib/team-directory";
import { KanbanBoard } from "./kanban-board";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    Response.json(JSON.parse(String(init?.body)))));
});

afterEach(() => vi.unstubAllGlobals());

function renderEnglishBoard() {
  render(<KanbanBoard initialBoard={createInitialBoard()} initialTeamDirectory={createInitialTeamDirectory()} />);
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
    fireEvent.click(within(backlog).getByRole("button", { name: "Add a card" }));

    expect(screen.getByText("Write release notes")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Actions for Write release notes"));
    fireEvent.click(screen.getByRole("button", { name: "Delete: Write release notes" }));
    expect(screen.queryByText("Write release notes")).not.toBeInTheDocument();
  });

  it("shows sample assignees and lets a card be reassigned", () => {
    renderEnglishBoard();
    const card = screen.getByTestId("card-brief");

    expect(within(card).getByText("Sara Ahmadi")).toBeInTheDocument();
    fireEvent.click(within(card).getByLabelText("Actions for Shape the launch story"));
    fireEvent.click(within(card).getByRole("button", { name: "Edit details for Shape the launch story" }));

    expect(screen.getByRole("group", { name: "Assignees" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Sara Ahmadi" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Arman Karimi" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(within(card).queryByText("Sara Ahmadi")).not.toBeInTheDocument();
    expect(within(card).getByText("Arman Karimi")).toBeInTheDocument();
  });

  it("renames a column", () => {
    renderEnglishBoard();
    fireEvent.click(screen.getByLabelText("Column actions for Review"));
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
    fireEvent.click(screen.getByLabelText("Actions for Shape the launch story"));
    fireEvent.click(screen.getByLabelText("Move Shape the launch story to another column"));
    fireEvent.click(within(screen.getByTestId("card-brief")).getByRole("button", { name: "Move to In progress" }));

    expect(within(screen.getByTestId("column-in-progress")).getByText("Shape the launch story")).toBeInTheDocument();
  });

  it("shows a failed server save and lets the user retry", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) =>
        Response.json(JSON.parse(String(init?.body))));
    vi.stubGlobal("fetch", fetchMock);
    renderEnglishBoard();

    fireEvent.click(within(screen.getByTestId("column-backlog")).getByRole("button", { name: "Add a card" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Card title" }), { target: { value: "Retry this save" } });
    fireEvent.click(within(screen.getByTestId("column-backlog")).getByRole("button", { name: "Add a card" }));

    expect(await screen.findByText("Save failed; these changes are not on the server yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
    await waitFor(() => expect(document.querySelector(".board-controlbar")).toHaveAttribute("data-save-state", "saved"));
  });
});


describe("AI assistant sidebar", () => {
  function openEnglishAssistant() {
    renderEnglishBoard();
    fireEvent.click(screen.getByRole("button", { name: "AI assistant" }));
    return screen.getByRole("region", { name: "AI assistant" });
  }

  it("shows replies without changes and sends the same conversation history", async () => {
    const board = createInitialBoard();
    const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/ai/chat") {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        calls.push({ path: String(input), body });
        return Response.json({ reply: calls.length === 1 ? "There are five columns." : "Still no board changes.", board });
      }
      return Response.json(JSON.parse(String(init?.body)));
    });
    vi.stubGlobal("fetch", fetchMock);
    openEnglishAssistant();

    const input = screen.getByRole("textbox", { name: "Write a message" });
    fireEvent.change(input, { target: { value: "How many columns?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("There are five columns.")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "And cards?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Still no board changes.")).toBeInTheDocument();

    expect(calls).toHaveLength(2);
    expect(calls[0].body).toEqual({ question: "How many columns?", history: [] });
    expect(calls[1].body).toEqual({
      question: "And cards?",
      history: [
        { role: "user", content: "How many columns?" },
        { role: "assistant", content: "There are five columns." },
      ],
    });
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/ai/chat")).toHaveLength(2);
  });

  it("renders the returned canonical board immediately and displays model text safely", async () => {
    const board = createInitialBoard();
    board.cards = board.cards.map((card) => card.id === "brief" ? { ...card, title: "AI-updated brief" } : card);
    const rawReply = "<img src=x onerror=alert(1)> The brief moved.";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/ai/chat") return Response.json({ reply: rawReply, board });
      return Response.json(JSON.parse(String(init?.body)));
    });
    vi.stubGlobal("fetch", fetchMock);
    openEnglishAssistant();

    fireEvent.change(screen.getByRole("textbox", { name: "Write a message" }), { target: { value: "Rename the brief." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const reply = await screen.findByText(rawReply);
    expect(reply.closest(".assistant-message")?.querySelector("img")).toBeNull();
    expect(await screen.findByText("AI-updated brief")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/board")).toHaveLength(0);
  });

  it("shows a localized network error", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/ai/chat") throw new Error("offline");
      return Response.json(JSON.parse(String(init?.body)));
    });
    vi.stubGlobal("fetch", fetchMock);
    openEnglishAssistant();

    fireEvent.change(screen.getByRole("textbox", { name: "Write a message" }), { target: { value: "Summarize the board." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The server could not be reached.");
  });

  it("does not send duplicate requests while a reply is pending", async () => {
    const board = createInitialBoard();
    let resolveResponse!: (response: Response) => void;
    const waitingForResponse = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/ai/chat") return waitingForResponse;
      return Response.json(JSON.parse(String(init?.body)));
    });
    vi.stubGlobal("fetch", fetchMock);
    openEnglishAssistant();

    const input = screen.getByRole("textbox", { name: "Write a message" });
    fireEvent.change(input, { target: { value: "Move the brief." } });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock.mock.calls.filter(([path]) => path === "/api/ai/chat")).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();
    resolveResponse(Response.json({ reply: "Done.", board }));
    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("keeps the assistant accessible and right-to-left in Persian", () => {
    render(<KanbanBoard initialBoard={createInitialBoard()} initialTeamDirectory={createInitialTeamDirectory()} />);
    fireEvent.click(screen.getByRole("button", { name: "دستیار کانبان" }));

    expect(screen.getByRole("region", { name: "دستیار کانبان" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("textbox", { name: "پیام خود را بنویسید" })).toBeInTheDocument();
  });
});
