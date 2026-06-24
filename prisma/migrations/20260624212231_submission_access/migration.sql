-- CreateEnum
CREATE TYPE "SubmissionAccess" AS ENUM ('NONE', 'REQUESTED', 'VERIFIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "submissionAccess" "SubmissionAccess" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "submissionRequestedAt" TIMESTAMP(3);

-- Backfill: existing users are granted submission access so they are not locked out.
-- Only accounts created after this migration start as 'NONE' (the column default).
UPDATE "User" SET "submissionAccess" = 'VERIFIED';
