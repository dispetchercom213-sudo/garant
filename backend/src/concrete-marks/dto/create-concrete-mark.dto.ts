import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateConcreteMarkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}



