-- AlterTable
ALTER TABLE "BookableService" ADD COLUMN "compareAtPrice" DECIMAL(10,2),
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "isCombo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ServiceComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ServiceComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceComboItem_serviceId_idx" ON "ServiceComboItem"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceComboItem_comboId_serviceId_key" ON "ServiceComboItem"("comboId", "serviceId");

-- AddForeignKey
ALTER TABLE "ServiceComboItem" ADD CONSTRAINT "ServiceComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "BookableService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceComboItem" ADD CONSTRAINT "ServiceComboItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "BookableService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
