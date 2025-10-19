import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

export class CreateConcreteMarkMaterialDto {
  @IsNumber()
  @IsNotEmpty()
  materialId: number;

  @IsNumber()
  @IsNotEmpty()
  quantityPerM3: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}



