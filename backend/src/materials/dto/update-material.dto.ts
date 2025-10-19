import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialDto } from './create-material.dto';

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {
  // Все поля из CreateMaterialDto уже включены через PartialType
}

