-- AlterTable
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill store-wide categories by createdAt so existing shop order is preserved.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "name" ASC) - 1 AS idx
  FROM "Category"
  WHERE "sellerId" IS NULL
)
UPDATE "Category" AS c
SET "sortOrder" = ordered.idx
FROM ordered
WHERE c.id = ordered.id;

-- CreateIndex
CREATE INDEX "Category_sellerId_sortOrder_idx" ON "Category"("sellerId", "sortOrder");
