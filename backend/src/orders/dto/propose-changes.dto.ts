import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ProposeChangesDto {
  @IsNotEmpty()
  @IsString()
  deliveryDate: string;

  @IsNotEmpty()
  @IsString()
  deliveryTime: string;

  @IsNotEmpty()
  @IsString()
  deliveryAddress: string;

  @IsOptional()
  @IsString()
  coordinates?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsString()
  changeReason: string; // Причина предложенных изменений
}



