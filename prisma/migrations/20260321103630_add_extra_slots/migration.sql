-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "positionId" TEXT,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "tableMin" TEXT,
    "gearBrings" TEXT NOT NULL DEFAULT '',
    "venueNeeds" TEXT NOT NULL DEFAULT '',
    "routing" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "extraSlots" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Artist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Artist_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Artist" ("endTime", "eventId", "gearBrings", "id", "name", "notes", "positionId", "routing", "sortOrder", "startTime", "tableMin", "venueNeeds") SELECT "endTime", "eventId", "gearBrings", "id", "name", "notes", "positionId", "routing", "sortOrder", "startTime", "tableMin", "venueNeeds" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
