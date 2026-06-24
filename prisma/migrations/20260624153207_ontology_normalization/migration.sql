-- CreateEnum
CREATE TYPE "AntigenRetrieval" AS ENUM ('CITRATE_PH6', 'TRIS_EDTA_PH9', 'ENZYMATIC', 'NONE');

-- DropForeignKey
ALTER TABLE "CellTypeStructure" DROP CONSTRAINT "CellTypeStructure_cellTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CellTypeStructure" DROP CONSTRAINT "CellTypeStructure_structureId_fkey";

-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_cellTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_structureId_fkey";

-- DropIndex
DROP INDEX "ExperimentalReport_cellTypeId_idx";

-- DropIndex
DROP INDEX "ExperimentalReport_structureId_idx";

-- AlterTable
ALTER TABLE "Antibody" DROP COLUMN "sourceOrganism",
ADD COLUMN     "hostTaxonId" TEXT;

-- AlterTable
ALTER TABLE "ExperimentalReport" DROP COLUMN "cellTypeId",
DROP COLUMN "species",
DROP COLUMN "structureId",
DROP COLUMN "tissueType",
ADD COLUMN     "incubation" TEXT,
ADD COLUMN     "speciesId" TEXT,
ADD COLUMN     "subcellularId" TEXT,
ADD COLUMN     "tissueId" TEXT,
DROP COLUMN "antigenRetrieval",
ADD COLUMN     "antigenRetrieval" "AntigenRetrieval";

-- AlterTable
ALTER TABLE "Panel" DROP COLUMN "species",
ADD COLUMN     "speciesId" TEXT;

-- DropTable
DROP TABLE "AnatomicalStructure";

-- DropTable
DROP TABLE "CellTypeStructure";

-- DropEnum
DROP TYPE "SourceOrganism";

-- DropEnum
DROP TYPE "Species";

-- CreateTable
CREATE TABLE "Taxon" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Taxon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tissue" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "partOfIds" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "Tissue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellularComponent" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "partOfIds" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "CellularComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCellType" (
    "reportId" TEXT NOT NULL,
    "cellTypeId" TEXT NOT NULL,

    CONSTRAINT "ReportCellType_pkey" PRIMARY KEY ("reportId","cellTypeId")
);

-- CreateIndex
CREATE INDEX "Taxon_label_idx" ON "Taxon"("label");

-- CreateIndex
CREATE INDEX "Tissue_label_idx" ON "Tissue"("label");

-- CreateIndex
CREATE INDEX "CellularComponent_label_idx" ON "CellularComponent"("label");

-- CreateIndex
CREATE INDEX "ReportCellType_cellTypeId_idx" ON "ReportCellType"("cellTypeId");

-- CreateIndex
CREATE INDEX "Antibody_hostTaxonId_idx" ON "Antibody"("hostTaxonId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_speciesId_idx" ON "ExperimentalReport"("speciesId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_tissueId_idx" ON "ExperimentalReport"("tissueId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_subcellularId_idx" ON "ExperimentalReport"("subcellularId");

-- CreateIndex
CREATE INDEX "Panel_speciesId_idx" ON "Panel"("speciesId");

-- AddForeignKey
ALTER TABLE "ReportCellType" ADD CONSTRAINT "ReportCellType_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCellType" ADD CONSTRAINT "ReportCellType_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antibody" ADD CONSTRAINT "Antibody_hostTaxonId_fkey" FOREIGN KEY ("hostTaxonId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_tissueId_fkey" FOREIGN KEY ("tissueId") REFERENCES "Tissue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_subcellularId_fkey" FOREIGN KEY ("subcellularId") REFERENCES "CellularComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

