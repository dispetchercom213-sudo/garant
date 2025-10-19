-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "creatorApprovedDeletion" BOOLEAN DEFAULT false,
ADD COLUMN     "directorApprovedDeletion" BOOLEAN DEFAULT false,
ADD COLUMN     "dispatcherApprovedDeletion" BOOLEAN DEFAULT false;
