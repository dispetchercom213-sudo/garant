import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { CounterpartiesService } from './counterparties.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from './dto/update-counterparty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, CounterpartyType } from '@prisma/client';

@Controller('counterparties')
@UseGuards(JwtAuthGuard)
export class CounterpartiesController {
  constructor(private readonly counterpartiesService: CounterpartiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DRIVER)
  create(@Body() createCounterpartyDto: CreateCounterpartyDto, @Request() req) {
    // userId приходит из JWT стратегии
    const userId = req.user.userId || req.user.id;
    return this.counterpartiesService.create(createCounterpartyDto, userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.DIRECTOR, UserRole.ACCOUNTANT, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.DRIVER)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: CounterpartyType,
    @Request() req?,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.counterpartiesService.findAll(pageNum, limitNum, search, type, req.user);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.DIRECTOR, UserRole.ACCOUNTANT)
  getStats() {
    return this.counterpartiesService.getStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.DIRECTOR, UserRole.ACCOUNTANT, UserRole.DISPATCHER)
  findOne(@Param('id') id: string) {
    return this.counterpartiesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DRIVER)
  update(@Param('id') id: string, @Body() updateCounterpartyDto: UpdateCounterpartyDto, @Request() req) {
    return this.counterpartiesService.update(+id, updateCounterpartyDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DRIVER)
  remove(@Param('id') id: string, @Request() req) {
    return this.counterpartiesService.remove(+id, req.user);
  }
}
