import { PartialType } from '@nestjs/mapped-types';
import { CreateConcreteMarkDto } from './create-concrete-mark.dto';

export class UpdateConcreteMarkDto extends PartialType(CreateConcreteMarkDto) {}



