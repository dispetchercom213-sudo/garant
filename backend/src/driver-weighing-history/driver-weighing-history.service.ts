import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDriverWeighingHistoryDto } from './dto/create-driver-weighing-history.dto';

@Injectable()
export class DriverWeighingHistoryService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateDriverWeighingHistoryDto, userId: number) {
    // Получаем ID водителя по ID пользователя
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Профиль водителя не найден');
    }

    return this.prisma.driverWeighingHistory.create({
      data: {
        driverId: driver.id,
        warehouseId: createDto.warehouseId,
        vehicleId: createDto.vehicleId,
        supplierId: createDto.supplierId,
        companyId: createDto.companyId,
        materialId: createDto.materialId,
        grossWeightKg: createDto.grossWeightKg,
        tareWeightKg: createDto.tareWeightKg,
        netWeightKg: createDto.netWeightKg,
        grossWeightAt: createDto.grossWeightAt,
        tareWeightAt: createDto.tareWeightAt,
        invoiceId: createDto.invoiceId,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            plate: true,
            type: true,
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
          }
        },
        company: {
          select: {
            id: true,
            name: true,
          }
        },
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          }
        }
      }
    });
  }

  async getByDriverId(userId: number) {
    // Получаем ID водителя по ID пользователя
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Профиль водителя не найден');
    }

    return this.prisma.driverWeighingHistory.findMany({
      where: { driverId: driver.id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            plate: true,
            type: true,
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
          }
        },
        company: {
          select: {
            id: true,
            name: true,
          }
        },
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}
