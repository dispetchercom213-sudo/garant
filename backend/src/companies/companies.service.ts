import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Проверяем уникальность BIN
    const existingCompany = await this.prisma.company.findUnique({
      where: { bin: createCompanyDto.bin },
    });

    if (existingCompany) {
      throw new BadRequestException('Компания с таким BIN уже существует');
    }

    return this.prisma.company.create({
      data: createCompanyDto,
      include: {
        warehouses: true,
        _count: {
          select: {
            warehouses: true,
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
        { name: { contains: search, mode: 'insensitive' as const } },
        { bin: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          warehouses: true,
          _count: {
            select: {
              warehouses: true,
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
      this.prisma.company.count({ where }),
    ]);

    return {
      data: companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        warehouses: true,
        _count: {
          select: {
            warehouses: true,
            invoices: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);

    // Если обновляется BIN, проверяем уникальность
    if (updateCompanyDto.bin && updateCompanyDto.bin !== company.bin) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { bin: updateCompanyDto.bin },
      });

      if (existingCompany) {
        throw new BadRequestException('Компания с таким BIN уже существует');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
      include: {
        warehouses: true,
        _count: {
          select: {
            warehouses: true,
            invoices: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const company = await this.findOne(id);

    // Проверяем, что у компании нет связанных складов или накладных
    const relatedData = await this.prisma.company.findUnique({
      where: { id },
      include: {
        warehouses: true,
        invoices: true,
      },
    });

    if (relatedData.warehouses.length > 0) {
      throw new BadRequestException('Нельзя удалить компанию с привязанными складами');
    }

    if (relatedData.invoices.length > 0) {
      throw new BadRequestException('Нельзя удалить компанию с привязанными накладными');
    }

    await this.prisma.company.delete({
      where: { id },
    });

    return { message: 'Компания успешно удалена' };
  }

  async findByBin(bin: string) {
    return this.prisma.company.findUnique({
      where: { bin },
    });
  }

  async getStats() {
    const [total, withWarehouses, withInvoices] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({
        where: {
          warehouses: {
            some: {},
          },
        },
      }),
      this.prisma.company.count({
        where: {
          invoices: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      withWarehouses,
      withInvoices,
    };
  }
}
