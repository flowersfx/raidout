-- Row counts + last change marker, used to compare databases before/after a migration.
SELECT 'User' AS tbl, count(*) AS rows FROM "User"
UNION ALL SELECT 'Event', count(*) FROM "Event"
UNION ALL SELECT 'Stage', count(*) FROM "Stage"
UNION ALL SELECT 'Position', count(*) FROM "Position"
UNION ALL SELECT 'Artist', count(*) FROM "Artist"
UNION ALL SELECT '_prisma_migrations', count(*) FROM "_prisma_migrations";

SELECT
  (SELECT max("updatedAt") FROM "Event") AS last_event_update,
  (SELECT max("intakeUpdatedAt") FROM "Artist") AS last_intake_update;
