import { IsNumber, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateInvoiceItemDto {
  @IsNumber()
  @IsNotEmpty()
  materialId: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;
}



