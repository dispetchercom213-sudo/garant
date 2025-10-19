import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateAdditionalServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}



