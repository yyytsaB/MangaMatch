import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { MangaResult } from "@/lib/anilist";

const findMany = vi.fn();
const findDismissed = vi.fn();
const getCandidatePool = vi.fn();
const getMediaRecommendations = vi.fn();
const rankCandidates = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    manga: { findMany: (a: unknown) => findMany(a) },
    dismissedManga: { findMany: (a: unknown) => findDismissed(a) },
  },
}));
vi.mock("@/lib/anilist", () => ({
  getCandidatePool: (f: unknown) => getCandidatePool(f),
  getMediaRecommendations: (id: number) => getMediaRecommendations(id),
}));
vi.mock("@/lib/gemini", () => ({
  rankCandidates: (c: unknown, f: unknown) => rankCandidates(c, f),
}));

const { POST } = await import("@/app/api/recommend/route");

function manga(overrides: Partial<MangaResult> = {}): MangaResult {
  return {
    anilistId: 1,
    title: "Candidate 1",
    genres: ["Action"],
    coverUrl: "https://img/1.jpg",
    synopsis: "Synopsis 1",
    status: "FINISHED",
    authors: [],
    publishedFrom: null,
    publishedTo: null,
    chapters: 50,
    volumes: null,
    score: 8,
    siteUrl: "https://anilist.co/manga/1",
    ...overrides,
  };
}

function request(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/recommend", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  findMany.mockResolvedValue([]);
  findDismissed.mockResolvedValue([]);
  getCandidatePool.mockResolvedValue([manga()]);
  getMediaRecommendations.mockResolvedValue([]);
  rankCandidates.mockResolvedValue([{ index: 0, reason: "Great fit" }]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const m of [findMany, findDismissed, getCandidatePool, getMediaRecommendations, rankCandidates]) {
    m.mockReset();
  }
});

describe("POST /api/recommend", () => {
  it("returns 400 for malformed JSON", async () => {
    const res = await POST(new NextRequest("http://localhost/api/recommend", {
      method: "POST",
      body: "{",
    }));

    expect(res.status).toBe(400);
    expect(getCandidatePool).not.toHaveBeenCalled();
  });

  it.each([
    { field: "customQuery", value: "x".repeat(5001) },
    { field: "genres", value: Array(51).fill("Action") },
    { field: "excludeAnilistIds", value: Array(501).fill(42) },
    { field: "excludeAnilistIds", value: [0] },
    { field: "baseMangaIds", value: Array(51).fill(3) },
    { field: "baseMangaIds", value: [2_147_483_648] },
    { field: "completionStatus", value: "other" },
    { field: "chapterLength", value: "other" },
    { field: "contentRating", value: "other" },
    { field: "diverge", value: "false" },
    { field: "page", value: 0 },
  ])("rejects invalid $field before querying the library or catalog", async ({ field, value }) => {
    const res = await POST(request({ [field]: value }));

    expect(res.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
    expect(getCandidatePool).not.toHaveBeenCalled();
    expect(rankCandidates).not.toHaveBeenCalled();
  });

  it("maps ranked picks back onto the real candidate data", async () => {
    getCandidatePool.mockResolvedValue([manga({
      authors: ["Author"], publishedFrom: "2020-01-02", publishedTo: "2021-03-04", volumes: 7,
    })]);
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      recommendations: [
        {
          title: "Candidate 1",
          synopsis: "Synopsis 1",
          reason: "Great fit",
          anilistId: 1,
          coverUrl: "https://img/1.jpg",
          genres: ["Action"],
          authors: ["Author"],
          publishedFrom: "2020-01-02",
          publishedTo: "2021-03-04",
          chapters: 50,
          volumes: 7,
          score: 8,
          status: "FINISHED",
          siteUrl: "https://anilist.co/manga/1",
        },
      ],
    });
  });

  it("defaults filters to 'any' when the body is empty", async () => {
    await POST(request());

    expect(getCandidatePool).toHaveBeenCalledWith({
      genres: [],
      completionStatus: "any",
      chapterLength: "any",
      contentRating: "any",
      page: 1,
      hiddenGems: false,
    });
    expect(rankCandidates.mock.calls[0][1]).toEqual({
      genres: [],
      completionStatus: "any",
      chapterLength: "any",
      contentRating: "any",
      baseManga: [],
      diverge: false,
      customQuery: "",
      loved: [],
      disliked: [],
    });
  });

  it("returns an empty synopsis rather than null", async () => {
    getCandidatePool.mockResolvedValue([manga({ synopsis: null })]);

    const res = await POST(request());

    expect((await res.json()).recommendations[0].synopsis).toBe("");
  });

  it("caps the response at 5 recommendations", async () => {
    getCandidatePool.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => manga({ anilistId: i + 1, title: `C${i}` }))
    );
    rankCandidates.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({ index: i, reason: `r${i}` }))
    );

    const res = await POST(request());

    expect((await res.json()).recommendations).toHaveLength(5);
  });

  it("loads base manga from the library and splits stored genres", async () => {
    findMany
      .mockResolvedValueOnce([
        {
          id: 3,
          anilistId: 999,
          title: "Berserk",
          genres: "Action,Drama,",
          synopsis: "Dark fantasy",
        },
      ])
      .mockResolvedValueOnce([{ anilistId: 999, title: "Berserk" }]);

    await POST(request({ baseMangaIds: ["3"] }));

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { id: { in: [3] }, sessionId: "default" },
    });
    expect(rankCandidates.mock.calls[0][1].baseManga).toEqual([
      { title: "Berserk", genres: ["Action", "Drama"], synopsis: "Dark fantasy" },
    ]);
    expect(getMediaRecommendations).toHaveBeenCalledWith(999);
  });

  it("skips the library lookup and community recommendations without base manga", async () => {
    await POST(request());

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(getMediaRecommendations).not.toHaveBeenCalled();
  });

  it("prioritizes community recommendations before truncating a full pool, without duplicating ids", async () => {
    findMany
      .mockResolvedValueOnce([
        { id: 3, anilistId: 999, title: "Berserk", genres: "", synopsis: null },
      ])
      .mockResolvedValueOnce([]);
    getCandidatePool.mockResolvedValue(Array.from({ length: 30 }, (_, index) =>
      manga({ anilistId: index + 1 })
    ));
    getMediaRecommendations.mockResolvedValue([manga({ anilistId: 70 }), manga({ anilistId: 1 })]);

    await POST(request({ baseMangaIds: [3] }));

    const candidates = rankCandidates.mock.calls[0][0];
    const ids = candidates.map((candidate: MangaResult) => candidate.anilistId);
    expect(ids[0]).toBe(70);
    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(25);
  });

  it("excludes library ids even after a rename, but retains distinct manga with the same title", async () => {
    getCandidatePool.mockResolvedValue([
      manga({ anilistId: 1, title: "New title" }),
      manga({ anilistId: 2, title: "Old title" }),
    ]);
    findMany.mockResolvedValue([{ anilistId: 1, title: "Old title" }]);

    await POST(request());

    expect(
      rankCandidates.mock.calls[0][0].map((c: { title: string }) => c.title)
    ).toEqual(["Old title"]);
    expect(findMany).toHaveBeenCalledWith({
      where: { sessionId: "default" },
      select: { anilistId: true, title: true, genres: true, rating: true },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("excludes ids the client has already seen", async () => {
    getCandidatePool.mockResolvedValue([
      manga({ anilistId: 1, title: "Berserk" }),
      manga({ anilistId: 2, title: "Vagabond" }),
    ]);

    await POST(request({ excludeAnilistIds: [2, 2] }));

    expect(
      rankCandidates.mock.calls[0][0].map((c: { title: string }) => c.title)
    ).toEqual(["Berserk"]);
  });

  it.each([
    ["completed", ["FINISHED", null]],
    ["ongoing", ["RELEASING", "HIATUS", null]],
    ["any", ["FINISHED", "RELEASING", "HIATUS", "NOT_YET_RELEASED", null]],
  ] as const)(
    "keeps only statuses compatible with completionStatus=%s",
    async (completionStatus, expected) => {
      getCandidatePool.mockResolvedValue(
        ["FINISHED", "RELEASING", "HIATUS", "NOT_YET_RELEASED", null].map(
          (status, i) => manga({ anilistId: i + 1, status })
        )
      );

      await POST(request({ completionStatus }));

      expect(
        rankCandidates.mock.calls[0][0].map((c: { status: string | null }) => c.status)
      ).toEqual(expected);
    }
  );

  it.each([
    ["short", [99, null]],
    ["medium", [100, 400, null]],
    ["long", [401, null]],
    ["any", [99, 100, 400, 401, null]],
  ] as const)(
    "keeps only chapter counts compatible with chapterLength=%s, never punishing unknowns",
    async (chapterLength, expected) => {
      getCandidatePool.mockResolvedValue(
        [99, 100, 400, 401, null].map((chapters, i) =>
          manga({ anilistId: i + 1, chapters })
        )
      );

      await POST(request({ chapterLength }));

      expect(
        rankCandidates.mock.calls[0][0].map((c: { chapters: number | null }) => c.chapters)
      ).toEqual(expected);
    }
  );

  it("drops adult genres when contentRating is 'safe'", async () => {
    getCandidatePool.mockResolvedValue([
      manga({ anilistId: 1, title: "Safe", genres: ["Action"] }),
      manga({ anilistId: 2, title: "Hentai pick", genres: ["Hentai"] }),
      manga({ anilistId: 3, title: "Ecchi pick", genres: ["Comedy", "Ecchi"] }),
    ]);

    await POST(request({ contentRating: "safe" }));

    expect(
      rankCandidates.mock.calls[0][0].map((c: { title: string }) => c.title)
    ).toEqual(["Safe"]);
  });

  it.each([["any", [2, 1]], ["mature", [1]]] as const)(
    "applies %s to both community and catalog candidates", async (contentRating, expected) => {
      findMany.mockResolvedValueOnce([{ anilistId: 999, title: "Base", genres: "", synopsis: null }]);
      getMediaRecommendations.mockResolvedValue([
        manga({ anilistId: 2 }), manga({ anilistId: 3, genres: ["Hentai", "Ecchi"] }),
      ]);
      getCandidatePool.mockResolvedValue([manga({ anilistId: 1, genres: ["Ecchi"] })]);

      await POST(request({ baseMangaIds: [3], contentRating }));

      expect(rankCandidates.mock.calls[0][0].map((candidate: MangaResult) => candidate.anilistId)).toEqual(expected);
      expect(rankCandidates.mock.calls[0][1]).toMatchObject({ contentRating });
      expect(getCandidatePool).toHaveBeenCalledWith(expect.objectContaining({ contentRating }));
    }
  );

  it("returns an explanatory note instead of calling Gemini when nothing matches", async () => {
    getCandidatePool.mockResolvedValue([manga({ chapters: 500 })]);

    const res = await POST(request({ chapterLength: "short" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      recommendations: [],
      note: "No manga matched these filters. Try loosening completion status or chapter length.",
    });
    expect(rankCandidates).not.toHaveBeenCalled();
  });

  it("forwards diverge and the custom query to the ranker", async () => {
    await POST(request({ diverge: true, customQuery: "no isekai" }));

    expect(rankCandidates.mock.calls[0][1]).toMatchObject({
      diverge: true,
      customQuery: "no isekai",
    });
  });

  describe("taste profile", () => {
    const shelf = [
      { anilistId: 501, title: "Monster", genres: "Mystery, Drama", rating: 10 },
      { anilistId: 502, title: "Pluto", genres: "Sci-Fi", rating: 9 },
      { anilistId: 503, title: "Ok Read", genres: "Action", rating: 7 },
      { anilistId: 504, title: "Unrated", genres: "Action", rating: null },
      { anilistId: 505, title: "Meh", genres: "Comedy", rating: 4 },
      { anilistId: 506, title: "Awful", genres: "Harem, Comedy", rating: 1 },
      { anilistId: 507, title: "Good", genres: "Drama", rating: 8 },
    ];

    it("feeds 8-10 rated titles as loved and 1-4 rated titles as disliked", async () => {
      findMany.mockResolvedValue(shelf);

      await POST(request());

      const { loved, disliked } = rankCandidates.mock.calls[0][1];
      expect(loved).toEqual([
        { title: "Monster", genres: ["Mystery", "Drama"], rating: 10 },
        { title: "Pluto", genres: ["Sci-Fi"], rating: 9 },
        { title: "Good", genres: ["Drama"], rating: 8 },
      ]);
      expect(disliked).toEqual([
        { title: "Awful", genres: ["Harem", "Comedy"], rating: 1 },
        { title: "Meh", genres: ["Comedy"], rating: 4 },
      ]);
    });

    it("caps taste signals so the prompt stays bounded", async () => {
      findMany.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({
        anilistId: 600 + i, title: `T${i}`, genres: "Drama", rating: i % 2 ? 9 : 2,
      })));

      await POST(request());

      const { loved, disliked } = rankCandidates.mock.calls[0][1];
      expect(loved).toHaveLength(8);
      expect(disliked).toHaveLength(5);
    });

    it("pulls community picks for the two favourite titles when no anchor is chosen", async () => {
      findMany.mockResolvedValue(shelf);
      getMediaRecommendations.mockImplementation(async (id: number) =>
        id === 501 ? [manga({ anilistId: 90, genres: ["Mystery"] })] : [manga({ anilistId: 91, genres: ["Sci-Fi"] })]
      );
      getCandidatePool.mockResolvedValue([manga({ anilistId: 1 })]);

      await POST(request());

      expect(getMediaRecommendations.mock.calls.map(([id]) => id)).toEqual([501, 502]);
      expect(rankCandidates.mock.calls[0][0].map((c: MangaResult) => c.anilistId)).toEqual([90, 91, 1]);
    });

    it("keeps favourite-derived picks inside the requested genres", async () => {
      findMany.mockResolvedValue(shelf);
      getMediaRecommendations.mockImplementation(async (id: number) =>
        id === 501 ? [manga({ anilistId: 90, genres: ["Mystery"] })] : [manga({ anilistId: 91, genres: ["Sci-Fi"] })]
      );
      getCandidatePool.mockResolvedValue([manga({ anilistId: 1, genres: ["Mystery"] })]);

      await POST(request({ genres: ["Mystery"] }));

      expect(rankCandidates.mock.calls[0][0].map((c: MangaResult) => c.anilistId)).toEqual([90, 1]);
    });

    it("uses explicit anchors instead of favourites for community picks", async () => {
      findMany
        .mockResolvedValueOnce([{ id: 3, anilistId: 999, title: "Anchor", genres: "", synopsis: null }])
        .mockResolvedValueOnce(shelf);

      await POST(request({ baseMangaIds: [3] }));

      expect(getMediaRecommendations.mock.calls.map(([id]) => id)).toEqual([999]);
    });
  });

  it("still recommends if the dismissed-titles lookup fails (e.g. table not migrated yet)", async () => {
    findDismissed.mockRejectedValue(new Error("no such table: DismissedManga"));

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect((await res.json()).recommendations).toHaveLength(1);
  });

  it("never re-suggests titles this session dismissed", async () => {
    findDismissed.mockResolvedValue([{ anilistId: 2 }]);
    getCandidatePool.mockResolvedValue([manga({ anilistId: 1 }), manga({ anilistId: 2 })]);

    await POST(request());

    expect(findDismissed).toHaveBeenCalledWith({ where: { sessionId: "default" }, select: { anilistId: true } });
    expect(rankCandidates.mock.calls[0][0].map((c: MangaResult) => c.anilistId)).toEqual([1]);
  });

  describe("diverge", () => {
    it("draws from hidden gems without similarity-based community picks", async () => {
      findMany
        .mockResolvedValueOnce([{ id: 3, anilistId: 999, title: "Anchor", genres: "", synopsis: null }])
        .mockResolvedValueOnce([{ anilistId: 501, title: "Monster", genres: "Mystery", rating: 10 }]);

      await POST(request({ diverge: true, baseMangaIds: [3] }));

      expect(getCandidatePool).toHaveBeenCalledWith(expect.objectContaining({ hiddenGems: true }));
      expect(getMediaRecommendations).not.toHaveBeenCalled();
      expect(rankCandidates.mock.calls[0][1].baseManga).toHaveLength(1);
    });

    it("keeps one gem per franchise, choosing among titles that pass the filters", async () => {
      getCandidatePool.mockResolvedValue([
        manga({ anilistId: 1, title: "Umineko When They Cry Episode 8", chapters: 200 }),
        manga({ anilistId: 2, title: "Umineko When They Cry Episode 7", chapters: 40 }),
        manga({ anilistId: 3, title: "Umineko When They Cry Episode 6", chapters: 30 }),
        manga({ anilistId: 4, title: "Medalist", chapters: 50 }),
      ]);

      await POST(request({ diverge: true, chapterLength: "short" }));

      expect(rankCandidates.mock.calls[0][0].map((c: MangaResult) => c.anilistId)).toEqual([2, 4]);
    });

    it("skips gems from franchises already on the shelf", async () => {
      findMany.mockResolvedValue([{ anilistId: 1001, title: "Vagabond", genres: "Action", rating: 9 }]);
      getCandidatePool.mockResolvedValue([
        manga({ anilistId: 1, title: "Vagabond: Saigo no Manga-ten" }),
        manga({ anilistId: 2, title: "Medalist" }),
      ]);

      await POST(request({ diverge: true }));

      expect(rankCandidates.mock.calls[0][0].map((c: MangaResult) => c.title)).toEqual(["Medalist"]);
    });
  });

  it("500s with a plain-language message, keeping vendor errors out of the response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rankCandidates.mockRejectedValue(new Error("Gemini API error: 503 high demand"));

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Couldn’t put your picks together right now. Try again in a moment.",
    });
  });

  it("uses the same message for non-Error failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getCandidatePool.mockRejectedValue("nope");

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Couldn’t put your picks together right now. Try again in a moment.",
    });
  });
});
