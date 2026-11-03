-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "CustomerPet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" TEXT,
    "dateOfBirth" DATE,
    "weightKg" DECIMAL(6,2),
    "color" TEXT,
    "microchipId" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerPet_ownerId_idx" ON "CustomerPet"("ownerId");

-- AddForeignKey
ALTER TABLE "CustomerPet" ADD CONSTRAINT "CustomerPet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
