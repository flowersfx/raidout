-- Migration: add Stage model, move stage config off Event, add stageId to Position

-- Step 1: Create Stage table
CREATE TABLE "Stage" (
    "id"          TEXT NOT NULL,
    "eventId"     TEXT NOT NULL,
    "name"        TEXT NOT NULL DEFAULT 'Stage',
    "stageWidth"  INTEGER NOT NULL DEFAULT 800,
    "stageDepth"  INTEGER NOT NULL DEFAULT 400,
    "fohPosition" TEXT NOT NULL DEFAULT 'bottom',
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- Step 2: Insert one Stage per Event, copying the event's current stage config
INSERT INTO "Stage" ("id", "eventId", "name", "stageWidth", "stageDepth", "fohPosition", "sortOrder")
SELECT
    gen_random_uuid()::text,
    "id",
    "stageName",
    "stageWidth",
    "stageDepth",
    "fohPosition",
    0
FROM "Event";

-- Step 3: Add stageId to Position (nullable first so we can backfill)
ALTER TABLE "Position" ADD COLUMN "stageId" TEXT;

-- Step 4: Populate stageId from the stage we just created for each event
UPDATE "Position" p
SET "stageId" = s."id"
FROM "Stage" s
WHERE s."eventId" = p."eventId";

-- Step 5: Now enforce NOT NULL
ALTER TABLE "Position" ALTER COLUMN "stageId" SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Position" ADD CONSTRAINT "Position_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Drop old stage config columns from Event
ALTER TABLE "Event" DROP COLUMN "stageWidth";
ALTER TABLE "Event" DROP COLUMN "stageDepth";
ALTER TABLE "Event" DROP COLUMN "stageName";
ALTER TABLE "Event" DROP COLUMN "fohPosition";
