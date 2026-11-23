// POST /api/recommend
// Pulls a real candidate pool from AniList, then asks Gemini to rank the best 5
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
  matchesContentRating,
} from "@/lib/filters";
import { getSessionId } from "@/lib/session";
import {
  MAX_TEXT_LENGTH,
  MAX_EXCLUDED_ANILIST_IDS,
  parseId,
  parseIntegerArray,
  parseStringArray,
  readJsonBody,
} from "@/lib/validation";

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
  const excludeAnilistIds = parseIntegerArray(body.excludeAnilistIds, MAX_EXCLUDED_ANILIST_IDS);
  const baseMangaIds = parseIntegerArray(body.baseMangaIds);
  const page = body.page === undefined ? 1 : parseId(body.page);

  if (!genres || !excludeAnilistIds || !baseMangaIds || !page ||
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

    const libraryManga = await prisma.manga.findMany({
      where: { sessionId },
      select: { anilistId: true },
    });
    const seen = new Set([...excludeAnilistIds, ...libraryManga.map((manga) => manga.anilistId)]);

    const [rawPool, communityLists] = await Promise.all([
      getCandidatePool({ genres, completionStatus, chapterLength, contentRating, page }),
      Promise.all(baseMangaAnilistIds.slice(0, 2).map((id) => getMediaRecommendations(id))),
    ]);

    const topPool: MangaResult[] = [];
    for (const manga of [...communityLists.flat(), ...rawPool]) {
      if (seen.has(manga.anilistId) ||
          !matchesCompletionStatus(manga.status, completionStatus) ||
          !matchesChapterLength(manga.chapters, chapterLength) ||
          !matchesContentRating(manga.genres, contentRating)) continue;
      seen.add(manga.anilistId);
      topPool.push(manga);
      if (topPool.length === 25) break;
    }

    if (topPool.length === 0) {
      return NextResponse.json({
        recommendations: [],
        note:
          page > 1
            ? "You've seen everything that matches these filters. Try loosening them or starting over."
            : "No manga matched these filters. Try loosening completion status or chapter length.",
      });
    }

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
      contentRating,
      baseManga,
      diverge,
      customQuery,
    });

    const recommendations = picks.slice(0, 5).map((pick) => {
      const match = topPool[pick.index];
      return {
        ...match,
        synopsis: match.synopsis ?? "",
        reason: pick.reason,
      };
    });
 

    return NextResponse.json({ recommendations });
  } catch (err) {
    return serverError(err, "Failed to generate recommendations", true);
  }
}
