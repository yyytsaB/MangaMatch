-- CreateTable
CREATE TABLE "DismissedManga" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DismissedManga_sessionId_anilistId_key" ON "DismissedManga"("sessionId", "anilistId");
