import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateInternalRequestDto } from './dto/create-request.dto';
import { UpdateInternalRequestDto } from './dto/update-request.dto';
import { RequestStatus, UserRole, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InternalRequestsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  // Генерация номера заявки
  private async generateRequestNumber(): Promise<string> {
    const lastRequest = await this.prisma.internalRequest.findFirst({
      orderBy: { id: 'desc' },
      select: { requestNumber: true },
    });

    if (!lastRequest) {
      return 'ЗВ-0001';
    }

    const lastNumber = parseInt(lastRequest.requestNumber.split('-')[1]);
    const newNumber = (lastNumber + 1).toString().padStart(4, '0');
    return `ЗВ-${newNumber}`;
  }

  // Добавление записи в историю
  private addHistory(request: any, action: string, userName: string) {
    const history = request.history || [];
    history.push({
      step: action,
      user: userName,
      date: new Date().toISOString(),
    });
    return history;
  }

  // Создание заявки сотрудником
  async create(employeeId: number, createDto: CreateInternalRequestDto, userName: string) {
    const requestNumber = await this.generateRequestNumber();

    const history = [{
      step: 'CREATED',
      user: userName,
      date: new Date().toISOString(),
    }];

    return this.prisma.internalRequest.create({
      data: {
        requestNumber,
        employeeId,
        itemName: createDto.itemName,
        quantity: createDto.quantity,
        unit: createDto.unit,
        reason: createDto.reason,
        warehouseId: createDto.warehouseId,
        status: RequestStatus.NEW,
        currentStep: 'Ожидает снабженца',
        history,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        warehouse: true,
      },
    });
  }

  // Получить МОИ заявки (для всех ролей)
  async findMy(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.internalRequest.findMany({
        where: { employeeId: userId },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.internalRequest.count({
        where: { employeeId: userId },
      }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Получить все заявки (с фильтрацией по роли)
  async findAll(userId: number, userRole: UserRole, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    let where: any = {};

    // Фильтрация по роли
    if (userRole === UserRole.DEVELOPER || userRole === UserRole.ADMIN) {
      // Админ и разработчик видят все
      where = {};
    } else if (userRole === UserRole.MANAGER || userRole === UserRole.OPERATOR || userRole === UserRole.DRIVER || userRole === UserRole.DISPATCHER) {
      // Обычные сотрудники видят только свои заявки
      where.employeeId = userId;
    } else if (userRole === UserRole.SUPPLIER) {
      // Снабженец видит NEW и FUNDED заявки
      where.OR = [
        { status: RequestStatus.NEW },
        { status: RequestStatus.UNDER_REVIEW },
        { status: RequestStatus.FUNDED },
      ];
    } else if (userRole === UserRole.DIRECTOR) {
      // Директор видит заявки на утверждение
      where.status = RequestStatus.WAITING_DIRECTOR;
    } else if (userRole === UserRole.ACCOUNTANT) {
      // Бухгалтер видит одобренные заявки
      where.status = RequestStatus.WAITING_ACCOUNTANT;
    }

    const [requests, total] = await Promise.all([
      this.prisma.internalRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.internalRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Получить одну заявку
  async findOne(id: number) {
    const request = await this.prisma.internalRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        warehouse: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    return request;
  }

  // Снабженец заполняет цену и поставщика
  async supplyFill(id: number, updateDto: UpdateInternalRequestDto, userName: string) {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.NEW && request.status !== RequestStatus.UNDER_REVIEW) {
      throw new BadRequestException('Заявка уже обработана или в другом статусе');
    }

    const totalAmount = updateDto.price ? updateDto.price * request.quantity : null;
    const history = this.addHistory(request, 'SUPPLY_FILLED', userName);

    return this.prisma.internalRequest.update({
      where: { id },
      data: {
        supplier: updateDto.supplier,
        price: updateDto.price,
        totalAmount,
        status: RequestStatus.WAITING_DIRECTOR,
        currentStep: 'На утверждении у директора',
        history,
      },
      include: {
        employee: true,
        warehouse: true,
      },
    });
  }

  // Директор утверждает или отклоняет
  async directorDecision(id: number, approved: boolean, decision: string, userName: string) {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.WAITING_DIRECTOR) {
      throw new BadRequestException('Заявка не находится на утверждении');
    }

    const history = this.addHistory(
      request,
      approved ? 'DIRECTOR_APPROVED' : 'DIRECTOR_REJECTED',
      userName
    );

    return this.prisma.internalRequest.update({
      where: { id },
      data: {
        status: approved ? RequestStatus.WAITING_ACCOUNTANT : RequestStatus.REJECTED,
        directorDecision: decision,
        currentStep: approved ? 'Ожидает финансирование' : 'Отклонена директором',
        history,
      },
      include: {
        employee: true,
        warehouse: true,
      },
    });
  }

  // Бухгалтер выделяет средства
  async accountantFund(id: number, userName: string) {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.WAITING_ACCOUNTANT) {
      throw new BadRequestException('Заявка не ожидает финансирования');
    }

    const history = this.addHistory(request, 'ACCOUNTANT_FUNDED', userName);

    const updatedRequest = await this.prisma.internalRequest.update({
      where: { id },
      data: {
        accountantApproved: true,
        status: RequestStatus.FUNDED,
        currentStep: 'Средства выделены, ожидает закупки',
        history,
      },
      include: {
        employee: true,
        warehouse: true,
      },
    });

    // Создаем уведомление для снабженца о выделении средств
    try {
      // Если это заявка связана с заказом, получаем создателя заказа
      if (updatedRequest.employee?.role === UserRole.SUPPLIER) {
        await this.notificationsService.createNotification(
          updatedRequest.employee.id,
          NotificationType.FUNDS_ALLOCATED,
          'Средства выделены бухгалтером',
          `Выделены деньги по заказу №${updatedRequest.id}`,
          updatedRequest.id,
          'order',
        );
      } else {
        // Или отправляем всем снабженцам
        await this.notificationsService.createNotificationsForRoles(
          [UserRole.SUPPLIER],
          NotificationType.FUNDS_ALLOCATED,
          'Средства выделены бухгалтером',
          `Выделены деньги по заявке №${updatedRequest.id}`,
          updatedRequest.id,
          'order',
        );
      }
    } catch (error) {
      console.error('Ошибка при создании уведомления о выделении средств:', error);
    }

    return updatedRequest;
  }

  // Снабженец отмечает закупку
  async markPurchased(id: number, userName: string) {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.FUNDED) {
      throw new BadRequestException('Заявка не готова к закупке');
    }

    const history = this.addHistory(request, 'PURCHASED', userName);

    return this.prisma.internalRequest.update({
      where: { id },
      data: {
        status: RequestStatus.PURCHASED,
        currentStep: 'Закуплено, ожидает выдачи сотруднику',
        history,
      },
      include: {
        employee: true,
        warehouse: true,
      },
    });
  }

  // Сотрудник подтверждает получение
  async confirmReceive(id: number, employeeId: number, userName: string) {
    const request = await this.findOne(id);

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('Вы не можете подтвердить получение чужой заявки');
    }

    if (request.status !== RequestStatus.PURCHASED) {
      throw new BadRequestException('Заявка еще не закуплена');
    }

    const history = this.addHistory(request, 'DELIVERED', userName);

    return this.prisma.internalRequest.update({
      where: { id },
      data: {
        receiverConfirmed: true,
        status: RequestStatus.DELIVERED,
        currentStep: 'Завершено',
        history,
      },
      include: {
        employee: true,
        warehouse: true,
      },
    });
  }

  // Статистика
  async getStats() {
    const [total, newRequests, approved, rejected, completed] = await Promise.all([
      this.prisma.internalRequest.count(),
      this.prisma.internalRequest.count({ where: { status: RequestStatus.NEW } }),
      this.prisma.internalRequest.count({ where: { status: RequestStatus.APPROVED } }),
      this.prisma.internalRequest.count({ where: { status: RequestStatus.REJECTED } }),
      this.prisma.internalRequest.count({ where: { status: RequestStatus.DELIVERED } }),
    ]);

    return {
      total,
      newRequests,
      approved,
      rejected,
      completed,
    };
  }
}


