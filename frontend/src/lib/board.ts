export type BoardColumn = {
  id: string;
  title: string;
};

export type CardPriority = "low" | "medium" | "high";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type TeamMember = {
  id: string;
  nameFa: string;
  nameEn: string;
  color: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "sara-ahmadi", nameFa: "سارا احمدی", nameEn: "Sara Ahmadi", color: "#67317f" },
  { id: "arman-karimi", nameFa: "آرمان کریمی", nameEn: "Arman Karimi", color: "#1476a3" },
  { id: "nika-moradi", nameFa: "نیکا مرادی", nameEn: "Nika Moradi", color: "#287154" },
  { id: "reza-farahani", nameFa: "رضا فرهادی", nameEn: "Reza Farahani", color: "#8a5d00" },
];

export type BoardCard = {
  id: string;
  columnId: string;
  title: string;
  details: string;
  priority?: CardPriority;
  dueDate?: string;
  labels?: string[];
  checklist?: ChecklistItem[];
  assigneeIds?: string[];
};

export type BoardState = {
  columns: BoardColumn[];
  cards: BoardCard[];
};

export const INITIAL_COLUMNS: BoardColumn[] = [
  { id: "backlog", title: "Backlog" },
  { id: "up-next", title: "Up next" },
  { id: "in-progress", title: "In progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

function sampleDueDate(daysFromToday: number) {
  const today = new Date();
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + daysFromToday));
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}
export function createInitialBoard(): BoardState {
  return {
    columns: INITIAL_COLUMNS.map((column) => ({ ...column })),
    cards: [
      {
        id: "brief", columnId: "backlog", assigneeIds: ["sara-ahmadi", "nika-moradi"], title: "Shape the launch story", details: "Align the homepage message with the product promise.",
        priority: "high", dueDate: sampleDueDate(3), labels: ["Launch", "Content"],
        checklist: [
          { id: "brief-copy", text: "Align the homepage message", done: true },
          { id: "brief-review", text: "Review the final copy", done: false },
        ],
      },
      {
        id: "research", columnId: "backlog", assigneeIds: ["reza-farahani"], title: "Review customer notes", details: "Pull out the themes from the latest interview round.",
        priority: "medium", dueDate: sampleDueDate(-2), labels: ["Research"],
        checklist: [
          { id: "research-themes", text: "Group recurring notes", done: false },
          { id: "research-summary", text: "Summarize customer needs", done: false },
        ],
      },
      {
        id: "design-system", columnId: "up-next", assigneeIds: ["arman-karimi", "sara-ahmadi"], title: "Polish the design system", details: "Tighten spacing and document the core components.",
        priority: "medium", dueDate: sampleDueDate(6), labels: ["Design System", "UI"],
        checklist: [
          { id: "design-spacing", text: "Audit spacing", done: true },
          { id: "design-components", text: "Document shared components", done: false },
          { id: "design-contrast", text: "Review color contrast", done: false },
        ],
      },
      {
        id: "onboarding", columnId: "up-next", assigneeIds: ["nika-moradi"], title: "Map the first run", details: "Make the first five minutes feel effortless.",
        priority: "low", dueDate: sampleDueDate(9), labels: ["Onboarding"],
        checklist: [
          { id: "onboarding-steps", text: "Outline the first-run steps", done: false },
          { id: "onboarding-copy", text: "Review the guidance text", done: false },
        ],
      },
      {
        id: "homepage", columnId: "in-progress", assigneeIds: ["arman-karimi"], title: "Build the new homepage", details: "Bring the approved direction into the live page.",
        priority: "high", dueDate: sampleDueDate(1), labels: ["Development", "Launch"],
        checklist: [
          { id: "homepage-layout", text: "Implement the approved layout", done: true },
          { id: "homepage-responsive", text: "Check responsive behavior", done: false },
          { id: "homepage-review", text: "Review the final page", done: false },
        ],
      },
      {
        id: "analytics", columnId: "in-progress", assigneeIds: ["sara-ahmadi", "reza-farahani"], title: "Add launch analytics", details: "Track the few signals that help us learn.",
        priority: "medium", dueDate: sampleDueDate(5), labels: ["Analytics"],
        checklist: [
          { id: "analytics-events", text: "Choose key events", done: false },
          { id: "analytics-verify", text: "Verify event tracking", done: false },
        ],
      },
      {
        id: "mobile-review", columnId: "review", assigneeIds: ["nika-moradi", "reza-farahani"], title: "Check mobile layouts", details: "Review the key screens at small breakpoints.",
        priority: "high", dueDate: sampleDueDate(-1), labels: ["Quality", "Mobile"],
        checklist: [
          { id: "mobile-screens", text: "Review the main screens", done: true },
          { id: "mobile-fixes", text: "List remaining fixes", done: false },
        ],
      },
      {
        id: "brand", columnId: "done", assigneeIds: ["sara-ahmadi"], title: "Confirm the visual direction", details: "The team is aligned on the new look and feel.",
        priority: "low", dueDate: sampleDueDate(-5), labels: ["Brand"],
        checklist: [
          { id: "brand-colors", text: "Approve the color palette", done: true },
          { id: "brand-type", text: "Confirm typography", done: true },
        ],
      },
    ],
  };
}

export function addColumn(board: BoardState, columnId: string, title: string): BoardState {
  const nextId = columnId.trim();
  const nextTitle = title.trim();
  if (!nextId || !nextTitle || board.columns.some((column) => column.id === nextId)) return board;
  return { ...board, columns: [...board.columns, { id: nextId, title: nextTitle }] };
}

export function deleteColumn(board: BoardState, columnId: string): BoardState {
  if (board.columns.length <= 1 || board.cards.some((card) => card.columnId === columnId)) return board;
  if (!board.columns.some((column) => column.id === columnId)) return board;
  return { ...board, columns: board.columns.filter((column) => column.id !== columnId) };
}

export function renameColumn(board: BoardState, columnId: string, title: string): BoardState {
  const nextTitle = title.trim();
  if (!nextTitle) return board;

  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === columnId ? { ...column, title: nextTitle } : column,
    ),
  };
}

export function addCard(
  board: BoardState,
  columnId: string,
  title: string,
  details: string,
  id: string,
): BoardState {
  const nextTitle = title.trim();
  if (!nextTitle) return board;

  return {
    ...board,
    cards: [...board.cards, { id, columnId, title: nextTitle, details: details.trim() }],
  };
}

export function deleteCard(board: BoardState, cardId: string): BoardState {
  return { ...board, cards: board.cards.filter((card) => card.id !== cardId) };
}

export function moveCard(board: BoardState, cardId: string, columnId: string): BoardState {
  return {
    ...board,
    cards: board.cards.map((card) => (card.id === cardId ? { ...card, columnId } : card)),
  };
}

export function updateCard(board: BoardState, cardId: string, updates: Partial<Omit<BoardCard, "id" | "columnId">>): BoardState {
  return { ...board, cards: board.cards.map((card) => card.id === cardId ? { ...card, ...updates } : card) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBoardState(value: unknown): value is BoardState {
  if (!isRecord(value) || !Array.isArray(value.columns) || !Array.isArray(value.cards)) return false;
  const columns = value.columns;
  const cards = value.cards;
  if (columns.length === 0) return false;

  const columnIds = new Set<string>();
  const validColumns = columns.every((column) => {
    if (!isRecord(column) || typeof column.id !== "string" || !column.id.trim() || typeof column.title !== "string" || !column.title.trim() || columnIds.has(column.id)) return false;
    columnIds.add(column.id);
    return true;
  });
  if (!validColumns) return false;

  return cards.every((card) => {
    if (!isRecord(card) || typeof card.id !== "string" || typeof card.columnId !== "string" || !columnIds.has(card.columnId) || typeof card.title !== "string" || typeof card.details !== "string") return false;
    if (card.priority !== undefined && card.priority !== "low" && card.priority !== "medium" && card.priority !== "high") return false;
    if (card.dueDate !== undefined && (typeof card.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(card.dueDate))) return false;
    if (card.labels !== undefined && (!Array.isArray(card.labels) || !card.labels.every((label) => typeof label === "string"))) return false;
    if (card.checklist !== undefined && (!Array.isArray(card.checklist) || !card.checklist.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.text === "string" && typeof item.done === "boolean"))) return false;
    if (card.assigneeIds !== undefined && (!Array.isArray(card.assigneeIds) || !card.assigneeIds.every((id) => typeof id === "string"))) return false;
    return true;
  });
}