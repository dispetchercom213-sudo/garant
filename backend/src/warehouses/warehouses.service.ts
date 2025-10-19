import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(createWarehouseDto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: createWarehouseDto,
      include: {
        company: true,
        balances: {
          include: {
            material: true,
          },
        },
        _count: {
          select: {
            balances: true,
            invoices: true,
            transactions: true,
          },
        },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, companyId?: number) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (companyId) {
      where.companyId = companyId;
    }

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        include: {
          company: true,
          balances: {
            include: {
              material: true,
            },
          },
          _count: {
            select: {
              balances: true,
              invoices: true,
              transactions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    // Логируем данные складов для отладки
    console.log('📡 Возвращаем склады из API:');
    warehouses.forEach(warehouse => {
      console.log(`🏢 Склад "${warehouse.name}":`, {
        id: warehouse.id,
        hasScales: warehouse.hasScales,
        scaleIpAddress: warehouse.scaleIpAddress,
        scaleApiKey: warehouse.scaleApiKey ? '***настроен***' : 'не настроен',
        scaleComPort: warehouse.scaleComPort,
        scaleStatus: warehouse.scaleStatus,
      });
    });

    return {
      data: warehouses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        company: true,
        balances: {
          include: {
            material: true,
          },
        },
        transactions: {
          include: {
            material: true,
            invoice: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50, // Последние 50 транзакций
        },
        _count: {
          select: {
            balances: true,
            invoices: true,
            transactions: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Склад не найден');
    }

    return warehouse;
  }

  async update(id: number, updateWarehouseDto: UpdateWarehouseDto) {
    console.log(`🔧 Обновляем склад ID: ${id}`);
    console.log('📊 Данные для обновления:', updateWarehouseDto);
    
    const warehouse = await this.findOne(id);

    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
      include: {
        company: true,
        balances: {
          include: {
            material: true,
          },
        },
        _count: {
          select: {
            balances: true,
            invoices: true,
            transactions: true,
          },
        },
      },
    });

    console.log('✅ Склад обновлен:', {
      id: updatedWarehouse.id,
      name: updatedWarehouse.name,
      hasScales: updatedWarehouse.hasScales,
      scaleIpAddress: updatedWarehouse.scaleIpAddress,
      scaleApiKey: updatedWarehouse.scaleApiKey ? '***настроен***' : 'не настроен',
      scaleComPort: updatedWarehouse.scaleComPort,
      scaleStatus: updatedWarehouse.scaleStatus,
    });

    return updatedWarehouse;
  }

  async remove(id: number) {
    const warehouse = await this.findOne(id);

    // Проверяем, что у склада нет связанных накладных или транзакций
    const relatedData = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        invoices: true,
        transactions: true,
      },
    });

    if (relatedData.invoices.length > 0) {
      throw new BadRequestException('Нельзя удалить склад с привязанными накладными');
    }

    if (relatedData.transactions.length > 0) {
      throw new BadRequestException('Нельзя удалить склад с привязанными транзакциями');
    }

    // Удаляем остатки материалов
    await this.prisma.warehouseMaterialBalance.deleteMany({
      where: { warehouseId: id },
    });

    await this.prisma.warehouse.delete({
      where: { id },
    });

    return { message: 'Склад успешно удалён' };
  }

  async getStats() {
    const [total, withMaterials, withTransactions] = await Promise.all([
      this.prisma.warehouse.count(),
      this.prisma.warehouse.count({
        where: {
          balances: {
            some: {},
          },
        },
      }),
      this.prisma.warehouse.count({
        where: {
          transactions: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      withMaterials,
      withTransactions,
    };
  }

  async getMaterialBalances(warehouseId: number) {
    return this.prisma.warehouseMaterialBalance.findMany({
      where: { warehouseId },
      include: {
        material: true,
        warehouse: true,
      },
      orderBy: {
        material: {
          name: 'asc',
        },
      },
    });
  }

  async updateMaterialBalance(warehouseId: number, materialId: number, quantity: number) {
    return this.prisma.warehouseMaterialBalance.upsert({
      where: {
        warehouseId_materialId: {
          warehouseId,
          materialId,
        },
      },
      update: {
        quantity,
      },
      create: {
        warehouseId,
        materialId,
        quantity,
      },
      include: {
        material: true,
        warehouse: true,
      },
    });
  }
}
