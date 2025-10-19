import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateConcreteMarkDto } from './dto/create-concrete-mark.dto';
import { UpdateConcreteMarkDto } from './dto/update-concrete-mark.dto';
import { CreateConcreteMarkMaterialDto } from './dto/create-concrete-mark-material.dto';

@Injectable()
export class ConcreteMarksService {
  constructor(private prisma: PrismaService) {}

  async create(createConcreteMarkDto: CreateConcreteMarkDto) {
    try {
      // Проверяем, существует ли уже марка с таким названием
      const existing = await this.prisma.concreteMark.findUnique({
        where: { name: createConcreteMarkDto.name },
      });

      if (existing) {
        throw new BadRequestException(`Марка бетона "${createConcreteMarkDto.name}" уже существует`);
      }

      return await this.prisma.concreteMark.create({
        data: {
          name: createConcreteMarkDto.name,
          description: createConcreteMarkDto.description,
        },
        include: {
          materials: {
            include: {
              material: true,
            },
          },
          _count: {
            select: {
              materials: true,
              orders: true,
              invoices: true,
              priceAgreements: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('❌ Ошибка при создании марки бетона:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Не удалось создать марку бетона. Возможно, марка с таким названием уже существует.');
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [concreteMarks, total] = await Promise.all([
      this.prisma.concreteMark.findMany({
        where,
        include: {
          materials: {
            include: {
              material: true,
            },
          },
          _count: {
            select: {
              materials: true,
              orders: true,
              invoices: true,
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
      this.prisma.concreteMark.count({ where }),
    ]);

    return {
      data: concreteMarks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const concreteMark = await this.prisma.concreteMark.findUnique({
      where: { id },
      include: {
        materials: {
          include: {
            material: {
              include: {
                type: true,
              },
            },
          },
          orderBy: {
            material: {
              type: {
                name: 'asc',
              },
            },
          },
        },
        orders: {
          include: {
            customer: true,
            createdBy: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Последние 10 заказов
        },
        invoices: {
          include: {
            customer: true,
            createdBy: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Последние 10 накладных
        },
        priceAgreements: {
          include: {
            customer: true,
            createdBy: true,
          },
          orderBy: {
            effectiveFrom: 'desc',
          },
          take: 10, // Последние 10 ценовых соглашений
        },
        _count: {
          select: {
            materials: true,
            orders: true,
            invoices: true,
            priceAgreements: true,
          },
        },
      },
    });

    if (!concreteMark) {
      throw new NotFoundException('Марка бетона не найдена');
    }

    return concreteMark;
  }

  async update(id: number, updateConcreteMarkDto: UpdateConcreteMarkDto) {
    const concreteMark = await this.findOne(id);

    return this.prisma.concreteMark.update({
      where: { id },
      data: updateConcreteMarkDto,
      include: {
        materials: {
          include: {
            material: true,
          },
        },
        _count: {
          select: {
            materials: true,
            orders: true,
            invoices: true,
            priceAgreements: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const concreteMark = await this.findOne(id);

    // Проверяем, что у марки бетона нет связанных заказов или накладных
    const relatedData = await this.prisma.concreteMark.findUnique({
      where: { id },
      include: {
        orders: true,
        invoices: true,
        priceAgreements: true,
      },
    });

    const ordersCount = relatedData.orders.length;
    const invoicesCount = relatedData.invoices.length;
    const agreementsCount = relatedData.priceAgreements.length;

    if (ordersCount > 0 || invoicesCount > 0 || agreementsCount > 0) {
      const details = [];
      if (ordersCount > 0) details.push(`${ordersCount} заказ(ов)`);
      if (invoicesCount > 0) details.push(`${invoicesCount} накладн(ых)`);
      if (agreementsCount > 0) details.push(`${agreementsCount} ценов(ых) соглашени(й)`);
      
      throw new BadRequestException(
        `Нельзя удалить марку бетона "${concreteMark.name}". ` +
        `С ней связано: ${details.join(', ')}. ` +
        `Сначала удалите или измените связанные записи.`
      );
    }

    // Удаляем состав материалов
    await this.prisma.concreteMarkMaterial.deleteMany({
      where: { markId: id },
    });

    await this.prisma.concreteMark.delete({
      where: { id },
    });

    return { message: 'Марка бетона успешно удалена' };
  }

  async addMaterial(markId: number, createMaterialDto: CreateConcreteMarkMaterialDto) {
    const concreteMark = await this.findOne(markId);

    // Проверяем, что материал ещё не добавлен
    const existingMaterial = await this.prisma.concreteMarkMaterial.findUnique({
      where: {
        markId_materialId: {
          markId,
          materialId: createMaterialDto.materialId,
        },
      },
    });

    if (existingMaterial) {
      throw new BadRequestException('Материал уже добавлен в состав марки');
    }

    return this.prisma.concreteMarkMaterial.create({
      data: {
        markId,
        materialId: createMaterialDto.materialId,
        quantityPerM3: createMaterialDto.quantityPerM3,
        unit: createMaterialDto.unit,
      },
      include: {
        material: {
          include: {
            type: true,
          },
        },
        mark: true,
      },
    });
  }

  async updateMaterial(markId: number, materialId: number, quantityPerM3: number, unit: string) {
    const concreteMarkMaterial = await this.prisma.concreteMarkMaterial.findUnique({
      where: {
        markId_materialId: {
          markId,
          materialId,
        },
      },
    });

    if (!concreteMarkMaterial) {
      throw new NotFoundException('Материал не найден в составе марки');
    }

    return this.prisma.concreteMarkMaterial.update({
      where: {
        markId_materialId: {
          markId,
          materialId,
        },
      },
      data: {
        quantityPerM3,
        unit,
      },
      include: {
        material: {
          include: {
            type: true,
          },
        },
        mark: true,
      },
    });
  }

  async removeMaterial(markId: number, materialId: number) {
    const concreteMarkMaterial = await this.prisma.concreteMarkMaterial.findUnique({
      where: {
        markId_materialId: {
          markId,
          materialId,
        },
      },
    });

    if (!concreteMarkMaterial) {
      throw new NotFoundException('Материал не найден в составе марки');
    }

    await this.prisma.concreteMarkMaterial.delete({
      where: {
        markId_materialId: {
          markId,
          materialId,
        },
      },
    });

    return { message: 'Материал успешно удалён из состава марки' };
  }

  async getStats() {
    const [total, withMaterials, withOrders, withInvoices] = await Promise.all([
      this.prisma.concreteMark.count(),
      this.prisma.concreteMark.count({
        where: {
          materials: {
            some: {},
          },
        },
      }),
      this.prisma.concreteMark.count({
        where: {
          orders: {
            some: {},
          },
        },
      }),
      this.prisma.concreteMark.count({
        where: {
          invoices: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      withMaterials,
      withOrders,
      withInvoices,
    };
  }

  async calculateComposition(markId: number, quantityM3: number) {
    const concreteMark = await this.findOne(markId);

    return concreteMark.materials.map(item => ({
      material: item.material,
      quantityPerM3: item.quantityPerM3,
      totalQuantity: item.quantityPerM3 * quantityM3,
      unit: item.unit,
    }));
  }
}
