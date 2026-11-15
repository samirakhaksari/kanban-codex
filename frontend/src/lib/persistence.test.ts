import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialBoard } from "./board";
import {
  initializeFromBrowserStorage,
  LEGACY_BOARD_KEY,
  LEGACY_TEAM_DIRECTORY_KEY,
  LegacyStorageError,
  PersistenceError,
  readLegacyInitializationPayload,
  sendAIChat,
} from "./persistence";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("legacy browser data", () => {
  it("sends saved board and team state to the one-time initializer", () => {
    const board = { columns: [{ id: "todo", title: "Todo" }], cards: [] };
    const teamDirectory = { teams: [], members: [] };
    const getItem = (key: string) => key === LEGACY_BOARD_KEY
      ? JSON.stringify(board)
      : key === LEGACY_TEAM_DIRECTORY_KEY
        ? JSON.stringify(teamDirectory)
        : null;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ initialized: false }))
      .mockResolvedValueOnce(Response.json({ board, teamDirectory }));
    vi.stubGlobal("fetch", fetchMock);

    return initializeFromBrowserStorage(() => ({ getItem })).then((result) => {
      expect(result).toEqual({ board, teamDirectory });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
      expect(body).toEqual({
        boardPresent: true,
        board,
        teamDirectoryPresent: true,
        teamDirectory,
      });
    });
  });

  it("uses server data without reading localStorage after initialization", async () => {
    const serverData = {
      board: { columns: [{ id: "server", title: "Server" }], cards: [] },
      teamDirectory: { teams: [], members: [] },
    };
    const getItem = vi.fn(() => { throw new Error("storage should not be read"); });
    const getStorage = vi.fn(() => ({ getItem }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({
      initialized: true,
      ...serverData,
    })));

    await expect(initializeFromBrowserStorage(getStorage)).resolves.toEqual(serverData);
    expect(getStorage).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });

  it("offers a sample choice without inspecting damaged browser data", async () => {
    const sample = {
      board: { columns: [{ id: "backlog", title: "Backlog" }], cards: [] },
      teamDirectory: { teams: [], members: [] },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ initialized: false }))
      .mockResolvedValueOnce(Response.json(sample));
    const getItem = vi.fn(() => { throw new Error("storage should not be read"); });
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializeFromBrowserStorage(() => ({ getItem }), true)).resolves.toEqual(sample);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.useSample).toBe(true);
    expect(getItem).not.toHaveBeenCalled();
  });

  it("fills missing metadata on unchanged sample cards during legacy import", () => {
    const oldBoard = createInitialBoard();
    oldBoard.cards = oldBoard.cards.map(({ id, columnId, title, details }) => ({ id, columnId, title, details }));
    const getItem = (key: string) => key === LEGACY_BOARD_KEY ? JSON.stringify(oldBoard) : null;
    const payload = readLegacyInitializationPayload({ getItem });
    const imported = payload.board as ReturnType<typeof createInitialBoard>;
    expect(imported.cards.find((card) => card.id === "brief")?.assigneeIds).toEqual(["sara-ahmadi", "nika-moradi"]);
    expect(imported.cards.find((card) => card.id === "brief")?.labels).toEqual(["Launch", "Content"]);
    expect(imported.cards.find((card) => card.id === "brief")?.checklist).toHaveLength(2);
  });

  it("reports malformed saved JSON without modifying the stored value", () => {
    const raw = "{bad json";
    const getItem = (key: string) => key === LEGACY_BOARD_KEY ? raw : null;

    expect(() => readLegacyInitializationPayload({ getItem })).toThrow(LegacyStorageError);
    expect(getItem(LEGACY_BOARD_KEY)).toBe(raw);
  });
});



describe("AI chat persistence", () => {
  it("posts the current question and conversation history to the authenticated API", async () => {
    const board = createInitialBoard();
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ reply: "Done.", board }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAIChat("Move the brief", [{ role: "user", content: "Hello" }])).resolves.toEqual({
      reply: "Done.",
      board,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/chat", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ question: "Move the brief", history: [{ role: "user", content: "Hello" }] }),
    }));
  });

  it("rejects a response without a valid canonical board", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ reply: "Done.", board: { cards: [] } })));

    await expect(sendAIChat("Show my board", [])).rejects.toMatchObject({
      name: "PersistenceError",
      status: 502,
    } satisfies Partial<PersistenceError>);
  });
});
