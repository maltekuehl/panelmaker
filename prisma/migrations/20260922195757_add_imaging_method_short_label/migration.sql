-- The compact display form ("CODEX", "IMC") used by table cells, facets and badges. `label` stays the
-- verbose ontology term. Backfilled from the seed catalog; any row not in it falls back to its first
-- alias, then to its label, so the column can be made NOT NULL without a default.

-- AlterTable
ALTER TABLE "ImagingMethod" ADD COLUMN "shortLabel" TEXT NOT NULL DEFAULT '';

-- Backfill
UPDATE "ImagingMethod" AS m
SET "shortLabel" = v."shortLabel"
FROM (
  VALUES
    ('pathoplex', 'PathoPlex'),
    ('codex', 'CODEX'),
    ('phenocycler', 'PhenoCycler'),
    ('phenocycler-fusion', 'PhenoCycler-Fusion'),
    ('t-cycif', 't-CyCIF'),
    ('ibex', 'IBEX'),
    ('cell-dive', 'Cell DIVE'),
    ('comet-seqif', 'COMET'),
    ('macsima', 'MACSima'),
    ('4i', '4i'),
    ('milan', 'MILAN'),
    ('cellscape', 'CellScape'),
    ('immuno-saber', 'Immuno-SABER'),
    ('dna-exchange-imaging', 'DNA Exchange Imaging'),
    ('orion', 'Orion'),
    ('phenoimager-ht', 'PhenoImager HT'),
    ('spectraplex', 'SpectraPlex'),
    ('multiplex-immunofluorescence', 'mIF'),
    ('imaging-mass-cytometry', 'IMC'),
    ('mibi-tof', 'MIBI-TOF'),
    ('other', 'Other')
) AS v(id, "shortLabel")
WHERE m.id = v.id;

UPDATE "ImagingMethod"
SET "shortLabel" = COALESCE("aliases"[1], "label")
WHERE "shortLabel" = '';

-- AlterTable
ALTER TABLE "ImagingMethod" ALTER COLUMN "shortLabel" DROP DEFAULT;
