import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initDevUser() {
  try {
    // Проверяем, существует ли уже пользователь-разработчик
    const existingDev = await prisma.user.findUnique({
      where: { login: 'dev' },
    });

    if (existingDev) {
      console.log('👤 Пользователь-разработчик уже существует');
      return existingDev;
    }

    // Создаём пользователя-разработчика
    const hashedPassword = await bcrypt.hash('dev123', 10);
    
    const devUser = await prisma.user.create({
      data: {
        username: 'dev',
        login: 'dev',
        password: hashedPassword,
        firstName: 'Developer',
        lastName: 'User',
        role: 'DEVELOPER',
        currentRole: 'DEVELOPER',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Пользователь-разработчик создан:');
    console.log('   Логин: dev');
    console.log('   Пароль: dev123');
    console.log('   Роль: DEVELOPER');
    
    return devUser;
  } catch (error) {
    console.error('❌ Ошибка создания пользователя-разработчика:', error);
    throw error;
  }
}

async function main() {
  await initDevUser();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

