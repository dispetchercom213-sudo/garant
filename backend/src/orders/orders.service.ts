import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.order.create({
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
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, status?: OrderStatus, user?: any) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    // Только Директор, Диспетчер, Бухгалтер, Оператор видят все заказы
    // Остальные (Менеджер, Водитель, Снабженец) видят только свои созданные заказы
    const canViewAll = user && ['DIRECTOR', 'DISPATCHER', 'ACCOUNTANT', 'OPERATOR', 'ADMIN', 'DEVELOPER'].includes(user.role);
    
    if (user && !canViewAll) {
      // Менеджер и другие видят только свои созданные заказы
      const currentUserId = user.userId || user.id;
      where.createdById = currentUserId;
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

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
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

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
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

  async remove(id: number, userId: number, userRole: string) {
    const order = await this.findOne(id);

    // Проверяем права на удаление - только создатель, директор, диспетчер или админ
    const canDelete = 
      userRole === 'ADMIN' || 
      userRole === 'DEVELOPER' ||
      order.createdById === userId || // Создатель
      userRole === 'DIRECTOR' ||       // Директор
      userRole === 'DISPATCHER';       // Диспетчер

    if (!canDelete) {
      throw new BadRequestException('У вас нет прав на удаление этого заказа');
    }

    // Статусы, для которых можно удалить сразу (до принятия директором)
    const canDeleteDirectly: OrderStatus[] = [
      OrderStatus.DRAFT,
      OrderStatus.PENDING_DIRECTOR,
      OrderStatus.WAITING_CREATOR_APPROVAL,
      OrderStatus.REJECTED,
      OrderStatus.CANCELED,
    ];

    // Если заказ уже принят - нельзя удалить напрямую
    if (!canDeleteDirectly.includes(order.status as OrderStatus)) {
      const statusNames = {
        PENDING_DISPATCHER: 'ожидает диспетчера',
        DISPATCHED: 'отправлен',
        IN_DELIVERY: 'в доставке',
        DELIVERED: 'доставлен',
        COMPLETED: 'завершён',
        APPROVED_BY_DIRECTOR: 'одобрен директором',
      };
      
      const statusText = statusNames[order.status] || order.status;
      
      throw new BadRequestException(
        `Нельзя напрямую удалить заказ №${order.orderNumber}. ` +
        `Статус заказа: "${statusText}". ` +
        `Для удаления принятого заказа нужно подтверждение от директора, диспетчера и создателя. ` +
        `Используйте кнопку "Запросить удаление".`
      );
    }

    // Проверяем, что у заказа нет связанных накладных
    const relatedData = await this.prisma.order.findUnique({
      where: { id },
      include: {
        invoices: true,
      },
    });

    if (relatedData.invoices && relatedData.invoices.length > 0) {
      throw new BadRequestException(
        `Нельзя удалить заказ №${order.orderNumber}. ` +
        `К нему привязаны накладные (${relatedData.invoices.length} шт). ` +
        `Сначала удалите все накладные.`
      );
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return { message: 'Заказ успешно удалён' };
  }

  // Запросить удаление заказа (для принятых заказов)
  async requestDeletion(id: number, userId: number, userRole: string, reason: string) {
    const order = await this.findOne(id);

    // Проверяем права: директор, диспетчер или создатель
    const canRequest = 
      userRole === 'ADMIN' || 
      userRole === 'DEVELOPER' ||
      order.createdById === userId ||
      userRole === 'DIRECTOR' ||
      userRole === 'DISPATCHER';

    if (!canRequest) {
      throw new BadRequestException('У вас нет прав на запрос удаления этого заказа');
    }

    // Проверяем, что заказ уже принят (нельзя запросить удаление для непринятых)
    const canRequestDeletion: OrderStatus[] = [
      OrderStatus.PENDING_DISPATCHER,
      OrderStatus.DISPATCHED,
      OrderStatus.IN_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    if (!canRequestDeletion.includes(order.status as OrderStatus)) {
      const statusNames = {
        PENDING_DIRECTOR: 'ожидает директора',
        WAITING_CREATOR_APPROVAL: 'ожидает подтверждения создателя',
        REJECTED: 'отклонён',
        CANCELED: 'отменён',
      };
      
      const statusText = statusNames[order.status] || order.status;
      
      throw new BadRequestException(
        `Запрос на удаление недоступен для заказа №${order.orderNumber}. ` +
        `Статус заказа: "${statusText}". ` +
        `Для таких заказов используйте обычное удаление.`
      );
    }

    // Проверяем, нет ли уже запроса
    if (order.deletionRequestedById) {
      const requester = order.deletionRequestedBy 
        ? `${order.deletionRequestedBy.firstName} ${order.deletionRequestedBy.lastName}`
        : 'неизвестный пользователь';
      
      const approvals = [];
      if (order.directorApprovedDeletion) approvals.push('директор');
      if (order.dispatcherApprovedDeletion) approvals.push('диспетчер');
      if (order.creatorApprovedDeletion) approvals.push('создатель');
      
      const pending = [];
      if (!order.directorApprovedDeletion) pending.push('директора');
      if (!order.dispatcherApprovedDeletion) pending.push('диспетчера');
      if (!order.creatorApprovedDeletion) pending.push('создателя');
      
      throw new BadRequestException(
        `Запрос на удаление заказа №${order.orderNumber} уже отправлен (${requester}). ` +
        `Подтвердили: ${approvals.join(', ') || 'никто'}. ` +
        `Ожидается подтверждение от: ${pending.join(', ')}.`
      );
    }

    // Проверяем накладные
    if (order.invoices && order.invoices.length > 0) {
      throw new BadRequestException(
        `Нельзя удалить заказ №${order.orderNumber}. ` +
        `К нему привязаны накладные (${order.invoices.length} шт). ` +
        `Сначала удалите все накладные.`
      );
    }

    // Автоматически проставляем подтверждение от инициатора запроса
    const updateData: any = {
      deletionRequestedById: userId,
      deletionReason: reason,
      deletionRequestedAt: new Date(),
    };

    // Инициатор автоматически подтверждает
    if (userRole === 'DIRECTOR') {
      updateData.directorApprovedDeletion = true;
    } else if (userRole === 'DISPATCHER') {
      updateData.dispatcherApprovedDeletion = true;
    } else if (order.createdById === userId) {
      updateData.creatorApprovedDeletion = true;
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        deletionRequestedBy: true,
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });
  }

  // Подтвердить удаление (директор/диспетчер/создатель)
  async approveDeletion(id: number, userId: number, userRole: string) {
    const order = await this.findOne(id);

    if (!order.deletionRequestedById) {
      throw new BadRequestException(
        `Нет запроса на удаление для заказа №${order.orderNumber}. ` +
        `Сначала создайте запрос на удаление.`
      );
    }

    if (order.invoices && order.invoices.length > 0) {
      throw new BadRequestException(
        `Нельзя удалить заказ №${order.orderNumber}. ` +
        `К нему привязаны накладные (${order.invoices.length} шт). ` +
        `Сначала удалите все накладные.`
      );
    }

    const updateData: any = {};

    // Проставляем подтверждение в зависимости от роли
    if (userRole === 'DIRECTOR') {
      if (order.directorApprovedDeletion) {
        throw new BadRequestException(
          `Вы (директор) уже подтвердили удаление заказа №${order.orderNumber}.`
        );
      }
      updateData.directorApprovedDeletion = true;
    } else if (userRole === 'DISPATCHER') {
      if (order.dispatcherApprovedDeletion) {
        throw new BadRequestException(
          `Вы (диспетчер) уже подтвердили удаление заказа №${order.orderNumber}.`
        );
      }
      updateData.dispatcherApprovedDeletion = true;
    } else if (order.createdById === userId) {
      if (order.creatorApprovedDeletion) {
        throw new BadRequestException(
          `Вы (создатель) уже подтвердили удаление заказа №${order.orderNumber}.`
        );
      }
      updateData.creatorApprovedDeletion = true;
    } else {
      throw new BadRequestException('У вас нет прав на подтверждение удаления этого заказа');
    }

    // Обновляем заказ
    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        deletionRequestedBy: true,
        additionalServices: {
          include: {
            additionalService: true,
          },
        },
      },
    });

    // Проверяем, все ли три стороны подтвердили
    const allApproved = 
      updated.directorApprovedDeletion && 
      updated.dispatcherApprovedDeletion && 
      updated.creatorApprovedDeletion;

    if (allApproved) {
      // Все подтвердили - удаляем заказ
      await this.prisma.order.delete({
        where: { id },
      });

      return { message: 'Заказ удалён (все три стороны подтвердили)', deleted: true };
    }

    return { message: 'Ваше подтверждение принято. Ожидаем подтверждения от остальных', order: updated, deleted: false };
  }

  // Отклонить запрос на удаление (любая из трех сторон)
  async rejectDeletion(id: number, userId: number, userRole: string) {
    const order = await this.findOne(id);

    if (!order.deletionRequestedById) {
      throw new BadRequestException('Нет запроса на удаление для этого заказа');
    }

    // Проверяем права: директор, диспетчер или создатель могут отклонить
    const canReject = 
      userRole === 'DIRECTOR' ||
      userRole === 'DISPATCHER' ||
      order.createdById === userId;

    if (!canReject) {
      throw new BadRequestException('У вас нет прав на отклонение этого запроса');
    }

    // Сбрасываем все поля запроса на удаление
    return this.prisma.order.update({
      where: { id },
      data: {
        deletionRequestedById: null,
        deletionReason: null,
        deletionRequestedAt: null,
        directorApprovedDeletion: false,
        dispatcherApprovedDeletion: false,
        creatorApprovedDeletion: false,
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

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
        approvedBy: true,
        invoices: true,
      },
    });
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

    return this.prisma.order.update({
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
