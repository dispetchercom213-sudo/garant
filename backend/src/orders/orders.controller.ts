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
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.CLIENT)
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // Автоматически устанавливаем createdById из токена пользователя
    const userId = req.user.userId || req.user.id;
    return this.ordersService.create({
      ...createOrderDto,
      createdById: userId,
    });
  }

  // Эндпоинт для получения заказов текущего пользователя (менеджер видит свои созданные заказы, водитель - назначенные)
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER, UserRole.MANAGER, UserRole.OPERATOR, UserRole.CLIENT)
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
    if (req.user.role === UserRole.DRIVER) {
      const driverId = await this.ordersService.getDriverIdByUserId(req.user.userId);
      return this.ordersService.getOrdersByDriver(driverId, pageNum, limitNum, search, status);
    }
    
    // Для менеджера, оператора и клиента показываем только созданные ими заказы
    const userId = req.user.userId || req.user.id;
    return this.ordersService.findAll(pageNum, limitNum, search, status, { 
      userId, 
      id: userId,
      role: req.user.role,
      filterByUserId: true // Явно указываем, что нужно фильтровать по userId
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.DRIVER, UserRole.CLIENT)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
    @Request() req?,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const user = req?.user;
    // Для CLIENT фильтруем только по его заказам
    if (user && user.role === UserRole.CLIENT) {
      const userId = user.userId || user.id;
      return this.ordersService.findAll(pageNum, limitNum, search, status, { 
        userId, 
        id: userId,
        role: user.role,
        filterByUserId: true
      });
    }
    return this.ordersService.findAll(pageNum, limitNum, search, status, user);
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
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.OPERATOR)
  updateStatus(@Param('id') id: string, @Body() body: { status: OrderStatus }, @Request() req) {
    const userId = req.user.userId || req.user.id;
    return this.ordersService.updateStatus(+id, body.status, userId);
  }

  // Удаление заказов полностью запрещено - все заказы сохраняются в истории
  // @Delete(':id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DRIVER)
  // remove(@Param('id') id: string, @Request() req) {
  //   return this.ordersService.remove(+id, req.user.userId, req.user.role);
  // }

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

  // Удаление заказов полностью запрещено - все заказы сохраняются в истории
  // Запросить удаление заказа (для принятых заказов)
  // @Patch(':id/request-deletion')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER)
  // requestDeletion(@Param('id') id: string, @Body() body: { reason: string }, @Request() req) {
  //   return this.ordersService.requestDeletion(+id, req.user.userId, req.user.role, body.reason);
  // }

  // Подтвердить удаление (директор/диспетчер/создатель)
  // @Patch(':id/approve-deletion')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER, UserRole.OPERATOR)
  // approveDeletion(@Param('id') id: string, @Request() req) {
  //   return this.ordersService.approveDeletion(+id, req.user.userId, req.user.role);
  // }

  // Отклонить запрос на удаление (директор/диспетчер/создатель)
  // @Patch(':id/reject-deletion')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.MANAGER, UserRole.OPERATOR)
  // rejectDeletion(@Param('id') id: string, @Request() req) {
  //   return this.ordersService.rejectDeletion(+id, req.user.userId, req.user.role);
  // }

  // Получить историю удаленных заказов
  @Get('history/deleted')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.OPERATOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT)
  getDeletedOrdersHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.getDeletedOrdersHistory(pageNum, limitNum, search, req.user);
  }
}
