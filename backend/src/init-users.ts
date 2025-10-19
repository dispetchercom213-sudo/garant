import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function initUsers() {
  try {
    // Проверяем, есть ли уже пользователи
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      console.log(`✅ Пользователи уже существуют (${userCount} шт.)`);
      return;
    }

    console.log('🚀 Создание начальных пользователей...');

    // Создаем admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        login: 'admin',
        username: 'admin',
        password: adminPassword,
        role: 'ADMIN',
        currentRole: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@garant-beton.kz',
      },
    });
    console.log('   ✅ Создан пользователь: admin (ADMIN)');

    // Создаем dev
    const devPassword = await bcrypt.hash('dev123', 10);
    await prisma.user.create({
      data: {
        login: 'dev',
        username: 'dev',
        password: devPassword,
        role: 'DEVELOPER',
        currentRole: 'DEVELOPER',
        firstName: 'Developer',
        lastName: 'User',
        email: 'dev@garant-beton.kz',
      },
    });
    console.log('   ✅ Создан пользователь: dev (DEVELOPER)');

    console.log('✅ Начальные пользователи созданы успешно!');
    console.log('   📧 admin / admin123 (ADMIN)');
    console.log('   📧 dev / dev123 (DEVELOPER)');
    console.log('   ⚠️  ВАЖНО: Смените пароли после первого входа!');
  } catch (error) {
    console.error('❌ Ошибка при создании пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

