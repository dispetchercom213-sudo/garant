import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdditionalServicesService } from './additional-services.service';
import { CreateAdditionalServiceDto } from './dto/create-additional-service.dto';
import { UpdateAdditionalServiceDto } from './dto/update-additional-service.dto';

@Controller('additional-services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdditionalServicesController {
  constructor(private readonly additionalServicesService: AdditionalServicesService) {}

  @Post()
  @Roles('ADMIN', 'DISPATCHER', 'DIRECTOR', 'MANAGER', 'OPERATOR', 'DEVELOPER')
  create(@Body() createDto: CreateAdditionalServiceDto) {
    return this.additionalServicesService.create(createDto);
  }

  @Get()
  findAll() {
    return this.additionalServicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.additionalServicesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DIRECTOR', 'MANAGER', 'OPERATOR', 'DEVELOPER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAdditionalServiceDto,
  ) {
    return this.additionalServicesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.additionalServicesService.remove(id);
  }
}

