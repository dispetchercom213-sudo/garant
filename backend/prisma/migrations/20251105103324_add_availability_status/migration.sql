-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('ONLINE', 'BREAK', 'LUNCH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'ONLINE';
