-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "arrivedPlantLatitude" DOUBLE PRECISION,
ADD COLUMN     "arrivedPlantLongitude" DOUBLE PRECISION,
ADD COLUMN     "arrivedSiteLatitude" DOUBLE PRECISION,
ADD COLUMN     "arrivedSiteLongitude" DOUBLE PRECISION,
ADD COLUMN     "departedSiteLatitude" DOUBLE PRECISION,
ADD COLUMN     "departedSiteLongitude" DOUBLE PRECISION,
ADD COLUMN     "driverAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "totalDistanceKm" DOUBLE PRECISION;
