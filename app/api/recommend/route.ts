// POST /api/recommend
// Pulls a real candidate pool from AniList (broad, filtered only by
// completion status server-side), then asks Gemini to rank the best 5
// from that real list using genre/chapter-length/base-manga similarity
// as soft preferences.
import { NextRequest, NextResponse } from "next/server";
import { rankCandidates, type CandidateManga } from "@/lib/gemini";
import {
  getCandidatePool,
  getMediaRecommendations,
  type MangaResult,
} from "@/lib/anilist";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api";
import { parseList } from "@/lib/manga";
import {
  CHAPTER_LENGTH_OPTIONS,
  COMPLETION_STATUS_OPTIONS,
  CONTENT_RATING_OPTIONS,
  matchesChapterLength,
  matchesCompletionStatus,
} from "@/lib/filters";
import { getSessionId } from "@/lib/session";
import {
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  parseId,
  parseIntegerArray,
  parseStringArray,
  readJsonBody,
} from "@/lib/validation";

const MAX_EXCLUDED_TITLES = 500;

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");

  const {
    completionStatus = "any",
    chapterLength = "any",
    contentRating = "any",
    diverge = false,
    customQuery = "",
  } = body;
  const genres = parseStringArray(body.genres, 100);
  const excludeTitles = parseStringArray(body.excludeTitles, MAX_TITLE_LENGTH, MAX_EXCLUDED_TITLES);
  const baseMangaIds = parseIntegerArray(body.baseMangaIds);
  const page = body.page === undefined ? 1 : parseId(body.page);

  if (!genres || !excludeTitles || !baseMangaIds || !page ||
      typeof customQuery !== "string" || customQuery.length > MAX_TEXT_LENGTH ||
      typeof diverge !== "boolean" ||
      typeof completionStatus !== "string" || !COMPLETION_STATUS_OPTIONS.some(({ value }) => value === completionStatus) ||
      typeof chapterLength !== "string" || !CHAPTER_LENGTH_OPTIONS.some(({ value }) => value === chapterLength) ||
      typeof contentRating !== "string" || !CONTENT_RATING_OPTIONS.some(({ value }) => value === contentRating)) {
    return badRequest("Invalid recommendation filters");
  }

  try {
    const sessionId = await getSessionId(req);
    let baseManga: { title: string; genres: string[]; synopsis: string | null }[] = [];
    let baseMangaAnilistIds: number[] = [];

    if (baseMangaIds.length > 0) {
      const mangaList = await prisma.manga.findMany({
        where: { id: { in: baseMangaIds }, sessionId },
      });
      baseManga = mangaList.map((manga) => ({
        title: manga.title,
        genres: parseList(manga.genres),
        synopsis: manga.synopsis,
      }));
      baseMangaAnilistIds = mangaList.map((manga) => manga.anilistId);
    }

    // Exclude everything already in the user's session library
    const libraryManga = await prisma.manga.findMany({
      where: { sessionId },
      select: { title: true },
    });
    const excludeTitlesLower = new Set(
      [...excludeTitles, ...libraryManga.map((m) => m.title)].map((t: string) =>
        t.toLowerCase()
      )
    );

    // Candidate pool — one query per selected genre/theme, so genre acts
    // as "any of these"; only completion status is a hard filter.
    const rawPool = await getCandidatePool({
      genres,
      completionStatus,
      chapterLength,
      page,
    });

    let pool: MangaResult[] = [...rawPool];

    // Merge in AniList's own community recommendations for top 2 base manga
    if (baseMangaAnilistIds.length > 0) {
      const targetBaseIds = baseMangaAnilistIds.slice(0, 2);
      const recLists = await Promise.all(
        targetBaseIds.map((id) => getMediaRecommendations(id))
      );
      const seen = new Set(pool.map((m) => m.anilistId));
      for (const list of recLists) {
        for (const m of list) {
          if (!seen.has(m.anilistId)) {
            seen.add(m.anilistId);
            pool.push(m);
          }
        }
      }
    }

    // Lenient pass: only excludes candidates out of range
    pool = pool.filter(
      (m) =>
        matchesCompletionStatus(m.status, completionStatus) &&
        matchesChapterLength(m.chapters, chapterLength)
    );

    // Filter out anything already in the session library or already seen this session
    pool = pool.filter((m) => !excludeTitlesLower.has(m.title.toLowerCase()));

    if (contentRating === "safe") {
      pool = pool.filter(
        (m) => !m.genres.includes("Hentai") && !m.genres.includes("Ecchi")
      );
    }

    if (pool.length === 0) {
      return NextResponse.json({
        recommendations: [],
        note:
          page > 1
            ? "You've seen everything that matches these filters. Try loosening them or starting over."
            : "No manga matched these filters. Try loosening completion status or chapter length.",
      });
    }

    const topPool = pool.slice(0, 25);
    const candidatesForGemini: CandidateManga[] = topPool.map((m) => ({
      anilistId: m.anilistId,
      title: m.title,
      genres: m.genres,
      synopsis: m.synopsis,
      chapters: m.chapters,
      status: m.status,
      score: m.score,
    }));

    const picks = await rankCandidates(candidatesForGemini, {
      genres,
      completionStatus,
      chapterLength,
      baseManga,
      diverge,
      customQuery,
    });

    const recommendations = picks.slice(0, 5).map((pick) => {
      const match = topPool[pick.index];
      return {
        title: match.title,
        synopsis: match.synopsis ?? "",
        reason: pick.reason,
        anilistId: match.anilistId,
        coverUrl: match.coverUrl,
        genres: match.genres,
        chapters: match.chapters,
        status: match.status,
        siteUrl: match.siteUrl,
      };
    });
 

    return NextResponse.json({ recommendations });
  } catch (err) {
    return serverError(err, "Failed to generate recommendations", true);
  }
}
