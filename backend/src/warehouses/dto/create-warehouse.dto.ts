import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPhoneNumber, IsBoolean } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  // ScaleBridge интеграция
  @IsOptional()
  @IsBoolean()
  hasScales?: boolean;

  @IsOptional()
  @IsString()
  scaleIpAddress?: string;

  @IsOptional()
  @IsString()
  scaleApiKey?: string;

  @IsOptional()
  @IsString()
  scaleComPort?: string;

  @IsOptional()
  @IsString()
  scaleStatus?: string;

  @IsOptional()
  @IsBoolean()
  hasCamera?: boolean;
}



