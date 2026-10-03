-- Panels get the same preservation + ChEBI fixative pair experiments already have.
ALTER TABLE "Panel" ADD COLUMN "fixativeId" TEXT,
ADD COLUMN "preservation" "Preservation";

CREATE INDEX "Panel_fixativeId_idx" ON "Panel"("fixativeId");

ALTER TABLE "Panel" ADD CONSTRAINT "Panel_fixativeId_fkey" FOREIGN KEY ("fixativeId") REFERENCES "Fixative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from the legacy enum before it is dropped. Existing split values always win.
INSERT INTO "Fixative" ("id", "label") VALUES
  ('CHEBI:16842', 'formaldehyde'),
  ('CHEBI:752978', 'paraformaldehyde'),
  ('CHEBI:17790', 'methanol'),
  ('CHEBI:15347', 'acetone')
ON CONFLICT ("id") DO NOTHING;

CREATE TEMP TABLE "_fixation_map" ("fixation" TEXT PRIMARY KEY, "preservation" "Preservation", "fixativeId" TEXT);
INSERT INTO "_fixation_map" VALUES
  ('FFPE', 'FFPE', 'CHEBI:16842'),
  ('FRESH_FROZEN', 'FRESH_FROZEN', NULL),
  ('PFA', 'FIXED_FROZEN', 'CHEBI:752978'),
  ('METHANOL', 'FIXED_FROZEN', 'CHEBI:17790'),
  ('ACETONE', 'FIXED_FROZEN', 'CHEBI:15347'),
  ('OTHER', 'OTHER', NULL);

UPDATE "Experiment" e
SET "preservation" = COALESCE(e."preservation", m."preservation"),
    "fixativeId" = COALESCE(e."fixativeId", m."fixativeId")
FROM "_fixation_map" m
WHERE e."fixation"::TEXT = m."fixation";

UPDATE "Panel" p
SET "preservation" = m."preservation",
    "fixativeId" = m."fixativeId"
FROM "_fixation_map" m
WHERE p."fixation"::TEXT = m."fixation";

DROP TABLE "_fixation_map";

ALTER TABLE "Experiment" DROP COLUMN "fixation";

ALTER TABLE "Panel" DROP COLUMN "fixation";

DROP TYPE "Fixation";
