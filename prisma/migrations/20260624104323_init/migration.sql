-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "Clonality" AS ENUM ('MONOCLONAL', 'POLYCLONAL', 'RECOMBINANT', 'OLIGOCLONAL');

-- CreateEnum
CREATE TYPE "SourceOrganism" AS ENUM ('MOUSE', 'RABBIT', 'GOAT', 'RAT', 'DONKEY', 'CHICKEN', 'SHEEP', 'HAMSTER', 'GUINEA_PIG', 'CAMELID', 'OTHER');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('HUMAN', 'MOUSE', 'RAT', 'NON_HUMAN_PRIMATE', 'PIG', 'RABBIT', 'ZEBRAFISH', 'OTHER');

-- CreateEnum
CREATE TYPE "Fixation" AS ENUM ('FFPE', 'FRESH_FROZEN', 'PFA', 'ACETONE', 'METHANOL', 'OTHER');

-- CreateEnum
CREATE TYPE "MultiplexMethod" AS ENUM ('PATHOPLEX', 'CODEX', 'CYCIF', 'IMC', 'MIBI', 'IBEX', 'OTHER');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignalQuality" AS ENUM ('EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'NONE');

-- CreateEnum
CREATE TYPE "Specificity" AS ENUM ('HIGH', 'MODERATE', 'LOW', 'NON_SPECIFIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "orcid" TEXT,
    "institution" TEXT,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "resourceType" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequestTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "modelName" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reviewBody" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "datePublished" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPending" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "experimentalReportId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentIds" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "CellType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnatomicalStructure" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "partOfIds" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "AnatomicalStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseCondition" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "DiseaseCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fluorophore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "excitation" INTEGER NOT NULL,
    "emission" INTEGER NOT NULL,
    "fpbaseId" TEXT,
    "chebiId" TEXT,
    "aliases" TEXT[],

    CONSTRAINT "Fluorophore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellTypeStructure" (
    "cellTypeId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "CellTypeStructure_pkey" PRIMARY KEY ("cellTypeId","structureId")
);

-- CreateTable
CREATE TABLE "Protein" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "geneSymbol" TEXT,
    "ensemblGeneId" TEXT,

    CONSTRAINT "Protein_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellTypeMarker" (
    "cellTypeId" TEXT NOT NULL,
    "proteinId" TEXT NOT NULL,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,

    CONSTRAINT "CellTypeMarker_pkey" PRIMARY KEY ("cellTypeId","proteinId")
);

-- CreateTable
CREATE TABLE "Antibody" (
    "id" TEXT NOT NULL,
    "rrid" TEXT,
    "name" TEXT NOT NULL,
    "catalogNumber" TEXT,
    "cloneId" TEXT,
    "clonality" "Clonality",
    "sourceOrganism" "SourceOrganism",
    "targetSpecies" TEXT NOT NULL DEFAULT '[]',
    "targetProteinId" TEXT,
    "targetName" TEXT,
    "applications" TEXT NOT NULL DEFAULT '[]',
    "conjugate" TEXT,
    "vendorName" TEXT,
    "vendorUrl" TEXT,
    "citationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Antibody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentalReport" (
    "id" TEXT NOT NULL,
    "antibodyId" TEXT,
    "cellTypeId" TEXT,
    "structureId" TEXT,
    "species" "Species",
    "tissueType" TEXT,
    "fixation" "Fixation",
    "method" "MultiplexMethod",
    "fluorophoreId" TEXT,
    "metalTag" TEXT,
    "cycleNumber" INTEGER,
    "dilution" TEXT,
    "antigenRetrieval" TEXT,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "works" BOOLEAN,
    "signalQuality" "SignalQuality",
    "specificity" "Specificity",
    "notes" TEXT,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "submitterId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "conditionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "species" "Species",
    "fixation" "Fixation",
    "conditionId" TEXT,
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelCycle" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PanelCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelMarker" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "proteinId" TEXT,
    "antibodyId" TEXT,
    "fluorophoreId" TEXT,
    "metalTag" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PanelMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_orcid_key" ON "User"("orcid");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE INDEX "RateLimit_userId_resourceType_idx" ON "RateLimit"("userId", "resourceType");

-- CreateIndex
CREATE INDEX "RateLimit_ipAddress_resourceType_idx" ON "RateLimit"("ipAddress", "resourceType");

-- CreateIndex
CREATE INDEX "RateLimit_windowStartTime_idx" ON "RateLimit"("windowStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_userId_resourceType_key" ON "RateLimit"("userId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_ipAddress_resourceType_key" ON "RateLimit"("ipAddress", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_published_idx" ON "BlogPost"("published");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");

-- CreateIndex
CREATE INDEX "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");

-- CreateIndex
CREATE INDEX "Review_experimentalReportId_idx" ON "Review"("experimentalReportId");

-- CreateIndex
CREATE INDEX "Review_isHelpful_idx" ON "Review"("isHelpful");

-- CreateIndex
CREATE INDEX "Review_datePublished_idx" ON "Review"("datePublished");

-- CreateIndex
CREATE INDEX "Review_isPending_idx" ON "Review"("isPending");

-- CreateIndex
CREATE INDEX "Review_isApproved_idx" ON "Review"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_experimentalReportId_key" ON "Review"("authorId", "experimentalReportId");

-- CreateIndex
CREATE INDEX "CellType_label_idx" ON "CellType"("label");

-- CreateIndex
CREATE INDEX "DiseaseCondition_label_idx" ON "DiseaseCondition"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Fluorophore_name_key" ON "Fluorophore"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Fluorophore_fpbaseId_key" ON "Fluorophore"("fpbaseId");

-- CreateIndex
CREATE INDEX "Fluorophore_name_idx" ON "Fluorophore"("name");

-- CreateIndex
CREATE INDEX "Protein_label_idx" ON "Protein"("label");

-- CreateIndex
CREATE INDEX "Protein_geneSymbol_idx" ON "Protein"("geneSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "Antibody_rrid_key" ON "Antibody"("rrid");

-- CreateIndex
CREATE INDEX "Antibody_name_idx" ON "Antibody"("name");

-- CreateIndex
CREATE INDEX "Antibody_targetProteinId_idx" ON "Antibody"("targetProteinId");

-- CreateIndex
CREATE INDEX "Antibody_targetName_idx" ON "Antibody"("targetName");

-- CreateIndex
CREATE INDEX "ExperimentalReport_antibodyId_idx" ON "ExperimentalReport"("antibodyId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_cellTypeId_idx" ON "ExperimentalReport"("cellTypeId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_structureId_idx" ON "ExperimentalReport"("structureId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_conditionId_idx" ON "ExperimentalReport"("conditionId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_submitterId_idx" ON "ExperimentalReport"("submitterId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_fluorophoreId_idx" ON "ExperimentalReport"("fluorophoreId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_method_idx" ON "ExperimentalReport"("method");

-- CreateIndex
CREATE INDEX "ExperimentalReport_status_idx" ON "ExperimentalReport"("status");

-- CreateIndex
CREATE INDEX "Panel_ownerId_idx" ON "Panel"("ownerId");

-- CreateIndex
CREATE INDEX "Panel_isPublic_idx" ON "Panel"("isPublic");

-- CreateIndex
CREATE INDEX "Panel_conditionId_idx" ON "Panel"("conditionId");

-- CreateIndex
CREATE INDEX "PanelCycle_panelId_idx" ON "PanelCycle"("panelId");

-- CreateIndex
CREATE INDEX "PanelMarker_cycleId_idx" ON "PanelMarker"("cycleId");

-- CreateIndex
CREATE INDEX "PanelMarker_proteinId_idx" ON "PanelMarker"("proteinId");

-- CreateIndex
CREATE INDEX "PanelMarker_antibodyId_idx" ON "PanelMarker"("antibodyId");

-- CreateIndex
CREATE INDEX "PanelMarker_fluorophoreId_idx" ON "PanelMarker"("fluorophoreId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_experimentalReportId_fkey" FOREIGN KEY ("experimentalReportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellTypeStructure" ADD CONSTRAINT "CellTypeStructure_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellTypeStructure" ADD CONSTRAINT "CellTypeStructure_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "AnatomicalStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellTypeMarker" ADD CONSTRAINT "CellTypeMarker_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellTypeMarker" ADD CONSTRAINT "CellTypeMarker_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antibody" ADD CONSTRAINT "Antibody_targetProteinId_fkey" FOREIGN KEY ("targetProteinId") REFERENCES "Protein"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "AnatomicalStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "DiseaseCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_fluorophoreId_fkey" FOREIGN KEY ("fluorophoreId") REFERENCES "Fluorophore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "DiseaseCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelCycle" ADD CONSTRAINT "PanelCycle_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMarker" ADD CONSTRAINT "PanelMarker_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PanelCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMarker" ADD CONSTRAINT "PanelMarker_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMarker" ADD CONSTRAINT "PanelMarker_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMarker" ADD CONSTRAINT "PanelMarker_fluorophoreId_fkey" FOREIGN KEY ("fluorophoreId") REFERENCES "Fluorophore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

