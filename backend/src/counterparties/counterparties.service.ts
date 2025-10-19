import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from './dto/update-counterparty.dto';
import { CounterpartyKind, CounterpartyType, UserRole } from '@prisma/client';

@Injectable()
export class CounterpartiesService {
  constructor(private prisma: PrismaService) {}

  async create(createCounterpartyDto: CreateCounterpartyDto, userId?: number) {
    // Проверяем уникальность BIN/IIN для юридических лиц
    if (createCounterpartyDto.kind === CounterpartyKind.LEGAL && createCounterpartyDto.binOrIin) {
      const existing = await this.prisma.counterparty.findFirst({
        where: { binOrIin: createCounterpartyDto.binOrIin },
      });

      if (existing) {
        throw new BadRequestException('Контрагент с таким BIN/IIN уже существует');
      }
    }

    return this.prisma.counterparty.create({
      data: {
        ...createCounterpartyDto,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            login: true,
          },
        },
        _count: {
          select: {
            customerOrders: true,
            customerInvoices: true,
            supplierInvoices: true,
            priceAgreements: true,
          },
        },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, type?: CounterpartyType, user?: any) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    // МЕНЕДЖЕР и ОПЕРАТОР видят только своих контрагентов
    // ВОДИТЕЛЬ видит всех контрагентов
    // Остальные роли (Директор, Диспетчер, Бухгалтер, Админ, Разработчик) видят всех
    const canViewAll = user && [UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DRIVER].includes(user.role);
    
    if (user && !canViewAll) {
      // МЕНЕДЖЕР и ОПЕРАТОР видят только своих
      const currentUserId = user.userId || user.id;
      where.createdById = currentUserId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { binOrIin: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (type) {
      where.type = type;
    }

    const [counterparties, total] = await Promise.all([
      this.prisma.counterparty.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              login: true,
            },
          },
          _count: {
            select: {
              customerOrders: true,
              customerInvoices: true,
              supplierInvoices: true,
              priceAgreements: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.counterparty.count({ where }),
    ]);

    return {
      data: counterparties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const counterparty = await this.prisma.counterparty.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            login: true,
          },
        },
        _count: {
          select: {
            customerOrders: true,
            customerInvoices: true,
            supplierInvoices: true,
            priceAgreements: true,
          },
        },
      },
    });

    if (!counterparty) {
      throw new NotFoundException('Контрагент не найден');
    }

    return counterparty;
  }

  async update(id: number, updateCounterpartyDto: UpdateCounterpartyDto, user?: any) {
    const counterparty = await this.findOne(id);

    // Проверяем права: только Директор, Диспетчер, Бухгалтер, Админ и Разработчик могут редактировать всех
    const canEditAll = user && [UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.DEVELOPER].includes(user.role);
    
    if (user && !canEditAll) {
      // userId приходит из JWT стратегии
      const currentUserId = user.userId || user.id;
      // Остальные могут редактировать только своих
      if (!counterparty.createdById || counterparty.createdById !== currentUserId) {
        throw new ForbiddenException('Вы можете редактировать только контрагентов, созданных вами');
      }
    }

    // Если обновляется BIN/IIN, проверяем уникальность
    if (updateCounterpartyDto.binOrIin && 
        updateCounterpartyDto.binOrIin !== counterparty.binOrIin &&
        updateCounterpartyDto.kind === CounterpartyKind.LEGAL) {
      const existing = await this.prisma.counterparty.findFirst({
        where: { 
          binOrIin: updateCounterpartyDto.binOrIin,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Контрагент с таким BIN/IIN уже существует');
      }
    }

    return this.prisma.counterparty.update({
      where: { id },
      data: updateCounterpartyDto,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            login: true,
          },
        },
        _count: {
          select: {
            customerOrders: true,
            customerInvoices: true,
            supplierInvoices: true,
            priceAgreements: true,
          },
        },
      },
    });
  }

  async remove(id: number, user?: any) {
    const counterparty = await this.findOne(id);

    // Проверяем права: менеджер, оператор и водитель могут удалять только своих
    // Админ, Разработчик, Директор, Диспетчер, Бухгалтер могут удалять всех
    const canDeleteAll = user && [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT].includes(user.role);
    
    if (user && !canDeleteAll) {
      // userId приходит из JWT стратегии
      const currentUserId = user.userId || user.id;
      // Остальные могут удалять только своих
      if (!counterparty.createdById || counterparty.createdById !== currentUserId) {
        throw new ForbiddenException('Вы можете удалять только контрагентов, созданных вами');
      }
    }

    // Проверяем, что у контрагента нет связанных заказов или накладных
    const relatedData = await this.prisma.counterparty.findUnique({
      where: { id },
      include: {
        customerOrders: true,
        customerInvoices: true,
        supplierInvoices: true,
        priceAgreements: true,
      },
    });

    if (relatedData.customerOrders.length > 0 || 
        relatedData.customerInvoices.length > 0 || 
        relatedData.supplierInvoices.length > 0 ||
        relatedData.priceAgreements.length > 0) {
      throw new BadRequestException('Нельзя удалить контрагента с привязанными заказами, накладными или ценовыми соглашениями');
    }

    await this.prisma.counterparty.delete({
      where: { id },
    });

    return { message: 'Контрагент успешно удалён' };
  }

  async getStats() {
    const [total, customers, suppliers, individuals, legal] = await Promise.all([
      this.prisma.counterparty.count(),
      this.prisma.counterparty.count({ where: { type: CounterpartyType.CUSTOMER } }),
      this.prisma.counterparty.count({ where: { type: CounterpartyType.SUPPLIER } }),
      this.prisma.counterparty.count({ where: { kind: CounterpartyKind.INDIVIDUAL } }),
      this.prisma.counterparty.count({ where: { kind: CounterpartyKind.LEGAL } }),
    ]);

    return {
      total,
      customers,
      suppliers,
      individuals,
      legal,
    };
  }

  async findByBinOrIin(binOrIin: string) {
    return this.prisma.counterparty.findFirst({
      where: { binOrIin },
    });
  }
}
