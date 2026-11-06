"use client";

import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  addCard,
  addColumn,
  BoardCard,
  BoardColumn,
  BoardState,
  createInitialBoard,
  deleteCard,
  deleteColumn,
  moveCard,
  renameColumn,
  CardPriority,
  ChecklistItem,
  isBoardState,
  TeamMember,
  updateCard,
} from "@/lib/board";
import { createInitialTeamDirectory, isTeamDirectory, type TeamDirectory } from "@/lib/team-directory";
import { TeamAvatar } from "./team-avatar";
import { TeamMembersPage } from "./team-members-page";

const columnColors = ["#ecad0a", "#209dd7", "#753991", "#617a9b", "#43a07a"];
const columnTints = ["#fff3ce", "#dff2fb", "#eee2f4", "#e4edf4", "#def1e7"];
const columnDarkTints = ["#3b3427", "#203847", "#332b3b", "#273543", "#243a33"];

type Language = "fa" | "en";
type Theme = "light" | "dark";

type DueFilter = "all" | "overdue";
type CardUpdate = Partial<Omit<BoardCard, "id" | "columnId">>;

type Copy = {
  breadcrumb: string;
  projectBoard: string;
  projectTitle: string;
  subtitle: string;
  boardNote: string;
  liveStats: string;
  overviewTitle: string;
  overviewDescription: string;
  completed: string;
  totalCards: string;
  acrossStages: string;
  movingNow: string;
  completedCards: string;
  cardsByStage: string;
  distribution: string;
  boardSummary: string;
  boardLabel: string;
  boardTips: string;
  moveTip: string;
  renameTip: string;
  scrollHint: string;
  columnName: string;
  emptyHint: string;
  titleLabel: string;
  detailsLabel: string;
  titlePlaceholder: string;
  detailsPlaceholder: string;
  cancel: string;
  addCard: string;
  addColumn: string;
  newColumnTitle: string;
  moveCardTitle: string;
  languageLabel: string;
  darkMode: string;
  lightMode: string;
  switchToDark: string;
  switchToLight: string;
  cardCount: (count: number) => string;
  renameColumn: (title: string) => string;
  deleteColumn: (title: string) => string;
  confirmDeleteColumn: (title: string) => string;
  moveCardsBeforeDelete: string;
  cannotDeleteLastColumn: string;
  moveCard: (title: string) => string;
  moveTo: (title: string) => string;
  deleteCard: (title: string) => string;
  addCardTo: (title: string) => string;
  formatNumber: (value: number) => string;
  percentage: (value: number) => string;
  completionAria: (value: number) => string;
  completedOf: (done: number, total: number) => string;
  chartTotal: (total: number) => string;
  chartSummary: (summary: string) => string;
  cardsAcrossColumns: (cards: number, columns: number) => string;
  additionalInsights: string;
  bottomChartsKicker: string;
  completionChartTitle: string;
  completionChartDescription: string;
  doneLegend: string;
  remainingLegend: string;
  stageShareTitle: string;
  stageShareDescription: string;
  completionMixAria: (done: number, remaining: number) => string;
  stageShareAria: (summary: string) => string;
  shareChartLabel: (count: number, share: number) => string;
  footerHint: string;
  filtersLabel: string;
  searchCards: string;
  searchPlaceholder: string;
  stageFilter: string;
  allStages: string;
  priorityFilter: string;
  allPriorities: string;
  noPriority: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  dueDateFilter: string;
  allDueDates: string;
  overdueOnly: string;
  clearFilters: string;
  resultsCount: (visible: number, total: number) => string;
  noMatchingCards: string;
  savedLocally: string;
  storageUnavailable: string;
  openCardDetails: (title: string) => string;
  cardDetailsTitle: string;
  saveChanges: string;
  closeDialog: string;
  priorityLabel: string;
  dueDateLabel: string;
  labelsLabel: string;
  labelsPlaceholder: string;
  labelsHelp: string;
  checklistLabel: string;
  checklistPlaceholder: string;
  addChecklistItem: string;
  removeChecklistItem: (title: string) => string;
  checklistProgress: (done: number, total: number) => string;
  overdueTag: string;
  assigneesLabel: string;
  assigneesHelp: string;
  noAssigneesSelected: string;
  assignedTo: (names: string[]) => string;
};

const copyByLanguage: Record<Language, Copy> = {
  fa: {
    breadcrumb: "فضای کار  /  پروژه‌ها",
    projectBoard: "برد پروژه",
    projectTitle: "راه‌اندازی وب‌سایت",
    subtitle: "وضعیت کارها و گام بعدی را در یک نگاه ببینید.",
    boardNote: "همه‌ی کارها، در یک نگاه",
    liveStats: "خلاصه‌ی وضعیت برد",
    overviewTitle: "وضعیت پروژه",
    overviewDescription: "کارت‌ها را در مسیر انجام تا تکمیل دنبال کنید.",
    completed: "پیشرفت کلی",
    totalCards: "همه‌ی کارت‌ها",
    acrossStages: "در همه‌ی ستون‌ها",
    movingNow: "کارت‌های در جریان",
    completedCards: "کارت‌های انجام‌شده",
    cardsByStage: "تعداد کارت‌ها در هر ستون",
    distribution: "تعداد کارت‌ها در هر ستون",
    boardSummary: "آمار برد",
    boardLabel: "برد کانبان",
    boardTips: "راهنمای استفاده از برد",
    moveTip: "برای جابه‌جایی، کارت را بکشید یا از منوی کنارش استفاده کنید.",
    renameTip: "برای تغییر نام ستون، مداد را بزنید و کلید اینتر را فشار دهید.",
    scrollHint: "برای دیدن همه‌ی ستون‌ها، به چپ و راست پیمایش کنید.",
    columnName: "نام ستون",
    emptyHint: "کارت‌ها را به این ستون بکشید.",
    titleLabel: "عنوان کارت",
    detailsLabel: "جزئیات کارت",
    titlePlaceholder: "عنوان کارت را وارد کنید",
    detailsPlaceholder: "توضیحات را اضافه کنید (اختیاری)",
    cancel: "لغو",
    addCard: "افزودن کارت",
    addColumn: "افزودن ستون",
    newColumnTitle: "ستون جدید",
    moveCardTitle: "جابه‌جایی کارت",
    languageLabel: "زبان رابط کاربری",
    darkMode: "تیره",
    lightMode: "روشن",
    switchToDark: "تغییر به حالت تیره",
    switchToLight: "تغییر به حالت روشن",
    additionalInsights: "نمودارهای تکمیلی",
    bottomChartsKicker: "تحلیل کارت‌ها",
    completionChartTitle: "کارت‌های انجام‌شده و باقی‌مانده",
    completionChartDescription: "سهم کارت‌های انجام‌شده از کل کارت‌ها",
    doneLegend: "انجام‌شده",
    remainingLegend: "باقی‌مانده",
    stageShareTitle: "سهم هر ستون",
    stageShareDescription: "درصد و تعداد کارت‌ها در هر ستون",
    completionMixAria: (done, remaining) => "انجام‌شده: " + new Intl.NumberFormat("fa-IR").format(done) + "؛ باقی‌مانده: " + new Intl.NumberFormat("fa-IR").format(remaining),
    stageShareAria: (summary) => "سهم کارت‌ها به تفکیک ستون: " + summary,
    shareChartLabel: (count, share) => new Intl.NumberFormat("fa-IR").format(share) + "٪ · " + new Intl.NumberFormat("fa-IR").format(count) + " کارت",
    cardCount: (count) => new Intl.NumberFormat("fa-IR").format(count) + " کارت",
    renameColumn: (title) => "تغییر نام " + title,
    deleteColumn: (title) => "حذف ستون " + title,
    confirmDeleteColumn: (title) => "ستون «" + title + "» حذف شود؟",
    moveCardsBeforeDelete: "برای حذف ستون، کارت‌های آن را ابتدا جابه‌جا کنید.",
    cannotDeleteLastColumn: "برد باید دست‌کم یک ستون داشته باشد.",
    moveCard: (title) => "جابه‌جایی کارت " + title,
    moveTo: (title) => "انتقال به " + title,
    deleteCard: (title) => "حذف کارت " + title,
    addCardTo: (title) => "افزودن کارت به " + title,
    formatNumber: (value) => new Intl.NumberFormat("fa-IR").format(value),
    percentage: (value) => new Intl.NumberFormat("fa-IR").format(value) + "٪",
    completionAria: (value) => "پیشرفت کلی: " + new Intl.NumberFormat("fa-IR").format(value) + " درصد",
    completedOf: (done, total) => new Intl.NumberFormat("fa-IR").format(done) + " از " + new Intl.NumberFormat("fa-IR").format(total) + " کارت",
    chartTotal: (total) => new Intl.NumberFormat("fa-IR").format(total) + " کارت",
    chartSummary: (summary) => "تعداد کارت‌ها در ستون‌ها: " + summary,
    cardsAcrossColumns: (cards, columns) => new Intl.NumberFormat("fa-IR").format(cards) + " کارت در " + new Intl.NumberFormat("fa-IR").format(columns) + " ستون",
    filtersLabel: "جست‌وجو و فیلتر",
    searchCards: "جست‌وجوی کارت‌ها",
    searchPlaceholder: "عنوان، توضیحات یا برچسب را جست‌وجو کنید",
    stageFilter: "وضعیت",
    allStages: "همه‌ی وضعیت‌ها",
    priorityFilter: "اولویت",
    allPriorities: "همه‌ی اولویت‌ها",
    noPriority: "بدون اولویت",
    priorityLow: "کم",
    priorityMedium: "متوسط",
    priorityHigh: "زیاد",
    dueDateFilter: "موعد",
    allDueDates: "همه‌ی موعدها",
    overdueOnly: "عقب‌افتاده",
    clearFilters: "پاک‌کردن فیلترها",
    resultsCount: (visible, total) => new Intl.NumberFormat("fa-IR").format(visible) + " از " + new Intl.NumberFormat("fa-IR").format(total) + " کارت",
    noMatchingCards: "کارتی با این فیلترها پیدا نشد.",
    savedLocally: "تغییرات در این مرورگر ذخیره شد",
    storageUnavailable: "ذخیره‌سازی در مرورگر در دسترس نیست",
    openCardDetails: (title) => "ویرایش جزئیات " + title,
    cardDetailsTitle: "جزئیات کارت",
    saveChanges: "ذخیره‌ی تغییرات",
    closeDialog: "بستن",
    priorityLabel: "اولویت",
    dueDateLabel: "تاریخ سررسید",
    labelsLabel: "برچسب‌ها",
    labelsPlaceholder: "مثلاً: طراحی، فوری",
    labelsHelp: "برچسب‌ها را با ویرگول جدا کنید.",
    checklistLabel: "فهرست کارها",
    checklistPlaceholder: "یک کار به فهرست اضافه کنید",
    addChecklistItem: "افزودن",
    removeChecklistItem: (title) => "حذف مورد " + title,
    checklistProgress: (done, total) => "فهرست: " + new Intl.NumberFormat("fa-IR").format(done) + " از " + new Intl.NumberFormat("fa-IR").format(total),
    overdueTag: "عقب‌افتاده",
    assigneesLabel: "اعضای مسئول",
    assigneesHelp: "یک یا چند عضو تیم را انتخاب کنید.",
    noAssigneesSelected: "هنوز عضوی انتخاب نشده است.",
    assignedTo: (names) => "مسئولان: " + names.join("، "),
    footerHint: "وضعیت کارها را شفاف نگه دارید و گام بعدی را مشخص کنید.",
  },
  en: {
    breadcrumb: "YOUR WORKSPACE  /  PROJECTS",
    projectBoard: "Project board",
    projectTitle: "Website launch",
    subtitle: "A clear view of what’s moving and what’s next.",
    boardNote: "One board, all the momentum",
    liveStats: "Board summary",
    overviewTitle: "Project overview",
    overviewDescription: "See how work is moving across your board.",
    completed: "Completion",
    totalCards: "Total cards",
    acrossStages: "Across all stages",
    movingNow: "Moving right now",
    completedCards: "Completed cards",
    cardsByStage: "Cards by stage",
    distribution: "Current distribution across the board",
    boardSummary: "Board summary",
    boardLabel: "Project board",
    boardTips: "Board tips",
    moveTip: "Move cards by dragging or using the arrow menu.",
    renameTip: "Select the pencil to rename a column, then press Enter.",
    scrollHint: "Scroll to see all columns",
    columnName: "Column name",
    emptyHint: "Drop a card here",
    titleLabel: "Card title",
    detailsLabel: "Card details",
    titlePlaceholder: "Give this card a title",
    detailsPlaceholder: "Add a little context…",
    cancel: "Cancel",
    addCard: "Add a card",
    addColumn: "Add column",
    newColumnTitle: "New column",
    moveCardTitle: "Move card",
    languageLabel: "Language",
    darkMode: "Dark",
    lightMode: "Light",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    additionalInsights: "More insights",
    bottomChartsKicker: "CARD ANALYSIS",
    completionChartTitle: "Completed and remaining",
    completionChartDescription: "Share of completed cards across the board",
    doneLegend: "Completed",
    remainingLegend: "Remaining",
    stageShareTitle: "Share by stage",
    stageShareDescription: "Percentage and count of cards in each column",
    completionMixAria: (done, remaining) => "Completed: " + done + "; remaining: " + remaining,
    stageShareAria: (summary) => "Card share by stage: " + summary,
    shareChartLabel: (count, share) => share + "% · " + count + " cards",
    cardCount: (count) => count + " cards",
    renameColumn: (title) => "Rename column " + title,
    deleteColumn: (title) => "Delete column " + title,
    confirmDeleteColumn: (title) => "Delete “" + title + "”? This column must be empty.",
    moveCardsBeforeDelete: "Move the cards out before deleting this column.",
    cannotDeleteLastColumn: "At least one column must remain on the board.",
    moveCard: (title) => "Move " + title + " to another column",
    moveTo: (title) => "Move to " + title,
    deleteCard: (title) => "Delete: " + title,
    addCardTo: (title) => "Add card to " + title,
    formatNumber: (value) => String(value),
    percentage: (value) => value + "%",
    completionAria: (value) => "Board completion: " + value + "%",
    completedOf: (done, total) => done + " of " + total + " cards",
    chartTotal: (total) => total + " total",
    chartSummary: (summary) => "Cards by stage: " + summary,
    cardsAcrossColumns: (cards, columns) => cards + " cards across " + columns + " columns",
    filtersLabel: "Search and filters",
    searchCards: "Search cards",
    searchPlaceholder: "Search titles, details, or labels",
    stageFilter: "Status",
    allStages: "All statuses",
    priorityFilter: "Priority",
    allPriorities: "All priorities",
    noPriority: "No priority",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    dueDateFilter: "Due date",
    allDueDates: "Any due date",
    overdueOnly: "Overdue",
    clearFilters: "Clear filters",
    resultsCount: (visible, total) => visible + " of " + total + " cards",
    noMatchingCards: "No cards match these filters.",
    savedLocally: "Changes saved in this browser",
    storageUnavailable: "Browser storage is unavailable",
    openCardDetails: (title) => "Edit details for " + title,
    cardDetailsTitle: "Card details",
    saveChanges: "Save changes",
    closeDialog: "Close",
    priorityLabel: "Priority",
    dueDateLabel: "Due date",
    labelsLabel: "Labels",
    labelsPlaceholder: "For example: design, urgent",
    labelsHelp: "Separate labels with commas.",
    checklistLabel: "Checklist",
    checklistPlaceholder: "Add a checklist item",
    addChecklistItem: "Add",
    removeChecklistItem: (title) => "Remove " + title,
    checklistProgress: (done, total) => done + "/" + total + " tasks",
    overdueTag: "Overdue",
    assigneesLabel: "Assignees",
    assigneesHelp: "Select one or more team members.",
    noAssigneesSelected: "No team members selected yet.",
    assignedTo: (names) => "Assigned to: " + names.join(", "),
    footerHint: "Keep the work visible. Keep the next step small.",
  },
};
const defaultColumnTitles: Record<string, string> = {
  backlog: "Backlog",
  "up-next": "Up next",
  "in-progress": "In progress",
  review: "Review",
  done: "Done",
};

const persianColumnTitles: Record<string, string> = {
  backlog: "کارهای آینده",
  "up-next": "در صف انجام",
  "in-progress": "در حال انجام",
  review: "بازبینی",
  done: "انجام‌شده",
};

const persianSampleCards: Record<string, { title: string; details: string }> = {
  brief: { title: "تدوین پیام معرفی محصول", details: "پیام صفحه‌ی اصلی را با ارزش پیشنهادی محصول هماهنگ کنید." },
  research: { title: "بررسی بازخورد مشتریان", details: "نکته‌های تکرارشونده در مصاحبه‌های اخیر را استخراج کنید." },
  "design-system": { title: "بهبود سیستم طراحی", details: "فاصله‌ها را دقیق کنید و اجزای اصلی را مستند کنید." },
  onboarding: { title: "طراحی فرایند شروع کار", details: "پنج دقیقه‌ی اول استفاده را ساده و روان کنید." },
  homepage: { title: "پیاده‌سازی صفحه‌ی اصلی", details: "طرح تأییدشده را در صفحه‌ی اصلی اجرا کنید." },
  analytics: { title: "افزودن ابزار تحلیل", details: "شاخص‌های کلیدی را برای یادگیری و بهبود دنبال کنید." },
  "mobile-review": { title: "بازبینی نسخه‌ی موبایل", details: "صفحه‌های اصلی را در اندازه‌های کوچک‌تر بررسی کنید." },
  brand: { title: "نهایی‌کردن هویت بصری", details: "تیم درباره‌ی ظاهر تازه‌ی محصول به توافق رسیده است." },
};

const sampleCardDefaults = Object.fromEntries(createInitialBoard().cards.map((card) => [card.id, card]));

function seedSampleAssigneesIfMissing(board: BoardState): BoardState {
  return {
    ...board,
    cards: board.cards.map((card) => {
      const assigneeIds = sampleCardDefaults[card.id]?.assigneeIds;
      if (!assigneeIds || card.assigneeIds !== undefined) return card;
      return { ...card, assigneeIds: [...assigneeIds] };
    }),
  };
}
const persianSampleMetadata: Record<string, { labels: string[]; checklist: Record<string, string> }> = {
  brief: { labels: ["عرضه", "محتوا"], checklist: { "brief-copy": "هماهنگ‌کردن پیام صفحه‌ی اصلی", "brief-review": "بازبینی متن نهایی" } },
  research: { labels: ["پژوهش"], checklist: { "research-themes": "دسته‌بندی نکته‌های تکراری", "research-summary": "خلاصه‌کردن نیازهای مشتریان" } },
  "design-system": { labels: ["سیستم طراحی", "رابط کاربری"], checklist: { "design-spacing": "بررسی فاصله‌گذاری‌ها", "design-components": "مستندسازی اجزای مشترک", "design-contrast": "بازبینی کنتراست رنگ‌ها" } },
  onboarding: { labels: ["شروع به کار"], checklist: { "onboarding-steps": "طراحی گام‌های شروع", "onboarding-copy": "بازبینی متن‌های راهنما" } },
  homepage: { labels: ["توسعه", "عرضه"], checklist: { "homepage-layout": "پیاده‌سازی چیدمان تأییدشده", "homepage-responsive": "بررسی نمایش در اندازه‌های مختلف", "homepage-review": "بازبینی صفحه‌ی نهایی" } },
  analytics: { labels: ["تحلیل داده"], checklist: { "analytics-events": "انتخاب رویدادهای کلیدی", "analytics-verify": "بررسی ثبت رویدادها" } },
  "mobile-review": { labels: ["کیفیت", "موبایل"], checklist: { "mobile-screens": "بازبینی صفحه‌های اصلی", "mobile-fixes": "ثبت اصلاحات باقی‌مانده" } },
  brand: { labels: ["هویت بصری"], checklist: { "brand-colors": "تأیید پالت رنگ", "brand-type": "نهایی‌کردن تایپوگرافی" } },
};

function displayCardMetadata(card: BoardCard, language: Language) {
  const defaults = sampleCardDefaults[card.id];
  const translated = persianSampleMetadata[card.id];
  const labels = card.labels ?? [];
  const defaultsMatch = Boolean(defaults && translated && labels.length === (defaults.labels?.length ?? 0) && labels.every((label, index) => label === defaults.labels?.[index]));
  return {
    labels: language === "fa" && defaultsMatch ? translated?.labels ?? labels : labels,
    checklist: (card.checklist ?? []).map((item) => {
      const initial = defaults?.checklist?.find((entry) => entry.id === item.id);
      const text = language === "fa" && initial && initial.text === item.text ? translated?.checklist[item.id] : undefined;
      return text ? { ...item, text } : item;
    }),
  };
}

function seedSampleMetadataIfMissing(board: BoardState): BoardState {
  return {
    ...board,
    cards: board.cards.map((card) => {
      const sample = sampleCardDefaults[card.id];
      if (!sample || card.title !== sample.title || card.details !== sample.details ||
        card.priority !== undefined || card.dueDate !== undefined || card.labels !== undefined || card.checklist !== undefined) return card;
      return {
        ...card,
        priority: sample.priority,
        dueDate: sample.dueDate,
        labels: sample.labels ? [...sample.labels] : [],
        checklist: sample.checklist?.map((item) => ({ ...item })) ?? [],
      };
    }),
  };
}


function displayColumnTitle(column: BoardColumn, language: Language) {
  const englishTitle = defaultColumnTitles[column.id];
  const persianTitle = persianColumnTitles[column.id];
  if (englishTitle && persianTitle && (column.title === englishTitle || column.title === persianTitle)) {
    return language === "fa" ? persianTitle : englishTitle;
  }
  return column.title;
}

function displayCardContent(card: BoardCard, language: Language) {
  const translated = persianSampleCards[card.id];
  const original = sampleCardDefaults[card.id];
  if (language !== "fa" || !translated || !original) return { title: card.title, details: card.details };
  return {
    title: card.title === original.title ? translated.title : card.title,
    details: card.details === original.details ? translated.details : card.details,
  };
}
function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function TeamNavigationIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 19c.2-3 2.1-4.8 5.5-4.8s5.3 1.8 5.5 4.8M16 5.6a2.6 2.6 0 0 1 0 5.1m1.2 3.8c2.1.5 3.2 2 3.3 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
function BoardMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4" width="5" height="16" rx="1.5" stroke="white" strokeWidth="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" stroke="white" strokeWidth="1.5" />
      <rect x="16.5" y="4" width="4" height="13" rx="1.5" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function PencilIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 7h15m-10-3h5M7 7l.8 12h8.4L17 7m-6.5 3v5m3-5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MoveIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h15m0 0-3-3m3 3-3 3M20 16H5m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function MoonIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.6 15.1A8.7 8.7 0 0 1 8.9 3.4 8.8 8.8 0 1 0 20.6 15.1Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
function localDateKey() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function isCardOverdue(card: BoardCard, today: string) {
  return Boolean(card.dueDate && card.dueDate < today && card.columnId !== "done");
}
function formatDueDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium" }).format(new Date(value + "T00:00:00"));
}
function priorityText(priority: CardPriority, copy: Copy) {
  return priority === "high" ? copy.priorityHigh : priority === "medium" ? copy.priorityMedium : copy.priorityLow;
}
function teamMemberName(member: TeamMember, language: Language) {
  return language === "fa" ? member.nameFa : member.nameEn;
}

function cardAssignedMembers(card: BoardCard, members: TeamMember[]) {
  const selected = new Set(card.assigneeIds ?? []);
  return members.filter((member) => selected.has(member.id));
}
function CardDetailsModal({ card, members, language, copy, onClose, onSave }: {
  card: BoardCard; members: TeamMember[]; language: Language; copy: Copy; onClose: () => void; onSave: (updates: CardUpdate) => void;
}) {
  const displayed = displayCardContent(card, language);
  const displayedMetadata = displayCardMetadata(card, language);
  const [title, setTitle] = useState(displayed.title);
  const [details, setDetails] = useState(displayed.details);
  const [priority, setPriority] = useState<CardPriority | "">(card.priority ?? "");
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const [labels, setLabels] = useState(displayedMetadata.labels.join(", "));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(displayedMetadata.checklist);
  const [newItem, setNewItem] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(card.assigneeIds ?? []);
  function addChecklist() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((items) => [...items, { id: "check-" + Date.now() + "-" + Math.random().toString(36).slice(2), text, done: false }]);
    setNewItem("");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim() === displayed.title ? card.title : title.trim(),
      details: details.trim() === displayed.details ? card.details : details.trim(),
      priority: priority || undefined,
      dueDate: dueDate || undefined,
      assigneeIds: [...assigneeIds],
      labels: (() => {
        const nextLabels = Array.from(new Set(labels.split(/[,\n]/).map((label) => label.trim()).filter(Boolean)));
        const unchanged = nextLabels.length === displayedMetadata.labels.length && nextLabels.every((label, index) => label === displayedMetadata.labels[index]);
        return unchanged ? card.labels ?? [] : nextLabels;
      })(),
      checklist: checklist.map((item) => {
        const stored = card.checklist?.find((entry) => entry.id === item.id);
        const shown = displayedMetadata.checklist.find((entry) => entry.id === item.id);
        return stored && shown && item.text === shown.text ? { ...item, text: stored.text } : item;
      }),
    });
  }
  return (
    <div className="card-dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="card-dialog" role="dialog" aria-modal="true" aria-labelledby="card-dialog-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        <div className="card-dialog-heading">
          <div><span className="card-dialog-kicker">{copy.cardDetailsTitle}</span><h2 id="card-dialog-title">{displayed.title}</h2></div>
          <button className="icon-button modal-close" type="button" aria-label={copy.closeDialog} onClick={onClose}>×</button>
        </div>
        <form className="card-dialog-form" onSubmit={save}>
          <label className="dialog-field"><span>{copy.titleLabel}</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="dialog-field"><span>{copy.detailsLabel}</span><textarea value={details} onChange={(event) => setDetails(event.target.value)} /></label>
          <div className="dialog-field-grid">
            <label className="dialog-field"><span>{copy.priorityLabel}</span><select value={priority} onChange={(event) => setPriority(event.target.value as CardPriority | "")}><option value="">{copy.noPriority}</option><option value="low">{copy.priorityLow}</option><option value="medium">{copy.priorityMedium}</option><option value="high">{copy.priorityHigh}</option></select></label>
            <label className="dialog-field"><span>{copy.dueDateLabel}</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
          <label className="dialog-field"><span>{copy.labelsLabel}</span><input value={labels} placeholder={copy.labelsPlaceholder} onChange={(event) => setLabels(event.target.value)} /><small>{copy.labelsHelp}</small></label>
          <fieldset className="assignee-picker">
            <legend>{copy.assigneesLabel}</legend>
            <p className="assignee-picker-help">{copy.assigneesHelp}</p>
            {assigneeIds.length === 0 && <p className="assignee-empty">{copy.noAssigneesSelected}</p>}
            <div className="assignee-options">
              {members.map((member) => {
                const name = teamMemberName(member, language);
                const checked = assigneeIds.includes(member.id);
                return (
                  <label className="assignee-option" key={member.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setAssigneeIds((current) => current.includes(member.id)
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id])}
                    />
                    <TeamAvatar member={member} />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <section className="checklist-editor" aria-label={copy.checklistLabel}>
            <h3>{copy.checklistLabel}</h3>
            {checklist.length > 0 && <ul>{checklist.map((item) => (
              <li key={item.id} className={item.done ? "checklist-item is-done" : "checklist-item"}>
                <label><input type="checkbox" checked={item.done} onChange={() => setChecklist((items) => items.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} /><span>{item.text}</span></label>
                <button className="checklist-remove" type="button" aria-label={copy.removeChecklistItem(item.text)} onClick={() => setChecklist((items) => items.filter((entry) => entry.id !== item.id))}>×</button>
              </li>
            ))}</ul>}
            <div className="checklist-add"><input value={newItem} placeholder={copy.checklistPlaceholder} aria-label={copy.checklistPlaceholder} onChange={(event) => setNewItem(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklist(); } }} /><button className="form-button submit" type="button" onClick={addChecklist}>{copy.addChecklistItem}</button></div>
          </section>
          <div className="dialog-actions"><button className="form-button cancel" type="button" onClick={onClose}>{copy.cancel}</button><button className="form-button submit" type="submit">{copy.saveChanges}</button></div>
        </form>
      </section>
    </div>
  );
}
function ColumnHeading({
  displayTitle,
  count,
  canDelete,
  hasCards,
  onDelete,
  color,
  copy,
  editing,
  onStartRename,
  onRename,
  onCancelRename,
}: {
  displayTitle: string;
  count: number;
  canDelete: boolean;
  hasCards: boolean;
  onDelete: () => void;
  color: string;
  copy: Copy;
  editing: boolean;
  onStartRename: () => void;
  onRename: (title: string) => void;
  onCancelRename: () => void;
}) {
  const [draft, setDraft] = useState(displayTitle);


  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRename(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDraft(displayTitle);
      onCancelRename();
    }
  }

  return (
    <div className="column-head">
      <div className="column-title-wrap">
        <span className="column-dot" style={{ backgroundColor: color }} />
        {editing ? (
          <form className="rename-form" onSubmit={submit}>
            <input
              autoFocus
              aria-label={copy.columnName}
              className="rename-input"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              value={draft}
            />
          </form>
        ) : (
          <h2 className="column-title">{displayTitle}</h2>
        )}
        <span className="count" aria-label={copy.cardCount(count)}>{copy.formatNumber(count)}</span>
      </div>
      {!editing && (
        <div className="column-actions">
          <button className="icon-button" type="button" aria-label={copy.renameColumn(displayTitle)} onClick={() => { setDraft(displayTitle); onStartRename(); }}>
            <PencilIcon />
          </button>
          <button
            className="icon-button delete-column"
            type="button"
            aria-label={copy.deleteColumn(displayTitle)}
            title={canDelete ? (hasCards ? copy.moveCardsBeforeDelete : copy.deleteColumn(displayTitle)) : copy.cannotDeleteLastColumn}
            disabled={!canDelete}
            onClick={onDelete}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export function KanbanBoard() {
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [teamDirectory, setTeamDirectory] = useState<TeamDirectory>(createInitialTeamDirectory);
  const [teamDirectoryLoaded, setTeamDirectoryLoaded] = useState(false);
  const [activeView, setActiveView] = useState<"dashboard" | "team-members">("dashboard");
  const [language, setLanguage] = useState<Language>("fa");
  const [theme, setTheme] = useState<Theme>("dark");
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [teamStorageUnavailable, setTeamStorageUnavailable] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<CardPriority | "all">("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [addingCardTo, setAddingCardTo] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const copy = copyByLanguage[language];
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("kanban-codex.board.v1");
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isBoardState(parsed)) setBoard(seedSampleAssigneesIfMissing(seedSampleMetadataIfMissing(parsed)));
        }
      } catch {
        setStorageUnavailable(true);
      } finally {
        setBoardLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("kanban-codex.teams.v1");
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isTeamDirectory(parsed)) setTeamDirectory(parsed);
          else setTeamStorageUnavailable(true);
        }
      } catch {
        setTeamStorageUnavailable(true);
      } finally {
        setTeamDirectoryLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);
  useEffect(() => {
    if (!boardLoaded) return;
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem("kanban-codex.board.v1", JSON.stringify(board));
        setStorageUnavailable(false);
      } catch {
        setStorageUnavailable(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [board, boardLoaded]);
  useEffect(() => {
    if (!teamDirectoryLoaded) return;
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem("kanban-codex.teams.v1", JSON.stringify(teamDirectory));
        setTeamStorageUnavailable(false);
      } catch {
        setTeamStorageUnavailable(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [teamDirectory, teamDirectoryLoaded]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    document.title = activeView === "dashboard"
      ? language === "fa" ? "کانبان کدکس — برد پروژه" : "Kanban Codex — Project board"
      : language === "fa" ? "کانبان کدکس — اعضای تیم" : "Kanban Codex — Team members";
  }, [activeView, language, theme]);
  const today = localDateKey();
  const normalizedSearch = searchTerm.trim().normalize("NFKC").toLocaleLowerCase(language);
  const filteredCards = useMemo(() => board.cards.filter((card) => {
    if (stageFilter !== "all" && card.columnId !== stageFilter) return false;
    if (priorityFilter !== "all" && card.priority !== priorityFilter) return false;
    if (dueFilter === "overdue" && !isCardOverdue(card, today)) return false;
    if (!normalizedSearch) return true;
    const displayed = displayCardContent(card, language);
    const displayedMetadata = displayCardMetadata(card, language);
    return [card.title, card.details, displayed.title, displayed.details, ...displayedMetadata.labels, ...displayedMetadata.checklist.map((item) => item.text)].join(" ").normalize("NFKC").toLocaleLowerCase(language).includes(normalizedSearch);
  }), [board.cards, dueFilter, language, normalizedSearch, priorityFilter, stageFilter, today]);
  const filtersActive = Boolean(normalizedSearch) || stageFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all";
  const editingCard = editingCardId ? board.cards.find((card) => card.id === editingCardId) ?? null : null;
  const totalCards = filteredCards.length;
  const cardsByColumn = useMemo(
    () => Object.fromEntries(board.columns.map((column) => [column.id, filteredCards.filter((card) => card.columnId === column.id)])),
    [board.columns, filteredCards],
  );

  const doneCount = cardsByColumn.done?.length ?? 0;
  const remainingCount = totalCards - doneCount;
  const inProgressCount = cardsByColumn["in-progress"]?.length ?? 0;
  const doneColumn = board.columns.find((column) => column.id === "done");
  const inProgressColumn = board.columns.find((column) => column.id === "in-progress");
  const completionPercent = totalCards === 0 ? 0 : Math.round((doneCount / totalCards) * 100);
  const maxColumnCount = Math.max(1, ...board.columns.map((column) => cardsByColumn[column.id]?.length ?? 0));
  const doneColumnTitle = doneColumn ? displayColumnTitle(doneColumn, language) : copy.completed;
  const inProgressColumnTitle = inProgressColumn ? displayColumnTitle(inProgressColumn, language) : copy.movingNow;
  const stageSummary = board.columns.map((column) => displayColumnTitle(column, language) + ": " + copy.formatNumber(cardsByColumn[column.id]?.length ?? 0)).join(language === "fa" ? "، " : ", ");
  const stageShareSummary = board.columns.map((column) => {
    const count = cardsByColumn[column.id]?.length ?? 0;
    const share = totalCards === 0 ? 0 : Math.round((count / totalCards) * 100);
    return displayColumnTitle(column, language) + " " + copy.shareChartLabel(count, share);
  }).join(language === "fa" ? "، " : ", ");
  function handleAddColumn() {
    const columnId = "column-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    setBoard((current) => addColumn(current, columnId, copy.newColumnTitle));
    setEditingColumnId(columnId);
    setSearchTerm("");
    setStageFilter("all");
    setPriorityFilter("all");
    setDueFilter("all");
  }

  function handleDeleteColumn(column: BoardColumn) {
    if (board.columns.length <= 1) return;
    if (board.cards.some((card) => card.columnId === column.id)) {
      window.alert(copy.moveCardsBeforeDelete);
      return;
    }
    const title = displayColumnTitle(column, language);
    if (!window.confirm(copy.confirmDeleteColumn(title))) return;
    setBoard((current) => deleteColumn(current, column.id));
    if (stageFilter === column.id) setStageFilter("all");
  }

  function finishRename(columnId: string, title: string) {
    setBoard((current) => renameColumn(current, columnId, title));
    setEditingColumnId(null);
  }

  function submitNewCard(event: FormEvent<HTMLFormElement>, columnId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "");
    const details = String(formData.get("details") ?? "");
    if (!title.trim()) return;
    setBoard((current) => addCard(current, columnId, title, details, `card-${Date.now()}-${Math.random().toString(36).slice(2)}`));
    setAddingCardTo(null);
  }

  function saveCardDetails(updates: CardUpdate) {
    if (!editingCardId) return;
    setBoard((current) => updateCard(current, editingCardId, updates));
    setEditingCardId(null);
  }
  function dropCard(event: React.DragEvent<HTMLElement>, columnId: string) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain") || draggingCardId;
    if (cardId) setBoard((current) => moveCard(current, cardId, columnId));
    setHoveredColumnId(null);
    setDraggingCardId(null);
  }

  function removeMemberFromTeam(teamId: string, memberId: string) {
    const nextTeams = teamDirectory.teams.map((team) => team.id === teamId
      ? { ...team, memberIds: team.memberIds.filter((id) => id !== memberId) }
      : team);
    const stillInAnotherTeam = nextTeams.some((team) => team.memberIds.includes(memberId));
    setTeamDirectory({
      teams: nextTeams,
      members: stillInAnotherTeam
        ? teamDirectory.members
        : teamDirectory.members.filter((member) => member.id !== memberId),
    });
    if (!stillInAnotherTeam) {
      setBoard((current) => ({
        ...current,
        cards: current.cards.map((card) => {
          if (!card.assigneeIds?.includes(memberId)) return card;
          const assigneeIds = card.assigneeIds.filter((id) => id !== memberId);
          return { ...card, assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined };
        }),
      }));
    }
  }

  function deleteEmptyTeam(teamId: string) {
    const team = teamDirectory.teams.find((item) => item.id === teamId);
    if (!team || team.memberIds.length > 0) return false;
    setTeamDirectory((current) => ({ ...current, teams: current.teams.filter((item) => item.id !== teamId) }));
    return true;
  }
  return (
    <div className="shell" dir="ltr">
      <aside className="sidebar" dir={language === "fa" ? "rtl" : "ltr"} lang={language}>
        <div className="sidebar-brand brand">
          <span className="brand-mark"><BoardMark /></span>
          <span className="brand-name">kanban</span>
        </div>
        <nav className="sidebar-nav" aria-label={language === "fa" ? "منوی اصلی" : "Main navigation"}>
          <button className={"sidebar-nav-item" + (activeView === "dashboard" ? " active" : "")} type="button" aria-current={activeView === "dashboard" ? "page" : undefined} onClick={() => setActiveView("dashboard")}>
            <DashboardIcon /><span className="sidebar-nav-label">{language === "fa" ? "داشبورد" : "Dashboard"}</span>
          </button>
          <button className={"sidebar-nav-item" + (activeView === "team-members" ? " active" : "")} type="button" aria-current={activeView === "team-members" ? "page" : undefined} onClick={() => setActiveView("team-members")}>
            <TeamNavigationIcon /><span className="sidebar-nav-label">{language === "fa" ? "اعضای تیم" : "Team members"}</span>
          </button>
        </nav>
      </aside>
      <div className="app-main" dir={language === "fa" ? "rtl" : "ltr"} lang={language}>
      <header className="topbar">
        <div className="crumb">{copy.breadcrumb} / {activeView === "dashboard" ? (language === "fa" ? "داشبورد" : "Dashboard") : (language === "fa" ? "اعضای تیم" : "Team members")}</div>
        <div className="topbar-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-label={theme === "light" ? copy.switchToDark : copy.switchToLight}
            title={theme === "light" ? copy.switchToDark : copy.switchToLight}
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            <span>{theme === "light" ? copy.darkMode : copy.lightMode}</span>
          </button>
          <div className="language-switch" role="group" aria-label={copy.languageLabel}>
            <button className={"language-option" + (language === "fa" ? " active" : "")} type="button" aria-pressed={language === "fa"} onClick={() => setLanguage("fa")}>فارسی</button>
            <button className={"language-option" + (language === "en" ? " active" : "")} type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
          </div>
          <span className="top-dot" aria-hidden="true" />
        </div>
      </header>

      <main className="view-content">
        {activeView === "dashboard" ? (
          <>
      <section className="page-head" aria-labelledby="page-title">
        <div className="eyebrow">{copy.projectBoard}</div>
        <div className="heading-row">
          <div>
            <h1 id="page-title" className="page-title">{copy.projectTitle}</h1>
            <p className="page-subtitle">{copy.subtitle}</p>
          </div>
          <div className="board-note">
            <span className="board-note-mark"><BoardMark /></span>
            {copy.boardNote}
          </div>
        </div>
      </section>

      <section className="board-wrap" aria-label={copy.boardLabel}>
        <section className="board-toolbar" aria-label={copy.filtersLabel}>
          <label className="filter-search"><SearchIcon /><span className="sr-only">{copy.searchCards}</span><input type="search" value={searchTerm} placeholder={copy.searchPlaceholder} onChange={(event) => setSearchTerm(event.target.value)} /></label>
          <div className="filter-controls">
            <label className="filter-control"><span>{copy.stageFilter}</span><select aria-label={copy.stageFilter} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">{copy.allStages}</option>{board.columns.map((column) => <option key={column.id} value={column.id}>{displayColumnTitle(column, language)}</option>)}</select></label>
            <label className="filter-control"><span>{copy.priorityFilter}</span><select aria-label={copy.priorityFilter} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as CardPriority | "all")}><option value="all">{copy.allPriorities}</option><option value="high">{copy.priorityHigh}</option><option value="medium">{copy.priorityMedium}</option><option value="low">{copy.priorityLow}</option></select></label>
            <label className="filter-control"><span>{copy.dueDateFilter}</span><select aria-label={copy.dueDateFilter} value={dueFilter} onChange={(event) => setDueFilter(event.target.value as DueFilter)}><option value="all">{copy.allDueDates}</option><option value="overdue">{copy.overdueOnly}</option></select></label>
          </div>
          <div className="filter-meta"><span className="filter-results" aria-live="polite">{copy.resultsCount(filteredCards.length, board.cards.length)}</span>{boardLoaded && <span className={storageUnavailable ? "storage-status is-unavailable" : "storage-status"} role="status"><span className="storage-status-dot" aria-hidden="true" />{storageUnavailable ? copy.storageUnavailable : copy.savedLocally}</span>}</div>
          {filtersActive && <button className="clear-filters" type="button" onClick={() => { setSearchTerm(""); setStageFilter("all"); setPriorityFilter("all"); setDueFilter("all"); }}>{copy.clearFilters}</button>}
          <button className="add-column" type="button" onClick={handleAddColumn}><PlusIcon />{copy.addColumn}</button>
        </section>
        <div className="board-guide" role="note" aria-label={copy.boardTips}>
          <div className="board-guide-copy">
            <span className="guide-icon"><MoveIcon /></span>
            <span>{copy.moveTip}</span>
            <span className="guide-divider" aria-hidden="true">·</span>
            <span className="guide-icon guide-icon-rename"><PencilIcon /></span>
            <span>{copy.renameTip}</span>
          </div>
          <div className="scroll-cue">
            <span>{copy.scrollHint}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="board-grid" style={{ "--column-count": board.columns.length } as CSSProperties}>
          {board.columns.map((column, index) => {
            const cards = cardsByColumn[column.id] ?? [];
            const displayTitle = displayColumnTitle(column, language);
            return (
              <section
                key={column.id}
                className={`column${hoveredColumnId === column.id ? " is-over" : ""}`}
                data-testid={`column-${column.id}`}
                aria-label={displayTitle}
                style={{ "--column-accent": columnColors[index % columnColors.length] } as CSSProperties}
                onDragEnter={() => setHoveredColumnId(column.id)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoveredColumnId(null);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropCard(event, column.id)}
              >
                <ColumnHeading
                  displayTitle={displayTitle}
                  copy={copy}
                  count={cards.length}
                  color={columnColors[index % columnColors.length]}
                  canDelete={board.columns.length > 1}
                  hasCards={board.cards.some((card) => card.columnId === column.id)}
                  onDelete={() => handleDeleteColumn(column)}
                  editing={editingColumnId === column.id}
                  onStartRename={() => setEditingColumnId(column.id)}
                  onRename={(title) => finishRename(column.id, title)}
                  onCancelRename={() => setEditingColumnId(null)}
                />
                <div className="cards">
                  {cards.map((card) => (
                    <article
                      key={card.id}
                      className={`card${draggingCardId === card.id ? " dragging" : ""}`}
                      data-testid={`card-${card.id}`}
                      style={{ "--card-accent": columnColors[index % columnColors.length], "--card-tint": columnTints[index % columnTints.length], "--card-tint-dark": columnDarkTints[index % columnDarkTints.length] } as CSSProperties}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", card.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingCardId(card.id);
                      }}
                      onDragEnd={() => {
                        setDraggingCardId(null);
                        setHoveredColumnId(null);
                      }}
                    >
                      <div className="card-top">
                        <h3 className="card-title">{displayCardContent(card, language).title}</h3>
                        <div className="card-actions">
                          <button className="icon-button details-card" type="button" aria-label={copy.openCardDetails(displayCardContent(card, language).title)} title={copy.cardDetailsTitle} onClick={() => setEditingCardId(card.id)}><PencilIcon /></button>
                          <details className="move-menu">
                            <summary
                              className="icon-button move-card"
                              aria-label={copy.moveCard(displayCardContent(card, language).title)}
                              title={copy.moveCardTitle}
                            >
                              <MoveIcon />
                            </summary>
                            <div className="move-options">
                              {board.columns.filter((target) => target.id !== card.columnId).map((target) => (
                                <button
                                  key={target.id}
                                  className="move-option"
                                  type="button"
                                  onClick={(event) => {
                                    setBoard((current) => moveCard(current, card.id, target.id));
                                    event.currentTarget.closest("details")?.removeAttribute("open");
                                  }}
                                >
                                  {copy.moveTo(displayColumnTitle(target, language))}
                                </button>
                              ))}
                            </div>
                          </details>
                          <button
                            className="icon-button delete-card"
                            type="button"
                            aria-label={copy.deleteCard(displayCardContent(card, language).title)}
                            onClick={() => setBoard((current) => deleteCard(current, card.id))}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      {displayCardContent(card, language).details && <p className="card-details">{displayCardContent(card, language).details}</p>}
                      {(card.priority || card.dueDate || (card.labels?.length ?? 0) > 0 || (card.checklist?.length ?? 0) > 0) && <div className="card-metadata">
                        {card.priority && <span className={"priority-badge priority-" + card.priority}>{priorityText(card.priority, copy)}</span>}
                        {card.dueDate && <span className={isCardOverdue(card, today) ? "card-due is-overdue" : "card-due"}><CalendarIcon />{formatDueDate(card.dueDate, language)}{isCardOverdue(card, today) && <strong>{copy.overdueTag}</strong>}</span>}
                        {(card.labels?.length ?? 0) > 0 && <div className="card-labels">{card.labels?.map((label) => <span className="card-label" key={label}>{label}</span>)}</div>}
                        {(card.checklist?.length ?? 0) > 0 && <span className="checklist-summary">{copy.checklistProgress(card.checklist?.filter((item) => item.done).length ?? 0, card.checklist?.length ?? 0)}</span>}
                      </div>}
                      {cardAssignedMembers(card, teamDirectory.members).length > 0 && (
                        <div
                          className="card-assignees"
                          role="group"
                          aria-label={copy.assignedTo(cardAssignedMembers(card, teamDirectory.members).map((member) => teamMemberName(member, language)))}
                        >
                          {cardAssignedMembers(card, teamDirectory.members).map((member) => (
                            <span className="assignee-chip" key={member.id} title={teamMemberName(member, language)}>
                              <TeamAvatar member={member} />
                              <span className="assignee-chip-name">{teamMemberName(member, language)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="card-rule" aria-hidden="true" />
                    </article>
                  ))}
                  {cards.length === 0 && <div className="empty-hint">{filtersActive ? copy.noMatchingCards : copy.emptyHint}</div>}
                </div>

                {addingCardTo === column.id ? (
                  <form className="card-form" aria-label={copy.addCardTo(displayTitle)} onSubmit={(event) => submitNewCard(event, column.id)}>
                    <div className="form-fields">
                      <input autoFocus name="title" aria-label={copy.titleLabel} placeholder={copy.titlePlaceholder} required />
                      <textarea name="details" aria-label={copy.detailsLabel} placeholder={copy.detailsPlaceholder} />
                    </div>
                    <div className="form-actions">
                      <button className="form-button cancel" type="button" onClick={() => setAddingCardTo(null)}>{copy.cancel}</button>
                      <button className="form-button submit" type="submit">{copy.addCard}</button>
                    </div>
                  </form>
                ) : (
                  <button className="add-card" type="button" onClick={() => setAddingCardTo(column.id)}>
                    <PlusIcon /> {copy.addCard}
                  </button>
                )}
              </section>
            );
          })}
        </div>
        <footer className="board-footer">
          <span className="footer-left"><span className="footer-spark" aria-hidden="true" /> {copy.footerHint}</span>
          <span><span className="footer-count">{copy.formatNumber(totalCards)}</span> {copy.cardsAcrossColumns(totalCards, board.columns.length)}</span>
        </footer>
      </section>
      <section className="overview" aria-labelledby="overview-title">
        <div className="overview-top">
          <div className="overview-intro">
            <div className="overview-kicker">{copy.liveStats}</div>
            <h2 id="overview-title">{copy.overviewTitle}</h2>
            <p>{copy.overviewDescription}</p>
          </div>
          <div className="completion-block">
            <div
              className="completion-ring"
              role="img"
              aria-label={copy.completionAria(completionPercent)}
              style={{ "--completion": completionPercent + "%" } as CSSProperties}
            >
              <span className="completion-value">{copy.percentage(completionPercent)}</span>
            </div>
            <div className="completion-copy">
              <span className="completion-label">{copy.completed}</span>
              <strong>{copy.completedOf(doneCount, totalCards)}</strong>
            </div>
          </div>
        </div>

        <div className="overview-bottom">
          <div className="stat-grid" role="group" aria-label={copy.boardSummary}>
            <div className="stat-card stat-total">
              <span className="stat-label">{copy.totalCards}</span>
              <strong className="stat-value">{copy.formatNumber(totalCards)}</strong>
              <span className="stat-note">{copy.acrossStages}</span>
            </div>
            <div className="stat-card stat-progress">
              <span className="stat-label">{inProgressColumnTitle}</span>
              <strong className="stat-value">{copy.formatNumber(inProgressCount)}</strong>
              <span className="stat-note">{copy.movingNow}</span>
            </div>
            <div className="stat-card stat-done">
              <span className="stat-label">{doneColumnTitle}</span>
              <strong className="stat-value">{copy.formatNumber(doneCount)}</strong>
              <span className="stat-note">{copy.completedCards}</span>
            </div>
          </div>

          <section className="chart-card" aria-labelledby="stage-chart-title">
            <div className="chart-heading">
              <div>
                <h3 id="stage-chart-title">{copy.cardsByStage}</h3>
                <p>{copy.distribution}</p>
              </div>
              <span className="chart-total">{copy.chartTotal(totalCards)}</span>
            </div>
            <div className="chart-bars-scroll" role="img" aria-label={copy.chartSummary(stageSummary)}><div className="chart-bars" style={{ "--column-count": board.columns.length } as CSSProperties}>
              {board.columns.map((column, index) => {
                const count = cardsByColumn[column.id]?.length ?? 0;
                const height = count === 0 ? 6 : Math.max(12, (count / maxColumnCount) * 100);
                return (
                  <div className="chart-bar-group" key={column.id}>
                    <span className="bar-value">{copy.formatNumber(count)}</span>
                    <div className="bar-track" aria-hidden="true">
                      <span className="bar-fill" style={{ height: height + "%", backgroundColor: columnColors[index % columnColors.length] }} />
                    </div>
                    <span className="bar-label" title={displayColumnTitle(column, language)}>{displayColumnTitle(column, language)}</span>
                  </div>
                );
              })}
            </div>
            </div>
          </section>
        </div>
      </section>
      <section className="bottom-insights" aria-label={copy.additionalInsights}>
        <section className="bottom-chart-card" aria-labelledby="completion-mix-title">
          <div className="bottom-chart-heading">
            <div>
              <div className="bottom-chart-kicker">{copy.bottomChartsKicker}</div>
              <h2 id="completion-mix-title">{copy.completionChartTitle}</h2>
              <p>{copy.completionChartDescription}</p>
            </div>
          </div>
          <div className="completion-breakdown">
            <div
              className="completion-donut"
              role="img"
              aria-label={copy.completionMixAria(doneCount, remainingCount)}
              style={{ "--done-share": completionPercent + "%" } as CSSProperties}
            >
              <div className="donut-center">
                <strong>{copy.percentage(completionPercent)}</strong>
                <span>{copy.completed}</span>
              </div>
            </div>
            <div className="donut-legend">
              <div className="donut-legend-row">
                <span className="legend-dot legend-done" aria-hidden="true" />
                <span className="legend-label">{copy.doneLegend}</span>
                <strong>{copy.formatNumber(doneCount)}</strong>
              </div>
              <div className="donut-legend-row">
                <span className="legend-dot legend-remaining" aria-hidden="true" />
                <span className="legend-label">{copy.remainingLegend}</span>
                <strong>{copy.formatNumber(remainingCount)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="bottom-chart-card" aria-labelledby="stage-share-title">
          <div className="bottom-chart-heading">
            <div>
              <div className="bottom-chart-kicker">{copy.bottomChartsKicker}</div>
              <h2 id="stage-share-title">{copy.stageShareTitle}</h2>
              <p>{copy.stageShareDescription}</p>
            </div>
          </div>
          <div className="share-chart" role="group" aria-label={copy.stageShareAria(stageShareSummary)}>
            {board.columns.map((column, index) => {
              const count = cardsByColumn[column.id]?.length ?? 0;
              const share = totalCards === 0 ? 0 : Math.round((count / totalCards) * 100);
              return (
                <div className="share-row" key={column.id}>
                  <div className="share-row-heading">
                    <span className="share-name">{displayColumnTitle(column, language)}</span>
                    <span className="share-value">{copy.shareChartLabel(count, share)}</span>
                  </div>
                  <div className="share-track" aria-hidden="true">
                    <span className="share-fill" style={{ width: share + "%", backgroundColor: columnColors[index % columnColors.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
      {editingCard && <CardDetailsModal key={editingCard.id} card={editingCard} members={teamDirectory.members} language={language} copy={copy} onClose={() => setEditingCardId(null)} onSave={saveCardDetails} />}
          </>
        ) : (
          <TeamMembersPage
            directory={teamDirectory}
            language={language}
            storageUnavailable={teamStorageUnavailable}
            onDirectoryChange={setTeamDirectory}
            onRemoveMember={removeMemberFromTeam}
            onDeleteTeam={deleteEmptyTeam}
          />
        )}
      </main>
    </div>
  </div>
  );
}
