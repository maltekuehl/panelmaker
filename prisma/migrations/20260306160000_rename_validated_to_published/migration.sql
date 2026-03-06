-- Rename ValidationStatus enum value: VALIDATED → PUBLISHED
-- SQLite has no native enums, so we just update the stored string values.
UPDATE "ExperimentalReport" SET "status" = 'PUBLISHED' WHERE "status" = 'VALIDATED';
