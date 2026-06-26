-- Rename the verified-access gate to be general: one VERIFIED status now governs
-- both experimental-report submission and lab creation. Data is preserved via RENAME.
ALTER TYPE "SubmissionAccess" RENAME TO "AccessStatus";
ALTER TABLE "User" RENAME COLUMN "submissionAccess" TO "accessStatus";
ALTER TABLE "User" RENAME COLUMN "submissionRequestedAt" TO "accessRequestedAt";
