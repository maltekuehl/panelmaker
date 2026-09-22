-- Taxon ids move from the local `NCBI:txid9606` form to the `NCBITaxon:9606` CURIE used by
-- SDRF-Proteomics, REMBI, CELLxGENE, HuBMAP OMAP and Cellosaurus.
--
-- Foreign keys are not deferrable here, so the rewrite inserts the new rows first, repoints every
-- child column, and only then deletes the old rows. Referencing columns (verified against
-- pg_constraint): Experiment.speciesId, Antibody.hostTaxonId, Panel.speciesId.

INSERT INTO "Taxon" ("id", "label")
SELECT replace("id", 'NCBI:txid', 'NCBITaxon:'), "label"
FROM "Taxon"
WHERE "id" LIKE 'NCBI:txid%'
ON CONFLICT ("id") DO NOTHING;

UPDATE "Experiment"
SET "speciesId" = replace("speciesId", 'NCBI:txid', 'NCBITaxon:')
WHERE "speciesId" LIKE 'NCBI:txid%';

UPDATE "Antibody"
SET "hostTaxonId" = replace("hostTaxonId", 'NCBI:txid', 'NCBITaxon:')
WHERE "hostTaxonId" LIKE 'NCBI:txid%';

UPDATE "Panel"
SET "speciesId" = replace("speciesId", 'NCBI:txid', 'NCBITaxon:')
WHERE "speciesId" LIKE 'NCBI:txid%';

DELETE FROM "Taxon" WHERE "id" LIKE 'NCBI:txid%';
