import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && await this.usersService.validatePassword(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    // Очищаем currentRole при логине (функциональность смены роли удалена)
    // Используем только основную role пользователя
    if (user.currentRole && user.currentRole !== user.role) {
      await this.usersService.update(user.id, { currentRole: null });
      user.currentRole = null;
    }

    const payload = { 
      username: user.username, 
      sub: user.id, 
      role: user.role
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        availabilityStatus: user.availabilityStatus,
      },
    };
  }

  async switchRole(userId: number, newRole: UserRole) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Временно разрешаем всем пользователям переключаться на любую роль
    // TODO: Настроить более детальные права позже
    // if (user.role !== 'DEVELOPER' && user.role !== 'ADMIN' && user.role !== newRole) {
    //   throw new UnauthorizedException('Недостаточно прав для переключения роли');
    // }

    const updatedUser = await this.usersService.update(userId, { currentRole: newRole });
    
    const payload = { 
      username: updatedUser.username, 
      sub: updatedUser.id, 
      role: updatedUser.role,
      currentRole: updatedUser.currentRole 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        currentRole: updatedUser.currentRole,
      },
    };
  }
}