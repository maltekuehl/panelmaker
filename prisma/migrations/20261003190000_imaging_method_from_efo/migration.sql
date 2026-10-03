-- Imaging methods become plain EFO terms keyed by their CURIE, like Tissue and Fixative. The local
-- catalog columns (short label, aliases, detection, cyclic, sort order) are dropped.
ALTER TABLE "Experiment" ADD COLUMN "imagingMethodText" TEXT;
ALTER TABLE "Panel" ADD COLUMN "imagingMethodText" TEXT;

ALTER TABLE "ImagingMethod" ADD COLUMN "ancestorIds" TEXT[],
ADD COLUMN "synonyms" TEXT[];

-- Methods without an EFO term keep their name as free text next to the closest EFO term.
UPDATE "Experiment" SET "imagingMethodText" = 'PathoPlex' WHERE "imagingMethodId" = 'pathoplex';
UPDATE "Panel" SET "imagingMethodText" = 'PathoPlex' WHERE "imagingMethodId" = 'pathoplex';

-- The foreign keys cascade on update, so renaming each row to its CURIE repoints every reference.
UPDATE "ImagingMethod" SET "id" = "efoId" WHERE "efoId" IS NOT NULL;

INSERT INTO "ImagingMethod" ("id", "label", "shortLabel", "detection", "aliases", "updatedAt")
VALUES ('EFO:0022989', 'multiplex immunofluorescence imaging assay', 'mIF', 'FLUORESCENCE', '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Experiment" SET "imagingMethodId" = 'EFO:0022989' WHERE "imagingMethodId" = 'pathoplex';
UPDATE "Panel" SET "imagingMethodId" = 'EFO:0022989' WHERE "imagingMethodId" = 'pathoplex';
UPDATE "Experiment" SET "imagingMethodId" = NULL WHERE "imagingMethodId" = 'other';
UPDATE "Panel" SET "imagingMethodId" = NULL WHERE "imagingMethodId" = 'other';
DELETE FROM "ImagingMethod" WHERE "efoId" IS NULL AND "id" IN ('pathoplex', 'other');

-- Synonyms and ancestors are filled from OLS by `npm run setup`.
UPDATE "ImagingMethod" SET "synonyms" = '{}', "ancestorIds" = '{}';
ALTER TABLE "ImagingMethod" ALTER COLUMN "synonyms" SET DEFAULT '{}',
ALTER COLUMN "ancestorIds" SET DEFAULT '{}';

DROP INDEX "ImagingMethod_detection_idx";
DROP INDEX "ImagingMethod_efoId_key";
DROP INDEX "ImagingMethod_sortOrder_idx";

ALTER TABLE "ImagingMethod" DROP COLUMN "aliases",
DROP COLUMN "createdAt",
DROP COLUMN "cyclic",
DROP COLUMN "detection",
DROP COLUMN "efoId",
DROP COLUMN "shortLabel",
DROP COLUMN "sortOrder",
DROP COLUMN "updatedAt";

DROP TYPE "DetectionModality";

CREATE INDEX "ImagingMethod_label_idx" ON "ImagingMethod"("label");
