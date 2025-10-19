import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      console.log('🔓 RolesGuard: нет требований к ролям, доступ разрешен');
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Используем currentRole для переключения ролей
    const userRole = user.currentRole || user.role;
    
    const hasAccess = requiredRoles.some((role) => userRole === role);
    
    console.log('🔐 RolesGuard проверка:', {
      requiredRoles,
      userRole,
      user: { username: user.username, role: user.role, currentRole: user.currentRole },
      hasAccess
    });
    
    return hasAccess;
  }
}



