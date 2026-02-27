-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "orcid" TEXT,
    "institution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("provider", "providerAccountId"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,

    PRIMARY KEY ("identifier", "token")
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

    PRIMARY KEY ("userId", "credentialID"),
    CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatRateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequestTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatRateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "ipAddress" TEXT,
    "resourceType" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequestTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "modelName" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "reviewBody" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "datePublished" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPending" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "authorId" TEXT NOT NULL,
    "experimentalReportId" INTEGER NOT NULL,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_experimentalReportId_fkey" FOREIGN KEY ("experimentalReportId") REFERENCES "ExperimentalReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CellType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "parentIds" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "AnatomicalStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "partOfIds" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "CellTypeStructure" (
    "cellTypeId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "source" TEXT,

    PRIMARY KEY ("cellTypeId", "structureId"),
    CONSTRAINT "CellTypeStructure_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CellTypeStructure_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "AnatomicalStructure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Protein" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "geneSymbol" TEXT,
    "ensemblGeneId" TEXT
);

-- CreateTable
CREATE TABLE "CellTypeMarker" (
    "cellTypeId" TEXT NOT NULL,
    "proteinId" TEXT NOT NULL,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,

    PRIMARY KEY ("cellTypeId", "proteinId"),
    CONSTRAINT "CellTypeMarker_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CellTypeMarker_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Antibody" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rrid" TEXT,
    "name" TEXT NOT NULL,
    "catalogNumber" TEXT,
    "cloneId" TEXT,
    "clonality" TEXT,
    "sourceOrganism" TEXT,
    "targetSpecies" TEXT NOT NULL DEFAULT '[]',
    "targetProteinId" TEXT,
    "targetName" TEXT,
    "applications" TEXT NOT NULL DEFAULT '[]',
    "conjugate" TEXT,
    "vendorName" TEXT,
    "vendorUrl" TEXT,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Antibody_targetProteinId_fkey" FOREIGN KEY ("targetProteinId") REFERENCES "Protein" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentalReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "antibodyId" INTEGER,
    "cellTypeId" TEXT,
    "structureId" TEXT,
    "species" TEXT,
    "tissueType" TEXT,
    "fixation" TEXT,
    "method" TEXT,
    "fluorophore" TEXT,
    "metalTag" TEXT,
    "cycleNumber" INTEGER,
    "dilution" TEXT,
    "antigenRetrieval" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "works" BOOLEAN,
    "signalQuality" TEXT,
    "specificity" TEXT,
    "notes" TEXT,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "submitterId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExperimentalReport_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExperimentalReport_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExperimentalReport_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "AnatomicalStructure" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExperimentalReport_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "species" TEXT,
    "fixation" TEXT,
    "condition" TEXT,
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Panel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PanelCycle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "panelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PanelCycle_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PanelMarker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cycleId" INTEGER NOT NULL,
    "proteinId" TEXT,
    "antibodyId" INTEGER,
    "fluorophore" TEXT,
    "metalTag" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PanelMarker_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PanelCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PanelMarker_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PanelMarker_antibodyId_fkey" FOREIGN KEY ("antibodyId") REFERENCES "Antibody" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE UNIQUE INDEX "ChatRateLimit_userId_key" ON "ChatRateLimit"("userId");

-- CreateIndex
CREATE INDEX "ChatRateLimit_userId_idx" ON "ChatRateLimit"("userId");

-- CreateIndex
CREATE INDEX "ChatRateLimit_windowStartTime_idx" ON "ChatRateLimit"("windowStartTime");

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
CREATE UNIQUE INDEX "Antibody_rrid_key" ON "Antibody"("rrid");

-- CreateIndex
CREATE INDEX "ExperimentalReport_antibodyId_idx" ON "ExperimentalReport"("antibodyId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_cellTypeId_idx" ON "ExperimentalReport"("cellTypeId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_structureId_idx" ON "ExperimentalReport"("structureId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_submitterId_idx" ON "ExperimentalReport"("submitterId");

-- CreateIndex
CREATE INDEX "ExperimentalReport_method_idx" ON "ExperimentalReport"("method");

-- CreateIndex
CREATE INDEX "ExperimentalReport_status_idx" ON "ExperimentalReport"("status");

-- CreateIndex
CREATE INDEX "Panel_ownerId_idx" ON "Panel"("ownerId");

-- CreateIndex
CREATE INDEX "Panel_isPublic_idx" ON "Panel"("isPublic");

-- CreateIndex
CREATE INDEX "PanelCycle_panelId_idx" ON "PanelCycle"("panelId");

-- CreateIndex
CREATE INDEX "PanelMarker_cycleId_idx" ON "PanelMarker"("cycleId");

-- CreateIndex
CREATE INDEX "PanelMarker_proteinId_idx" ON "PanelMarker"("proteinId");

-- CreateIndex
CREATE INDEX "PanelMarker_antibodyId_idx" ON "PanelMarker"("antibodyId");
