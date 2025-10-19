import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialTypeEnum } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(createMaterialDto: CreateMaterialDto) {
    // Находим тип материала
    const materialType = await this.prisma.materialType.findUnique({
      where: { name: createMaterialDto.typeName },
    });

    if (!materialType) {
      throw new BadRequestException('Тип материала не найден');
    }

    return this.prisma.material.create({
      data: {
        name: createMaterialDto.name,
        unit: createMaterialDto.unit,
        typeId: materialType.id,
      },
      include: {
        type: true,
        balances: {
          include: {
            warehouse: true,
          },
        },
        _count: {
          select: {
            balances: true,
            markUsages: true,
            invoiceItems: true,
            invoices: true,
            warehouseTransactions: true,
          },
        },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, typeName?: MaterialTypeEnum) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { unit: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (typeName) {
      where.type = {
        name: typeName,
      };
    }

    const [materials, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        include: {
          type: true,
          balances: {
            include: {
              warehouse: true,
            },
          },
          _count: {
            select: {
              balances: true,
              markUsages: true,
              invoiceItems: true,
              invoices: true,
              warehouseTransactions: true,
            },
          },
        },
        orderBy: [
          { type: { name: 'asc' } },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.material.count({ where }),
    ]);

    return {
      data: materials,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        type: true,
        balances: {
          include: {
            warehouse: true,
          },
        },
        markUsages: {
          include: {
            mark: true,
          },
        },
        invoiceItems: {
          include: {
            invoice: true,
          },
          orderBy: {
            invoice: {
              createdAt: 'desc',
            },
          },
          take: 20, // Последние 20 использований
        },
        warehouseTransactions: {
          include: {
            warehouse: true,
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
            markUsages: true,
            invoiceItems: true,
            invoices: true,
            warehouseTransactions: true,
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException('Материал не найден');
    }

    return material;
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto) {
    const material = await this.findOne(id);

    let typeId = material.typeId;
    
    if (updateMaterialDto.typeName && updateMaterialDto.typeName !== material.type.name) {
      const materialType = await this.prisma.materialType.findUnique({
        where: { name: updateMaterialDto.typeName },
      });

      if (!materialType) {
        throw new BadRequestException('Тип материала не найден');
      }
      
      typeId = materialType.id;
    }

    const updateData: any = {};
    if (updateMaterialDto.name !== undefined) updateData.name = updateMaterialDto.name;
    if (updateMaterialDto.unit !== undefined) updateData.unit = updateMaterialDto.unit;
    if (updateMaterialDto.typeName !== undefined) updateData.typeId = typeId;

    return this.prisma.material.update({
      where: { id },
      data: updateData,
      include: {
        type: true,
        balances: {
          include: {
            warehouse: true,
          },
        },
        _count: {
          select: {
            balances: true,
            markUsages: true,
            invoiceItems: true,
            invoices: true,
            warehouseTransactions: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const material = await this.findOne(id);

    // Проверяем, что у материала нет связанных записей
    const relatedData = await this.prisma.material.findUnique({
      where: { id },
      include: {
        balances: true,
        markUsages: true,
        invoiceItems: true,
        invoices: true,
        warehouseTransactions: true,
      },
    });

    if (relatedData.balances.length > 0 || 
        relatedData.markUsages.length > 0 || 
        relatedData.invoiceItems.length > 0 ||
        relatedData.invoices.length > 0 ||
        relatedData.warehouseTransactions.length > 0) {
      throw new BadRequestException('Нельзя удалить материал с привязанными записями');
    }

    await this.prisma.material.delete({
      where: { id },
    });

    return { message: 'Материал успешно удалён' };
  }

  async getStats() {
    const [total, byType] = await Promise.all([
      this.prisma.material.count(),
      this.prisma.material.groupBy({
        by: ['typeId'],
        _count: {
          id: true,
        },
      }),
    ]);

    // Получаем названия типов
    const typeNames = await this.prisma.materialType.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const typeStats = byType.map(item => ({
      type: typeNames.find(t => t.id === item.typeId)?.name || 'Unknown',
      count: item._count.id,
    }));

    return {
      total,
      byType: typeStats,
    };
  }

  async getMaterialTypes() {
    return this.prisma.materialType.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findByType(typeName: MaterialTypeEnum) {
    const materialType = await this.prisma.materialType.findUnique({
      where: { name: typeName },
    });

    if (!materialType) {
      throw new NotFoundException('Тип материала не найден');
    }

    return this.prisma.material.findMany({
      where: {
        typeId: materialType.id,
      },
      include: {
        type: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}

