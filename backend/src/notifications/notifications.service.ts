import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType, UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Создать уведомление для пользователя
   */
  async createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: number,
    relatedType?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
        relatedType,
      },
    });
  }

  /**
   * Создать уведомления для пользователей по ролям
   */
  async createNotificationsForRoles(
    roles: UserRole[],
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: number,
    relatedType?: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: roles },
        status: 'ACTIVE',
      },
    });

    console.log(`📧 Создание уведомлений для ролей: ${roles.join(', ')}`);
    console.log(`👥 Найдено пользователей: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });

    const notifications = users.map((user) =>
      this.createNotification(user.id, type, title, message, relatedId, relatedType),
    );

    const result = await Promise.all(notifications);
    console.log(`✅ Создано ${result.length} уведомлений`);
    return result;
  }

  /**
   * Получить все уведомления пользователя
   */
  async getUserNotifications(userId: number, unreadOnly: boolean = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Получить количество непрочитанных уведомлений по типу связанного объекта
   */
  async getUnreadCountByType(userId: number, relatedType: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        relatedType,
      },
    });
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(notificationId: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Проверка безопасности: пользователь может отметить только свои уведомления
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Отметить все уведомления пользователя как прочитанные
   */
  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Отметить уведомления по типу связанного объекта как прочитанные
   */
  async markAsReadByType(userId: number, relatedType: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        relatedType,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Удалить уведомление
   */
  async delete(notificationId: number, userId: number) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Проверка безопасности
      },
    });
  }
}

