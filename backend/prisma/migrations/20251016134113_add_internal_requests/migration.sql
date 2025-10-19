-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'WAITING_DIRECTOR', 'APPROVED', 'REJECTED', 'WAITING_ACCOUNTANT', 'FUNDED', 'PURCHASED', 'DELIVERED');

-- CreateTable
CREATE TABLE "InternalRequest" (
    "id" SERIAL NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT,
    "supplier" TEXT,
    "price" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "warehouseId" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "directorDecision" TEXT,
    "accountantApproved" BOOLEAN NOT NULL DEFAULT false,
    "receiverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" TEXT,
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalRequest_requestNumber_key" ON "InternalRequest"("requestNumber");

-- AddForeignKey
ALTER TABLE "InternalRequest" ADD CONSTRAINT "InternalRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalRequest" ADD CONSTRAINT "InternalRequest_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
