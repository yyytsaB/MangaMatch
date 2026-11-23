CREATE TABLE "StarterLibrary" (
    "sessionId" TEXT NOT NULL PRIMARY KEY
);

INSERT INTO "StarterLibrary" ("sessionId")
SELECT "sessionId" FROM "Manga"
UNION
SELECT "sessionId" FROM "Category";
