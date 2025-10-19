-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "driverId" INTEGER;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
