import { IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateDriverWeighingHistoryDto {
  @IsNumber()
  warehouseId: number;

  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  materialId?: number;

  @IsOptional()
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsNumber()
  tareWeightKg?: number;

  @IsOptional()
  @IsNumber()
  netWeightKg?: number;

  @IsOptional()
  @IsDateString()
  grossWeightAt?: Date;

  @IsOptional()
  @IsDateString()
  tareWeightAt?: Date;

  @IsOptional()
  @IsNumber()
  invoiceId?: number;
}
