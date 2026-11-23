import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseLibraryBackup } from "@/lib/library-backup";
import { getSessionId } from "@/lib/session";
import { readJsonBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");
  if (!Array.isArray(body.library)) {
    return badRequest("Invalid backup format. Expected a JSON object with a 'library' array.");
  }

  const backup = parseLibraryBackup({ ...body, library: body.library });
  if (!backup) {
    return badRequest("Invalid backup data. A backup can contain up to 1,000 manga and 1,000 categories.");
  }

  try {
    const sessionId = await getSessionId(req);
    const { mode, manga, colorsByName } = backup;
    const counts = await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.manga.deleteMany({ where: { sessionId } });
        await tx.category.deleteMany({
          where: { sessionId, name: { notIn: [...colorsByName.keys()] } },
        });
      }

      const categoryLinks = new Map<string, { id: number; sessionId: string }>();
      let createdCategoriesCount = 0;
      for (const [name, color] of colorsByName) {
        const existing = await tx.category.findUnique({
          where: { sessionId_name: { sessionId, name } },
        });
        if (existing) {
          const where = { id: existing.id, sessionId };
          if (color !== undefined && color !== existing.color) {
            await tx.category.update({ where, data: { color } });
          }
          categoryLinks.set(name, where);
        } else {
          const created = await tx.category.create({ data: { sessionId, name, color } });
          categoryLinks.set(name, { id: created.id, sessionId });
          createdCategoriesCount++;
        }
      }

      let importedCount = 0;
      let updatedCount = 0;
      for (const { categoryNames, ...item } of manga) {
        const links = categoryNames.flatMap((name) => categoryLinks.get(name) ?? []);
        const where = { sessionId_anilistId: { sessionId, anilistId: item.anilistId } };
        const existing = await tx.manga.findUnique({ where });
        if (existing) {
          await tx.manga.update({
            where,
            data: {
              title: item.title,
              genres: item.genres ?? undefined,
              coverUrl: item.coverUrl ?? undefined,
              synopsis: item.synopsis ?? undefined,
              publicationStatus: item.publicationStatus ?? undefined,
              readingStatus: item.readingStatus ?? undefined,
              rating: item.rating,
              authors: item.authors ?? undefined,
              publishedFrom: item.publishedFrom ?? undefined,
              publishedTo: item.publishedTo ?? undefined,
              chapters: item.chapters ?? undefined,
              volumes: item.volumes ?? undefined,
              malScore: item.malScore ?? undefined,
              siteUrl: item.siteUrl ?? undefined,
              categories: links.length > 0 ? { set: links } : undefined,
            },
          });
          updatedCount++;
        } else {
          await tx.manga.create({
            data: {
              ...item,
              sessionId,
              genres: item.genres ?? "",
              authors: item.authors ?? "",
              readingStatus: item.readingStatus ?? "planning",
              categories: { connect: links },
            },
          });
          importedCount++;
        }
      }

      return { importedCount, updatedCount, createdCategoriesCount };
    });

    return NextResponse.json({
      success: true,
      mode,
      ...counts,
      totalProcessed: counts.importedCount + counts.updatedCount,
    });
  } catch (error) {
    return serverError(error, "Failed to process backup file. Please check file structure.");
  }
}
