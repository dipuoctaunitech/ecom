-- CreateTable
CREATE TABLE "ServiceTimeFrame" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "vertical" "ServiceVertical" NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMins" INTEGER NOT NULL DEFAULT 30,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTimeFrame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeFrameStaff" (
    "id" TEXT NOT NULL,
    "timeFrameId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "TimeFrameStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceTimeFrame_storeId_vertical_idx" ON "ServiceTimeFrame"("storeId", "vertical");

-- CreateIndex
CREATE INDEX "TimeFrameStaff_staffId_idx" ON "TimeFrameStaff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeFrameStaff_timeFrameId_staffId_key" ON "TimeFrameStaff"("timeFrameId", "staffId");

-- AddForeignKey
ALTER TABLE "ServiceTimeFrame" ADD CONSTRAINT "ServiceTimeFrame_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeFrameStaff" ADD CONSTRAINT "TimeFrameStaff_timeFrameId_fkey" FOREIGN KEY ("timeFrameId") REFERENCES "ServiceTimeFrame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeFrameStaff" ADD CONSTRAINT "TimeFrameStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
