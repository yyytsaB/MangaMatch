// Library view state (filters, title query, sort, layout) and the pure
// functions that apply it. The state lives in the URL query so Back from a
// detail page — or a shared link — restores exactly the same shelf.
import { parseList, READING_STATUSES, type ReadingStatus } from "@/lib/manga";
import type { SavedManga } from "@/lib/types";

export const SORT_OPTIONS = [
  { value: "recently-added", label: "Recently added" },
  { value: "title-az", label: "Title (A–Z)" },
  { value: "highest-rated", label: "Highest rated" },
  { value: "year-newest", label: "Year (newest)" },
  { value: "year-oldest", label: "Year (oldest)" },
  { value: "latest-update", label: "Recently updated" },
] as const;

export type LibrarySort = (typeof SORT_OPTIONS)[number]["value"];
export type LibraryStatusFilter = "all" | ReadingStatus;
export type LibraryLayout = "grid" | "list";

export interface LibraryViewState {
  status: LibraryStatusFilter;
  genre: string | null;
  category: string | null;
  q: string;
  sort: LibrarySort;
  view: LibraryLayout;
}

export const DEFAULT_LIBRARY_VIEW: LibraryViewState = {
  status: "all",
  genre: null,
  category: null,
  q: "",
  sort: "recently-added",
  view: "grid",
};

const STATUS_VALUES: readonly string[] = READING_STATUSES.map((s) => s.value);
const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((s) => s.value);

function oneOf<T extends string>(value: string | null, allowed: readonly string[], fallback: T): T {
  return value !== null && allowed.includes(value) ? (value as T) : fallback;
}

export function parseLibraryView(params: { get(name: string): string | null }): LibraryViewState {
  return {
    status: oneOf(params.get("status"), STATUS_VALUES, DEFAULT_LIBRARY_VIEW.status),
    genre: params.get("genre") || null,
    category: params.get("category") || null,
    q: params.get("q") ?? "",
    sort: oneOf(params.get("sort"), SORT_VALUES, DEFAULT_LIBRARY_VIEW.sort),
    view: oneOf(params.get("view"), ["grid", "list"], DEFAULT_LIBRARY_VIEW.view),
  };
}

/** Serializes only non-default values, so a pristine shelf keeps a clean URL. */
export function libraryViewQuery(state: LibraryViewState): string {
  const params = new URLSearchParams();
  if (state.status !== DEFAULT_LIBRARY_VIEW.status) params.set("status", state.status);
  if (state.genre) params.set("genre", state.genre);
  if (state.category) params.set("category", state.category);
  if (state.q) params.set("q", state.q);
  if (state.sort !== DEFAULT_LIBRARY_VIEW.sort) params.set("sort", state.sort);
  if (state.view !== DEFAULT_LIBRARY_VIEW.view) params.set("view", state.view);
  return params.toString();
}

export function hasActiveFilters(state: LibraryViewState): boolean {
  return state.status !== "all" || state.genre !== null || state.category !== null || state.q.trim() !== "";
}

function timestamp(value: string | null): number {
  return Date.parse(value ?? "");
}

function compare(sort: LibrarySort, a: SavedManga, b: SavedManga): number {
  switch (sort) {
    case "title-az":
      return a.title.localeCompare(b.title);
    case "highest-rated":
      return (b.rating ?? -1) - (a.rating ?? -1);
    case "year-newest":
    case "year-oldest": {
      const left = timestamp(a.publishedFrom);
      const right = timestamp(b.publishedFrom);
      if (Number.isNaN(left)) return Number.isNaN(right) ? 0 : 1;
      if (Number.isNaN(right)) return -1;
      return sort === "year-newest" ? right - left : left - right;
    }
    case "latest-update":
      return timestamp(b.updatedAt) - timestamp(a.updatedAt);
    case "recently-added":
    default:
      return timestamp(b.createdAt) - timestamp(a.createdAt);
  }
}

export function applyLibraryView(manga: readonly SavedManga[], state: LibraryViewState): SavedManga[] {
  const query = state.q.trim().toLowerCase();
  return manga
    .filter((m) => state.status === "all" || m.readingStatus === state.status)
    .filter((m) => !state.genre || parseList(m.genres).includes(state.genre))
    .filter((m) => !state.category || m.categories.some((c) => c.name === state.category))
    .filter((m) => !query || m.title.toLowerCase().includes(query))
    .sort((a, b) => compare(state.sort, a, b));
}

export interface LibraryFacets {
  statusCounts: Record<LibraryStatusFilter, number>;
  genres: { name: string; count: number }[];
  categories: { name: string; color: string; count: number }[];
}

export function libraryFacets(manga: readonly SavedManga[]): LibraryFacets {
  const statusCounts: Record<LibraryStatusFilter, number> = { all: manga.length, reading: 0, planning: 0, completed: 0 };
  const genres = new Map<string, number>();
  const categories = new Map<string, { color: string; count: number }>();

  for (const item of manga) {
    if (item.readingStatus in statusCounts) statusCounts[item.readingStatus as ReadingStatus] += 1;
    for (const genre of parseList(item.genres)) genres.set(genre, (genres.get(genre) ?? 0) + 1);
    for (const { name, color } of item.categories) {
      const entry = categories.get(name);
      categories.set(name, { color, count: (entry?.count ?? 0) + 1 });
    }
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return {
    statusCounts,
    genres: [...genres].map(([name, count]) => ({ name, count })).sort(byName),
    categories: [...categories].map(([name, value]) => ({ name, ...value })).sort(byName),
  };
}

// The last library query, so the detail page's Back link returns to the same
// filtered shelf even after a full reload (browser Back already works via
// the URL itself).
const RETURN_KEY = "mangamatch:library-query";

export function rememberLibraryQuery(query: string): void {
  try {
    window.sessionStorage.setItem(RETURN_KEY, query);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

export function rememberedLibraryHref(): string {
  try {
    const query = window.sessionStorage.getItem(RETURN_KEY);
    return query ? `/library?${query}` : "/library";
  } catch {
    return "/library";
  }
}
