-- CreateEnum
CREATE TYPE "DetectionModality" AS ENUM ('FLUORESCENCE', 'MASS', 'OTHER');

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "imagingMethodId" TEXT;

-- AlterTable
ALTER TABLE "Panel" ADD COLUMN     "imagingMethodId" TEXT;

-- CreateTable
CREATE TABLE "ImagingMethod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "efoId" TEXT,
    "detection" "DetectionModality" NOT NULL,
    "cyclic" BOOLEAN NOT NULL DEFAULT false,
    "aliases" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImagingMethod_efoId_key" ON "ImagingMethod"("efoId");

-- CreateIndex
CREATE INDEX "ImagingMethod_detection_idx" ON "ImagingMethod"("detection");

-- CreateIndex
CREATE INDEX "ImagingMethod_sortOrder_idx" ON "ImagingMethod"("sortOrder");

-- CreateIndex
CREATE INDEX "Experiment_imagingMethodId_idx" ON "Experiment"("imagingMethodId");

-- CreateIndex
CREATE INDEX "Panel_imagingMethodId_idx" ON "Panel"("imagingMethodId");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_imagingMethodId_fkey" FOREIGN KEY ("imagingMethodId") REFERENCES "ImagingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_imagingMethodId_fkey" FOREIGN KEY ("imagingMethodId") REFERENCES "ImagingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the EFO `spatial proteomics` branch (EFO:0700000, 19 descendants) plus a PathoPlex row with
-- no ontology id and a generic fallback row. Kept in sync with models/imaging-method/data.ts.

INSERT INTO "ImagingMethod" ("id", "label", "efoId", "detection", "cyclic", "aliases", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('pathoplex', 'PathoPlex', NULL, 'FLUORESCENCE'::"DetectionModality", true, ARRAY['PathoPlex'], 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('codex', 'co-detection by indexing assay', 'OBI:0003093', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['CODEX', 'co-detection by indexing'], 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('phenocycler', 'PhenoCycler', 'EFO:0700002', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['PhenoCycler', 'Akoya PhenoCycler'], 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('phenocycler-fusion', 'PhenoCycler-Fusion', 'EFO:0700001', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['PhenoCycler-Fusion', 'PhenoCycler Fusion'], 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('t-cycif', 't-CyCIF', 'EFO:0023019', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['t-CyCIF', 'CyCIF', 'cyclic immunofluorescence'], 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ibex', 'IBEX assay', 'EFO:0022996', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['IBEX', 'IBEX2D', 'Iterative Bleaching Extends Multiplexity'], 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cell-dive', 'Cell DIVE', 'EFO:0022991', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['Cell DIVE', 'CellDIVE'], 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('comet-seqif', 'COMET (seqIF)', 'EFO:0022993', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['COMET', 'seqIF', 'sequential immunofluorescence'], 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('macsima', 'MACSima imaging cyclic staining assay', 'EFO:0023001', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['MACSima', 'MICS', 'MACSima imaging cyclic staining'], 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('4i', 'iterative indirect immunofluorescence imaging', 'EFO:0022990', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['4i', 'iterative indirect immunofluorescence imaging'], 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('milan', 'MILAN', 'EFO:0023002', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['MILAN', 'multiple iterative labeling by antibody neodeposition'], 110, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cellscape', 'CellScape', 'EFO:0022992', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['CellScape', 'ChipCytometry'], 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('immuno-saber', 'Immuno-SABER assay', 'EFO:0022998', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['Immuno-SABER', 'SABER'], 130, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dna-exchange-imaging', 'DNA Exchange Imaging assay', 'EFO:0022995', 'FLUORESCENCE'::"DetectionModality", true, ARRAY['DNA Exchange Imaging', 'DEI', 'Exchange-PAINT'], 140, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('orion', 'Orion RareCyte', 'EFO:0023003', 'FLUORESCENCE'::"DetectionModality", false, ARRAY['Orion', 'Orion RareCyte', 'RareCyte Orion'], 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('phenoimager-ht', 'PhenoImager HT', 'EFO:0023004', 'FLUORESCENCE'::"DetectionModality", false, ARRAY['PhenoImager HT', 'PhenoImager', 'Vectra Polaris'], 160, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('spectraplex', 'SpectraPlex', 'EFO:0023018', 'FLUORESCENCE'::"DetectionModality", false, ARRAY['SpectraPlex'], 170, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('multiplex-immunofluorescence', 'multiplex immunofluorescence imaging assay', 'EFO:0022989', 'FLUORESCENCE'::"DetectionModality", false, ARRAY['mIF', 'multiplex immunofluorescence', 'multiplexed immunofluorescence'], 180, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('imaging-mass-cytometry', 'imaging mass cytometry assay', 'EFO:0022997', 'MASS'::"DetectionModality", false, ARRAY['IMC', 'imaging mass cytometry', 'Hyperion'], 190, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mibi-tof', 'MIBI-TOF', 'EFO:0023000', 'MASS'::"DetectionModality", false, ARRAY['MIBI', 'MIBI-TOF', 'multiplexed ion beam imaging'], 200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('other', 'Other or unspecified', NULL, 'OTHER'::"DetectionModality", false, ARRAY['Other'], 900, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill from the MultiplexMethod enum. The enum column stays for one release so app code that
-- still reads Experiment.method keeps working while it migrates to imagingMethodId.
UPDATE "Experiment"
SET "imagingMethodId" = CASE "method"::text
  WHEN 'PATHOPLEX' THEN 'pathoplex'
  WHEN 'CODEX' THEN 'codex'
  WHEN 'CYCIF' THEN 't-cycif'
  WHEN 'IMC' THEN 'imaging-mass-cytometry'
  WHEN 'MIBI' THEN 'mibi-tof'
  WHEN 'IBEX' THEN 'ibex'
  WHEN 'OTHER' THEN 'other'
END
WHERE "method" IS NOT NULL;
