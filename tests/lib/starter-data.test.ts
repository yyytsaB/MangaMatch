import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  initialized: new Set<string>(),
  manga: new Map<string, Set<number>>(),
  categoryUpsert: vi.fn(),
  mangaCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const prisma = {
    starterLibrary: {
      findUnique: async ({ where }: { where: { sessionId: string } }) =>
        state.initialized.has(where.sessionId) ? where : null,
      create: async ({ data }: { data: { sessionId: string } }) => {
        if (state.initialized.has(data.sessionId)) throw Object.assign(new Error("Duplicate session"), { code: "P2002" });
        state.initialized.add(data.sessionId);
        return data;
      },
    },
    manga: {
      count: async ({ where }: { where: { sessionId: string } }) => state.manga.get(where.sessionId)?.size ?? 0,
      create: state.mangaCreate,
    },
    category: { upsert: state.categoryUpsert },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
  };
  return { prisma };
});

import { parseList } from "@/lib/manga";
import { seedStarterLibraryIfEmpty, STARTER_MANGA } from "@/lib/starter-data";

beforeEach(() => {
  state.initialized.clear();
  state.manga.clear();
  state.categoryUpsert.mockReset().mockResolvedValue({ id: 1 });
  state.mangaCreate.mockReset().mockImplementation(async ({ data }) => {
    const titles = state.manga.get(data.sessionId) ?? new Set();
    if (titles.has(data.anilistId)) throw new Error("Duplicate manga");
    titles.add(data.anilistId);
    state.manga.set(data.sessionId, titles);
  });
});

describe("starter libraries", () => {
  it("trims list items including legacy whitespace and drops blank items", () => {
    expect(parseList("Action, Fantasy, ,Drama,")).toEqual(["Action", "Fantasy", "Drama"]);
  });

  it("provides canonical lists and dates for every starter manga", () => {
    for (const manga of STARTER_MANGA) {
      expect(manga.genres).not.toMatch(/,\s/);
      expect(manga.authors).not.toMatch(/,\s/);
      expect(manga.publishedFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (manga.publishedTo !== null) expect(manga.publishedTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("does not resurrect a starter library after all titles are deleted", async () => {
    await seedStarterLibraryIfEmpty("reader-a");
    expect(state.manga.get("reader-a")?.size).toBe(STARTER_MANGA.length);
    state.manga.delete("reader-a");

    await seedStarterLibraryIfEmpty("reader-a");

    expect(state.manga.get("reader-a")?.size ?? 0).toBe(0);
    expect(state.mangaCreate).toHaveBeenCalledTimes(STARTER_MANGA.length);
  });

  it("concurrent first visits seed a session only once without errors", async () => {
    await Promise.all([
      seedStarterLibraryIfEmpty("reader-a"),
      seedStarterLibraryIfEmpty("reader-a"),
      seedStarterLibraryIfEmpty("reader-b"),
    ]);

    expect(state.manga.get("reader-a")?.size).toBe(STARTER_MANGA.length);
    expect(state.manga.get("reader-b")?.size).toBe(STARTER_MANGA.length);
    expect(state.mangaCreate).toHaveBeenCalledTimes(STARTER_MANGA.length * 2);
  });
});
