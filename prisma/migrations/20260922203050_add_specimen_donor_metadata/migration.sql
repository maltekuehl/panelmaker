-- CreateEnum
CREATE TYPE "Preservation" AS ENUM ('FFPE', 'FRESH_FROZEN', 'FIXED_FROZEN', 'FRESH', 'OTHER');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('TISSUE', 'CELL_LINE', 'PRIMARY_CELL_CULTURE', 'ORGANOID', 'OTHER');

-- CreateEnum
CREATE TYPE "DonorSex" AS ENUM ('MALE', 'FEMALE', 'INTERSEX', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "antigenRetrievalText" TEXT,
ADD COLUMN     "developmentalStageId" TEXT,
ADD COLUMN     "donorAge" TEXT,
ADD COLUMN     "donorSex" "DonorSex",
ADD COLUMN     "fixativeConcentration" TEXT,
ADD COLUMN     "fixativeId" TEXT,
ADD COLUMN     "preservation" "Preservation",
ADD COLUMN     "preservationText" TEXT,
ADD COLUMN     "protocolDoi" TEXT,
ADD COLUMN     "sampleType" "SampleType",
ADD COLUMN     "sectionThicknessUm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Fixative" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Fixative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentalStage" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "DevelopmentalStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fixative_label_idx" ON "Fixative"("label");

-- CreateIndex
CREATE INDEX "DevelopmentalStage_label_idx" ON "DevelopmentalStage"("label");

-- CreateIndex
CREATE INDEX "Experiment_preservation_idx" ON "Experiment"("preservation");

-- CreateIndex
CREATE INDEX "Experiment_fixativeId_idx" ON "Experiment"("fixativeId");

-- CreateIndex
CREATE INDEX "Experiment_developmentalStageId_idx" ON "Experiment"("developmentalStageId");

-- CreateIndex
CREATE INDEX "Experiment_sampleType_idx" ON "Experiment"("sampleType");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_fixativeId_fkey" FOREIGN KEY ("fixativeId") REFERENCES "Fixative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_developmentalStageId_fkey" FOREIGN KEY ("developmentalStageId") REFERENCES "DevelopmentalStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
