import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, UserRole, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  // Получить ID водителя по ID пользователя
  async getDriverIdByUserId(userId: number): Promise<number> {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    
    if (!driver) {
      throw new NotFoundException('Водитель не найден для данного пользователя');
    }
    
    return driver.id;
  }

  async create(createOrderDto: CreateOrderDto) {
    // Генерируем номер заказа
    const orderNumber = await this.generateOrderNumber();

    // Извлекаем дополнительные услуги из DTO
    const { additionalServices, ...orderData } = createOrderDto;

    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        orderNumber,
        // Добавляем дополнительные услуги, если они есть
        ...(additionalServices && additionalServices.length > 0 && {
          additionalServices: {
            create: additionalServices.map(service => ({
              additionalServiceId: service.additionalServiceId,
              quantity: service.quantity,
              price: service.price,
              totalAmount: service.quantity * service.price,
            })),
          },
        }),
      },
      include: {
        customer: true,
        concreteMark: {
          include: {
            materials: {
              include: {
                material: true,
              },
            },
          },
        },
        createdBy: true,
        approvedBy: true,
        invoices: true,
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });

    // Создаем уведомления для Директора, Снабженца и Диспетчера о новом заказе
    try {
      await this.notificationsService.createNotificationsForRoles(
        [UserRole.DIRECTOR, UserRole.SUPPLIER, UserRole.DISPATCHER],
        NotificationType.ORDER_CREATED,
        'Новый заказ создан',
        `Поступил новый заказ на доставку №${orderNumber}`,
        order.id,
        'order',
      );
    } catch (error) {
      console.error('Ошибка при создании уведомлений:', error);
    }

    return order;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, status?: OrderStatus, user?: any) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      deletedAt: null, // Исключаем удаленные заказы из основного списка
    };
    
    if (user) {
      // Проверяем, может ли пользователь видеть все заказы
      const canViewAll = ['DIRECTOR', 'DISPATCHER', 'ACCOUNTANT', 'OPERATOR', 'ADMIN', 'DEVELOPER'].includes(user.role);
      
      // Если явно указан флаг filterByUserId (для /orders/my) или это роль без полного доступа
      if (user.filterByUserId === true || !canViewAll) {
        // Фильтруем по ID пользователя
        const currentUserId = user.userId || user.id;
        if (currentUserId) {
          where.createdById = currentUserId;
        }
      }
      // Если canViewAll === true и filterByUserId !== true, не добавляем фильтр - показываем все заказы
    }
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { deliveryAddress: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: true,
          concreteMark: {
            include: {
              materials: {
                include: {
                  material: true,
                },
              },
            },
          },
          createdBy: true,
          approvedBy: true,
          invoices: {
            include: {
              driver: true,
              vehicle: true,
            },
          },
          additionalServices: {
            include: {
              additionalService: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Получить заказы водителя через накладные
  async getOrdersByDriver(
    driverId: number, 
    page: number = 1, 
    limit: number = 10, 
    search?: string, 
    status?: OrderStatus
  ) {
    const skip = (page - 1) * limit;

    // Получаем userId водителя для проверки созданных заказов
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { userId: true },
    });

    // Строим условие поиска
    const where: any = {
      AND: [
        // Базовое условие: заказы водителя ИЛИ созданные им
        {
          OR: [
            // Заказы, где водитель назначен через накладную
            {
              invoices: {
                some: {
                  driverId: driverId
                }
              }
            },
            // Заказы, которые водитель создал сам
            ...(driver?.userId ? [{
              createdById: driver.userId
            }] : [])
          ]
        }
      ]
    };
    
    // Добавляем поиск, если он есть
    if (search) {
      where.AND.push({
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' as const } },
          { deliveryAddress: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
          { customer: { name: { contains: search, mode: 'insensitive' as const } } },
          { concreteMark: { name: { contains: search, mode: 'insensitive' as const } } },
        ]
      });
    }
    
    // Добавляем фильтр по статусу
    if (status) {
      where.AND.push({ status });
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: true,
          concreteMark: {
            include: {
              materials: {
                include: {
                  material: true,
                },
              },
            },
          },
          createdBy: true,
          approvedBy: true,
          deletionRequestedBy: true,
          invoices: {
            include: {
              driver: true,
              vehicle: true,
            },
          },
          additionalServices: {
            include: {
              additionalService: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, includeDeleted: boolean = false) {
    const where: any = { id };
    if (!includeDeleted) {
      where.deletedAt = null; // Исключаем удаленные заказы по умолчанию
    }

    const order = await this.prisma.order.findUnique({
      where,
      include: {
        customer: true,
        concreteMark: {
          include: {
            materials: {
              include: {
                material: {
                  include: {
                    type: true,
                  },
                },
              },
            },
          },
        },
        createdBy: true,
        approvedBy: true,
        deletedBy: true,
        deletionRequestedBy: true,
        invoices: {
          include: {
            driver: {
              include: {
                user: true,
              },
            },
            vehicle: true,
            items: {
              include: {
                material: true,
              },
            },
          },
        },
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, userId: number) {
    const order = await this.findOne(id);

    // КРИТИЧЕСКИ ВАЖНО: quantityM3 заказа НИКОГДА не должен изменяться!
    // Это изначальный объем заказа, который устанавливается при создании и остается неизменным.
    if ('quantityM3' in updateOrderDto && (updateOrderDto as any).quantityM3 !== undefined) {
      throw new BadRequestException(
        'Изначальный объем заказа (quantityM3) не может быть изменен. ' +
        'Это значение устанавливается при создании заказа и остается постоянным.'
      );
    }

    // Только создатель может редактировать заказ
    if (order.createdById !== userId) {
      const creator = order.createdBy 
        ? `${order.createdBy.firstName} ${order.createdBy.lastName}` 
        : 'неизвестный пользователь';
      
      throw new BadRequestException(
        `Только создатель может редактировать заказ №${order.orderNumber}. ` +
        `Создатель заказа: ${creator}. ` +
        `Вы не можете изменять чужие заказы.`
      );
    }

    // Редактирование доступно только до принятия директором
    if (order.status !== OrderStatus.PENDING_DIRECTOR) {
      const statusNames = {
        WAITING_CREATOR_APPROVAL: 'ожидает подтверждения создателя',
        APPROVED_BY_DIRECTOR: 'одобрен директором',
        PENDING_DISPATCHER: 'ожидает диспетчера',
        DISPATCHED: 'отправлен',
        IN_DELIVERY: 'в доставке',
        DELIVERED: 'доставлен',
        COMPLETED: 'завершён',
        REJECTED: 'отклонён',
        CANCELED: 'отменён',
      };
      
      const statusText = statusNames[order.status] || order.status;
      
      let message = `Нельзя редактировать заказ №${order.orderNumber}. ` +
                   `Статус заказа: "${statusText}". `;
      
      if (order.approvedBy && order.approvedBy.firstName) {
        const approver = `${order.approvedBy.firstName} ${order.approvedBy.lastName || ''}`.trim();
        message += `Заказ уже принят (${approver}). `;
      } else if (order.approvedById) {
        message += `Заказ уже принят директором. `;
      }
      
      message += `Редактирование доступно только для заказов со статусом "ожидает директора".`;
      
      throw new BadRequestException(message);
    }

    // Явно исключаем quantityM3 из данных обновления (на случай если он каким-то образом попал в DTO)
    const { quantityM3, ...safeUpdateData } = updateOrderDto as any;
    
    if (quantityM3 !== undefined) {
      console.error('⚠️ КРИТИЧЕСКАЯ ОШИБКА: Попытка изменить quantityM3 заказа через update! Заказ ID:', id);
    }

    return this.prisma.order.update({
      where: { id },
      data: safeUpdateData,
      include: {
        customer: true,
        concreteMark: {
          include: {
            materials: {
              include: {
                material: true,
              },
            },
          },
        },
        createdBy: true,
        approvedBy: true,
        invoices: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });
  }

  // Удаление заказов полностью запрещено - все заказы сохраняются в истории
  async remove(id: number, userId: number, userRole: string) {
    throw new BadRequestException(
      'Удаление заказов полностью запрещено. Все заказы сохраняются в истории системы для аудита и отчетности. ' +
      'Для просмотра истории удаленных заказов используйте эндпоинт /orders/history/deleted.'
    );
  }

  // Удаление заказов полностью запрещено
  // Запросить удаление заказа (для принятых заказов)
  async requestDeletion(id: number, userId: number, userRole: string, reason: string) {
    throw new BadRequestException(
      'Удаление заказов полностью запрещено. Все заказы сохраняются в истории системы для аудита и отчетности.'
    );
  }

  // Удаление заказов полностью запрещено
  // Подтвердить удаление (директор/диспетчер/создатель)
  async approveDeletion(id: number, userId: number, userRole: string) {
    throw new BadRequestException(
      'Удаление заказов полностью запрещено. Все заказы сохраняются в истории системы для аудита и отчетности.'
    );
  }

  // Получить историю удаленных заказов
  async getDeletedOrdersHistory(page: number = 1, limit: number = 10, search?: string, user?: any) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      deletedAt: { not: null }, // Только удаленные заказы
    };
    
    if (user) {
      // Для менеджера показываем только его удаленные заказы
      const canViewAll = ['DIRECTOR', 'DISPATCHER', 'ACCOUNTANT', 'OPERATOR', 'ADMIN', 'DEVELOPER'].includes(user.role);
      
      if (!canViewAll || user.filterByUserId === true) {
        const currentUserId = user.userId || user.id;
        if (currentUserId) {
          where.createdById = currentUserId;
        }
      }
    }
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { deliveryAddress: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
        { deletionReason: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' }, // Сначала недавно удаленные
        include: {
          customer: true,
          concreteMark: true,
          createdBy: true,
          approvedBy: true,
          deletedBy: true,
          deletionRequestedBy: true,
          invoices: {
            include: {
              driver: true,
              vehicle: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Удаление заказов полностью запрещено
  // Отклонить запрос на удаление (любая из трех сторон)
  async rejectDeletion(id: number, userId: number, userRole: string) {
    throw new BadRequestException(
      'Удаление заказов полностью запрещено. Все заказы сохраняются в истории системы для аудита и отчетности.'
    );
  }

  async updateStatus(id: number, status: OrderStatus, userId?: number) {
    const order = await this.findOne(id);

    // КРИТИЧЕСКИ ВАЖНО: quantityM3 заказа НИКОГДА не должен изменяться!
    const updateData: any = { status };
    
    // Явно исключаем quantityM3 (на случай если он каким-то образом попал в updateData)
    if ('quantityM3' in updateData) {
      delete updateData.quantityM3;
      console.error('⚠️ КРИТИЧЕСКАЯ ОШИБКА: Попытка изменить quantityM3 заказа через updateStatus! Заказ ID:', id);
    }
    
    // Если директор одобряет заказ, устанавливаем approvedById
    if (status === OrderStatus.APPROVED_BY_DIRECTOR && userId) {
      updateData.approvedById = userId;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        invoices: true,
      },
    });

    // Создаем уведомления при изменении статуса
    try {
      if (status === OrderStatus.APPROVED_BY_DIRECTOR) {
        // Уведомление для бухгалтера о том, что заказ одобрен директором
        await this.notificationsService.createNotificationsForRoles(
          [UserRole.ACCOUNTANT],
          NotificationType.ORDER_APPROVED,
          'Заказ одобрен директором',
          `Директор одобрил заказ №${updatedOrder.orderNumber}`,
          updatedOrder.id,
          'order',
        );
      } else if (status === OrderStatus.COMPLETED) {
        // Уведомление для всех участников заказа о завершении
        const participantRoles: UserRole[] = [UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.SUPPLIER];
        if (updatedOrder.createdBy) {
          // Получаем роль создателя
          const creatorRole = updatedOrder.createdBy.role;
          if (!participantRoles.includes(creatorRole)) {
            participantRoles.push(creatorRole);
          }
        }
        await this.notificationsService.createNotificationsForRoles(
          participantRoles,
          NotificationType.ORDER_COMPLETED,
          'Заказ полностью выполнен',
          `Заказ №${updatedOrder.orderNumber} закрыт`,
          updatedOrder.id,
          'order',
        );
      }
    } catch (error) {
      console.error('Ошибка при создании уведомлений:', error);
    }

    return updatedOrder;
  }

  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),
    ]);

    const statusStats = byStatus.map(item => ({
      status: item.status,
      count: item._count.id,
    }));

    return {
      total,
      byStatus: statusStats,
    };
  }

  async getPendingOrders() {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING_DIRECTOR, OrderStatus.APPROVED_BY_DIRECTOR],
        },
      },
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        invoices: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getOrdersByCustomer(customerId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        include: {
          customer: true,
          concreteMark: true,
          createdBy: true,
          approvedBy: true,
          invoices: {
            include: {
              driver: true,
              vehicle: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Находим последний заказ за сегодня
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `${year}${month}${day}`,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${year}${month}${day}${String(sequence).padStart(4, '0')}`;
  }

  async calculateOrderMaterials(orderId: number) {
    const order = await this.findOne(orderId);
    
    return order.concreteMark.materials.map(item => ({
      material: item.material,
      quantityPerM3: item.quantityPerM3,
      totalQuantity: item.quantityPerM3 * order.quantityM3,
      unit: item.unit,
    }));
  }

  // Директор предлагает изменения в заказ
  async proposeChanges(orderId: number, proposeChangesDto: any, directorId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: true,
        approvedBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ №${orderId} не найден`);
    }

    if (order.status !== OrderStatus.PENDING_DIRECTOR) {
      const statusNames = {
        WAITING_CREATOR_APPROVAL: 'ожидает подтверждения создателя',
        APPROVED_BY_DIRECTOR: 'одобрен директором',
        PENDING_DISPATCHER: 'ожидает диспетчера',
        DISPATCHED: 'отправлен',
        IN_DELIVERY: 'в доставке',
        DELIVERED: 'доставлен',
        COMPLETED: 'завершён',
        REJECTED: 'отклонён',
        CANCELED: 'отменён',
        DRAFT: 'черновик',
      };
      
      const statusText = statusNames[order.status] || order.status;
      
      throw new BadRequestException(
        `Нельзя предложить изменения для заказа №${order.orderNumber}. ` +
        `Статус заказа: "${statusText}". ` +
        `Изменения можно предложить только для заказов со статусом "ожидает директора".`
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        proposedDeliveryDate: new Date(proposeChangesDto.deliveryDate),
        proposedDeliveryTime: proposeChangesDto.deliveryTime,
        proposedDeliveryAddress: proposeChangesDto.deliveryAddress,
        proposedCoordinates: proposeChangesDto.coordinates,
        changeReason: proposeChangesDto.changeReason,
        status: OrderStatus.WAITING_CREATOR_APPROVAL,
        approvedById: directorId,
        // Сохраняем примечания, если они были
        ...(proposeChangesDto.notes && { notes: proposeChangesDto.notes }),
      },
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });

    // Создаем уведомление для создателя заказа о предложенных изменениях
    try {
      if (updatedOrder.createdBy) {
        await this.notificationsService.createNotification(
          updatedOrder.createdBy.id,
          NotificationType.ORDER_APPROVED, // Можно использовать существующий тип или создать новый
          'Директор предложил изменения в заказ',
          `Директор предложил изменить параметры доставки для заказа №${updatedOrder.orderNumber}. Проверьте предложенные изменения и подтвердите или отклоните их.`,
          updatedOrder.id,
          'order',
        );
      }
    } catch (error) {
      console.error('Ошибка при создании уведомления о предложенных изменениях:', error);
      // Не прерываем выполнение, если уведомление не создалось
    }

    return updatedOrder;
  }

  // Создатель принимает предложенные изменения
  async acceptProposedChanges(orderId: number, creatorId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: true,
        approvedBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ №${orderId} не найден`);
    }

    if (order.createdById !== creatorId) {
      const creator = order.createdBy 
        ? `${order.createdBy.firstName} ${order.createdBy.lastName}` 
        : 'неизвестный пользователь';
      
      throw new BadRequestException(
        `Только создатель заказа может принимать изменения для заказа №${order.orderNumber}. ` +
        `Создатель: ${creator}.`
      );
    }

    if (order.status !== OrderStatus.WAITING_CREATOR_APPROVAL) {
      const statusNames = {
        PENDING_DIRECTOR: 'ожидает директора',
        APPROVED_BY_DIRECTOR: 'одобрен директором',
        PENDING_DISPATCHER: 'ожидает диспетчера',
        DISPATCHED: 'отправлен',
        IN_DELIVERY: 'в доставке',
        DELIVERED: 'доставлен',
        COMPLETED: 'завершён',
        REJECTED: 'отклонён',
        CANCELED: 'отменён',
      };
      
      const statusText = statusNames[order.status] || order.status;
      
      throw new BadRequestException(
        `Нет предложенных изменений для заказа №${order.orderNumber}. ` +
        `Статус заказа: "${statusText}". ` +
        `Принимать изменения можно только для заказов со статусом "ожидает подтверждения создателя".`
      );
    }

    // Применяем предложенные изменения к основным полям
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryDate: order.proposedDeliveryDate,
        deliveryTime: order.proposedDeliveryTime,
        deliveryAddress: order.proposedDeliveryAddress,
        coordinates: order.proposedCoordinates,
        // Очищаем предложенные изменения
        proposedDeliveryDate: null,
        proposedDeliveryTime: null,
        proposedDeliveryAddress: null,
        proposedCoordinates: null,
        changeReason: null,
        // Переводим в статус "Одобрен директором"
        status: OrderStatus.PENDING_DISPATCHER,
      },
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });
  }

  // Создатель отклоняет предложенные изменения (отменяет заказ)
  async rejectProposedChanges(orderId: number, creatorId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: true,
        approvedBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Заказ №${orderId} не найден`);
    }

    if (order.createdById !== creatorId) {
      const creator = order.createdBy 
        ? `${order.createdBy.firstName} ${order.createdBy.lastName}` 
        : 'неизвестный пользователь';
      
      throw new BadRequestException(
        `Только создатель заказа может отклонять изменения для заказа №${order.orderNumber}. ` +
        `Создатель: ${creator}.`
      );
    }

    if (order.status !== OrderStatus.WAITING_CREATOR_APPROVAL) {
      const statusNames = {
        PENDING_DIRECTOR: 'ожидает директора',
        APPROVED_BY_DIRECTOR: 'одобрен директором',
        PENDING_DISPATCHER: 'ожидает диспетчера',
        DISPATCHED: 'отправлен',
        IN_DELIVERY: 'в доставке',
        DELIVERED: 'доставлен',
        COMPLETED: 'завершён',
        REJECTED: 'отклонён',
        CANCELED: 'отменён',
      };
      
      const statusText = statusNames[order.status] || order.status;
      
      throw new BadRequestException(
        `Нет предложенных изменений для заказа №${order.orderNumber}. ` +
        `Статус заказа: "${statusText}". ` +
        `Отклонять изменения можно только для заказов со статусом "ожидает подтверждения создателя".`
      );
    }

    // Отменяем заказ
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELED,
        // Очищаем предложенные изменения
        proposedDeliveryDate: null,
        proposedDeliveryTime: null,
        proposedDeliveryAddress: null,
        proposedCoordinates: null,
        changeReason: null,
      },
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });
  }
}
