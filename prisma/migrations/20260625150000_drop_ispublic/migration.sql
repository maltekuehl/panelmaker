-- Phase 8: drop the transitional `isPublic` mirror columns. `visibility` (PRIVATE/LAB/PUBLIC) is now
-- the sole source of truth on Experiment and Panel; every reader/writer was migrated off `isPublic`.

-- DropIndex
DROP INDEX "Experiment_isPublic_idx";

-- DropIndex
DROP INDEX "Panel_isPublic_idx";

-- AlterTable
ALTER TABLE "Experiment" DROP COLUMN "isPublic";

-- AlterTable
ALTER TABLE "Panel" DROP COLUMN "isPublic";
