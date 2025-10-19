import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentType } from '@prisma/client';

export class OrderAdditionalServiceDto {
  @IsNumber()
  additionalServiceId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class CreateOrderDto {
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @IsNumber()
  @IsNotEmpty()
  concreteMarkId: number;

  @IsNumber()
  @IsNotEmpty()
  quantityM3: number;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsDateString()
  @IsNotEmpty()
  deliveryDate: string;

  @IsString()
  @IsNotEmpty()
  deliveryTime: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsOptional()
  @IsString()
  coordinates?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  @IsNotEmpty()
  createdById: number;

  @IsOptional()
  @IsNumber()
  approvedById?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAdditionalServiceDto)
  additionalServices?: OrderAdditionalServiceDto[];
}

