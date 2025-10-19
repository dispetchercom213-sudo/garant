import { PartialType } from '@nestjs/mapped-types';
import { CreateAdditionalServiceDto } from './create-additional-service.dto';

export class UpdateAdditionalServiceDto extends PartialType(CreateAdditionalServiceDto) {}



