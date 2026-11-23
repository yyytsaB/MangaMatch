-- Preserve existing libraries in the default session.
ALTER TABLE "Manga" ADD COLUMN "sessionId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Category" ADD COLUMN "sessionId" TEXT NOT NULL DEFAULT 'default';

-- The earlier column rename kept the original index name.
DROP INDEX "Manga_malId_key";
DROP INDEX "Category_name_key";

CREATE UNIQUE INDEX "Manga_sessionId_anilistId_key" ON "Manga"("sessionId", "anilistId");
CREATE INDEX "Manga_sessionId_idx" ON "Manga"("sessionId");
CREATE UNIQUE INDEX "Category_sessionId_name_key" ON "Category"("sessionId", "name");
CREATE INDEX "Category_sessionId_idx" ON "Category"("sessionId");
