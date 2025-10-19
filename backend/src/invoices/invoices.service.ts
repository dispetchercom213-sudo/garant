import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';
import { InvoiceType } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // Получить ID водителя по ID пользователя
  async getDriverIdByUserId(userId: number): Promise<number> {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    
    if (!driver) {
      console.error(`❌ Водитель не найден для userId: ${userId}`);
      throw new NotFoundException(`Профиль водителя не найден. Обратитесь к администратору для создания профиля водителя.`);
    }
    
    return driver.id;
  }

  async create(createInvoiceDto: CreateInvoiceDto) {
    try {
      console.log('📝 Создание накладной. DTO:', JSON.stringify(createInvoiceDto, null, 2));
      
      // Генерируем номер накладной
      const invoiceNumber = await this.generateInvoiceNumber(createInvoiceDto.type);

    // Для расходных накладных проверяем и уменьшаем количество в заказе
    if (createInvoiceDto.type === InvoiceType.EXPENSE && createInvoiceDto.orderId && createInvoiceDto.quantityM3) {
      const order = await this.prisma.order.findUnique({
        where: { id: createInvoiceDto.orderId },
        select: { id: true, quantityM3: true }
      });

      if (!order) {
        throw new BadRequestException('Заказ не найден');
      }

      // Проверяем, достаточно ли количества в заказе
      if (order.quantityM3 < createInvoiceDto.quantityM3) {
        throw new BadRequestException(
          `Недостаточно количества в заказе. Доступно: ${order.quantityM3} м³, запрошено: ${createInvoiceDto.quantityM3} м³`
        );
      }

      // Уменьшаем количество в заказе
      await this.prisma.order.update({
        where: { id: createInvoiceDto.orderId },
        data: {
          quantityM3: order.quantityM3 - createInvoiceDto.quantityM3
        }
      });
    }

    // Рассчитываем расстояние если не указано
    let distanceKm = createInvoiceDto.distanceKm;
    if (!distanceKm && createInvoiceDto.latitudeTo && createInvoiceDto.longitudeTo) {
      distanceKm = this.calculateDistance(
        createInvoiceDto.latitudeFrom || 0,
        createInvoiceDto.longitudeFrom || 0,
        createInvoiceDto.latitudeTo,
        createInvoiceDto.longitudeTo,
      );
    }

    // Добавляем 20% к расстоянию
    const adjustedDistance = distanceKm ? distanceKm * 1.2 : 0;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        type: createInvoiceDto.type,
        date: new Date(),
        orderId: createInvoiceDto.orderId || undefined,
        companyId: createInvoiceDto.companyId || undefined,
        warehouseId: createInvoiceDto.warehouseId || undefined,
        customerId: createInvoiceDto.customerId || undefined,
        supplierId: createInvoiceDto.supplierId || undefined,
        createdById: createInvoiceDto.createdById || 1, // временно используем ID 1
        concreteMarkId: createInvoiceDto.concreteMarkId || undefined,
        quantityM3: createInvoiceDto.quantityM3 || undefined,
        slumpValue: createInvoiceDto.slumpValue || undefined,
        sealNumbers: createInvoiceDto.sealNumbers ? [createInvoiceDto.sealNumbers] : [],
        contractNumber: createInvoiceDto.contractNumber || undefined,
        departedPlantAt: createInvoiceDto.departedPlantAt || undefined,
        arrivedSiteAt: createInvoiceDto.arrivedSiteAt || undefined,
        departedSiteAt: createInvoiceDto.departedSiteAt || undefined,
        departureAddress: createInvoiceDto.departureAddress || undefined,
        latitudeFrom: createInvoiceDto.latitudeFrom || undefined,
        longitudeFrom: createInvoiceDto.longitudeFrom || undefined,
        latitudeTo: createInvoiceDto.latitudeTo || undefined,
        longitudeTo: createInvoiceDto.longitudeTo || undefined,
        distanceKm: adjustedDistance,
        vehicleId: createInvoiceDto.vehicleId || undefined,
        driverId: createInvoiceDto.driverId || undefined,
        dispatcherId: createInvoiceDto.dispatcherId || undefined,
        releasedByFio: createInvoiceDto.releasedByFio || undefined,
        receivedByFio: createInvoiceDto.receivedByFio || undefined,
        basePricePerM3: createInvoiceDto.basePricePerM3 || undefined,
        salePricePerM3: createInvoiceDto.salePricePerM3 || undefined,
        managerProfit: createInvoiceDto.managerProfit || undefined,
        ...(createInvoiceDto.vatRate !== undefined && { vatRate: createInvoiceDto.vatRate }),
        ...(createInvoiceDto.vatAmount !== undefined && { vatAmount: createInvoiceDto.vatAmount }),
        materialId: createInvoiceDto.materialId || undefined,
        grossWeightKg: createInvoiceDto.grossWeightKg || undefined,
        grossWeightAt: createInvoiceDto.grossWeightAt || undefined,
        tareWeightKg: createInvoiceDto.tareWeightKg || undefined,
        tareWeightAt: createInvoiceDto.tareWeightAt || undefined,
        netWeightKg: createInvoiceDto.netWeightKg || undefined,
        moisturePercent: createInvoiceDto.moisturePercent || undefined,
        correctedWeightKg: createInvoiceDto.correctedWeightKg || undefined,
        status: 'PENDING',
      },
      include: {
        customer: true,
        supplier: true,
        company: true,
        material: true,
        concreteMark: true,
        driver: {
          include: {
          },
        },
        vehicle: true,
        warehouse: true,
        createdBy: true,
        dispatcher: {
          include: {
          },
        },
        items: {
          include: {
            material: true,
          },
        },
        order: true,
        _count: {
          select: {
            items: true,
            warehouseTransactions: true,
          },
        },
      },
    });
    } catch (error) {
      console.error('❌ Ошибка при создании накладной:', error);
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, type?: InvoiceType) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    const andConditions: any[] = [];
    
    if (search) {
      console.log('🔍 Поиск накладных по запросу:', search);
      andConditions.push({
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
          { departureAddress: { contains: search, mode: 'insensitive' as const } },
          { contractNumber: { contains: search, mode: 'insensitive' as const } },
          { customer: { name: { contains: search, mode: 'insensitive' as const } } },
          { supplier: { name: { contains: search, mode: 'insensitive' as const } } },
          { concreteMark: { name: { contains: search, mode: 'insensitive' as const } } },
          { vehicle: { plate: { contains: search, mode: 'insensitive' as const } } },
        ]
      });
    }
    
    if (type) {
      andConditions.push({ type });
    }
    
    // Добавляем AND только если есть условия
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }
    
    console.log('📊 Prisma WHERE условие:', JSON.stringify(where, null, 2));

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          supplier: true,
          company: true,
          material: true,
          concreteMark: true,
          driver: {
            include: {
            },
          },
          vehicle: true,
          warehouse: true,
          createdBy: true,
          dispatcher: {
            include: {
            },
          },
          items: {
            include: {
              material: true,
            },
          },
          order: true,
          _count: {
            select: {
              items: true,
              warehouseTransactions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        supplier: true,
        company: true,
        material: true,
        concreteMark: {
          include: {
            materials: {
              include: {
                material: true,
              },
            },
          },
        },
        driver: {
          include: {
          },
        },
        vehicle: true,
        warehouse: true,
        createdBy: true,
        dispatcher: {
          include: {
          },
        },
        items: {
          include: {
            material: {
              include: {
                type: true,
              },
            },
          },
        },
        order: true,
        warehouseTransactions: {
          include: {
            material: true,
            warehouse: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            items: true,
            warehouseTransactions: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Накладная не найдена');
    }

    return invoice;
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    // Проверяем, можно ли изменить накладную
    if (invoice.status === 'DELIVERED') {
      throw new BadRequestException('Нельзя изменить доставленную накладную');
    }

    // Для расходных накладных пересчитываем количество в заказе при изменении
    if (invoice.type === InvoiceType.EXPENSE && invoice.orderId && updateInvoiceDto.quantityM3 !== undefined) {
      const oldQuantity = invoice.quantityM3 || 0;
      const newQuantity = updateInvoiceDto.quantityM3;
      const difference = newQuantity - oldQuantity;

      if (difference !== 0) {
        const order = await this.prisma.order.findUnique({
          where: { id: invoice.orderId },
          select: { id: true, quantityM3: true }
        });

        if (order) {
          // Если увеличиваем количество в накладной - уменьшаем в заказе
          // Если уменьшаем количество в накладной - увеличиваем в заказе
          const newOrderQuantity = order.quantityM3 - difference;

          // Проверяем, что в заказе достаточно количества
          if (newOrderQuantity < 0) {
            throw new BadRequestException(
              `Недостаточно количества в заказе. Доступно: ${order.quantityM3} м³, требуется дополнительно: ${difference} м³`
            );
          }

          await this.prisma.order.update({
            where: { id: invoice.orderId },
            data: {
              quantityM3: newOrderQuantity
            }
          });
        }
      }
    }

    // Пересчитываем расстояние если изменились координаты
    let distanceKm = updateInvoiceDto.distanceKm;
    if (!distanceKm && updateInvoiceDto.latitudeTo && updateInvoiceDto.longitudeTo) {
      const warehouseLat = updateInvoiceDto.latitudeFrom || invoice.latitudeFrom || 0;
      const warehouseLng = updateInvoiceDto.longitudeFrom || invoice.longitudeFrom || 0;
      distanceKm = this.calculateDistance(
        warehouseLat,
        warehouseLng,
        updateInvoiceDto.latitudeTo,
        updateInvoiceDto.longitudeTo,
      );
    }

    // Добавляем 20% к расстоянию
    const adjustedDistance = distanceKm ? distanceKm * 1.2 : invoice.distanceKm;

    const updateData: any = {};
    if (updateInvoiceDto.type !== undefined) updateData.type = updateInvoiceDto.type;
    if (updateInvoiceDto.customerId !== undefined) updateData.customerId = updateInvoiceDto.customerId;
    if (updateInvoiceDto.supplierId !== undefined) updateData.supplierId = updateInvoiceDto.supplierId;
    if (updateInvoiceDto.concreteMarkId !== undefined) updateData.concreteMarkId = updateInvoiceDto.concreteMarkId;
    if (updateInvoiceDto.orderId !== undefined) updateData.orderId = updateInvoiceDto.orderId;
    if (updateInvoiceDto.departureAddress !== undefined) updateData.departureAddress = updateInvoiceDto.departureAddress;
    if (updateInvoiceDto.latitudeFrom !== undefined) updateData.latitudeFrom = updateInvoiceDto.latitudeFrom;
    if (updateInvoiceDto.longitudeFrom !== undefined) updateData.longitudeFrom = updateInvoiceDto.longitudeFrom;
    if (updateInvoiceDto.latitudeTo !== undefined) updateData.latitudeTo = updateInvoiceDto.latitudeTo;
    if (updateInvoiceDto.longitudeTo !== undefined) updateData.longitudeTo = updateInvoiceDto.longitudeTo;
    if (updateInvoiceDto.warehouseId !== undefined) updateData.warehouseId = updateInvoiceDto.warehouseId;
    if (updateInvoiceDto.vehicleId !== undefined) updateData.vehicleId = updateInvoiceDto.vehicleId;
    if (updateInvoiceDto.driverId !== undefined) updateData.driverId = updateInvoiceDto.driverId;
    if (updateInvoiceDto.dispatcherId !== undefined) updateData.dispatcherId = updateInvoiceDto.dispatcherId;
    if (updateInvoiceDto.quantityM3 !== undefined) updateData.quantityM3 = updateInvoiceDto.quantityM3;
    if (updateInvoiceDto.slumpValue !== undefined) updateData.slumpValue = updateInvoiceDto.slumpValue;
    if (updateInvoiceDto.sealNumbers !== undefined) updateData.sealNumbers = [updateInvoiceDto.sealNumbers];
    if (updateInvoiceDto.contractNumber !== undefined) updateData.contractNumber = updateInvoiceDto.contractNumber;
    if (updateInvoiceDto.departedPlantAt !== undefined) updateData.departedPlantAt = updateInvoiceDto.departedPlantAt;
    if (updateInvoiceDto.arrivedSiteAt !== undefined) updateData.arrivedSiteAt = updateInvoiceDto.arrivedSiteAt;
    if (updateInvoiceDto.departedSiteAt !== undefined) updateData.departedSiteAt = updateInvoiceDto.departedSiteAt;
    if (updateInvoiceDto.releasedByFio !== undefined) updateData.releasedByFio = updateInvoiceDto.releasedByFio;
    if (updateInvoiceDto.receivedByFio !== undefined) updateData.receivedByFio = updateInvoiceDto.receivedByFio;
    if (updateInvoiceDto.basePricePerM3 !== undefined) updateData.basePricePerM3 = updateInvoiceDto.basePricePerM3;
    if (updateInvoiceDto.salePricePerM3 !== undefined) updateData.salePricePerM3 = updateInvoiceDto.salePricePerM3;
    if (updateInvoiceDto.managerProfit !== undefined) updateData.managerProfit = updateInvoiceDto.managerProfit;
    if (updateInvoiceDto.vatRate !== undefined) updateData.vatRate = updateInvoiceDto.vatRate;
    if (updateInvoiceDto.vatAmount !== undefined) updateData.vatAmount = updateInvoiceDto.vatAmount;
    if (updateInvoiceDto.materialId !== undefined) updateData.materialId = updateInvoiceDto.materialId;
    if (updateInvoiceDto.grossWeightKg !== undefined) updateData.grossWeightKg = updateInvoiceDto.grossWeightKg;
    if (updateInvoiceDto.tareWeightKg !== undefined) updateData.tareWeightKg = updateInvoiceDto.tareWeightKg;
    if (updateInvoiceDto.netWeightKg !== undefined) updateData.netWeightKg = updateInvoiceDto.netWeightKg;
    if (updateInvoiceDto.moisturePercent !== undefined) updateData.moisturePercent = updateInvoiceDto.moisturePercent;
    if (updateInvoiceDto.correctedWeightKg !== undefined) updateData.correctedWeightKg = updateInvoiceDto.correctedWeightKg;
    
    updateData.distanceKm = adjustedDistance;

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        supplier: true,
        concreteMark: true,
        driver: {
          include: {
          },
        },
        vehicle: true,
        warehouse: true,
        createdBy: true,
        dispatcher: {
          include: {
          },
        },
        items: {
          include: {
            material: true,
          },
        },
        order: true,
        _count: {
          select: {
            items: true,
            warehouseTransactions: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const invoice = await this.findOne(id);

    console.log('🗑️ Удаление накладной:', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      orderId: invoice.orderId,
      quantityM3: invoice.quantityM3,
      status: invoice.status
    });

    // Проверяем, можно ли удалить накладную
    if (invoice.status === 'DELIVERED') {
      throw new BadRequestException('Нельзя удалить доставленную накладную');
    }

    // Для расходных накладных возвращаем количество обратно в заказ
    if (invoice.type === InvoiceType.EXPENSE && invoice.orderId && invoice.quantityM3) {
      console.log('🔙 Возврат количества в заказ при удалении накладной:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        quantityToReturn: invoice.quantityM3
      });

      const order = await this.prisma.order.findUnique({
        where: { id: invoice.orderId },
        select: { id: true, quantityM3: true }
      });

      if (order) {
        console.log('📊 Текущее количество в заказе:', order.quantityM3);
        const newQuantity = order.quantityM3 + invoice.quantityM3;
        console.log('➕ Новое количество в заказе:', newQuantity);
        
        // Возвращаем количество обратно в заказ
        await this.prisma.order.update({
          where: { id: invoice.orderId },
          data: {
            quantityM3: newQuantity
          }
        });
        
        console.log('✅ Количество успешно возвращено в заказ');
      } else {
        console.log('⚠️ Заказ не найден:', invoice.orderId);
      }
    } else {
      console.log('ℹ️ Возврат количества не требуется:', {
        type: invoice.type,
        orderId: invoice.orderId,
        quantityM3: invoice.quantityM3
      });
    }

    // Удаляем связанные записи
    await this.prisma.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    await this.prisma.warehouseTransaction.deleteMany({
      where: { invoiceId: id },
    });

    await this.prisma.invoice.delete({
      where: { id },
    });

    return { message: 'Накладная успешно удалена' };
  }

  async addItem(invoiceId: number, createItemDto: CreateInvoiceItemDto) {
    const invoice = await this.findOne(invoiceId);

    // Проверяем, можно ли добавить позицию
    if (invoice.status === 'DELIVERED') {
      throw new BadRequestException('Нельзя добавить позицию в доставленную накладную');
    }

    return this.prisma.invoiceItem.create({
      data: {
        ...createItemDto,
        invoiceId,
      },
      include: {
        material: true,
        invoice: true,
      },
    });
  }

  async updateItem(invoiceId: number, itemId: number, updateData: Partial<CreateInvoiceItemDto>) {
    const invoice = await this.findOne(invoiceId);

    // Проверяем, можно ли изменить позицию
    if (invoice.status === 'DELIVERED') {
      throw new BadRequestException('Нельзя изменить позицию в доставленной накладной');
    }

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
    });

    if (!item) {
      throw new NotFoundException('Позиция не найдена');
    }

    return this.prisma.invoiceItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        material: true,
        invoice: true,
      },
    });
  }

  async removeItem(invoiceId: number, itemId: number) {
    const invoice = await this.findOne(invoiceId);

    // Проверяем, можно ли удалить позицию
    if (invoice.status === 'DELIVERED') {
      throw new BadRequestException('Нельзя удалить позицию из доставленной накладной');
    }

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
    });

    if (!item) {
      throw new NotFoundException('Позиция не найдена');
    }

    await this.prisma.invoiceItem.delete({
      where: { id: itemId },
    });

    return { message: 'Позиция успешно удалена' };
  }

  async updateStatus(id: number, status: string) {
    const invoice = await this.findOne(id);

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        supplier: true,
        concreteMark: true,
        driver: {
          include: {
          },
        },
        vehicle: true,
        warehouse: true,
        createdBy: true,
        dispatcher: {
          include: {
          },
        },
        items: {
          include: {
            material: true,
          },
        },
        order: true,
        _count: {
          select: {
            items: true,
            warehouseTransactions: true,
          },
        },
      },
    });
  }

  async getStats() {
    const [total, byType, byStatus] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.groupBy({
        by: ['type'],
        _count: {
          id: true,
        },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      total,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.id,
      })),
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count.id,
      })),
    };
  }

  async getInvoicesByDriver(
    driverId: number, 
    page: number = 1, 
    limit: number = 10, 
    search?: string, 
    type?: InvoiceType
  ) {
    const skip = (page - 1) * limit;

    // Строим условие поиска
    const where: any = { 
      driverId
    };
    
    const andConditions: any[] = [];
    
    if (search) {
      andConditions.push({
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { departureAddress: { contains: search, mode: 'insensitive' } },
          { contractNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { supplier: { name: { contains: search, mode: 'insensitive' } } },
          { concreteMark: { name: { contains: search, mode: 'insensitive' } } },
          { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
        ]
      });
    }
    
    if (type) {
      andConditions.push({ type });
    }
    
    // Добавляем AND только если есть условия
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          supplier: true,
          concreteMark: true,
          vehicle: true,
          warehouse: true,
          driver: true,
          createdBy: true,
          dispatcher: true,
          items: {
            include: {
              material: true,
            },
          },
          order: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async generateInvoiceNumber(type: InvoiceType): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = type === InvoiceType.EXPENSE ? 'EXP' : 'INC';
    
    // Находим последнюю накладную за сегодня
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        type,
        invoiceNumber: {
          startsWith: `${prefix}-${year}${month}${day}`,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}${month}${day}${String(sequence).padStart(4, '0')}`;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Расчет расстояния по дорогам через OSRM (OpenStreetMap Routing Machine)
  private async calculateRoadDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    try {
      // Используем публичный OSRM API (или можно развернуть свой сервер)
      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BetonAPP/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      // Расстояние в метрах, конвертируем в километры
      const distanceMeters = data.routes[0].distance;
      const distanceKm = distanceMeters / 1000;
      
      return Math.round(distanceKm * 10) / 10; // Округляем до 1 знака после запятой
    } catch (error) {
      console.error('Ошибка при запросе к OSRM:', error);
      throw error;
    }
  }

  async processWarehouseTransactions(invoiceId: number) {
    const invoice = await this.findOne(invoiceId);

    if (invoice.status !== 'DELIVERED') {
      throw new BadRequestException('Накладная должна быть доставлена для обработки складских операций');
    }

    // Создаём складские транзакции для каждой позиции
    const transactions = [];
    
    for (const item of invoice.items) {
      const transaction = await this.prisma.warehouseTransaction.create({
        data: {
          warehouseId: invoice.warehouseId || 1, // временно используем ID 1
          materialId: item.materialId,
          invoiceId: invoice.id,
          type: invoice.type,
          quantity: item.quantity,
          unit: item.unit,
          notes: `Накладная ${invoice.invoiceNumber}`,
          balanceAfter: 0, // будет рассчитано позже
        },
        include: {
          material: true,
          warehouse: true,
          invoice: true,
        },
      });
      transactions.push(transaction);

      // Обновляем остатки на складе
      await this.updateWarehouseBalance(
        invoice.warehouseId,
        item.materialId,
        item.quantity,
        invoice.type === InvoiceType.EXPENSE ? 'OUT' : 'IN',
      );
    }

    return transactions;
  }

  private async updateWarehouseBalance(warehouseId: number, materialId: number, quantity: number, type: 'IN' | 'OUT') {
    const currentBalance = await this.prisma.warehouseMaterialBalance.findUnique({
      where: {
        warehouseId_materialId: {
          warehouseId,
          materialId,
        },
      },
    });

    if (currentBalance) {
      const newQuantity = type === 'IN' 
        ? currentBalance.quantity + quantity
        : currentBalance.quantity - quantity;

      if (newQuantity < 0) {
        throw new BadRequestException('Недостаточно материалов на складе');
      }

      await this.prisma.warehouseMaterialBalance.update({
        where: {
          warehouseId_materialId: {
            warehouseId,
            materialId,
          },
        },
        data: {
          quantity: newQuantity,
        },
      });
    } else if (type === 'IN') {
      await this.prisma.warehouseMaterialBalance.create({
        data: {
          warehouseId,
          materialId,
          quantity,
        },
      });
    } else {
      throw new BadRequestException('Материал отсутствует на складе');
    }
  }

  // ============================================
  // Методы для отслеживания маршрута водителя
  // ============================================

  // Принять накладную водителем
  async acceptInvoice(invoiceId: number, userId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { driver: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Накладная с ID ${invoiceId} не найдена`);
    }

    // Проверяем, что пользователь является водителем этой накладной
    if (invoice.driver?.userId !== userId) {
      throw new BadRequestException('Вы не назначены водителем на эту накладную');
    }

    if (invoice.driverAcceptedAt) {
      throw new BadRequestException('Накладная уже принята');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        driverAcceptedAt: new Date(),
      },
      include: {
        driver: true,
        vehicle: true,
        customer: true,
        concreteMark: true,
      },
    });
  }

  // Отметить прибытие на объект
  async markArrivedAtSite(invoiceId: number, userId: number, latitude?: number, longitude?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        driver: true,
        warehouse: true,
        order: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Накладная с ID ${invoiceId} не найдена`);
    }

    if (invoice.driver?.userId !== userId) {
      throw new BadRequestException('Вы не назначены водителем на эту накладную');
    }

    if (!invoice.driverAcceptedAt) {
      throw new BadRequestException('Сначала примите накладную');
    }

    if (invoice.arrivedSiteAt) {
      throw new BadRequestException('Прибытие на объект уже отмечено');
    }

    // Рассчитываем расстояние от склада до объекта через OSRM (OpenStreetMap)
    let distanceKm: number | undefined;
    
    // Используем координаты склада и координаты места прибытия
    if (invoice.warehouse?.latitude && invoice.warehouse?.longitude && latitude && longitude) {
      try {
        distanceKm = await this.calculateRoadDistance(
          invoice.warehouse.latitude,
          invoice.warehouse.longitude,
          latitude,
          longitude
        );
        console.log(`📍 Рассчитано расстояние по дорогам: ${distanceKm} км от склада до объекта`);
      } catch (error) {
        console.error('❌ Ошибка расчета расстояния через OSRM, используем расчет по прямой:', error);
        // Fallback: если OSRM недоступен, используем расчет по прямой
        distanceKm = this.calculateDistance(
          invoice.warehouse.latitude,
          invoice.warehouse.longitude,
          latitude,
          longitude
        );
        console.log(`📍 Рассчитано расстояние по прямой (fallback): ${distanceKm} км`);
      }
    } else if (invoice.warehouse?.latitude && invoice.warehouse?.longitude && invoice.order) {
      // Если координаты прибытия не предоставлены, но есть координаты из заказа
      const orderCoords = invoice.order.coordinates;
      if (orderCoords) {
        const [lat, lng] = orderCoords.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          try {
            distanceKm = await this.calculateRoadDistance(
              invoice.warehouse.latitude,
              invoice.warehouse.longitude,
              lat,
              lng
            );
            console.log(`📍 Рассчитано расстояние по дорогам (из заказа): ${distanceKm} км`);
          } catch (error) {
            console.error('❌ Ошибка расчета расстояния через OSRM, используем расчет по прямой:', error);
            // Fallback: если OSRM недоступен, используем расчет по прямой
            distanceKm = this.calculateDistance(
              invoice.warehouse.latitude,
              invoice.warehouse.longitude,
              lat,
              lng
            );
            console.log(`📍 Рассчитано расстояние по прямой (fallback): ${distanceKm} км`);
          }
        }
      }
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        arrivedSiteAt: new Date(),
        arrivedSiteLatitude: latitude,
        arrivedSiteLongitude: longitude,
        ...(distanceKm !== undefined && { distanceKm }),
      },
    });
  }

  // Отметить выезд с объекта
  async markDepartedFromSite(invoiceId: number, userId: number, latitude?: number, longitude?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { driver: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Накладная с ID ${invoiceId} не найдена`);
    }

    if (invoice.driver?.userId !== userId) {
      throw new BadRequestException('Вы не назначены водителем на эту накладную');
    }

    if (!invoice.arrivedSiteAt) {
      throw new BadRequestException('Сначала отметьте прибытие на объект');
    }

    if (invoice.departedSiteAt) {
      throw new BadRequestException('Выезд с объекта уже отмечен');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        departedSiteAt: new Date(),
        departedSiteLatitude: latitude,
        departedSiteLongitude: longitude,
      },
    });
  }

  // Отметить прибытие на завод
  async markArrivedAtPlant(invoiceId: number, userId: number, latitude?: number, longitude?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { driver: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Накладная с ID ${invoiceId} не найдена`);
    }

    if (invoice.driver?.userId !== userId) {
      throw new BadRequestException('Вы не назначены водителем на эту накладную');
    }

    if (!invoice.departedSiteAt) {
      throw new BadRequestException('Сначала отметьте выезд с объекта');
    }

    if (invoice.arrivedPlantAt) {
      throw new BadRequestException('Прибытие на завод уже отмечено');
    }

    // Рассчитываем общее расстояние маршрута через OpenRouteService
    let totalDistance = 0;
    if (invoice.latitudeFrom && invoice.longitudeFrom && invoice.latitudeTo && invoice.longitudeTo) {
      totalDistance = await this.calculateRouteDistance(
        invoice.latitudeFrom,
        invoice.longitudeFrom,
        invoice.latitudeTo,
        invoice.longitudeTo,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        arrivedPlantAt: new Date(),
        arrivedPlantLatitude: latitude,
        arrivedPlantLongitude: longitude,
        totalDistanceKm: totalDistance > 0 ? totalDistance : undefined,
      },
    });
  }

  // Расчёт расстояния маршрута через OpenRouteService API
  private async calculateRouteDistance(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ): Promise<number> {
    try {
      const ORS_API_KEY = process.env.ORS_API_KEY;
      if (!ORS_API_KEY) {
        console.warn('⚠️ ORS_API_KEY не настроен, расстояние не будет рассчитано');
        return 0;
      }

      const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
        method: 'POST',
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [fromLon, fromLat],
            [toLon, toLat],
          ],
        }),
      });

      if (!response.ok) {
        console.error('❌ Ошибка API OpenRouteService:', response.statusText);
        return 0;
      }

      const data = await response.json();
      const distanceMeters = data?.routes?.[0]?.summary?.distance || 0;
      const distanceKm = distanceMeters / 1000;

      console.log(`🗺️ Рассчитано расстояние маршрута: ${distanceKm.toFixed(2)} км`);
      return parseFloat(distanceKm.toFixed(2));
    } catch (error) {
      console.error('❌ Ошибка при расчёте расстояния:', error);
      return 0;
    }
  }

  // Получить все накладные для водителя (активные и завершённые)
  async getMyActiveInvoices(userId: number) {
    try {
      const driverId = await this.getDriverIdByUserId(userId);
      console.log(`🚚 Поиск накладных для водителя ID: ${driverId} (userId: ${userId})`);
      
      const invoices = await this.prisma.invoice.findMany({
        where: {
          driverId,
          // Показываем все типы накладных (INCOME и EXPENSE)
        },
        include: {
          customer: true,
          concreteMark: true,
          vehicle: true,
          order: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log(`📋 Найдено накладных: ${invoices.length}`);
      if (invoices.length > 0) {
        console.log('📦 Накладные:', invoices.map(i => `#${i.invoiceNumber} (ID: ${i.id})`).join(', '));
      }

      return invoices;
    } catch (error) {
      console.error('❌ Ошибка при получении накладных водителя:', error);
      // Если водитель не найден, возвращаем пустой массив
      if (error instanceof NotFoundException) {
        return [];
      }
      throw error;
    }
  }
}
