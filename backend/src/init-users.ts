import { PrismaClient, MaterialTypeEnum } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initMaterialTypes() {
  try {
    const typeNames: MaterialTypeEnum[] = [
      MaterialTypeEnum.CEMENT,
      MaterialTypeEnum.SAND,
      MaterialTypeEnum.GRAVEL,
      MaterialTypeEnum.WATER,
      MaterialTypeEnum.ADDITIVE
    ];
    
    for (const name of typeNames) {
      const existing = await prisma.materialType.findUnique({ where: { name } });
      if (!existing) {
        await prisma.materialType.create({ data: { name } });
        console.log(`   ✅ Создан тип материала: ${name}`);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при создании типов материалов:', error);
  }
}

async function initBasicMaterials() {
  try {
    const cementType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.CEMENT } });
    const sandType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.SAND } });
    const gravelType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.GRAVEL } });

    if (cementType) {
      const existingCement = await prisma.material.findFirst({ where: { name: 'Цемент М400' } });
      if (!existingCement) {
        await prisma.material.create({
          data: { name: 'Цемент М400', unit: 'кг', typeId: cementType.id }
        });
        console.log('   ✅ Создан материал: Цемент М400');
      }
    }

    if (sandType) {
      const existingSand = await prisma.material.findFirst({ where: { name: 'Песок речной' } });
      if (!existingSand) {
        await prisma.material.create({
          data: { name: 'Песок речной', unit: 'кг', typeId: sandType.id }
        });
        console.log('   ✅ Создан материал: Песок речной');
      }
    }

    if (gravelType) {
      const existingGravel = await prisma.material.findFirst({ where: { name: 'Щебень 5-20' } });
      if (!existingGravel) {
        await prisma.material.create({
          data: { name: 'Щебень 5-20', unit: 'кг', typeId: gravelType.id }
        });
        console.log('   ✅ Создан материал: Щебень 5-20');
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при создании материалов:', error);
  }
}

export async function initUsers() {
  try {
    // Инициализация типов материалов
    console.log('🔧 Проверка типов материалов...');
    await initMaterialTypes();
    await initBasicMaterials();

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
  } catch (error: any) {
    // Если таблица User не существует (P2021), значит миграции еще не применились
    if (error.code === 'P2021') {
      console.log('⚠️  Таблица User не существует - миграции еще не применились');
      console.log('   Пользователи будут созданы при следующем запуске');
    } else {
      console.error('❌ Ошибка при создании пользователей:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

