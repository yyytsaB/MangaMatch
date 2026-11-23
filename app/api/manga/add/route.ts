// POST /api/manga/add
// Saves a manga (picked from search results) into the database scoped to current session.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import { parseList, READING_STATUS_VALUES } from "@/lib/manga";
import {
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  parseHttpUrl,
  parseOptionalInteger,
  parseOptionalNumber,
  parseOptionalString,
  parsePublicationDate,
  parseString,
  parseStringArray,
  readJsonBody,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) {
    return badRequest("Invalid JSON body");
  }

  const anilistId = parseOptionalInteger(body.anilistId ?? body.malId);
  const title = parseString(body.title, MAX_TITLE_LENGTH);
  const genres = parseStringArray(body.genres, MAX_TITLE_LENGTH);
  const authors = parseStringArray(body.authors, MAX_TITLE_LENGTH);
  const { readingStatus = "planning" } = body;

  if (!anilistId || !title || !genres || !authors) {
    return badRequest(
      "Invalid or missing fields: anilistId, title, genres, authors"
    );
  }
  if (typeof readingStatus !== "string" || !READING_STATUS_VALUES.includes(readingStatus)) {
    return badRequest("Invalid reading status");
  }

  try {
    const sessionId = await getSessionId(req);

    const manga = await prisma.manga.upsert({
      where: {
        sessionId_anilistId: {
          sessionId,
          anilistId,
        },
      },
      update: body.readingStatus === undefined ? {} : { readingStatus },
      create: {
        sessionId,
        anilistId,
        title,
        genres: parseList(genres.join(",")).join(","),
        coverUrl: parseHttpUrl(body.coverUrl),
        synopsis: parseOptionalString(body.synopsis, MAX_TEXT_LENGTH),
        publicationStatus: parseOptionalString(body.status, MAX_TITLE_LENGTH),
        readingStatus,
        authors: parseList(authors.join(",")).join(",") || null,
        publishedFrom: parsePublicationDate(body.publishedFrom),
        publishedTo: parsePublicationDate(body.publishedTo),
        chapters: parseOptionalInteger(body.chapters),
        volumes: parseOptionalInteger(body.volumes),
        malScore: parseOptionalNumber(body.score),
        siteUrl: parseHttpUrl(body.siteUrl),
      },
    });

    return NextResponse.json({ success: true, manga });
  } catch (err) {
    return serverError(err, "Failed to save manga to library");
  }
}
