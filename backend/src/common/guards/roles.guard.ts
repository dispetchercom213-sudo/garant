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
    
    // Проверяем, что пользователь аутентифицирован
    if (!user) {
      console.error('❌ RolesGuard: пользователь не найден в запросе');
      return false;
    }
    
    // Используем основную role пользователя (функциональность смены роли удалена)
    const userRole = user.role;
    
    if (!userRole) {
      console.error('❌ RolesGuard: роль пользователя не найдена', { user });
      return false;
    }
    
    const hasAccess = requiredRoles.some((role) => userRole === role);
    
    console.log('🔐 RolesGuard проверка:', {
      requiredRoles,
      userRole,
      user: { 
        username: user.username, 
        userId: user.userId || user.id,
        role: user.role
      },
      hasAccess,
      endpoint: context.switchToHttp().getRequest().url
    });
    
    if (!hasAccess) {
      console.warn(`⚠️ RolesGuard: доступ запрещен. Требуется: ${requiredRoles.join(', ')}, есть: ${userRole}`);
    }
    
    return hasAccess;
  }
}



