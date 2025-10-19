import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DriverWeighingHistoryService } from './driver-weighing-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateDriverWeighingHistoryDto } from './dto/create-driver-weighing-history.dto';

@Controller('driver-weighing-history')
@UseGuards(JwtAuthGuard)
export class DriverWeighingHistoryController {
  constructor(private readonly driverWeighingHistoryService: DriverWeighingHistoryService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async create(@Body() createDto: CreateDriverWeighingHistoryDto, @Request() req: any) {
    return this.driverWeighingHistoryService.create(createDto, req.user.userId);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.DEVELOPER)
  async getMyHistory(@Request() req: any) {
    return this.driverWeighingHistoryService.getByDriverId(req.user.userId);
  }
}
