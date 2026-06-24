-- AlterTable
ALTER TABLE "ExperimentalReport" DROP COLUMN "imageUrls";

-- CreateTable
CREATE TABLE "ReportImage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "ReportImage_reportId_idx" ON "ReportImage"("reportId");

-- CreateIndex
CREATE INDEX "ReportImageCellType_cellTypeId_idx" ON "ReportImageCellType"("cellTypeId");

-- AddForeignKey
ALTER TABLE "ReportImage" ADD CONSTRAINT "ReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExperimentalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImageCellType" ADD CONSTRAINT "ReportImageCellType_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ReportImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImageCellType" ADD CONSTRAINT "ReportImageCellType_cellTypeId_fkey" FOREIGN KEY ("cellTypeId") REFERENCES "CellType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
