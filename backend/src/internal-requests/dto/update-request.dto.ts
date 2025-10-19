import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateInternalRequestDto {
  @IsString()
  @IsOptional()
  supplier?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  directorDecision?: string;
}


