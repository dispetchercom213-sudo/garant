const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function upsertUser(login, passwordPlain, role, firstName, lastName, email) {
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  await prisma.user.upsert({
    where: { login },
    update: {},
    create: {
      login,
      username: login,
      password: passwordHash,
      role,
      currentRole: role,
      firstName,
      lastName,
      email,
    },
  });
}

async function seedCounterparties() {
  // 20 клиентов
  const clients = [
    { name: 'ТОО "Алматы Строй"', bin: '123456789012', address: 'г. Алматы, ул. Абая, 1', phone: '+7 727 123 45 67', email: 'info@almstroy.kz' },
    { name: 'ТОО "Нур-Султан Строй"', bin: '123456789013', address: 'г. Нур-Султан, ул. Кенесары, 2', phone: '+7 7172 234 56 78', email: 'info@nurstroy.kz' },
    { name: 'ИП "Шымкент Бетон"', bin: '123456789014', address: 'г. Шымкент, ул. Байтурсынова, 3', phone: '+7 7252 345 67 89', email: 'info@shymkent.kz' },
    { name: 'ТОО "Актобе Строй Групп"', bin: '123456789015', address: 'г. Актобе, ул. Ахмета Байтурсынова, 4', phone: '+7 7132 456 78 90', email: 'info@aktobe.kz' },
    { name: 'ТОО "Тараз Строй"', bin: '123456789016', address: 'г. Тараз, ул. Пушкина, 5', phone: '+7 7262 567 89 01', email: 'info@taraz.kz' },
    { name: 'ИП "Павлодар Бетон"', bin: '123456789017', address: 'г. Павлодар, ул. Торайгырова, 6', phone: '+7 7182 678 90 12', email: 'info@pavlodar.kz' },
    { name: 'ТОО "Семей Строй"', bin: '123456789018', address: 'г. Семей, ул. Абая, 7', phone: '+7 7222 789 01 23', email: 'info@semey.kz' },
    { name: 'ТОО "Усть-Каменогорск Бетон"', bin: '123456789019', address: 'г. Усть-Каменогорск, ул. Казахстан, 8', phone: '+7 7232 890 12 34', email: 'info@uk.kz' },
    { name: 'ИП "Костанай Строй"', bin: '123456789020', address: 'г. Костанай, ул. Бейбитшилик, 9', phone: '+7 7142 901 23 45', email: 'info@kostanay.kz' },
    { name: 'ТОО "Кызылорда Бетон"', bin: '123456789021', address: 'г. Кызылорда, ул. Айтеке би, 10', phone: '+7 7242 012 34 56', email: 'info@kyzylorda.kz' },
    { name: 'ТОО "Атырау Строй"', bin: '123456789022', address: 'г. Атырау, ул. Исатая, 11', phone: '+7 7122 123 45 67', email: 'info@atyrau.kz' },
    { name: 'ИП "Актау Бетон"', bin: '123456789023', address: 'г. Актау, ул. Абая, 12', phone: '+7 7292 234 56 78', email: 'info@aktau.kz' },
    { name: 'ТОО "Петропавловск Строй"', bin: '123456789024', address: 'г. Петропавловск, ул. Конституции, 13', phone: '+7 7152 345 67 89', email: 'info@petropavlovsk.kz' },
    { name: 'ТОО "Туркестан Бетон"', bin: '123456789025', address: 'г. Туркестан, ул. Арыстан-баба, 14', phone: '+7 7253 456 78 90', email: 'info@turkestan.kz' },
    { name: 'ИП "Жанаозен Строй"', bin: '123456789026', address: 'г. Жанаозен, ул. Шакарима, 15', phone: '+7 7293 567 89 01', email: 'info@zhanaozen.kz' },
    { name: 'ТОО "Талдыкорган Бетон"', bin: '123456789027', address: 'г. Талдыкорган, ул. Абая, 16', phone: '+7 7282 678 90 12', email: 'info@taldykorgan.kz' },
    { name: 'ТОО "Кокшетау Строй"', bin: '123456789028', address: 'г. Кокшетау, ул. Абая, 17', phone: '+7 7162 789 01 23', email: 'info@kokshetau.kz' },
    { name: 'ИП "Экибастуз Бетон"', bin: '123456789029', address: 'г. Экибастуз, ул. Ленина, 18', phone: '+7 7187 890 12 34', email: 'info@ekibastuz.kz' },
    { name: 'ТОО "Рудный Строй"', bin: '123456789030', address: 'г. Рудный, ул. Мира, 19', phone: '+7 7143 901 23 45', email: 'info@rudny.kz' },
    { name: 'ТОО "Темиртау Бетон"', bin: '123456789031', address: 'г. Темиртау, ул. Металлургов, 20', phone: '+7 7213 012 34 56', email: 'info@temirtau.kz' }
  ];

  // 20 поставщиков
  const suppliers = [
    { name: 'ТОО "Казахстан Цемент"', bin: '987654321012', address: 'г. Алматы, ул. Сатпаева, 100', phone: '+7 727 987 65 43', email: 'sales@kazcement.kz' },
    { name: 'ТОО "Центральный Бетон"', bin: '987654321013', address: 'г. Нур-Султан, ул. Нурсултан Назарбаев, 101', phone: '+7 7172 876 54 32', email: 'info@centralbeton.kz' },
    { name: 'ИП "Южный Поставщик"', bin: '987654321014', address: 'г. Шымкент, ул. Каратау, 102', phone: '+7 7252 765 43 21', email: 'sales@southern.kz' },
    { name: 'ТОО "Западный Цемент"', bin: '987654321015', address: 'г. Актобе, ул. Есет батыра, 103', phone: '+7 7132 654 32 10', email: 'info@westcement.kz' },
    { name: 'ТОО "Бетон Плюс"', bin: '987654321016', address: 'г. Тараз, ул. Жамбыла, 104', phone: '+7 7262 543 21 09', email: 'sales@betonplus.kz' },
    { name: 'ИП "Северный Строй"', bin: '987654321017', address: 'г. Павлодар, ул. Султанмахмута Торайгырова, 105', phone: '+7 7182 432 10 98', email: 'info@northstroy.kz' },
    { name: 'ТОО "Восток Бетон"', bin: '987654321018', address: 'г. Семей, ул. Абая Кунанбаева, 106', phone: '+7 7222 321 09 87', email: 'sales@eastbeton.kz' },
    { name: 'ТОО "Алтай Цемент"', bin: '987654321019', address: 'г. Усть-Каменогорск, ул. Протозанова, 107', phone: '+7 7232 210 98 76', email: 'info@altaycement.kz' },
    { name: 'ИП "Костанай Поставщик"', bin: '987654321020', address: 'г. Костанай, ул. Тәуелсіздік, 108', phone: '+7 7142 109 87 65', email: 'sales@kostanaysupply.kz' },
    { name: 'ТОО "Сырдария Бетон"', bin: '987654321021', address: 'г. Кызылорда, ул. Қорқыт ата, 109', phone: '+7 7242 098 76 54', email: 'info@syrbeton.kz' },
    { name: 'ТОО "Каспий Цемент"', bin: '987654321022', address: 'г. Атырау, ул. Махамбета, 110', phone: '+7 7122 987 65 43', email: 'sales@caspcement.kz' },
    { name: 'ИП "Мангышлак Бетон"', bin: '987654321023', address: 'г. Актау, ул. Елбасы, 111', phone: '+7 7292 876 54 32', email: 'info@mangbeton.kz' },
    { name: 'ТОО "Северо-Казахстанский Цемент"', bin: '987654321024', address: 'г. Петропавловск, ул. Қазақстан, 112', phone: '+7 7152 765 43 21', email: 'sales@northcement.kz' },
    { name: 'ТОО "Туркестан Поставщик"', bin: '987654321025', address: 'г. Туркестан, ул. Ходжи Ахмеда Ясави, 113', phone: '+7 7253 654 32 10', email: 'info@turksupply.kz' },
    { name: 'ИП "Жанаозен Цемент"', bin: '987654321026', address: 'г. Жанаозен, ул. Маңғыстау, 114', phone: '+7 7293 543 21 09', email: 'sales@zhancement.kz' },
    { name: 'ТОО "Жетысу Бетон"', bin: '987654321027', address: 'г. Талдыкорган, ул. Қазыбек би, 115', phone: '+7 7282 432 10 98', email: 'info@zhetbeton.kz' },
    { name: 'ТОО "Акмола Цемент"', bin: '987654321028', address: 'г. Кокшетау, ул. Абая, 116', phone: '+7 7162 321 09 87', email: 'sales@akmolacement.kz' },
    { name: 'ИП "Павлодар Поставщик"', bin: '987654321029', address: 'г. Экибастуз, ул. Қаныш Сәтбаев, 117', phone: '+7 7187 210 98 76', email: 'info@pavsupply.kz' },
    { name: 'ТОО "Рудный Цемент"', bin: '987654321030', address: 'г. Рудный, ул. Құрманғазы, 118', phone: '+7 7143 109 87 65', email: 'sales@rudcement.kz' },
    { name: 'ТОО "Темиртау Поставщик"', bin: '987654321031', address: 'г. Темиртау, ул. Қарағанды, 119', phone: '+7 7213 098 76 54', email: 'info@temirsupply.kz' }
  ];

  // Создаем клиентов
  for (const client of clients) {
    await prisma.counterparty.create({
      data: {
        name: client.name,
        kind: 'LEGAL',
        type: 'CUSTOMER',
        binOrIin: client.bin,
        address: client.address,
        phone: client.phone
      }
    });
  }

  // Создаем поставщиков
  for (const supplier of suppliers) {
    await prisma.counterparty.create({
      data: {
        name: supplier.name,
        kind: 'LEGAL',
        type: 'SUPPLIER',
        binOrIin: supplier.bin,
        address: supplier.address,
        phone: supplier.phone
      }
    });
  }

  console.log('✅ Seed: 20 клиентов и 20 поставщиков созданы');
}

async function seedConcreteMarks() {
  const concreteMarks = [
    { name: 'М100', description: 'Бетон марки М100 (В7,5) - легкий бетон для подготовительных работ' },
    { name: 'М150', description: 'Бетон марки М150 (В10) - легкий бетон для ненагруженных конструкций' },
    { name: 'М200', description: 'Бетон марки М200 (В15) - самый популярный для фундаментов, стяжек' },
    { name: 'М250', description: 'Бетон марки М250 (В20) - для ленточных фундаментов, монолитных стен' },
    { name: 'М300', description: 'Бетон марки М300 (В22,5) - для плитных фундаментов, лестниц' },
    { name: 'М350', description: 'Бетон марки М350 (В25) - для колонн, балок, плит перекрытий' },
    { name: 'М400', description: 'Бетон марки М400 (В30) - для мостов, плотин, высоконагруженных конструкций' },
    { name: 'М450', description: 'Бетон марки М450 (В35) - для специальных сооружений' },
    { name: 'М500', description: 'Бетон марки М500 (В40) - для особо ответственных конструкций' },
    { name: 'М550', description: 'Бетон марки М550 (В45) - для уникальных сооружений' },
    { name: 'М600', description: 'Бетон марки М600 (В50) - для специальных объектов' },
    { name: 'М700', description: 'Бетон марки М700 (В60) - для особо прочных конструкций' },
    { name: 'М800', description: 'Бетон марки М800 (В70) - для специальных применений' },
    { name: 'М900', description: 'Бетон марки М900 (В80) - для уникальных проектов' },
    { name: 'М1000', description: 'Бетон марки М1000 (В90) - для специальных сооружений' },
    { name: 'Морозостойкий F100', description: 'Морозостойкий бетон F100 для сурового климата' },
    { name: 'Морозостойкий F150', description: 'Морозостойкий бетон F150 для экстремальных условий' },
    { name: 'Морозостойкий F200', description: 'Морозостойкий бетон F200 для особых требований' },
    { name: 'Водонепроницаемый W4', description: 'Водонепроницаемый бетон W4 для подземных конструкций' },
    { name: 'Водонепроницаемый W6', description: 'Водонепроницаемый бетон W6 для гидротехнических сооружений' },
    { name: 'Водонепроницаемый W8', description: 'Водонепроницаемый бетон W8 для особых условий' },
    { name: 'Быстротвердеющий', description: 'Быстротвердеющий бетон для ускоренного строительства' },
    { name: 'Самоуплотняющийся', description: 'Самоуплотняющийся бетон для сложных форм' },
    { name: 'Декоративный цветной', description: 'Декоративный цветной бетон для отделочных работ' },
    { name: 'Теплоизоляционный', description: 'Теплоизоляционный бетон для энергоэффективных зданий' }
  ];

  for (const mark of concreteMarks) {
    await prisma.concreteMark.upsert({
      where: { name: mark.name },
      update: {},
      create: {
        name: mark.name,
        description: mark.description
      }
    });
  }

  console.log('✅ Seed: 25 марок бетона созданы');
}

async function seedMaterialTypesAndMaterials() {
  const typeNames = ['CEMENT', 'SAND', 'GRAVEL', 'WATER', 'ADDITIVE'];
  for (const name of typeNames) {
    await prisma.materialType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const cementType = await prisma.materialType.findUnique({ where: { name: 'CEMENT' } });
  const sandType = await prisma.materialType.findUnique({ where: { name: 'SAND' } });
  const gravelType = await prisma.materialType.findUnique({ where: { name: 'GRAVEL' } });

  await prisma.material.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Цемент М400', unit: 'кг', typeId: cementType.id },
  });
  await prisma.material.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Песок речной', unit: 'кг', typeId: sandType.id },
  });
  await prisma.material.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'Щебень 5-20', unit: 'кг', typeId: gravelType.id },
  });
}

async function main() {
  await upsertUser('admin', 'admin123', 'ADMIN', 'Admin', 'User', 'admin@example.com');
  await upsertUser('dev', 'dev123', 'DEVELOPER', 'Dev', 'User', 'dev@example.com');
  console.log('✅ Seed: admin/dev готовы');

  await seedCounterparties();
  await seedConcreteMarks();
  await seedMaterialTypesAndMaterials();
  console.log('✅ Seed: Все данные созданы');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


