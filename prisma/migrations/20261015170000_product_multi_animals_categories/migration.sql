-- Add multi-animal support and migrate from single `animal`.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "animals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product"
SET "animals" = ARRAY["animal"]
WHERE "animal" IS NOT NULL AND "animal" <> '' AND cardinality("animals") = 0;

-- Implicit many-to-many join table for Product <-> Category
CREATE TABLE IF NOT EXISTS "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_ProductCategories_AB_unique"
  ON "_ProductCategories"("A", "B");

CREATE INDEX IF NOT EXISTS "_ProductCategories_B_index"
  ON "_ProductCategories"("B");

-- Migrate existing single categoryId assignments into the join table.
-- Prisma relation "ProductCategories": A = Category.id, B = Product.id
INSERT INTO "_ProductCategories" ("A", "B")
SELECT "categoryId", "id"
FROM "Product"
WHERE "categoryId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop legacy single-value columns / indexes
DROP INDEX IF EXISTS "Product_categoryId_idx";
DROP INDEX IF EXISTS "Product_animal_idx";

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "animal";
