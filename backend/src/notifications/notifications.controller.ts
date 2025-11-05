import { Controller, Get, Patch, Param, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Получить все уведомления текущего пользователя
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.SUPPLIER,
    UserRole.CLIENT,
  )
  async getMyNotifications(@Request() req, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.user.userId || req.user.id;
    const unread = unreadOnly === 'true';
    return this.notificationsService.getUserNotifications(userId, unread);
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  @Get('unread-count')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.SUPPLIER,
    UserRole.CLIENT,
  )
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId || req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Получить количество непрочитанных уведомлений по типу
   */
  @Get('unread-count/:type')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.SUPPLIER,
    UserRole.CLIENT,
  )
  async getUnreadCountByType(@Request() req, @Param('type') type: string) {
    const userId = req.user.userId || req.user.id;
    const count = await this.notificationsService.getUnreadCountByType(userId, type);
    return { count };
  }

  /**
   * Отметить уведомление как прочитанное
   */
  @Patch(':id/read')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.SUPPLIER,
    UserRole.CLIENT,
  )
  async markAsRead(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.id;
    await this.notificationsService.markAsRead(parseInt(id, 10), userId);
    return { success: true };
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  @Patch('mark-all-read')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.SUPPLIER,
    UserRole.CLIENT,
  )
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId || req.user.id;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * Отметить уведомления по типу как прочитанные (например, при открытии раздела)
   */
  @Patch('mark-read-by-type/:type')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.OPERATOR,
    UserRole.DRIVER,
    UserRole.SUPPLIER,
    UserRole.CLIENT,
  )
  async markAsReadByType(@Request() req, @Param('type') type: string) {
    const userId = req.user.userId || req.user.id;
    await this.notificationsService.markAsReadByType(userId, type);
    return { success: true };
  }
}

