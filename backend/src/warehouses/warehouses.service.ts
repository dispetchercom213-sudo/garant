import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { InvoiceType } from '@prisma/client';

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

  async getAllMaterialBalances(warehouseId?: number, startDate?: Date, endDate?: Date) {
    try {
      // Получаем все склады
      const warehousesWhere: any = {};
      if (warehouseId) {
        warehousesWhere.id = warehouseId;
      }

      const warehouses = await this.prisma.warehouse.findMany({
        where: warehousesWhere,
        include: {
          company: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      console.log(`✅ Найдено складов: ${warehouses.length}`);

      // Получаем все материалы
      const materials = await this.prisma.material.findMany({
        include: {
          type: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      console.log(`✅ Найдено материалов: ${materials.length}`);

      // Получаем остатки материалов на складах
      const balancesWhere: any = {};
      if (warehouseId) {
        balancesWhere.warehouseId = warehouseId;
      }

      const balances = await this.prisma.warehouseMaterialBalance.findMany({
        where: balancesWhere,
        include: {
          material: {
            include: {
              type: true,
            },
          },
          warehouse: true,
        },
      });

      console.log(`✅ Найдено остатков: ${balances.length}`);

      // Получаем расходные накладные для расчета расходования материалов
      // Расход рассчитывается из состава марки бетона и объема накладной
      const invoicesWhere: any = {
        type: InvoiceType.EXPENSE, // Только расходные накладные
      };

      // Фильтр по складу
      if (warehouseId) {
        invoicesWhere.warehouseId = warehouseId;
      }

      if (startDate && endDate) {
        // Устанавливаем время начала на начало дня, а конец - на конец дня
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        invoicesWhere.date = {
          gte: start,
          lte: end,
        };
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        invoicesWhere.date = {
          gte: start,
        };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        invoicesWhere.date = {
          lte: end,
        };
      }

      console.log('🔍 Поиск расходных накладных с условием:', JSON.stringify(invoicesWhere, null, 2));
      const invoices = await this.prisma.invoice.findMany({
        where: invoicesWhere,
        include: {
          warehouse: true,
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
        },
        orderBy: {
          date: 'desc',
        },
      });

      console.log(`✅ Найдено расходных накладных: ${invoices.length}`);
      
      // Дополнительная информация о найденных накладных
      if (invoices.length > 0) {
        console.log('📋 Найденные накладные:');
        invoices.forEach((inv) => {
          console.log(`  - Накладная ${inv.invoiceNumber || inv.id}:`, {
            date: inv.date,
            warehouseId: inv.warehouseId,
            concreteMarkId: inv.concreteMarkId,
            quantityM3: inv.quantityM3,
            hasConcreteMark: !!inv.concreteMark,
            hasMaterials: !!(inv.concreteMark as any)?.materials,
          });
        });
      } else {
        console.warn('⚠️ Не найдено расходных накладных! Проверьте условия поиска.');
      }

      // Рассчитываем расход материалов из состава марок бетона
      const consumedByWarehouseMaterial = new Map<string, number>();
      
      invoices.forEach((invoice) => {
        console.log(`📋 Обработка накладной ${invoice.id}:`, {
          invoiceNumber: invoice.invoiceNumber,
          warehouseId: invoice.warehouseId,
          concreteMarkId: invoice.concreteMarkId,
          quantityM3: invoice.quantityM3,
          hasConcreteMark: !!invoice.concreteMark,
        });

        if (!invoice.warehouseId) {
          console.warn('⚠️ Накладная без склада:', invoice.id);
          return;
        }

        if (!invoice.concreteMark) {
          console.warn('⚠️ Накладная без марки бетона:', invoice.id);
          return;
        }

        if (!invoice.quantityM3) {
          console.warn('⚠️ Накладная без объема:', invoice.id);
          return;
        }

        const quantityM3 = invoice.quantityM3;
        const concreteMark = invoice.concreteMark as any;

        console.log(`  Марка бетона: ${concreteMark.name}, объем: ${quantityM3} м³`);
        console.log(`  Состав марки (materials):`, concreteMark.materials ? `${concreteMark.materials.length} материалов` : 'отсутствует');

        // Если есть состав марки бетона, рассчитываем расход материалов
        if (concreteMark.materials && Array.isArray(concreteMark.materials)) {
          concreteMark.materials.forEach((markMaterial: any) => {
            if (!markMaterial.material || !markMaterial.quantityPerM3) {
              console.warn(`  ⚠️ Пропущен материал без данных:`, markMaterial);
              return;
            }

            const materialId = markMaterial.material.id;
            const materialName = markMaterial.material.name;
            const quantityPerM3 = markMaterial.quantityPerM3;
            const totalQuantity = quantityPerM3 * quantityM3; // Расход материала = количество на м³ * объем накладной

            console.log(`  ➕ Расход материала ${materialName}: ${quantityPerM3} ${markMaterial.unit}/м³ × ${quantityM3} м³ = ${totalQuantity} ${markMaterial.unit}`);

            const key = `${invoice.warehouseId}_${materialId}`;
            const current = consumedByWarehouseMaterial.get(key) || 0;
            consumedByWarehouseMaterial.set(key, current + totalQuantity);
          });
        } else {
          console.warn(`  ⚠️ У марки бетона ${concreteMark.name} нет состава материалов`);
        }
      });

      console.log(`✅ Сгруппировано записей расходования: ${consumedByWarehouseMaterial.size}`);

      // Формируем результат
      const result: any[] = [];

      warehouses.forEach((warehouse) => {
        materials.forEach((material) => {
          const balance = balances.find(
            (b) => b.warehouseId === warehouse.id && b.materialId === material.id
          );

          const key = `${warehouse.id}_${material.id}`;
          const consumed = consumedByWarehouseMaterial.get(key) || 0;
          const currentBalance = balance?.quantity || 0;

          result.push({
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            warehouseAddress: warehouse.address,
            companyName: warehouse.company?.name || null,
            materialId: material.id,
            materialName: material.name,
            materialType: material.type?.name || 'Не указан',
            materialUnit: material.unit,
            currentBalance: currentBalance,
            consumed: consumed,
            totalReceived: currentBalance + consumed, // Изначально получено = остаток + израсходовано
          });
        });
      });

      console.log(`✅ Сформировано записей: ${result.length}`);

      // Фильтруем только те записи, где есть остаток или было расходование
      const filteredResult = result.filter(
        (item) => item.currentBalance > 0 || item.consumed > 0
      );

      console.log(`✅ После фильтрации записей: ${filteredResult.length}`);

      // Сортируем по складу, затем по типу материала, затем по названию
      filteredResult.sort((a, b) => {
        if (a.warehouseName !== b.warehouseName) {
          return a.warehouseName.localeCompare(b.warehouseName);
        }
        if (a.materialType !== b.materialType) {
          return a.materialType.localeCompare(b.materialType);
        }
        return a.materialName.localeCompare(b.materialName);
      });

      // Общая статистика
      const totalBalance = filteredResult.reduce((sum, item) => sum + item.currentBalance, 0);
      const totalConsumed = filteredResult.reduce((sum, item) => sum + item.consumed, 0);
      const totalReceived = filteredResult.reduce((sum, item) => sum + item.totalReceived, 0);

      const response = {
        data: filteredResult,
        summary: {
          totalWarehouses: warehouses.length,
          totalMaterials: new Set(filteredResult.map((item) => item.materialId)).size,
          totalBalance,
          totalConsumed,
          totalReceived,
        },
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      };

      console.log('✅ Ответ сформирован:', {
        records: filteredResult.length,
        summary: response.summary,
      });

      return response;
    } catch (error) {
      console.error('❌ Ошибка в getAllMaterialBalances:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }
}
