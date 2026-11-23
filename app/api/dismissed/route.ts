// GET    /api/dismissed  -> titles this session asked never to see again
// POST   /api/dismissed  -> { anilistId, title? } dismiss (idempotent)
// DELETE /api/dismissed  -> { anilistId } undo a dismissal
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import { MAX_TITLE_LENGTH, parseId, parseString, readJsonBody } from "@/lib/validation";

/** Strict JSON number id (numeric strings are not accepted from a JSON body). */
function readAnilistId(body: Record<string, unknown>): number | null {
  return typeof body.anilistId === "number" ? parseId(body.anilistId) : null;
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId(req);
    const dismissed = await prisma.dismissedManga.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: { anilistId: true, title: true, createdAt: true },
    });
    return NextResponse.json({ dismissed });
  } catch (err) {
    return serverError(err, "Failed to load dismissed titles");
  }
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");

  const anilistId = readAnilistId(body);
  if (!anilistId) return badRequest("'anilistId' must be a positive integer");

  let title: string | null = null;
  if (body.title !== undefined && body.title !== null) {
    if (typeof body.title !== "string" || body.title.length > MAX_TITLE_LENGTH) {
      return badRequest(`'title' must be a string of at most ${MAX_TITLE_LENGTH} characters`);
    }
    title = parseString(body.title, MAX_TITLE_LENGTH);
  }

  try {
    const sessionId = await getSessionId(req);
    await prisma.dismissedManga.upsert({
      where: { sessionId_anilistId: { sessionId, anilistId } },
      update: {},
      create: { sessionId, anilistId, title },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, "Failed to dismiss title");
  }
}

export async function DELETE(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");

  const anilistId = readAnilistId(body);
  if (!anilistId) return badRequest("'anilistId' must be a positive integer");

  try {
    const sessionId = await getSessionId(req);
    await prisma.dismissedManga.deleteMany({ where: { sessionId, anilistId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, "Failed to undo dismissal");
  }
}
