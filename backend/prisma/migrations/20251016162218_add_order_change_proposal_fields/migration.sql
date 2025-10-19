-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'WAITING_CREATOR_APPROVAL';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "changeReason" TEXT,
ADD COLUMN     "proposedCoordinates" TEXT,
ADD COLUMN     "proposedDeliveryAddress" TEXT,
ADD COLUMN     "proposedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "proposedDeliveryTime" TEXT;
