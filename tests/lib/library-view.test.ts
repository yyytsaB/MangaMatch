import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_VIEW,
  applyLibraryView,
  hasActiveFilters,
  libraryFacets,
  libraryViewQuery,
  parseLibraryView,
} from "@/lib/library-view";
import type { SavedManga } from "@/lib/types";

function manga(overrides: Partial<SavedManga> & { id: number }): SavedManga {
  return {
    anilistId: overrides.id,
    title: `Manga ${overrides.id}`,
    genres: "Drama",
    coverUrl: null,
    synopsis: null,
    publicationStatus: null,
    readingStatus: "planning",
    rating: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    publishedFrom: null,
    categories: [],
    siteUrl: null,
    ...overrides,
  };
}

describe("parseLibraryView", () => {
  it("returns defaults for an empty query", () => {
    expect(parseLibraryView(new URLSearchParams())).toEqual(DEFAULT_LIBRARY_VIEW);
  });

  it("reads every supported filter from the URL", () => {
    const view = parseLibraryView(new URLSearchParams(
      "status=reading&genre=Action&category=Masterpiece&q=%20solo%20&sort=title-az&view=list"
    ));
    expect(view).toEqual({
      status: "reading", genre: "Action", category: "Masterpiece",
      q: " solo ", sort: "title-az", view: "list",
    });
  });

  it("falls back to defaults for unknown or malformed values", () => {
    const view = parseLibraryView(new URLSearchParams(
      "status=dropped&sort=random&view=table&genre=&category="
    ));
    expect(view).toEqual(DEFAULT_LIBRARY_VIEW);
  });
});

describe("libraryViewQuery", () => {
  it("omits defaults so a pristine library keeps a clean URL", () => {
    expect(libraryViewQuery(DEFAULT_LIBRARY_VIEW)).toBe("");
  });

  it("round-trips non-default state through the URL", () => {
    const state = {
      ...DEFAULT_LIBRARY_VIEW, status: "completed" as const, genre: "Slice of Life",
      category: "Peak & Mainstream", q: "one", sort: "year-oldest" as const, view: "list" as const,
    };
    expect(parseLibraryView(new URLSearchParams(libraryViewQuery(state)))).toEqual(state);
  });
});

describe("applyLibraryView", () => {
  const shelf = [
    manga({ id: 1, title: "Vinland Saga", genres: "Action, Drama", readingStatus: "reading", rating: 9,
      categories: [{ id: 5, name: "Masterpiece", color: "#F472B6" }], createdAt: "2020-01-03T00:00:00.000Z" }),
    manga({ id: 2, title: "Blue Period", genres: "Drama", readingStatus: "completed", rating: 7,
      createdAt: "2020-01-02T00:00:00.000Z" }),
    manga({ id: 3, title: "Ajin", genres: "Action,Horror", readingStatus: "reading", rating: null,
      createdAt: "2020-01-01T00:00:00.000Z" }),
  ];
  const ids = (list: SavedManga[]) => list.map((item) => item.id);

  it("filters by status, genre (trimmed), category name, and a case-insensitive title query", () => {
    expect(ids(applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, status: "reading" }))).toEqual([1, 3]);
    expect(ids(applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, genre: "Drama" }))).toEqual([1, 2]);
    expect(ids(applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, category: "Masterpiece" }))).toEqual([1]);
    expect(ids(applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, q: "  SAGA " }))).toEqual([1]);
  });

  it("sorts by title, rating (unrated last), and recency", () => {
    expect(ids(applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, sort: "title-az" }))).toEqual([3, 2, 1]);
    expect(ids(applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, sort: "highest-rated" }))).toEqual([1, 2, 3]);
    expect(ids(applyLibraryView(shelf, DEFAULT_LIBRARY_VIEW))).toEqual([1, 2, 3]);
  });

  it.each([["year-newest", [2, 1, 3]], ["year-oldest", [1, 2, 3]]] as const)(
    "sorts mixed-format dates for %s and puts unknown dates last", (sort, expected) => {
      const dated = [
        manga({ id: 1, publishedFrom: "December 31, 1999" }),
        manga({ id: 2, publishedFrom: "2000-01-01" }),
        manga({ id: 3, publishedFrom: "Unknown" }),
      ];
      expect(ids(applyLibraryView(dated, { ...DEFAULT_LIBRARY_VIEW, sort }))).toEqual(expected);
    }
  );

  it("does not mutate the input list", () => {
    const copy = [...shelf];
    applyLibraryView(shelf, { ...DEFAULT_LIBRARY_VIEW, sort: "title-az" });
    expect(shelf).toEqual(copy);
  });
});

describe("hasActiveFilters", () => {
  it("ignores sort and view, which are not filters", () => {
    expect(hasActiveFilters({ ...DEFAULT_LIBRARY_VIEW, sort: "title-az", view: "list" })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_LIBRARY_VIEW, q: "   " })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_LIBRARY_VIEW, genre: "Drama" })).toBe(true);
  });
});

describe("libraryFacets", () => {
  it("counts statuses, trimmed genres, and categories with their stored colors", () => {
    const facets = libraryFacets([
      manga({ id: 1, genres: "Action, Drama", readingStatus: "reading",
        categories: [{ id: 5, name: "Masterpiece", color: "#F472B6" }] }),
      manga({ id: 2, genres: "Drama", readingStatus: "completed",
        categories: [{ id: 5, name: "Masterpiece", color: "#F472B6" }] }),
    ]);

    expect(facets.statusCounts).toEqual({ all: 2, reading: 1, planning: 0, completed: 1 });
    expect(facets.genres).toEqual([{ name: "Action", count: 1 }, { name: "Drama", count: 2 }]);
    expect(facets.categories).toEqual([{ name: "Masterpiece", color: "#F472B6", count: 2 }]);
  });
});
