import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalCompanies, totalCounterparties, totalOrders, totalInvoices] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.counterparty.count(),
      this.prisma.order.count(),
      this.prisma.invoice.count(),
    ]);

    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const invoicesByType = await this.prisma.invoice.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    return {
      totalCompanies,
      totalCounterparties,
      totalOrders,
      totalInvoices,
      ordersByStatus,
      invoicesByType,
    };
  }

  async getOrdersReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
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
    });
  }

  async getInvoicesReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        supplier: true,
        concreteMark: true,
        driver: true,
        vehicle: true,
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Отчеты для менеджера (только по своим заказам)
  async getManagerDashboardStats(userId: number) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const [totalOrders, totalInvoices] = await Promise.all([
        this.prisma.order.count({
          where: { createdById: userId },
        }),
        this.prisma.invoice.count({
          where: {
            order: {
              createdById: userId,
            },
          },
        }),
      ]);

      const ordersByStatus = await this.prisma.order.groupBy({
        by: ['status'],
        where: { createdById: userId },
        _count: {
          id: true,
        },
      });

      // Используем безопасную группировку для накладных
      let invoicesByType = [];
      try {
        const invoicesGrouped = await this.prisma.invoice.groupBy({
          by: ['type'],
          where: {
            order: {
              createdById: userId,
            },
          },
          _count: {
            id: true,
          },
        });
        // Фильтруем записи с null типом после группировки
        invoicesByType = invoicesGrouped.filter(item => item.type !== null);
      } catch (error) {
        console.error('Ошибка при группировке накладных по типу:', error);
        // Если есть проблема с группировкой, возвращаем пустой массив
        invoicesByType = [];
      }

      return {
        totalOrders,
        totalInvoices,
        ordersByStatus: ordersByStatus || [],
        invoicesByType: invoicesByType || [],
      };
    } catch (error) {
      console.error('Ошибка в getManagerDashboardStats:', error);
      throw error;
    }
  }

  async getManagerOrdersReport(userId: number, startDate?: Date, endDate?: Date) {
    const where: any = {
      createdById: userId,
    };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        concreteMark: true,
        createdBy: true,
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
    });
  }

  async getManagerInvoicesReport(userId: number, startDate?: Date, endDate?: Date) {
    const where: any = {
      order: {
        createdById: userId,
      },
    };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        supplier: true,
        concreteMark: true,
        driver: true,
        vehicle: true,
        order: {
          include: {
            createdBy: true,
          },
        },
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCounterpartyReport(counterpartyId: number, startDate?: Date, endDate?: Date, userRole?: string) {
    const where: any = {
      customerId: counterpartyId,
      type: 'EXPENSE', // Только расходные накладные
    };
    
    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Для менеджера не нужно загружать данные о расходах материалов
    const includeConcreteMarkMaterials = userRole !== 'MANAGER';

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        concreteMark: includeConcreteMarkMaterials ? {
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
        } : true,
        vehicle: true,
        order: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Форматируем данные для отчета
    return invoices.map((invoice) => {
      const concreteMark = invoice.concreteMark as any; // Используем any для работы с условным include
      let cementPerM3 = null;
      let sandPerM3 = null;
      let gravelPerM3 = null;

      // Для менеджера не показываем расходы материалов
      if (userRole !== 'MANAGER' && concreteMark && 'materials' in concreteMark && concreteMark.materials) {
        concreteMark.materials.forEach((markMaterial: any) => {
          const materialType = markMaterial.material?.type?.name;
          if (materialType === 'CEMENT') {
            cementPerM3 = markMaterial.quantityPerM3;
          } else if (materialType === 'SAND') {
            sandPerM3 = markMaterial.quantityPerM3;
          } else if (materialType === 'GRAVEL') {
            gravelPerM3 = markMaterial.quantityPerM3;
          }
        });
      }

      return {
        id: invoice.id,
        customerName: invoice.customer?.name || invoice.order?.customer?.name || 'Не указано',
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        concreteMarkName: concreteMark?.name || 'Не указано',
        vehiclePlateNumber: invoice.vehicle?.plate || 'Не указано',
        quantityM3: invoice.quantityM3 || 0,
        deliveryAddress: invoice.order?.deliveryAddress || 'Не указано',
        arrivedSiteAt: invoice.arrivedSiteAt,
        departedSiteAt: invoice.departedSiteAt,
        ...(userRole !== 'MANAGER' ? {
          cementPerM3,
          sandPerM3,
          gravelPerM3,
        } : {}),
      };
    });
  }

  async getVehiclesReport(startDate?: Date, endDate?: Date) {
    const where: any = {
      type: 'EXPENSE', // Только расходные накладные
      vehicleId: { not: null }, // Только накладные с привязанным транспортом
    };
    
    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Группируем по транспорту и суммируем километраж
    const vehicleStats = new Map<number, {
      vehicleId: number;
      vehiclePlate: string;
      vehicleType: string;
      totalDistanceKm: number;
      totalDistanceKmWithAdjustment: number; // distanceKm уже включает 20% добавку
      totalDistanceKmRaw: number; // Без добавки (если нужно)
      invoiceCount: number;
      invoices: any[];
    }>();

    invoices.forEach((invoice) => {
      if (!invoice.vehicleId || !invoice.vehicle) return;

      const vehicleId = invoice.vehicleId;
      const distanceKm = invoice.distanceKm || 0;
      const totalDistanceKm = invoice.totalDistanceKm || distanceKm; // Используем totalDistanceKm если есть, иначе distanceKm
      
      if (!vehicleStats.has(vehicleId)) {
        vehicleStats.set(vehicleId, {
          vehicleId,
          vehiclePlate: invoice.vehicle.plate || 'Не указан',
          vehicleType: invoice.vehicle.type || 'Не указан',
          totalDistanceKm: 0,
          totalDistanceKmWithAdjustment: 0,
          totalDistanceKmRaw: 0,
          invoiceCount: 0,
          invoices: [],
        });
      }

      const stats = vehicleStats.get(vehicleId)!;
      stats.totalDistanceKm += totalDistanceKm;
      stats.totalDistanceKmWithAdjustment += distanceKm; // distanceKm уже с учетом 20% добавки
      stats.totalDistanceKmRaw += totalDistanceKm / 1.2; // Обратно вычисляем без добавки
      stats.invoiceCount += 1;
      stats.invoices.push({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        distanceKm: distanceKm,
        totalDistanceKm: totalDistanceKm,
        driver: invoice.driver ? {
          name: invoice.driver.name,
          phone: invoice.driver.phone,
        } : null,
      });
    });

    // Преобразуем Map в массив и сортируем по общему пробегу
    const result = Array.from(vehicleStats.values())
      .map((stats) => ({
        vehicleId: stats.vehicleId,
        vehiclePlate: stats.vehiclePlate,
        vehicleType: stats.vehicleType,
        totalDistanceKm: Math.round(stats.totalDistanceKmWithAdjustment * 10) / 10, // Используем distanceKm с учетом добавки
        invoiceCount: stats.invoiceCount,
        averageDistanceKm: stats.invoiceCount > 0 
          ? Math.round((stats.totalDistanceKmWithAdjustment / stats.invoiceCount) * 10) / 10 
          : 0,
        invoices: stats.invoices,
      }))
      .sort((a, b) => b.totalDistanceKm - a.totalDistanceKm);

    // Общая статистика
    const totalDistance = result.reduce((sum, v) => sum + v.totalDistanceKm, 0);
    const totalInvoices = result.reduce((sum, v) => sum + v.invoiceCount, 0);

    return {
      vehicles: result,
      summary: {
        totalVehicles: result.length,
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
        totalInvoices,
        averageDistancePerVehicle: result.length > 0 
          ? Math.round((totalDistance / result.length) * 10) / 10 
          : 0,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }
}