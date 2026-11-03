-- CreateTable
CREATE TABLE "PetCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PetCollection_slug_key" ON "PetCollection"("slug");

-- CreateIndex
CREATE INDEX "PetCollection_sortOrder_idx" ON "PetCollection"("sortOrder");

-- CreateIndex
CREATE INDEX "PetCollection_categoryId_idx" ON "PetCollection"("categoryId");

-- AddForeignKey
ALTER TABLE "PetCollection" ADD CONSTRAINT "PetCollection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
