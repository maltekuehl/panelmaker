-- Splits the legacy `Experiment.fixation` enum into the preservation state and the fixative
-- chemistry. `fixation` is left in place: browse filters, evidence roll-ups and the chat tools still
-- read it, and `Panel.fixation` still uses the same enum type.
--
-- FFPE and FRESH_FROZEN name a preservation state, so they map straight across. PFA, ACETONE and
-- METHANOL name only the fixative: the old enum never recorded whether the block was embedded,
-- frozen or a cryosection, so `preservation` stays NULL rather than asserting one, and the value is
-- kept verbatim in `preservationText` so nothing is lost. OTHER carries no chemistry at all.

INSERT INTO "Fixative" ("id", "label") VALUES
  ('CHEBI:16842', 'formaldehyde'),
  ('CHEBI:752978', 'paraformaldehyde'),
  ('CHEBI:17790', 'methanol'),
  ('CHEBI:15347', 'acetone'),
  ('CHEBI:64276', 'glutaraldehyde')
ON CONFLICT ("id") DO NOTHING;

UPDATE "Experiment"
SET "preservation" = 'FFPE',
    "fixativeId" = COALESCE("fixativeId", 'CHEBI:16842')
WHERE "fixation" = 'FFPE' AND "preservation" IS NULL;

UPDATE "Experiment"
SET "preservation" = 'FRESH_FROZEN'
WHERE "fixation" = 'FRESH_FROZEN' AND "preservation" IS NULL;

UPDATE "Experiment"
SET "fixativeId" = COALESCE("fixativeId", 'CHEBI:752978'),
    "preservationText" = COALESCE("preservationText", 'PFA fixed')
WHERE "fixation" = 'PFA' AND "preservation" IS NULL;

UPDATE "Experiment"
SET "fixativeId" = COALESCE("fixativeId", 'CHEBI:15347'),
    "preservationText" = COALESCE("preservationText", 'Acetone fixed')
WHERE "fixation" = 'ACETONE' AND "preservation" IS NULL;

UPDATE "Experiment"
SET "fixativeId" = COALESCE("fixativeId", 'CHEBI:17790'),
    "preservationText" = COALESCE("preservationText", 'Methanol fixed')
WHERE "fixation" = 'METHANOL' AND "preservation" IS NULL;

UPDATE "Experiment"
SET "preservation" = 'OTHER'
WHERE "fixation" = 'OTHER' AND "preservation" IS NULL;
