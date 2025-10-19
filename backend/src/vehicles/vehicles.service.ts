import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleType } from '@prisma/client';

@Injectable()
export class VehiclesService {
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

  // Получить ID водителя по ID пользователя (для Developer может быть null)
  async getDriverIdByUserIdOrNull(userId: number): Promise<number | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    
    return driver?.id || null;
  }

  // Получить весь транспорт водителя (many-to-many)
  async findByDriverId(driverId: number) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { 
        drivers: { 
          some: { id: driverId } 
        } 
      },
      include: {
        drivers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: vehicles,
      total: vehicles.length,
    };
  }

  // Получить все транспортные средства (для Developer)
  async findAllForDeveloper() {
    const vehicles = await this.prisma.vehicle.findMany({
      include: {
        drivers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: vehicles,
      total: vehicles.length,
    };
  }

  // Добавить транспорт для водителя (или связать существующий)
  async addMyVehicle(driverId: number, createVehicleDto: CreateVehicleDto) {
    // Проверяем, существует ли уже транспорт с таким номером
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: { plate: createVehicleDto.plate },
      include: {
        drivers: {
          where: { id: driverId }
        }
      }
    });

    if (existingVehicle) {
      // Если транспорт существует и водитель уже связан с ним
      if (existingVehicle.drivers.length > 0) {
        throw new BadRequestException('Вы уже добавили этот транспорт');
      }

      // Если транспорт существует, но водитель не связан - просто связываем
      return this.prisma.vehicle.update({
        where: { id: existingVehicle.id },
        data: {
          drivers: {
            connect: { id: driverId }
          }
        },
        include: {
          drivers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          _count: {
            select: {
              invoices: true,
            },
          },
        },
      });
    }

    // Если транспорта нет - создаём новый и сразу связываем с водителем
    return this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        drivers: {
          connect: { id: driverId }
        }
      },
      include: {
        drivers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });
  }

  // Отвязать транспорт от водителя
  async removeMyVehicle(driverId: number, vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        drivers: {
          where: { id: driverId }
        }
      }
    });

    if (!vehicle) {
      throw new NotFoundException('Транспорт не найден');
    }

    if (vehicle.drivers.length === 0) {
      throw new BadRequestException('Этот транспорт не связан с вами');
    }

    // Отвязываем водителя от транспорта
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        drivers: {
          disconnect: { id: driverId }
        }
      }
    });

    return { message: 'Транспорт успешно удалён из вашего списка' };
  }

  async create(createVehicleDto: CreateVehicleDto) {
    // Проверяем уникальность номера
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: { plate: createVehicleDto.plate },
    });

    if (existingVehicle) {
      throw new BadRequestException('Транспорт с таким номером уже существует');
    }

    return this.prisma.vehicle.create({
      data: createVehicleDto,
      include: {
        drivers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, type?: VehicleType) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { plate: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (type) {
      where.type = type;
    }

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        include: {
          drivers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: vehicles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Транспорт не найден');
    }

    return vehicle;
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);

    // Если обновляется номер, проверяем уникальность
    if (updateVehicleDto.plate && updateVehicleDto.plate !== vehicle.plate) {
      const existingVehicle = await this.prisma.vehicle.findUnique({
        where: { plate: updateVehicleDto.plate },
      });

      if (existingVehicle) {
        throw new BadRequestException('Транспорт с таким номером уже существует');
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const vehicle = await this.findOne(id);

    // Проверяем, что у транспорта нет связанных накладных
    const relatedData = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        invoices: true,
      },
    });

    if (relatedData.invoices.length > 0) {
      throw new BadRequestException('Нельзя удалить транспорт с привязанными накладными');
    }

    await this.prisma.vehicle.delete({
      where: { id },
    });

    return { message: 'Транспорт успешно удалён' };
  }

  async getStats() {
    const [total, mixers, dumpTrucks, loaders, other] = await Promise.all([
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({ where: { type: VehicleType.MIXER } }),
      this.prisma.vehicle.count({ where: { type: VehicleType.DUMP_TRUCK } }),
      this.prisma.vehicle.count({ where: { type: VehicleType.LOADER } }),
      this.prisma.vehicle.count({ where: { type: VehicleType.OTHER } }),
    ]);

    return {
      total,
      mixers,
      dumpTrucks,
      loaders,
      other,
    };
  }

  async findByPlate(plate: string) {
    return this.prisma.vehicle.findUnique({
      where: { plate },
    });
  }
}



