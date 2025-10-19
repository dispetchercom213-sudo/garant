import { IsEnum, IsNumber } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SwitchRoleDto {
  @IsNumber()
  userId: number;

  @IsEnum(UserRole)
  role: UserRole;
}