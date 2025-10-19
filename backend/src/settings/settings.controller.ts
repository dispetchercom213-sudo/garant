import { Controller, Get, Put, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER)
  async getAll() {
    return await this.service.getAll();
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async update(@Body() body: Record<string, string>) {
    return await this.service.updateSettings(body);
  }

  @Get('email')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER)
  async getEmailSettings() {
    return await this.service.getEmailSettings();
  }

  @Put('email')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async updateEmailSettings(@Body() body: {
    MAIL_SERVICE?: string;
    MAIL_USER?: string;
    MAIL_PASS?: string;
    MAIL_TO?: string;
    MAIL_HOST?: string;
    MAIL_PORT?: string;
    MAIL_SECURE?: boolean;
  }) {
    return await this.service.updateEmailSettings(body);
  }

  @Get(':key')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.MANAGER)
  async get(@Param('key') key: string) {
    return { key, value: await this.service.get(key) };
  }

  @Post(':key')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async set(@Param('key') key: string, @Body() body: { value: string }) {
    return await this.service.set(key, body.value);
  }

  @Delete(':key')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  async delete(@Param('key') key: string) {
    await this.service.delete(key);
    return { message: 'Настройка удалена' };
  }
}

