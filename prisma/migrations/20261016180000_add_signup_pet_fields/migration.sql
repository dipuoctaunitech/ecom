-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "vetContact" TEXT;

-- AlterTable
ALTER TABLE "CustomerPet" ADD COLUMN IF NOT EXISTS "vaccinatedAt" DATE;
ALTER TABLE "CustomerPet" ADD COLUMN IF NOT EXISTS "dewormedAt" DATE;
ALTER TABLE "CustomerPet" ADD COLUMN IF NOT EXISTS "diagnosis" TEXT;
ALTER TABLE "CustomerPet" ADD COLUMN IF NOT EXISTS "bbmpLicense" TEXT;
ALTER TABLE "CustomerPet" ADD COLUMN IF NOT EXISTS "insurancePolicy" TEXT;
