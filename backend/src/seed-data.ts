import { PrismaClient, UserRole, UserStatus, CounterpartyKind, CounterpartyType, MaterialTypeEnum, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('👤 Создание пользователей...');
  
  const hashedPassword = await bcrypt.hash('dev123', 10);
  
  // Разработчик
  const dev = await prisma.user.upsert({
    where: { login: 'dev' },
    update: {},
    create: {
      username: 'dev',
      login: 'dev',
      password: hashedPassword,
      firstName: 'Developer',
      lastName: 'User',
      role: UserRole.DEVELOPER,
      currentRole: UserRole.DEVELOPER,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('  ✅ Разработчик создан (dev / dev123)');

  // Администратор
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      username: 'admin',
      login: 'admin',
      password: hashedPassword,
      firstName: 'Администратор',
      lastName: 'Системы',
      role: UserRole.ADMIN,
      currentRole: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('  ✅ Администратор создан (admin / dev123)');

  // Директор
  const director = await prisma.user.upsert({
    where: { login: 'director' },
    update: {},
    create: {
      username: 'director',
      login: 'director',
      password: hashedPassword,
      firstName: 'Иван',
      lastName: 'Директоров',
      role: UserRole.DIRECTOR,
      currentRole: UserRole.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('  ✅ Директор создан (director / dev123)');

  // Менеджер
  const manager = await prisma.user.upsert({
    where: { login: 'manager' },
    update: {},
    create: {
      username: 'manager',
      login: 'manager',
      password: hashedPassword,
      firstName: 'Мария',
      lastName: 'Менеджерова',
      role: UserRole.MANAGER,
      currentRole: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('  ✅ Менеджер создан (manager / dev123)');

  // Диспетчер
  const dispatcher = await prisma.user.upsert({
    where: { login: 'dispatcher' },
    update: {},
    create: {
      username: 'dispatcher',
      login: 'dispatcher',
      password: hashedPassword,
      firstName: 'Петр',
      lastName: 'Диспетчеров',
      role: UserRole.DISPATCHER,
      currentRole: UserRole.DISPATCHER,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('  ✅ Диспетчер создан (dispatcher / dev123)');

  return { dev, admin, director, manager, dispatcher };
}

async function seedCompanies() {
  console.log('🏢 Создание компаний...');
  
  const company1 = await prisma.company.upsert({
    where: { bin: '123456789012' },
    update: {},
    create: {
      name: 'ТОО "Гарант Бетон"',
      bin: '123456789012',
      address: 'г. Алматы, ул. Промышленная, 10',
      phone: '+7 727 123 45 67',
      email: 'info@garantbeton.kz',
      director: 'Иванов Иван Иванович',
      bankName: 'АО "Народный Банк Казахстана"',
      iik: 'KZ123456789012345678',
      bik: 'HSBKKZKX',
    },
  });
  console.log('  ✅ Компания "Гарант Бетон" создана');

  return { company1 };
}

async function seedWarehouses(companyId: number) {
  console.log('🏭 Создание складов...');
  
  const warehouse1 = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Главный склад',
      address: 'г. Алматы, ул. Промышленная, 10',
      latitude: 43.2220,
      longitude: 76.8512,
      phone: '+7 727 123 45 67',
      companyId,
    },
  });
  console.log('  ✅ Склад "Главный склад" создан');

  const warehouse2 = await prisma.warehouse.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Складской комплекс №2',
      address: 'г. Алматы, пр. Райымбека, 250',
      latitude: 43.2561,
      longitude: 76.9286,
      phone: '+7 727 123 45 68',
      companyId,
    },
  });
  console.log('  ✅ Склад "Складской комплекс №2" создан');

  return { warehouse1, warehouse2 };
}

async function seedMaterialTypes() {
  console.log('📦 Создание типов материалов...');
  
  const types = [
    MaterialTypeEnum.CEMENT,
    MaterialTypeEnum.SAND,
    MaterialTypeEnum.GRAVEL,
    MaterialTypeEnum.WATER,
    MaterialTypeEnum.ADDITIVE,
  ];

  for (const type of types) {
    await prisma.materialType.upsert({
      where: { name: type },
      update: {},
      create: { name: type },
    });
  }
  
  console.log('  ✅ Типы материалов созданы');
}

async function seedMaterials() {
  console.log('🧱 Создание материалов...');
  
  const cementType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.CEMENT } });
  const sandType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.SAND } });
  const gravelType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.GRAVEL } });
  const waterType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.WATER } });
  const additiveType = await prisma.materialType.findUnique({ where: { name: MaterialTypeEnum.ADDITIVE } });

  await prisma.material.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Цемент М400',
      unit: 'кг',
      typeId: cementType!.id,
    },
  });

  await prisma.material.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Песок речной',
      unit: 'кг',
      typeId: sandType!.id,
    },
  });

  await prisma.material.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Щебень фракция 5-20',
      unit: 'кг',
      typeId: gravelType!.id,
    },
  });

  await prisma.material.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Вода техническая',
      unit: 'л',
      typeId: waterType!.id,
    },
  });

  await prisma.material.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'Пластификатор',
      unit: 'л',
      typeId: additiveType!.id,
    },
  });

  console.log('  ✅ Материалы созданы');
}

async function seedConcreteMarks() {
  console.log('🏗️ Создание марок бетона...');
  
  const marks = [
    { name: 'М100', description: 'Бетон марки М100 (В7.5)' },
    { name: 'М150', description: 'Бетон марки М150 (В12.5)' },
    { name: 'М200', description: 'Бетон марки М200 (В15)' },
    { name: 'М250', description: 'Бетон марки М250 (В20)' },
    { name: 'М300', description: 'Бетон марки М300 (В22.5)' },
    { name: 'М350', description: 'Бетон марки М350 (В25)' },
    { name: 'М400', description: 'Бетон марки М400 (В30)' },
  ];

  for (const mark of marks) {
    await prisma.concreteMark.upsert({
      where: { name: mark.name },
      update: {},
      create: mark,
    });
  }

  console.log('  ✅ Марки бетона созданы');
}

async function seedCounterparties() {
  console.log('👥 Создание контрагентов...');
  
  await prisma.counterparty.upsert({
    where: { id: 1 },
    update: {},
    create: {
      kind: CounterpartyKind.LEGAL,
      type: CounterpartyType.CUSTOMER,
      name: 'ТОО "СтройМонтаж"',
      binOrIin: '987654321012',
      phone: '+7 727 987 65 43',
      address: 'г. Алматы, ул. Строителей, 5',
      representativeName: 'Петров Петр Петрович',
      representativePhone: '+7 701 123 45 67',
    },
  });

  await prisma.counterparty.upsert({
    where: { id: 2 },
    update: {},
    create: {
      kind: CounterpartyKind.INDIVIDUAL,
      type: CounterpartyType.CUSTOMER,
      name: 'ИП Сидоров А.Б.',
      binOrIin: '850101301234',
      phone: '+7 702 234 56 78',
      address: 'г. Алматы, мкр. Аксай-1, д. 10',
    },
  });

  await prisma.counterparty.upsert({
    where: { id: 3 },
    update: {},
    create: {
      kind: CounterpartyKind.LEGAL,
      type: CounterpartyType.SUPPLIER,
      name: 'ТОО "Цемент Плюс"',
      binOrIin: '111222333444',
      phone: '+7 727 111 22 33',
      address: 'г. Алматы, пр. Суюнбая, 100',
      representativeName: 'Козлов Владимир Иванович',
      representativePhone: '+7 701 111 22 33',
    },
  });

  console.log('  ✅ Контрагенты созданы');
}

async function seedVehicles() {
  console.log('🚛 Создание транспорта...');
  
  await prisma.vehicle.upsert({
    where: { plate: 'А123БВ01' },
    update: {},
    create: {
      type: VehicleType.MIXER,
      plate: 'А123БВ01',
      capacity: 7,
      unit: 'м³',
    },
  });

  await prisma.vehicle.upsert({
    where: { plate: 'В456ГД02' },
    update: {},
    create: {
      type: VehicleType.MIXER,
      plate: 'В456ГД02',
      capacity: 9,
      unit: 'м³',
    },
  });

  await prisma.vehicle.upsert({
    where: { plate: 'Д789ЕЖ02' },
    update: {},
    create: {
      type: VehicleType.DUMP_TRUCK,
      plate: 'Д789ЕЖ02',
      capacity: 20,
      unit: 'т',
    },
  });

  console.log('  ✅ Транспорт создан');
}

async function main() {
  console.log('🌱 Начало заполнения базы данных тестовыми данными...\n');
  
  try {
    const users = await seedUsers();
    const { company1 } = await seedCompanies();
    await seedWarehouses(company1.id);
    await seedMaterialTypes();
    await seedMaterials();
    await seedConcreteMarks();
    await seedCounterparties();
    await seedVehicles();
    
    console.log('\n✅ База данных успешно заполнена тестовыми данными!');
    console.log('\n📋 Учетные данные для входа:');
    console.log('   Разработчик: dev / dev123');
    console.log('   Администратор: admin / dev123');
    console.log('   Директор: director / dev123');
    console.log('   Менеджер: manager / dev123');
    console.log('   Диспетчер: dispatcher / dev123');
  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


