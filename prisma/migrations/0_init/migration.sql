-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "Clonality" AS ENUM ('MONOCLONAL', 'POLYCLONAL', 'RECOMBINANT', 'OLIGOCLONAL');

-- CreateEnum
CREATE TYPE "Fixation" AS ENUM ('FFPE', 'FRESH_FROZEN', 'PFA', 'ACETONE', 'METHANOL', 'OTHER');

-- CreateEnum
CREATE TYPE "Preservation" AS ENUM ('FFPE', 'FRESH_FROZEN', 'FIXED_FROZEN', 'FRESH', 'OTHER');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('TISSUE', 'CELL_LINE', 'PRIMARY_CELL_CULTURE', 'ORGANOID', 'OTHER');

-- CreateEnum
CREATE TYPE "DonorSex" AS ENUM ('MALE', 'FEMALE', 'INTERSEX', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DetectionModality" AS ENUM ('FLUORESCENCE', 'MASS', 'OTHER');

-- CreateEnum
CREATE TYPE "AntigenRetrieval" AS ENUM ('CITRATE_PH6', 'TRIS_EDTA_PH9', 'ENZYMATIC', 'NONE');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignalQuality" AS ENUM ('EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'NONE');

-- CreateEnum
CREATE TYPE "Specificity" AS ENUM ('HIGH', 'MODERATE', 'LOW', 'NON_SPECIFIC');

-- CreateEnum
CREATE TYPE "LabRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "LabInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LabAntibodyStatus" AS ENUM ('IN_STOCK', 'LOW', 'ORDERED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'LAB', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ApiCredentialScope" AS ENUM ('USER', 'LAB');

-- CreateEnum
CREATE TYPE "ApiCredentialStatus" AS ENUM ('UNVERIFIED', 'VALID', 'INVALID');

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
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "model" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "labId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCredential" (
    "id" TEXT NOT NULL,
    "scope" "ApiCredentialScope" NOT NULL,
    "userId" TEXT,
    "labId" TEXT,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "ciphertext" TEXT NOT NULL,
    "last4" TEXT,
    "createdById" TEXT,
    "status" "ApiCredentialStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentIds" TEXT[],

    CONSTRAINT "CellType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taxon" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Taxon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tissue" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "partOfIds" TEXT[],

    CONSTRAINT "Tissue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellularComponent" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "partOfIds" TEXT[],

    CONSTRAINT "CellularComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseCondition" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "DiseaseCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixative" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Fixative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentalStage" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "DevelopmentalStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fluorophore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "excitation" INTEGER NOT NULL,
    "emission" INTEGER NOT NULL,
    "fpbaseId" TEXT,
    "fpbaseSlug" TEXT,
    "chebiId" TEXT,
    "aliases" TEXT[],
    "extinctionCoefficient" DOUBLE PRECISION,
    "quantumYield" DOUBLE PRECISION,
    "excitationSpectrum" JSONB,
    "emissionSpectrum" JSONB,

    CONSTRAINT "Fluorophore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingMethod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "efoId" TEXT,
    "detection" "DetectionModality" NOT NULL,
    "cyclic" BOOLEAN NOT NULL DEFAULT false,
    "aliases" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCellType" (
    "reportId" TEXT NOT NULL,
    "cellTypeId" TEXT NOT NULL,

    CONSTRAINT "ReportCellType_pkey" PRIMARY KEY ("reportId","cellTypeId")
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
    "hostTaxonId" TEXT,
    "targetSpecies" TEXT[],
    "targetProteinId" TEXT,
    "targetName" TEXT,
    "applications" TEXT[],
    "conjugate" TEXT,
    "vendorName" TEXT,
    "vendorUrl" TEXT,
    "citationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Antibody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "citation" TEXT,
    "pmid" TEXT,
    "doi" TEXT,
    "speciesId" TEXT,
    "tissueId" TEXT,
    "fixation" "Fixation",
    "imagingMethodId" TEXT,
    "antigenRetrieval" "AntigenRetrieval",
    "conditionId" TEXT,
    "submitterId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "owningLabId" TEXT,
    "preservation" "Preservation",
    "preservationText" TEXT,
    "fixativeId" TEXT,
    "fixativeConcentration" TEXT,
    "antigenRetrievalText" TEXT,
    "sampleType" "SampleType",
    "sectionThicknessUm" DOUBLE PRECISION,
    "donorSex" "DonorSex",
    "donorAge" TEXT,
    "developmentalStageId" TEXT,
    "protocolDoi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentalReport" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "antibodyId" TEXT,
    "subcellularId" TEXT,
    "fluorophoreId" TEXT,
    "metalTag" TEXT,
    "cycleNumber" INTEGER,
    "dilution" TEXT,
    "incubation" TEXT,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "works" BOOLEAN,
    "signalQuality" "SignalQuality",
    "specificity" "Specificity",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportImage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportImageCellType" (
    "imageId" TEXT NOT NULL,
    "cellTypeId" TEXT NOT NULL,

    CONSTRAINT "ReportImageCellType_pkey" PRIMARY KEY ("imageId","cellTypeId")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "speciesId" TEXT,
    "fixation" "Fixation",
    "imagingMethodId" TEXT,
    "conditionId" TEXT,
    "ownerId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "owningLabId" TEXT,
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

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "institution" TEXT,
    "institutionId" TEXT,
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_orcid_key" ON "User"("orcid");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "RateLimit_windowStartTime_idx" ON "RateLimit"("windowStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_userId_resourceType_key" ON "RateLimit"("userId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_ipAddress_resourceType_key" ON "RateLimit"("ipAddress", "resourceType");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_deleted_updatedAt_idx" ON "ChatConversation"("userId", "deleted", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_labId_idx" ON "ChatConversation"("labId");

-- CreateIndex
CREATE INDEX "ChatConversationMessage_conversationId_createdAt_idx" ON "ChatConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCredential_userId_provider_key" ON "ApiCredential"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCredential_labId_provider_key" ON "ApiCredential"("labId", "provider");

-- CreateIndex
CREATE INDEX "CellType_label_idx" ON "CellType"("label");

-- CreateIndex
CREATE INDEX "Taxon_label_idx" ON "Taxon"("label");

-- CreateIndex
CREATE INDEX "Tissue_label_idx" ON "Tissue"("label");

-- CreateIndex
CREATE INDEX "CellularComponent_label_idx" ON "CellularComponent"("label");

-- CreateIndex
CREATE INDEX "DiseaseCondition_label_idx" ON "DiseaseCondition"("label");

-- CreateIndex
CREATE INDEX "Fixative_label_idx" ON "Fixative"("label");

-- CreateIndex
CREATE INDEX "DevelopmentalStage_label_idx" ON "DevelopmentalStage"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Fluorophore_name_key" ON "Fluorophore"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Fluorophore_fpbaseId_key" ON "Fluorophore"("fpbaseId");

-- CreateIndex
CREATE INDEX "Fluorophore_fpbaseSlug_idx" ON "Fluorophore"("fpbaseSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingMethod_efoId_key" ON "ImagingMethod"("efoId");

-- CreateIndex
CREATE INDEX "ImagingMethod_detection_idx" ON "ImagingMethod"("detection");

-- CreateIndex
CREATE INDEX "ImagingMethod_sortOrder_idx" ON "ImagingMethod"("sortOrder");

-- CreateIndex
CREATE INDEX "ReportCellType_cellTypeId_idx" ON "ReportCellType"("cellTypeId");

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
CREATE INDEX "Antibody_hostTaxonId_idx" ON "Antibody"("hostTaxonId");

-- CreateIndex
CREATE INDEX "Experiment_speciesId_idx" ON "Experiment"("speciesId");

-- CreateIndex
CREATE INDEX "Experiment_tissueId_idx" ON "Experiment"("tissueId");

-- CreateIndex
CREATE INDEX "Experiment_conditionId_idx" ON "Experiment"("conditionId");

-- CreateIndex
CREATE INDEX "Experiment_submitterId_idx" ON "Experiment"("submitterId");

-- CreateIndex
CREATE INDEX "Experiment_imagingMethodId_idx" ON "Experiment"("imagingMethodId");

-- CreateIndex
CREATE INDEX "Experiment_visibility_idx" ON "Experiment"("visibility");

-- CreateIndex
CREATE INDEX "Experiment_owningLabId_idx" ON "Experiment"("owningLabId");

-- CreateIndex
CREATE INDEX "Experiment_createdAt_idx" ON "Experiment"("createdAt");

-- CreateIndex
CREATE INDEX "Experiment_preservation_idx" ON "Experiment"("preservation");

-- CreateIndex
CREATE INDEX "Experiment_fixativeId_idx" ON "Experiment"("fixativeId");

-- CreateIndex
CREATE INDEX "Experiment_developmentalStageId_idx" ON "Experiment"("developmentalStageId");

-- CreateIndex
CREATE INDEX "Experiment_sampleType_idx" ON "Experiment"("sampleType");

-- CreateIndex
CREATE INDEX "ExperimentalReport_experimentId_idx" ON "ExperimentalReport"("experimentId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_antibodyId_idx" ON "ExperimentalReport"("antibodyId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_subcellularId_idx" ON "ExperimentalReport"("subcellularId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_fluorophoreId_idx" ON "ExperimentalReport"("fluorophoreId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_status_idx" ON "ExperimentalReport"("status");

-- CreateIndex
CREATE INDEX "ExperimentalReport_createdAt_idx" ON "ExperimentalReport"("createdAt");

-- CreateIndex
CREATE INDEX "ReportImage_reportId_idx" ON "ReportImage"("reportId");

-- CreateIndex
CREATE INDEX "ReportImageCellType_cellTypeId_idx" ON "ReportImageCellType"("cellTypeId");

-- CreateIndex
CREATE INDEX "Panel_ownerId_idx" ON "Panel"("ownerId");

-- CreateIndex
CREATE INDEX "Panel_conditionId_idx" ON "Panel"("conditionId");

-- CreateIndex
CREATE INDEX "Panel_speciesId_idx" ON "Panel"("speciesId");

-- CreateIndex
CREATE INDEX "Panel_imagingMethodId_idx" ON "Panel"("imagingMethodId");

-- CreateIndex
CREATE INDEX "Panel_visibility_idx" ON "Panel"("visibility");

-- CreateIndex
CREATE INDEX "Panel_owningLabId_idx" ON "Panel"("owningLabId");

-- CreateIndex
CREATE INDEX "Panel_updatedAt_idx" ON "Panel"("updatedAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "Lab_slug_key" ON "Lab"("slug");

-- CreateIndex
CREATE INDEX "Lab_createdById_idx" ON "Lab"("createdById");

-- CreateIndex
CREATE INDEX "LabMembership_labId_idx" ON "LabMembership"("labId");

-- CreateIndex
CREATE INDEX "LabMembership_invitedById_idx" ON "LabMembership"("invitedById");

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
CREATE INDEX "LabInvitation_invitedById_idx" ON "LabInvitation"("invitedById");

-- CreateIndex
CREATE INDEX "LabInvitation_acceptedById_idx" ON "LabInvitation"("acceptedById");

-- CreateIndex
CREATE INDEX "LabAntibody_antibodyId_idx" ON "LabAntibody"("antibodyId");

-- CreateIndex
CREATE INDEX "LabAntibody_status_idx" ON "LabAntibody"("status");

-- CreateIndex
CREATE INDEX "LabAntibody_addedAt_idx" ON "LabAntibody"("addedAt");

-- CreateIndex
CREATE INDEX "LabAntibody_addedById_idx" ON "LabAntibody"("addedById");

-- CreateIndex
CREATE UNIQUE INDEX "LabAntibody_labId_antibodyId_key" ON "LabAntibody"("labId", "antibodyId");

-- CreateIndex
CREATE INDEX "ExperimentLabShare_labId_idx" ON "ExperimentLabShare"("labId");

-- CreateIndex
CREATE INDEX "PanelLabShare_labId_idx" ON "PanelLabShare"("labId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversationMessage" ADD CONSTRAINT "ChatConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCellType" ADD CONSTRAINT "ReportCellType_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCellType" ADD CONSTRAINT "ReportCellType_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellTypeMarker" ADD CONSTRAINT "CellTypeMarker_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellTypeMarker" ADD CONSTRAINT "CellTypeMarker_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antibody" ADD CONSTRAINT "Antibody_targetProteinId_fkey" FOREIGN KEY ("targetProteinId") REFERENCES "Protein"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antibody" ADD CONSTRAINT "Antibody_hostTaxonId_fkey" FOREIGN KEY ("hostTaxonId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_imagingMethodId_fkey" FOREIGN KEY ("imagingMethodId") REFERENCES "ImagingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_fixativeId_fkey" FOREIGN KEY ("fixativeId") REFERENCES "Fixative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_developmentalStageId_fkey" FOREIGN KEY ("developmentalStageId") REFERENCES "DevelopmentalStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_tissueId_fkey" FOREIGN KEY ("tissueId") REFERENCES "Tissue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "DiseaseCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_owningLabId_fkey" FOREIGN KEY ("owningLabId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_subcellularId_fkey" FOREIGN KEY ("subcellularId") REFERENCES "CellularComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentalReport" ADD CONSTRAINT "ExperimentalReport_fluorophoreId_fkey" FOREIGN KEY ("fluorophoreId") REFERENCES "Fluorophore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImage" ADD CONSTRAINT "ReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImageCellType" ADD CONSTRAINT "ReportImageCellType_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ReportImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImageCellType" ADD CONSTRAINT "ReportImageCellType_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "DiseaseCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_imagingMethodId_fkey" FOREIGN KEY ("imagingMethodId") REFERENCES "ImagingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_owningLabId_fkey" FOREIGN KEY ("owningLabId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

