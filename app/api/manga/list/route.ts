// GET /api/manga/list
// Returns all manga saved in the library for the current session, most recently added first.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serverError } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import { seedStarterLibraryIfEmpty } from "@/lib/starter-data";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId(req);

    // Auto-seed starter pack if this session is brand new
    await seedStarterLibraryIfEmpty(sessionId);

    const manga = await prisma.manga.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      include: { categories: { where: { sessionId } } },
    });

    return NextResponse.json({ manga });
  } catch (err) {
    return serverError(err, "Failed to load library");
  }
}
