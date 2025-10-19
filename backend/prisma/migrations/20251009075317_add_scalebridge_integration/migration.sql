/*
  Warnings:

  - A unique constraint covering the columns `[licenseNumber]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstName` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Driver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "licenseExpiryDate" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "currentRole" "UserRole",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "cameraActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cameraUrl" TEXT,
ADD COLUMN     "hasScales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scaleActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scaleApiKey" TEXT,
ADD COLUMN     "scaleComPort" TEXT,
ADD COLUMN     "scaleDecimals" INTEGER DEFAULT 2,
ADD COLUMN     "scaleDriver" TEXT,
ADD COLUMN     "scaleIpAddress" TEXT,
ADD COLUMN     "scaleLastSeen" TIMESTAMP(3),
ADD COLUMN     "scalePolling" INTEGER DEFAULT 1000,
ADD COLUMN     "scaleStatus" TEXT DEFAULT 'disconnected',
ADD COLUMN     "scaleUrl" TEXT;

-- AlterTable
ALTER TABLE "WarehouseTransaction" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "ScaleFix" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "photoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScaleFix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScaleSetting" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "scaleIp" TEXT NOT NULL,
    "comPort" TEXT NOT NULL,
    "baudRate" INTEGER NOT NULL DEFAULT 9600,
    "dataBits" INTEGER NOT NULL DEFAULT 8,
    "parity" TEXT NOT NULL DEFAULT 'none',
    "stopBits" INTEGER NOT NULL DEFAULT 1,
    "backendUrl" TEXT,
    "apiKey" TEXT,
    "autoStart" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScaleSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScaleCameraSetting" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "weightType" TEXT NOT NULL,
    "cameraType" TEXT NOT NULL,
    "cameraDevice" INTEGER,
    "cameraUrl" TEXT,
    "cameraName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScaleCameraSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScaleFix_createdAt_idx" ON "ScaleFix"("createdAt");

-- CreateIndex
CREATE INDEX "ScaleFix_warehouseId_idx" ON "ScaleFix"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ScaleSetting_warehouseId_key" ON "ScaleSetting"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ScaleCameraSetting_warehouseId_weightType_cameraType_camera_key" ON "ScaleCameraSetting"("warehouseId", "weightType", "cameraType", "cameraDevice");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_licenseNumber_key" ON "Driver"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScaleFix" ADD CONSTRAINT "ScaleFix_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScaleSetting" ADD CONSTRAINT "ScaleSetting_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScaleCameraSetting" ADD CONSTRAINT "ScaleCameraSetting_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
