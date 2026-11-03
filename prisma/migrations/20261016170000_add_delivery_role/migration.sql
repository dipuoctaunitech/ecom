-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DELIVERY';

-- CreateEnum
CREATE TYPE "PaymentMarkedByRole" AS ENUM ('SELLER', 'DELIVERY', 'ADMIN');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryBoyId" TEXT;

-- AlterTable
ALTER TABLE "OrderPayment" ADD COLUMN "paymentMarkedById" TEXT,
ADD COLUMN "paymentMarkedByRole" "PaymentMarkedByRole";

-- CreateIndex
CREATE INDEX "Order_deliveryBoyId_idx" ON "Order"("deliveryBoyId");

-- CreateIndex
CREATE INDEX "OrderPayment_paymentMarkedById_idx" ON "OrderPayment"("paymentMarkedById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryBoyId_fkey" FOREIGN KEY ("deliveryBoyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_paymentMarkedById_fkey" FOREIGN KEY ("paymentMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
