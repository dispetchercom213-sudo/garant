import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async create(createDriverDto: CreateDriverDto, createdById?: number) {
    // Проверяем уникальность телефона
    const existingDriver = await this.prisma.driver.findFirst({
      where: { phone: createDriverDto.phone },
    });

    if (existingDriver) {
      throw new BadRequestException('Водитель с таким телефоном уже существует');
    }

    // Проверяем уникальность логина (телефона) в пользователях
    const existingUser = await this.prisma.user.findFirst({
      where: { login: createDriverDto.phone },
    });

    if (existingUser) {
      throw new BadRequestException('Пользователь с таким телефоном уже существует');
    }

    // Создаём пользователя автоматически
    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = await this.prisma.user.create({
      data: {
        login: createDriverDto.phone,
        username: createDriverDto.phone, // дублируем login в username
        password: hashedPassword,
        role: UserRole.DRIVER,
        currentRole: UserRole.DRIVER,
        status: UserStatus.ACTIVE,
        firstName: createDriverDto.firstName,
        lastName: createDriverDto.lastName,
        phone: createDriverDto.phone,
        email: createDriverDto.email || null,
        createdById,
      },
    });

    // Создаём водителя
    return this.prisma.driver.create({
      data: {
        ...createDriverDto,
        name: `${createDriverDto.firstName} ${createDriverDto.lastName}`, // формируем name из firstName и lastName
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
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

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { licenseNumber: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        include: {
          user: true,
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
      this.prisma.driver.count({ where }),
    ]);

    return {
      data: drivers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverByUserId(userId: number) {
    if (!userId) {
      throw new NotFoundException('ID пользователя не указан');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        licenseNumber: true,
        licenseExpiryDate: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            currentRole: true,
            status: true,
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundException(`Профиль водителя не найден для пользователя с ID: ${userId}. Обратитесь к администратору для создания профиля водителя.`);
    }

    return driver;
  }

  async findOne(id: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        invoices: {
          include: {
            customer: true,
            vehicle: true,
            concreteMark: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20, // Последние 20 накладных
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Водитель не найден');
    }

    return driver;
  }

  async update(id: number, updateDriverDto: UpdateDriverDto) {
    const driver = await this.findOne(id);

    // Если обновляется телефон, проверяем уникальность
    if (updateDriverDto.phone && updateDriverDto.phone !== driver.phone) {
      const existingDriver = await this.prisma.driver.findFirst({
        where: { 
          phone: updateDriverDto.phone,
          id: { not: id },
        },
      });

      if (existingDriver) {
        throw new BadRequestException('Водитель с таким телефоном уже существует');
      }
    }

    // Обновляем данные водителя
    // Если обновляются firstName или lastName, обновляем также поле name
    const updateData: any = { ...updateDriverDto };
    if (updateDriverDto.firstName || updateDriverDto.lastName) {
      const newFirstName = updateDriverDto.firstName || driver.firstName;
      const newLastName = updateDriverDto.lastName || driver.lastName;
      updateData.name = `${newFirstName} ${newLastName}`;
    }
    
    const updatedDriver = await this.prisma.driver.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    // Синхронизируем данные с пользователем
    if (driver.userId) {
      await this.prisma.user.update({
        where: { id: driver.userId },
        data: {
          firstName: updateDriverDto.firstName || driver.firstName,
          lastName: updateDriverDto.lastName || driver.lastName,
          phone: updateDriverDto.phone || driver.phone,
          email: updateDriverDto.email !== undefined ? updateDriverDto.email : driver.user?.email,
          login: updateDriverDto.phone || driver.phone, // телефон = логин
          username: updateDriverDto.phone || driver.phone, // дублируем в username
        },
      });
    }

    return updatedDriver;
  }

  async remove(id: number) {
    const driver = await this.findOne(id);

    // Проверяем, что у водителя нет связанных накладных
    const relatedData = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        invoices: true,
      },
    });

    if (relatedData.invoices.length > 0) {
      throw new BadRequestException('Нельзя удалить водителя с привязанными накладными');
    }

    await this.prisma.driver.delete({
      where: { id },
    });

    return { message: 'Водитель успешно удалён' };
  }

  async getStats() {
    const [total, withInvoices] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({
        where: {
          invoices: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      withInvoices,
    };
  }

  async findByPhone(phone: string) {
    return this.prisma.driver.findFirst({
      where: { phone },
    });
  }

  async findByLicense(licenseNumber: string) {
    return this.prisma.driver.findFirst({
      where: { licenseNumber },
    });
  }

  async getAvailableDrivers() {
    // Водители без привязанных накладных или с завершёнными накладными
    return this.prisma.driver.findMany({
      where: {
        OR: [
          {
            invoices: {
              none: {},
            },
          },
          {
            invoices: {
              every: {
                status: 'DELIVERED',
              },
            },
          },
        ],
      },
      include: {
        user: true,
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });
  }

  async getDriverPerformance(driverId: number, startDate?: Date, endDate?: Date) {
    const where: any = {
      driverId,
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [totalInvoices, deliveredInvoices, totalDistance] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.count({ 
        where: { 
          ...where, 
          status: 'DELIVERED' 
        } 
      }),
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          distanceKm: true,
        },
      }),
    ]);

    return {
      totalInvoices,
      deliveredInvoices,
      totalDistance: totalDistance._sum.distanceKm || 0,
      deliveryRate: totalInvoices > 0 ? (deliveredInvoices / totalInvoices) * 100 : 0,
    };
  }
}
