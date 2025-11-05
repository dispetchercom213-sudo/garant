import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ConcreteMarksService } from './concrete-marks.service';
import { CreateConcreteMarkDto } from './dto/create-concrete-mark.dto';
import { UpdateConcreteMarkDto } from './dto/update-concrete-mark.dto';
import { CreateConcreteMarkMaterialDto } from './dto/create-concrete-mark-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('concrete-marks')
@UseGuards(JwtAuthGuard)
export class ConcreteMarksController {
  constructor(private readonly concreteMarksService: ConcreteMarksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.MANAGER)
  create(@Body() createConcreteMarkDto: CreateConcreteMarkDto) {
    return this.concreteMarksService.create(createConcreteMarkDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.DRIVER, UserRole.CLIENT)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.concreteMarksService.findAll(pageNum, limitNum, search);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getStats() {
    return this.concreteMarksService.getStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT)
  findOne(@Param('id') id: string) {
    return this.concreteMarksService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateConcreteMarkDto: UpdateConcreteMarkDto) {
    return this.concreteMarksService.update(+id, updateConcreteMarkDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DISPATCHER, UserRole.OPERATOR)
  remove(@Param('id') id: string) {
    return this.concreteMarksService.remove(+id);
  }

  @Post(':id/materials')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.MANAGER)
  addMaterial(@Param('id') id: string, @Body() createMaterialDto: CreateConcreteMarkMaterialDto) {
    return this.concreteMarksService.addMaterial(+id, createMaterialDto);
  }

  @Patch(':id/materials/:materialId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.MANAGER)
  updateMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @Body() body: { quantityPerM3: number; unit: string },
  ) {
    return this.concreteMarksService.updateMaterial(+id, +materialId, body.quantityPerM3, body.unit);
  }

  @Delete(':id/materials/:materialId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.MANAGER)
  removeMaterial(@Param('id') id: string, @Param('materialId') materialId: string) {
    return this.concreteMarksService.removeMaterial(+id, +materialId);
  }

  @Get(':id/calculate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.ACCOUNTANT)
  calculateComposition(
    @Param('id') id: string,
    @Query('quantity') quantity: string,
  ) {
    const quantityM3 = parseFloat(quantity) || 1;
    return this.concreteMarksService.calculateComposition(+id, quantityM3);
  }
}
