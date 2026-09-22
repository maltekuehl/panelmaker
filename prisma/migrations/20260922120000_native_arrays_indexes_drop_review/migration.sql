-- Parses a JSON-encoded string array in place. Returns an empty array for NULL, blank, malformed,
-- or non-array values so the type change can never fail on a bad row. Dropped at the end.
CREATE FUNCTION migration_json_text_array(raw text) RETURNS text[] AS $$
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN ARRAY[]::text[];
  END IF;
  IF jsonb_typeof(btrim(raw)::jsonb) <> 'array' THEN
    RETURN ARRAY[]::text[];
  END IF;
  RETURN ARRAY(SELECT jsonb_array_elements_text(btrim(raw)::jsonb));
EXCEPTION
  WHEN others THEN RETURN ARRAY[]::text[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- AlterTable: JSON-in-String columns become native text[]
ALTER TABLE "CellType" ALTER COLUMN "parentIds" DROP DEFAULT;
ALTER TABLE "CellType" ALTER COLUMN "parentIds" DROP NOT NULL;
ALTER TABLE "CellType" ALTER COLUMN "parentIds" TYPE text[] USING migration_json_text_array("parentIds");

ALTER TABLE "Tissue" ALTER COLUMN "partOfIds" DROP DEFAULT;
ALTER TABLE "Tissue" ALTER COLUMN "partOfIds" DROP NOT NULL;
ALTER TABLE "Tissue" ALTER COLUMN "partOfIds" TYPE text[] USING migration_json_text_array("partOfIds");

ALTER TABLE "CellularComponent" ALTER COLUMN "partOfIds" DROP DEFAULT;
ALTER TABLE "CellularComponent" ALTER COLUMN "partOfIds" DROP NOT NULL;
ALTER TABLE "CellularComponent" ALTER COLUMN "partOfIds" TYPE text[] USING migration_json_text_array("partOfIds");

ALTER TABLE "Antibody" ALTER COLUMN "targetSpecies" DROP DEFAULT;
ALTER TABLE "Antibody" ALTER COLUMN "targetSpecies" DROP NOT NULL;
ALTER TABLE "Antibody" ALTER COLUMN "targetSpecies" TYPE text[] USING migration_json_text_array("targetSpecies");

ALTER TABLE "Antibody" ALTER COLUMN "applications" DROP DEFAULT;
ALTER TABLE "Antibody" ALTER COLUMN "applications" DROP NOT NULL;
ALTER TABLE "Antibody" ALTER COLUMN "applications" TYPE text[] USING migration_json_text_array("applications");

ALTER TABLE "BlogPost" ALTER COLUMN "keywords" DROP DEFAULT;
ALTER TABLE "BlogPost" ALTER COLUMN "keywords" DROP NOT NULL;
ALTER TABLE "BlogPost" ALTER COLUMN "keywords" TYPE text[] USING migration_json_text_array("keywords");

DROP FUNCTION migration_json_text_array(text);

-- DropForeignKey
ALTER TABLE "ExperimentalReport" DROP CONSTRAINT "ExperimentalReport_antibodyId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_approvedBy_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_experimentalReportId_fkey";

-- DropTable
DROP TABLE "Review";

-- DropIndex: redundant with an existing unique constraint on the same column list or its prefix
DROP INDEX "ApiCredential_labId_idx";
DROP INDEX "ApiCredential_userId_idx";
DROP INDEX "BlogPost_slug_idx";
DROP INDEX "Fluorophore_name_idx";
DROP INDEX "Lab_slug_idx";
DROP INDEX "LabAntibody_labId_idx";
DROP INDEX "LabMembership_userId_idx";
DROP INDEX "RateLimit_ipAddress_resourceType_idx";
DROP INDEX "RateLimit_userId_resourceType_idx";

-- AlterTable
ALTER TABLE "Experiment" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

-- CreateIndex
CREATE INDEX "Experiment_createdAt_idx" ON "Experiment"("createdAt");
CREATE INDEX "ExperimentalReport_createdAt_idx" ON "ExperimentalReport"("createdAt");
CREATE INDEX "LabAntibody_addedAt_idx" ON "LabAntibody"("addedAt");
CREATE INDEX "LabAntibody_addedById_idx" ON "LabAntibody"("addedById");
CREATE INDEX "LabInvitation_invitedById_idx" ON "LabInvitation"("invitedById");
CREATE INDEX "LabInvitation_acceptedById_idx" ON "LabInvitation"("acceptedById");
CREATE INDEX "LabMembership_invitedById_idx" ON "LabMembership"("invitedById");
CREATE INDEX "Panel_updatedAt_idx" ON "Panel"("updatedAt");

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
