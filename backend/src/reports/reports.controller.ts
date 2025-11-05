import { Controller, Get, UseGuards, Query, Request, BadRequestException, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT)
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT)
  getOrdersReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getOrdersReport(start, end);
  }

  @Get('invoices')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT)
  getInvoicesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getInvoicesReport(start, end);
  }

  // Отчеты для менеджера и клиента (только по своим заказам)
  @Get('my/dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.CLIENT)
  getMyDashboardStats(@Request() req) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      console.error('❌ User ID not found in request:', req.user);
      throw new BadRequestException('User ID not found in request');
    }
    console.log('📊 Запрос статистики для менеджера, userId:', userId, 'user:', req.user);
    return this.reportsService.getManagerDashboardStats(userId);
  }

  @Get('my/orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.CLIENT)
  getMyOrdersReport(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId || req.user.id;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getManagerOrdersReport(userId, start, end);
  }

  @Get('my/invoices')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.CLIENT)
  getMyInvoicesReport(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.userId || req.user.id;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getManagerInvoicesReport(userId, start, end);
  }

  @Get('counterparty/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.ACCOUNTANT, UserRole.MANAGER, UserRole.DISPATCHER)
  getCounterpartyReport(
    @Param('id') id: string,
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const counterpartyId = parseInt(id, 10);
    if (!counterpartyId || isNaN(counterpartyId)) {
      throw new BadRequestException('Invalid counterparty ID');
    }
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const userRole = req.user?.role;
    return this.reportsService.getCounterpartyReport(counterpartyId, start, end, userRole);
  }

  @Get('vehicles')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  getVehiclesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getVehiclesReport(start, end);
  }
}