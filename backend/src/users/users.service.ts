import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, createdById?: number) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        currentRole: createUserDto.role,
        username: createUserDto.login, // дублируем login в username
        createdById,
      },
      select: {
        id: true,
        username: true,
        login: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        currentRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            login: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        login: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        currentRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        currentRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, currentUser?: any) {
    const user = await this.findOne(id);

    // Проверка прав: только ADMIN и DEVELOPER могут редактировать любых пользователей
    const canEditAny = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER');
    
    // userId приходит из JWT стратегии
    const currentUserId = currentUser?.userId || currentUser?.id;
    
    // Если не админ/девелопер, можно редактировать только себя
    if (!canEditAny && currentUser && currentUserId !== id) {
      throw new ForbiddenException('Вы можете редактировать только свой профиль');
    }

    // Если пользователь редактирует себя, запрещаем менять роль и статус
    const updateData: any = { ...updateUserDto };
    
    if (!canEditAny && currentUser && currentUserId === id) {
      // Обычный пользователь не может менять свою роль и статус
      delete updateData.role;
      delete updateData.currentRole;
      delete updateData.status;
    }
    
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        login: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        currentRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Синхронизируем данные с таблицей Driver, если пользователь является водителем
    if (updatedUser.role === 'DRIVER') {
      const driver = await this.prisma.driver.findFirst({
        where: { userId: id },
      });

      if (driver) {
        const newFirstName = updateData.firstName || driver.firstName;
        const newLastName = updateData.lastName || driver.lastName;
        
        await this.prisma.driver.update({
          where: { id: driver.id },
          data: {
            firstName: newFirstName,
            lastName: newLastName,
            name: `${newFirstName} ${newLastName}`, // Обновляем поле name
            email: updateData.email !== undefined ? updateData.email : driver.email,
            phone: updateData.phone || driver.phone,
          },
        });
      }
    }

    return updatedUser;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Пользователь успешно удалён' };
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}