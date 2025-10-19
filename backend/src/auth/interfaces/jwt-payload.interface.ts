import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: number; // user id
  login: string;
  role: UserRole;
  activeRole: UserRole; // Для developer режима
}



