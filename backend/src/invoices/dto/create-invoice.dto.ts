import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { InvoiceType } from '@prisma/client';

export class CreateInvoiceDto {
  @IsEnum(InvoiceType)
  type: InvoiceType;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsNumber()
  concreteMarkId?: number;

  @IsOptional()
  @IsNumber()
  orderId?: number;

  @IsOptional()
  @IsString()
  departureAddress?: string;

  @IsOptional()
  @IsNumber()
  latitudeFrom?: number;

  @IsOptional()
  @IsNumber()
  longitudeFrom?: number;

  @IsOptional()
  @IsNumber()
  latitudeTo?: number;

  @IsOptional()
  @IsNumber()
  longitudeTo?: number;

  @IsOptional()
  @IsNumber()
  warehouseId?: number;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  driverId?: number;

  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @IsOptional()
  @IsNumber()
  dispatcherId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  createdById?: number;

  // Для приходных накладных
  @IsOptional()
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsDateString()
  grossWeightAt?: Date;

  @IsOptional()
  @IsNumber()
  tareWeightKg?: number;

  @IsOptional()
  @IsDateString()
  tareWeightAt?: Date;

  @IsOptional()
  @IsNumber()
  netWeightKg?: number;

  @IsOptional()
  @IsNumber()
  moisturePercent?: number;

  @IsOptional()
  @IsString()
  receivedByFio?: string;

  @IsOptional()
  @IsString()
  sealNumbers?: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsOptional()
  @IsDateString()
  departedPlantAt?: Date;

  @IsOptional()
  @IsDateString()
  arrivedSiteAt?: Date;

  @IsOptional()
  @IsDateString()
  departedSiteAt?: Date;

  @IsOptional()
  @IsNumber()
  slumpValue?: number;

  @IsOptional()
  @IsNumber()
  quantityM3?: number;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsString()
  releasedByFio?: string;

  @IsOptional()
  @IsNumber()
  basePricePerM3?: number;

  @IsOptional()
  @IsNumber()
  salePricePerM3?: number;

  @IsOptional()
  @IsNumber()
  managerProfit?: number;

  @IsOptional()
  @IsNumber()
  vatRate?: number; // Ставка НДС в процентах

  @IsOptional()
  @IsNumber()
  vatAmount?: number; // Сумма НДС

  @IsOptional()
  @IsNumber()
  materialId?: number;

  @IsOptional()
  @IsNumber()
  correctedWeightKg?: number;
}

