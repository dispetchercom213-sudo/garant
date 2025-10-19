import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, VehicleType } from '@prisma/client';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER)
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  // Endpoint для водителя чтобы добавить свой транспорт (или связать существующий)
  @Post('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async createMyVehicle(@Request() req, @Body() createVehicleDto: CreateVehicleDto) {
    // Для Developer создаем транспорт без привязки к водителю
    if (req.user.role === UserRole.DEVELOPER) {
      return this.vehiclesService.create(createVehicleDto);
    }
    
    // Для водителя привязываем к нему
    const driverId = await this.vehiclesService.getDriverIdByUserId(req.user.userId);
    return this.vehiclesService.addMyVehicle(driverId, createVehicleDto);
  }

  // Endpoint для получения транспорта текущего водителя
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async getMyVehicles(@Request() req) {
    // Для Developer показываем все транспортные средства
    if (req.user.role === UserRole.DEVELOPER) {
      return this.vehiclesService.findAllForDeveloper();
    }
    
    // Для водителя показываем только его транспорт
    const driverId = await this.vehiclesService.getDriverIdByUserId(req.user.userId);
    return this.vehiclesService.findByDriverId(driverId);
  }

  // Endpoint для отвязки транспорта от водителя
  @Delete('my/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async removeMyVehicle(@Request() req, @Param('id') id: string) {
    // Для Developer удаляем транспорт полностью
    if (req.user.role === UserRole.DEVELOPER) {
      return this.vehiclesService.remove(+id);
    }
    
    // Для водителя отвязываем от него
    const driverId = await this.vehiclesService.getDriverIdByUserId(req.user.userId);
    return this.vehiclesService.removeMyVehicle(driverId, +id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.MANAGER)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: VehicleType,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.vehiclesService.findAll(pageNum, limitNum, search, type);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER)
  getStats() {
    return this.vehiclesService.getStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER)
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(+id, updateVehicleDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(+id);
  }
}



