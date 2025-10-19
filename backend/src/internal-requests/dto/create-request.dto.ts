import { IsNotEmpty, IsString, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateInternalRequestDto {
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsInt()
  @IsOptional()
  warehouseId?: number;
}


