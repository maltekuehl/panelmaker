-- Panels carry an imaging method now. `Panel.imagingMethodId` already existed but nothing ever wrote
-- it, so every row is NULL. The two seeded demo panels name their method in their title; any other
-- panel is a user draft and is left NULL until its owner picks one.
UPDATE "Panel"
SET "imagingMethodId" = 'codex'
WHERE "imagingMethodId" IS NULL
  AND "name" = 'Immune Cell Profiling - Spleen (CODEX)'
  AND EXISTS (SELECT 1 FROM "ImagingMethod" WHERE "id" = 'codex');

UPDATE "Panel"
SET "imagingMethodId" = 't-cycif'
WHERE "imagingMethodId" IS NULL
  AND "name" = 'Tumor Microenvironment - CyCIF Core Panel'
  AND EXISTS (SELECT 1 FROM "ImagingMethod" WHERE "id" = 't-cycif');
