"use client";

import { createInitialBoard, isBoardState, type BoardState } from "./board";
import type { TeamDirectory } from "./team-directory";

export const LEGACY_BOARD_KEY = "kanban-codex.board.v1";
export const LEGACY_TEAM_DIRECTORY_KEY = "kanban-codex.teams.v1";

export type InitializedData = {
  board: BoardState;
  teamDirectory: TeamDirectory;
};

type InitializationStatus =
  | { initialized: false }
  | ({ initialized: true } & InitializedData);

type InitializationPayload = {
  boardPresent: boolean;
  board: unknown;
  teamDirectoryPresent: boolean;
  teamDirectory: unknown;
  useSample?: boolean;
};

export class PersistenceError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "PersistenceError";
  }
}

const sampleCards = new Map(createInitialBoard().cards.map((card) => [card.id, card]));

function upgradeLegacyBoard(value: unknown): unknown {
  if (!isBoardState(value)) return value;
  return {
    ...value,
    cards: value.cards.map((card) => {
      const sample = sampleCards.get(card.id);
      if (!sample) return card;
      let upgraded = card;
      if (upgraded.assigneeIds === undefined && sample.assigneeIds) {
        upgraded = { ...upgraded, assigneeIds: [...sample.assigneeIds] };
      }
      const hasOldSampleShape = card.title === sample.title && card.details === sample.details &&
        card.priority === undefined && card.dueDate === undefined && card.labels === undefined && card.checklist === undefined;
      if (!hasOldSampleShape) return upgraded;
      return {
        ...upgraded,
        priority: sample.priority,
        dueDate: sample.dueDate,
        labels: [...(sample.labels ?? [])],
        checklist: (sample.checklist ?? []).map((item) => ({ ...item })),
      };
    }),
  };
}

export class PendingSaveError extends Error {
  constructor() {
    super("Board or team changes have not been saved yet.");
    this.name = "PendingSaveError";
  }
}

export class LegacyStorageError extends Error {
  constructor(readonly key: string) {
    super("Saved browser data is not valid JSON.");
    this.name = "LegacyStorageError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new PersistenceError("The server could not complete the request.", response.status);
  }
  return response.json() as Promise<T>;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new PersistenceError("The server could not be reached.");
  }
  return readJson<T>(response);
}

function parseLegacyValue(storage: Pick<Storage, "getItem">, key: string): { present: boolean; value: unknown } {
  const raw = storage.getItem(key);
  if (raw === null) return { present: false, value: null };
  try {
    return { present: true, value: JSON.parse(raw) as unknown };
  } catch {
    throw new LegacyStorageError(key);
  }
}

export function readLegacyInitializationPayload(
  storage: Pick<Storage, "getItem">,
): InitializationPayload {
  const board = parseLegacyValue(storage, LEGACY_BOARD_KEY);
  const teamDirectory = parseLegacyValue(storage, LEGACY_TEAM_DIRECTORY_KEY);
  return {
    boardPresent: board.present,
    board: board.present ? upgradeLegacyBoard(board.value) : board.value,
    teamDirectoryPresent: teamDirectory.present,
    teamDirectory: teamDirectory.value,
  };
}

export async function initializeFromBrowserStorage(
  getStorage: () => Pick<Storage, "getItem">,
  useSample = false,
): Promise<InitializedData> {
  const status = await requestJson<InitializationStatus>("/api/board/initialize");
  if (status.initialized) return { board: status.board, teamDirectory: status.teamDirectory };

  const payload = useSample
    ? { boardPresent: false, board: null, teamDirectoryPresent: false, teamDirectory: null, useSample: true }
    : readLegacyInitializationPayload(getStorage());
  return requestJson<InitializedData>("/api/board/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveBoardState(board: BoardState): Promise<BoardState> {
  return requestJson<BoardState>("/api/board", {
    method: "PUT",
    body: JSON.stringify(board),
  });
}

export function saveTeamDirectory(directory: TeamDirectory): Promise<TeamDirectory> {
  return requestJson<TeamDirectory>("/api/board/team-directory", {
    method: "PUT",
    body: JSON.stringify(directory),
  });
}



export type AIChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIChatResult = {
  reply: string;
  board: BoardState;
};

export async function sendAIChat(question: string, history: AIChatMessage[]): Promise<AIChatResult> {
  const result = await requestJson<unknown>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ question, history }),
  });
  if (typeof result !== "object" || result === null || !("reply" in result) || !("board" in result)) {
    throw new PersistenceError("The assistant returned an invalid response.", 502);
  }
  if (typeof result.reply !== "string" || !isBoardState(result.board)) {
    throw new PersistenceError("The assistant returned an invalid response.", 502);
  }
  return { reply: result.reply, board: result.board };
}
