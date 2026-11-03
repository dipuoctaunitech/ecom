-- CreateTable
CREATE TABLE "OfferGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minPercent" INTEGER NOT NULL,
    "maxPercent" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferGroup_sortOrder_idx" ON "OfferGroup"("sortOrder");

-- CreateIndex
CREATE INDEX "OfferGroup_minPercent_maxPercent_idx" ON "OfferGroup"("minPercent", "maxPercent");
