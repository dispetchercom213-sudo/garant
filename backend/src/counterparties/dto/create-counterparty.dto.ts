import { IsString, IsNotEmpty, IsOptional, IsEnum, IsPhoneNumber } from 'class-validator';
import { CounterpartyKind, CounterpartyType } from '@prisma/client';

export class CreateCounterpartyDto {
  @IsEnum(CounterpartyKind)
  kind: CounterpartyKind;

  @IsEnum(CounterpartyType)
  type: CounterpartyType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  binOrIin?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  representativeName?: string;

  @IsOptional()
  @IsString()
  representativePhone?: string;
}



