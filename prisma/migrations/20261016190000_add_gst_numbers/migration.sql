-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;

-- AlterTable
ALTER TABLE "SellerSettings" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
