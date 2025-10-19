-- CreateTable
CREATE TABLE "DriverWeighingHistory" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "vehicleId" INTEGER,
    "supplierId" INTEGER,
    "companyId" INTEGER,
    "materialId" INTEGER,
    "grossWeightKg" DOUBLE PRECISION,
    "tareWeightKg" DOUBLE PRECISION,
    "netWeightKg" DOUBLE PRECISION,
    "grossWeightAt" TIMESTAMP(3),
    "tareWeightAt" TIMESTAMP(3),
    "invoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWeighingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverWeighingHistory_driverId_idx" ON "DriverWeighingHistory"("driverId");

-- CreateIndex
CREATE INDEX "DriverWeighingHistory_createdAt_idx" ON "DriverWeighingHistory"("createdAt");

-- CreateIndex
CREATE INDEX "DriverWeighingHistory_warehouseId_idx" ON "DriverWeighingHistory"("warehouseId");

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWeighingHistory" ADD CONSTRAINT "DriverWeighingHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
