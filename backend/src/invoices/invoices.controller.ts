import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, InvoiceType } from '@prisma/client';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.DRIVER)
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT, UserRole.DRIVER)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: InvoiceType,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.invoicesService.findAll(pageNum, limitNum, search, type);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.ACCOUNTANT)
  getStats() {
    return this.invoicesService.getStats();
  }

  // Эндпоинт для получения накладных текущего водителя
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async getMyInvoices(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: InvoiceType,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    // Для Developer показываем все накладные
    if (req.user.role === UserRole.DEVELOPER) {
      return this.invoicesService.findAll(pageNum, limitNum, search, type);
    }
    
    // Для водителя получаем ID водителя и показываем только его накладные
    const driverId = await this.invoicesService.getDriverIdByUserId(req.user.userId);
    return this.invoicesService.getInvoicesByDriver(driverId, pageNum, limitNum, search, type);
  }

  @Get('driver/:driverId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.DRIVER)
  getInvoicesByDriver(
    @Param('driverId') driverId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.invoicesService.getInvoicesByDriver(+driverId, pageNum, limitNum);
  }

  // Получить активные накладные для текущего водителя
  @Get('my-active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  getMyActiveInvoices(@Request() req) {
    const userId = req.user.userId || req.user.id;
    console.log(`🎯 Контроллер: Запрос активных накладных от пользователя ID: ${userId}, username: ${req.user.username}`);
    return this.invoicesService.getMyActiveInvoices(userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR, UserRole.ACCOUNTANT, UserRole.DRIVER)
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR)
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.update(+id, updateInvoiceDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.DRIVER)
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.invoicesService.updateStatus(+id, body.status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(+id);
  }

  @Post(':id/items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR)
  addItem(@Param('id') id: string, @Body() createItemDto: CreateInvoiceItemDto) {
    return this.invoicesService.addItem(+id, createItemDto);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateData: Partial<CreateInvoiceItemDto>,
  ) {
    return this.invoicesService.updateItem(+id, +itemId, updateData);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.DISPATCHER, UserRole.OPERATOR)
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.invoicesService.removeItem(+id, +itemId);
  }

  @Post(':id/process-warehouse')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.ACCOUNTANT)
  processWarehouseTransactions(@Param('id') id: string) {
    return this.invoicesService.processWarehouseTransactions(+id);
  }

  // ============================================
  // Эндпоинты для отслеживания маршрута водителя
  // ============================================

  // Принять накладную
  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  acceptInvoice(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId || req.user.id;
    return this.invoicesService.acceptInvoice(+id, userId);
  }

  // Отметить прибытие на объект
  @Post(':id/arrived-at-site')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  markArrivedAtSite(
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.invoicesService.markArrivedAtSite(+id, userId, body.latitude, body.longitude);
  }

  // Отметить выезд с объекта
  @Post(':id/departed-from-site')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  markDepartedFromSite(
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.invoicesService.markDepartedFromSite(+id, userId, body.latitude, body.longitude);
  }

  // Отметить прибытие на завод
  @Post(':id/arrived-at-plant')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  markArrivedAtPlant(
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.invoicesService.markArrivedAtPlant(+id, userId, body.latitude, body.longitude);
  }
}
