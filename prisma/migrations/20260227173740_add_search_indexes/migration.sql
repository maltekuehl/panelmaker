-- CreateIndex
CREATE INDEX "Antibody_name_idx" ON "Antibody"("name");

-- CreateIndex
CREATE INDEX "Antibody_targetProteinId_idx" ON "Antibody"("targetProteinId");

-- CreateIndex
CREATE INDEX "Antibody_targetName_idx" ON "Antibody"("targetName");

-- CreateIndex
CREATE INDEX "CellType_label_idx" ON "CellType"("label");

-- CreateIndex
CREATE INDEX "Protein_label_idx" ON "Protein"("label");

-- CreateIndex
CREATE INDEX "Protein_geneSymbol_idx" ON "Protein"("geneSymbol");
