-- DropIndex
DROP INDEX "Experiment_method_idx";

-- AlterTable
ALTER TABLE "Experiment" DROP COLUMN "method";

-- DropEnum
DROP TYPE "MultiplexMethod";

