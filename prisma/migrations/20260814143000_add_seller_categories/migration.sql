-- AlterTable
ALTER TABLE "Category" ADD COLUMN "sellerId" TEXT;

-- CreateIndex
CREATE INDEX "Category_sellerId_idx" ON "Category"("sellerId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
