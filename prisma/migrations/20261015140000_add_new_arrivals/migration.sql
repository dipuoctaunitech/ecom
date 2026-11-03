-- CreateTable
CREATE TABLE "NewArrivalEntry" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewArrivalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewArrivalEntry_productId_key" ON "NewArrivalEntry"("productId");

-- CreateIndex
CREATE INDEX "NewArrivalEntry_sortOrder_idx" ON "NewArrivalEntry"("sortOrder");

-- AddForeignKey
ALTER TABLE "NewArrivalEntry" ADD CONSTRAINT "NewArrivalEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
