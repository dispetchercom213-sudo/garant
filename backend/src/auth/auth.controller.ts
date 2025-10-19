import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('switch-role')
  @UseGuards(JwtAuthGuard)
  async switchRole(@Body() switchRoleDto: SwitchRoleDto) {
    return this.authService.switchRole(switchRoleDto.userId, switchRoleDto.role);
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  async getRoles() {
    return Object.values(UserRole);
  }
}