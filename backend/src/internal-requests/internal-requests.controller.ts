import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { InternalRequestsService } from './internal-requests.service';
import { CreateInternalRequestDto } from './dto/create-request.dto';
import { UpdateInternalRequestDto } from './dto/update-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('internal-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternalRequestsController {
  constructor(private readonly requestsService: InternalRequestsService) {}

  // Создать заявку (доступно всем сотрудникам)
  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
    UserRole.SUPPLIER,
    UserRole.DRIVER,
    UserRole.DIRECTOR,
  )
  async create(@Request() req, @Body() createDto: CreateInternalRequestDto) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.login;
    return this.requestsService.create(req.user.userId, createDto, userName);
  }

  // Получить МОИ заявки (доступно всем)
  @Get('my')
  async findMy(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.requestsService.findMy(
      req.user.userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  // Получить все заявки (с фильтрацией по роли)
  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.ACCOUNTANT,
    UserRole.SUPPLIER,
    UserRole.DISPATCHER,
  )
  async findAll(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.requestsService.findAll(
      req.user.userId,
      req.user.role,
      parseInt(page),
      parseInt(limit),
    );
  }

  // Получить одну заявку
  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.ACCOUNTANT,
    UserRole.SUPPLIER,
  )
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requestsService.findOne(id);
  }

  // Снабженец заполняет цену и поставщика
  @Patch(':id/supply-fill')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.SUPPLIER)
  async supplyFill(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateInternalRequestDto,
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.login;
    return this.requestsService.supplyFill(id, updateDto, userName);
  }

  // Директор утверждает или отклоняет
  @Patch(':id/director-decision')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async directorDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approved: boolean; decision: string },
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.login;
    return this.requestsService.directorDecision(id, body.approved, body.decision, userName);
  }

  // Бухгалтер выделяет средства
  @Patch(':id/accountant-fund')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.ACCOUNTANT)
  async accountantFund(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.login;
    return this.requestsService.accountantFund(id, userName);
  }

  // Снабженец отмечает закупку
  @Patch(':id/mark-purchased')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.SUPPLIER)
  async markPurchased(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.login;
    return this.requestsService.markPurchased(id, userName);
  }

  // Сотрудник подтверждает получение
  @Patch(':id/confirm-receive')
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.ACCOUNTANT,
    UserRole.SUPPLIER,
  )
  async confirmReceive(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.login;
    return this.requestsService.confirmReceive(id, req.user.userId, userName);
  }

  // Статистика
  @Get('stats/summary')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT)
  async getStats() {
    return this.requestsService.getStats();
  }
}


