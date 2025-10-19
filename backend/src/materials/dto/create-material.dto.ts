import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { MaterialTypeEnum } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsEnum(MaterialTypeEnum)
  typeName: MaterialTypeEnum;
}



