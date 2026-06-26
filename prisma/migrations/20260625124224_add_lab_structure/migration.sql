-- CreateEnum
CREATE TYPE "LabRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "LabInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LabAntibodyStatus" AS ENUM ('IN_STOCK', 'LOW', 'ORDERED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'LAB', 'PUBLIC');

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "owningLabId" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Panel" ADD COLUMN     "owningLabId" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- Backfill visibility from the legacy isPublic flag. isPublic is kept as a mirror of
-- (visibility = PUBLIC) through the transition and dropped in a later migration.
-- Experiment default is PUBLIC, so only private rows need correcting.
UPDATE "Experiment" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;
-- Panel default is PRIVATE, so only public rows need correcting.
UPDATE "Panel" SET "visibility" = 'PUBLIC' WHERE "isPublic" = true;

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "institution" TEXT,
    "avatarUrl" TEXT,
    "website" TEXT,
    "isPublicProfile" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "role" "LabRole" NOT NULL DEFAULT 'MEMBER',
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabInvitation" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "email" TEXT,
    "role" "LabRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "status" "LabInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "maxUses" INTEGER DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "invitedById" TEXT,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabAntibody" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "antibodyId" TEXT NOT NULL,
    "storageLocation" TEXT,
    "freezerLocation" TEXT,
    "lotNumber" TEXT,
    "vendorCatalog" TEXT,
    "aliquotsRemaining" INTEGER,
    "status" "LabAntibodyStatus" NOT NULL DEFAULT 'IN_STOCK',
    "notes" TEXT,
    "addedById" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabAntibody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentLabShare" (
    "experimentId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentLabShare_pkey" PRIMARY KEY ("experimentId","labId")
);

-- CreateTable
CREATE TABLE "PanelLabShare" (
    "panelId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelLabShare_pkey" PRIMARY KEY ("panelId","labId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lab_slug_key" ON "Lab"("slug");

-- CreateIndex
CREATE INDEX "Lab_slug_idx" ON "Lab"("slug");

-- CreateIndex
CREATE INDEX "Lab_createdById_idx" ON "Lab"("createdById");

-- CreateIndex
CREATE INDEX "LabMembership_userId_idx" ON "LabMembership"("userId");

-- CreateIndex
CREATE INDEX "LabMembership_labId_idx" ON "LabMembership"("labId");

-- CreateIndex
CREATE UNIQUE INDEX "LabMembership_userId_labId_key" ON "LabMembership"("userId", "labId");

-- CreateIndex
CREATE UNIQUE INDEX "LabInvitation_tokenHash_key" ON "LabInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "LabInvitation_labId_idx" ON "LabInvitation"("labId");

-- CreateIndex
CREATE INDEX "LabInvitation_email_idx" ON "LabInvitation"("email");

-- CreateIndex
CREATE INDEX "LabInvitation_status_idx" ON "LabInvitation"("status");

-- CreateIndex
CREATE INDEX "LabInvitation_expiresAt_idx" ON "LabInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "LabAntibody_labId_idx" ON "LabAntibody"("labId");

-- CreateIndex
CREATE INDEX "LabAntibody_antibodyId_idx" ON "LabAntibody"("antibodyId");

-- CreateIndex
CREATE INDEX "LabAntibody_status_idx" ON "LabAntibody"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LabAntibody_labId_antibodyId_key" ON "LabAntibody"("labId", "antibodyId");

-- CreateIndex
CREATE INDEX "ExperimentLabShare_labId_idx" ON "ExperimentLabShare"("labId");

-- CreateIndex
CREATE INDEX "PanelLabShare_labId_idx" ON "PanelLabShare"("labId");

-- CreateIndex
CREATE INDEX "Experiment_visibility_idx" ON "Experiment"("visibility");

-- CreateIndex
CREATE INDEX "Experiment_owningLabId_idx" ON "Experiment"("owningLabId");

-- CreateIndex
CREATE INDEX "Panel_visibility_idx" ON "Panel"("visibility");

-- CreateIndex
CREATE INDEX "Panel_owningLabId_idx" ON "Panel"("owningLabId");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_owningLabId_fkey" FOREIGN KEY ("owningLabId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_owningLabId_fkey" FOREIGN KEY ("owningLabId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMembership" ADD CONSTRAINT "LabMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMembership" ADD CONSTRAINT "LabMembership_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMembership" ADD CONSTRAINT "LabMembership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabInvitation" ADD CONSTRAINT "LabInvitation_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabInvitation" ADD CONSTRAINT "LabInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabInvitation" ADD CONSTRAINT "LabInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAntibody" ADD CONSTRAINT "LabAntibody_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAntibody" ADD CONSTRAINT "LabAntibody_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAntibody" ADD CONSTRAINT "LabAntibody_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentLabShare" ADD CONSTRAINT "ExperimentLabShare_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentLabShare" ADD CONSTRAINT "ExperimentLabShare_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelLabShare" ADD CONSTRAINT "PanelLabShare_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelLabShare" ADD CONSTRAINT "PanelLabShare_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
