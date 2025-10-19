-- CreateTable
CREATE TABLE "AdditionalService" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAdditionalService" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "additionalServiceId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAdditionalService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalService_name_key" ON "AdditionalService"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAdditionalService_orderId_additionalServiceId_key" ON "OrderAdditionalService"("orderId", "additionalServiceId");

-- AddForeignKey
ALTER TABLE "OrderAdditionalService" ADD CONSTRAINT "OrderAdditionalService_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdditionalService" ADD CONSTRAINT "OrderAdditionalService_additionalServiceId_fkey" FOREIGN KEY ("additionalServiceId") REFERENCES "AdditionalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
