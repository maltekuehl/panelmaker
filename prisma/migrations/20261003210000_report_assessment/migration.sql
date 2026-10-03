-- Reports move from works / signal quality / specificity grades to a three-level recommendation,
-- issue tags and per-method specificity evidence, plus an optional concentration.
CREATE TYPE "Recommendation" AS ENUM ('RECOMMENDED', 'WITH_CAVEATS', 'NOT_RECOMMENDED');

CREATE TYPE "ValidationResult" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'INCONCLUSIVE');

ALTER TABLE "ExperimentalReport" ADD COLUMN "concentrationUgPerMl" DOUBLE PRECISION,
ADD COLUMN "recommendation" "Recommendation";

CREATE TABLE "ValidationMethod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ValidationMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StainingIssue" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "StainingIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportValidation" (
    "reportId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "result" "ValidationResult" NOT NULL,

    CONSTRAINT "ReportValidation_pkey" PRIMARY KEY ("reportId","methodId")
);

CREATE TABLE "ReportStainingIssue" (
    "reportId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "ReportStainingIssue_pkey" PRIMARY KEY ("reportId","issueId")
);

CREATE INDEX "ValidationMethod_label_idx" ON "ValidationMethod"("label");

CREATE INDEX "StainingIssue_label_idx" ON "StainingIssue"("label");

CREATE INDEX "ReportValidation_methodId_idx" ON "ReportValidation"("methodId");

CREATE INDEX "ReportStainingIssue_issueId_idx" ON "ReportStainingIssue"("issueId");

CREATE INDEX "ExperimentalReport_recommendation_idx" ON "ExperimentalReport"("recommendation");

ALTER TABLE "ReportValidation" ADD CONSTRAINT "ReportValidation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportValidation" ADD CONSTRAINT "ReportValidation_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ValidationMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReportStainingIssue" ADD CONSTRAINT "ReportStainingIssue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportStainingIssue" ADD CONSTRAINT "ReportStainingIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "StainingIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill from the legacy grades before they are dropped. Specificity grades carry no evidence,
-- so no validation rows are inferred from them.
INSERT INTO "StainingIssue" ("id", "label") VALUES
  ('no-signal', 'No detectable signal'),
  ('weak-signal', 'Weak signal'),
  ('off-target-staining', 'Off-target staining')
ON CONFLICT ("id") DO NOTHING;

UPDATE "ExperimentalReport"
SET "recommendation" = CASE
  WHEN "works" = false THEN 'NOT_RECOMMENDED'::"Recommendation"
  WHEN ("signalQuality" IS NULL OR "signalQuality" IN ('EXCELLENT', 'GOOD'))
    AND ("specificity" IS NULL OR "specificity" NOT IN ('LOW', 'NON_SPECIFIC')) THEN 'RECOMMENDED'::"Recommendation"
  ELSE 'WITH_CAVEATS'::"Recommendation"
END
WHERE "works" IS NOT NULL;

INSERT INTO "ReportStainingIssue" ("reportId", "issueId")
SELECT "id", 'no-signal' FROM "ExperimentalReport" WHERE "signalQuality" = 'NONE'
UNION ALL
SELECT "id", 'weak-signal' FROM "ExperimentalReport" WHERE "signalQuality" = 'POOR'
UNION ALL
SELECT "id", 'off-target-staining' FROM "ExperimentalReport" WHERE "specificity" IN ('LOW', 'NON_SPECIFIC');

ALTER TABLE "ExperimentalReport" DROP COLUMN "signalQuality",
DROP COLUMN "specificity",
DROP COLUMN "works";

DROP TYPE "SignalQuality";

DROP TYPE "Specificity";
