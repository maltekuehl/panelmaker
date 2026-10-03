-- An image is one field of view of an experiment. Its channels say which stain each colour shows: a
-- report for a stain of interest, or a labelled dye for a nuclear or structural reference.

-- CreateEnum
CREATE TYPE "ImageChannelRole" AS ENUM ('TARGET', 'NUCLEAR', 'STRUCTURAL');

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageChannel" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "role" "ImageChannelRole" NOT NULL DEFAULT 'TARGET',
    "reportId" TEXT,
    "label" TEXT,
    "fluorophoreId" TEXT,
    "displayColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageCellType" (
    "imageId" TEXT NOT NULL,
    "cellTypeId" TEXT NOT NULL,

    CONSTRAINT "ImageCellType_pkey" PRIMARY KEY ("imageId","cellTypeId")
);

-- Copy: one image per (experiment, url), keeping the first row's id, caption and position.
CREATE TEMP TABLE "_image_map" AS
SELECT
  ri."id" AS "reportImageId",
  ri."reportId",
  ri."sortOrder",
  FIRST_VALUE(ri."id") OVER w AS "imageId",
  ROW_NUMBER() OVER w AS "channelOrder",
  r."experimentId",
  ri."url"
FROM "ReportImage" ri
JOIN "ExperimentalReport" r ON r."id" = ri."reportId"
WINDOW w AS (PARTITION BY r."experimentId", ri."url" ORDER BY ri."sortOrder", ri."createdAt", ri."id");

INSERT INTO "Image" ("id", "experimentId", "url", "caption", "sortOrder", "createdAt", "updatedAt")
SELECT ri."id", m."experimentId", ri."url", ri."caption", ri."sortOrder", ri."createdAt", CURRENT_TIMESTAMP
FROM "_image_map" m
JOIN "ReportImage" ri ON ri."id" = m."reportImageId"
WHERE m."reportImageId" = m."imageId";

INSERT INTO "ImageChannel" ("id", "imageId", "role", "reportId", "sortOrder", "updatedAt")
SELECT DISTINCT ON (m."imageId", m."reportId")
  'ch_' || m."reportImageId", m."imageId", 'TARGET', m."reportId", m."channelOrder" - 1, CURRENT_TIMESTAMP
FROM "_image_map" m
ORDER BY m."imageId", m."reportId", m."channelOrder";

INSERT INTO "ImageCellType" ("imageId", "cellTypeId")
SELECT DISTINCT m."imageId", ct."cellTypeId"
FROM "ReportImageCellType" ct
JOIN "_image_map" m ON m."reportImageId" = ct."imageId";

DROP TABLE "_image_map";

-- DropForeignKey
ALTER TABLE "ReportImage" DROP CONSTRAINT "ReportImage_reportId_fkey";

-- DropForeignKey
ALTER TABLE "ReportImageCellType" DROP CONSTRAINT "ReportImageCellType_cellTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ReportImageCellType" DROP CONSTRAINT "ReportImageCellType_imageId_fkey";

-- DropTable
DROP TABLE "ReportImageCellType";

-- DropTable
DROP TABLE "ReportImage";

-- CreateIndex
CREATE INDEX "Image_url_idx" ON "Image"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Image_experimentId_url_key" ON "Image"("experimentId", "url");

-- CreateIndex
CREATE INDEX "ImageChannel_reportId_idx" ON "ImageChannel"("reportId");

-- CreateIndex
CREATE INDEX "ImageChannel_fluorophoreId_idx" ON "ImageChannel"("fluorophoreId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageChannel_imageId_reportId_key" ON "ImageChannel"("imageId", "reportId");

-- CreateIndex
CREATE INDEX "ImageCellType_cellTypeId_idx" ON "ImageCellType"("cellTypeId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageChannel" ADD CONSTRAINT "ImageChannel_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageChannel" ADD CONSTRAINT "ImageChannel_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageChannel" ADD CONSTRAINT "ImageChannel_fluorophoreId_fkey" FOREIGN KEY ("fluorophoreId") REFERENCES "Fluorophore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageCellType" ADD CONSTRAINT "ImageCellType_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageCellType" ADD CONSTRAINT "ImageCellType_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
