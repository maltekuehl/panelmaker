-- Methods EFO has no term for become their own rows under the closest EFO term instead of a free-text
-- column next to it.
ALTER TABLE "ImagingMethod" ADD COLUMN "parentId" TEXT;

CREATE INDEX "ImagingMethod_parentId_idx" ON "ImagingMethod"("parentId");

ALTER TABLE "ImagingMethod" ADD CONSTRAINT "ImagingMethod_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ImagingMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ImagingMethod" ("id", "label", "parentId")
SELECT 'c74chshigy7movn3yu7l53u4g', 'PathoPlex', 'EFO:0022989'
WHERE EXISTS (SELECT 1 FROM "Experiment" WHERE "imagingMethodText" = 'PathoPlex')
   OR EXISTS (SELECT 1 FROM "Panel" WHERE "imagingMethodText" = 'PathoPlex');

UPDATE "Experiment" SET "imagingMethodId" = 'c74chshigy7movn3yu7l53u4g' WHERE "imagingMethodText" = 'PathoPlex';
UPDATE "Panel" SET "imagingMethodId" = 'c74chshigy7movn3yu7l53u4g' WHERE "imagingMethodText" = 'PathoPlex';

ALTER TABLE "Experiment" DROP COLUMN "imagingMethodText";
ALTER TABLE "Panel" DROP COLUMN "imagingMethodText";

ALTER TABLE "ImagingMethod" DROP COLUMN "ancestorIds",
DROP COLUMN "synonyms";
