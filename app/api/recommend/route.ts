// POST /api/recommend
// Pulls a real candidate pool from AniList, then asks Gemini to rank the best 5
// from that real list using genre/chapter-length/base-manga similarity
// as soft preferences.
import { NextRequest, NextResponse } from "next/server";
import { rankCandidates, type CandidateManga, type TasteSignal } from "@/lib/gemini";
import {
  getCandidatePool,
  getMediaRecommendations,
  type MangaResult,
} from "@/lib/anilist";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api";
import { franchiseKey, parseList } from "@/lib/manga";
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

// Taste signals from the reader's own ratings (Slice 3A).
const LOVED_MIN_RATING = 8;
const DISLIKED_MAX_RATING = 4;
const MAX_LOVED = 8;
const MAX_DISLIKED = 5;
const MAX_FAVOURITE_SEEDS = 2; // community-rec lookups per request

type LibraryRow = { anilistId: number; title: string; genres: string | null; rating: number | null };

function tasteSignals(library: LibraryRow[]) {
  const toSignal = (m: LibraryRow & { rating: number }): TasteSignal => ({
    title: m.title,
    genres: parseList(m.genres),
    rating: m.rating,
  });
  const rated = library.filter((m): m is LibraryRow & { rating: number } => typeof m.rating === "number");
  const loved = rated.filter((m) => m.rating >= LOVED_MIN_RATING).sort((a, b) => b.rating - a.rating);
  const disliked = rated.filter((m) => m.rating <= DISLIKED_MAX_RATING).sort((a, b) => a.rating - b.rating);
  return {
    lovedRows: loved,
    loved: loved.slice(0, MAX_LOVED).map(toSignal),
    disliked: disliked.slice(0, MAX_DISLIKED).map(toSignal),
  };
}

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

    const [libraryManga, dismissed] = await Promise.all([
      prisma.manga.findMany({
        where: { sessionId },
        select: { anilistId: true, title: true, genres: true, rating: true },
        orderBy: { updatedAt: "desc" },
      }),
      // Dismissals improve picks but must never block them (e.g. before
      // the DismissedManga migration reaches a deployment).
      prisma.dismissedManga.findMany({ where: { sessionId }, select: { anilistId: true } }).catch((err: unknown) => {
        console.error("Dismissed titles lookup failed:", err);
        return [] as { anilistId: number }[];
      }),
    ]);
    const library: LibraryRow[] = libraryManga;
    const seen = new Set([
      ...excludeAnilistIds,
      ...library.map((manga) => manga.anilistId),
      ...dismissed.map((entry) => entry.anilistId),
    ]);
    const { lovedRows, loved, disliked } = tasteSignals(library);

    // Similarity seeds: explicit anchors win; otherwise the reader's
    // favourites. Diverge mode skips similarity and digs for hidden gems.
    const favouriteSeeds = baseMangaAnilistIds.length === 0
      ? lovedRows.slice(0, MAX_FAVOURITE_SEEDS).map((m) => m.anilistId)
      : [];
    const [rawPool, anchorLists, favouriteLists] = await Promise.all([
      getCandidatePool({ genres, completionStatus, chapterLength, contentRating, page, hiddenGems: diverge }),
      diverge ? [] : Promise.all(baseMangaAnilistIds.slice(0, 2).map((id) => getMediaRecommendations(id))),
      diverge ? [] : Promise.all(favouriteSeeds.map((id) => getMediaRecommendations(id))),
    ]);
    const inRequestedGenres = (manga: MangaResult) =>
      genres.length === 0 || manga.genres.some((genre) => genres.includes(genre));
    // Diverge: one gem per franchise, and none from franchises already shelved.
    const franchises = new Set(library.map((manga) => franchiseKey(manga.title)));

    const topPool: MangaResult[] = [];
    for (const manga of [...anchorLists.flat(), ...favouriteLists.flat().filter(inRequestedGenres), ...rawPool]) {
      if (seen.has(manga.anilistId) ||
          !matchesCompletionStatus(manga.status, completionStatus) ||
          !matchesChapterLength(manga.chapters, chapterLength) ||
          !matchesContentRating(manga.genres, contentRating)) continue;
      if (diverge) {
        const franchise = franchiseKey(manga.title);
        if (franchises.has(franchise)) continue;
        franchises.add(franchise);
      }
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
      loved,
      disliked,
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
    return serverError(err, "Couldn’t put your picks together right now. Try again in a moment.");
  }
}
