-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "animal" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_animal_idx" ON "Product"("animal");
CREATE INDEX IF NOT EXISTS "Product_brand_idx" ON "Product"("brand");
