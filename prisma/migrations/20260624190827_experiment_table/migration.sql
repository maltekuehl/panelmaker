-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_conditionId_fkey";

-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_speciesId_fkey";

-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_submitterId_fkey";

-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_tissueId_fkey";

-- DropIndex
DROP INDEX "ExperimentalReport_conditionId_idx";

-- DropIndex
DROP INDEX "ExperimentalReport_method_idx";

-- DropIndex
DROP INDEX "ExperimentalReport_speciesId_idx";

-- DropIndex
DROP INDEX "ExperimentalReport_submitterId_idx";

-- DropIndex
DROP INDEX "ExperimentalReport_tissueId_idx";

-- AlterTable
ALTER TABLE "ExperimentalReport" DROP COLUMN "antigenRetrieval",
DROP COLUMN "conditionId",
DROP COLUMN "fixation",
DROP COLUMN "isPublic",
DROP COLUMN "method",
DROP COLUMN "speciesId",
DROP COLUMN "submitterId",
DROP COLUMN "tissueId",
ADD COLUMN     "experimentId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "speciesId" TEXT,
    "tissueId" TEXT,
    "fixation" "Fixation",
    "method" "MultiplexMethod",
    "antigenRetrieval" "AntigenRetrieval",
    "conditionId" TEXT,
    "submitterId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Experiment_speciesId_idx" ON "Experiment"("speciesId");

-- CreateIndex
CREATE INDEX "Experiment_tissueId_idx" ON "Experiment"("tissueId");

-- CreateIndex
CREATE INDEX "Experiment_conditionId_idx" ON "Experiment"("conditionId");

-- CreateIndex
CREATE INDEX "Experiment_submitterId_idx" ON "Experiment"("submitterId");

-- CreateIndex
CREATE INDEX "Experiment_method_idx" ON "Experiment"("method");

-- CreateIndex
CREATE INDEX "Experiment_isPublic_idx" ON "Experiment"("isPublic");

-- CreateIndex
CREATE INDEX "ExperimentalReport_experimentId_idx" ON "ExperimentalReport"("experimentId");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_tissueId_fkey" FOREIGN KEY ("tissueId") REFERENCES "Tissue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "DiseaseCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
