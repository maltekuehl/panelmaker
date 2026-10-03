-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN "sourceId" TEXT;

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "license" TEXT,
    "attribution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Experiment_sourceId_idx" ON "Experiment"("sourceId");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Imported IBEX experiments carried the dataset attribution in `citation`, where it read as a publication.
INSERT INTO "DataSource" ("id", "name", "url", "license", "attribution", "updatedAt")
SELECT
  'ibex-knowledge-base',
  'IBEX Knowledge-Base',
  'https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base',
  'CC BY 4.0',
  'IBEX Imaging Community. Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base, reagent_resources.csv. Licensed CC BY 4.0.',
  CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 FROM "Experiment"
  WHERE "citation" LIKE 'IBEX Imaging Community. Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base%'
);

UPDATE "Experiment"
SET "sourceId" = 'ibex-knowledge-base', "citation" = NULL
WHERE "citation" LIKE 'IBEX Imaging Community. Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base%';
