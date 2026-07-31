-- AlterTable
ALTER TABLE "DiscountCode" ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "locationAddress" TEXT,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountry" TEXT,
ADD COLUMN     "locationName" TEXT;

-- CreateTable
CREATE TABLE "SellerSettings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "standardDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expressDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "standardDeliveryDays" INTEGER NOT NULL DEFAULT 5,
    "expressDeliveryDays" INTEGER NOT NULL DEFAULT 2,
    "standardDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expressDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 9.99,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerSettings_sellerId_key" ON "SellerSettings"("sellerId");

-- CreateIndex
CREATE INDEX "DiscountCode_sellerId_idx" ON "DiscountCode"("sellerId");

-- AddForeignKey
ALTER TABLE "SellerSettings" ADD CONSTRAINT "SellerSettings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
