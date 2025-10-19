import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProposeChangesDto } from './dto/propose-changes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.DRIVER)
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  // Эндпоинт для получения заказов текущего водителя
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async getMyOrders(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    // Для Developer показываем все заказы
    if (req.user.role === UserRole.DEVELOPER) {
      return this.ordersService.findAll(pageNum, limitNum, search, status);
    }
    
    // Для водителя получаем ID водителя и показываем только его заказы
    const driverId = await this.ordersService.getDriverIdByUserId(req.user.userId);
    return this.ordersService.getOrdersByDriver(driverId, pageNum, limitNum, search, status);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.DRIVER)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
    @Request() req?,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.findAll(pageNum, limitNum, search, status, req.user);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER)
  getPendingOrders() {
    return this.ordersService.getPendingOrders();
  }

  @Get('customer/:customerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.ACCOUNTANT)
  getOrdersByCustomer(
    @Param('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.getOrdersByCustomer(+customerId, pageNum, limitNum);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR)
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
    return this.ordersService.update(+id, updateOrderDto, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER)
  updateStatus(@Param('id') id: string, @Body() body: { status: OrderStatus }) {
    return this.ordersService.updateStatus(+id, body.status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DRIVER)
  remove(@Param('id') id: string, @Request() req) {
    return this.ordersService.remove(+id, req.user.userId, req.user.role);
  }

  @Get(':id/materials')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT)
  calculateOrderMaterials(@Param('id') id: string) {
    return this.ordersService.calculateOrderMaterials(+id);
  }

  // Директор предлагает изменения в заказ
  @Patch(':id/propose-changes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  proposeChanges(@Param('id') id: string, @Body() proposeChangesDto: ProposeChangesDto, @Request() req) {
    return this.ordersService.proposeChanges(+id, proposeChangesDto, req.user.userId);
  }

  // Создатель принимает предложенные изменения
  @Patch(':id/accept-changes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR)
  acceptProposedChanges(@Param('id') id: string, @Request() req) {
    return this.ordersService.acceptProposedChanges(+id, req.user.userId);
  }

  // Создатель отклоняет предложенные изменения (отменяет заказ)
  @Patch(':id/reject-changes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR)
  rejectProposedChanges(@Param('id') id: string, @Request() req) {
    return this.ordersService.rejectProposedChanges(+id, req.user.userId);
  }

  // Запросить удаление заказа (для принятых заказов)
  @Patch(':id/request-deletion')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER)
  requestDeletion(@Param('id') id: string, @Body() body: { reason: string }, @Request() req) {
    return this.ordersService.requestDeletion(+id, req.user.userId, req.user.role, body.reason);
  }

  // Подтвердить удаление (директор/диспетчер/создатель)
  @Patch(':id/approve-deletion')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER, UserRole.OPERATOR)
  approveDeletion(@Param('id') id: string, @Request() req) {
    return this.ordersService.approveDeletion(+id, req.user.userId, req.user.role);
  }

  // Отклонить запрос на удаление (директор/диспетчер/создатель)
  @Patch(':id/reject-deletion')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER, UserRole.OPERATOR)
  rejectDeletion(@Param('id') id: string, @Request() req) {
    return this.ordersService.rejectDeletion(+id, req.user.userId, req.user.role);
  }
}
