-- AlterTable
ALTER TABLE "Fluorophore" ADD COLUMN     "emissionSpectrum" JSONB,
ADD COLUMN     "excitationSpectrum" JSONB,
ADD COLUMN     "extinctionCoefficient" DOUBLE PRECISION,
ADD COLUMN     "fpbaseSlug" TEXT,
ADD COLUMN     "quantumYield" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Fluorophore_fpbaseSlug_idx" ON "Fluorophore"("fpbaseSlug");
