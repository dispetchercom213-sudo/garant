import { Injectable } from '@nestjs/common';
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
}