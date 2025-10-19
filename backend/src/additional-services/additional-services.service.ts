import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAdditionalServiceDto } from './dto/create-additional-service.dto';
import { UpdateAdditionalServiceDto } from './dto/update-additional-service.dto';

@Injectable()
export class AdditionalServicesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateAdditionalServiceDto) {
    return this.prisma.additionalService.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        price: createDto.price ?? 0,
        unit: createDto.unit,
      },
    });
  }

  async findAll() {
    return this.prisma.additionalService.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const service = await this.prisma.additionalService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Дополнительная услуга с ID ${id} не найдена`);
    }

    return service;
  }

  async update(id: number, updateDto: UpdateAdditionalServiceDto) {
    await this.findOne(id); // Проверка существования

    return this.prisma.additionalService.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Проверка существования

    return this.prisma.additionalService.delete({
      where: { id },
    });
  }
}

