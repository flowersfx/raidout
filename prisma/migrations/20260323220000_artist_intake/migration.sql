-- Artist: add soundcheckMinLength, intakeToken (with backfill), intakeUpdatedAt
ALTER TABLE "Artist" ADD COLUMN "soundcheckMinLength" TEXT;
ALTER TABLE "Artist" ADD COLUMN "intakeToken" TEXT;
ALTER TABLE "Artist" ADD COLUMN "intakeUpdatedAt" TIMESTAMP(3);

-- Backfill intakeToken for existing rows before enforcing NOT NULL
UPDATE "Artist" SET "intakeToken" = gen_random_uuid()::text WHERE "intakeToken" IS NULL;

ALTER TABLE "Artist" ALTER COLUMN "intakeToken" SET NOT NULL;
CREATE UNIQUE INDEX "Artist_intakeToken_key" ON "Artist"("intakeToken");

-- Event: add artistsLastReviewedAt
ALTER TABLE "Event" ADD COLUMN "artistsLastReviewedAt" TIMESTAMP(3);
