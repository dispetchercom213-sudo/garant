-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deletionRequestedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deletionRequestedById_fkey" FOREIGN KEY ("deletionRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
