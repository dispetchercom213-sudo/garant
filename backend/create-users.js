const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser(login, passwordPlain, role, firstName, lastName, email) {
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  
  const existingUser = await prisma.user.findUnique({
    where: { login }
  });

  if (existingUser) {
    console.log(`⚠️  Пользователь ${login} уже существует`);
    return;
  }

  await prisma.user.create({
    data: {
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

  console.log(`✅ Создан пользователь: ${login} (${role})`);
}

async function main() {
  console.log('🚀 Создание пользователей...\n');

  await createUser('admin', 'admin123', 'ADMIN', 'Admin', 'User', 'admin@garant-beton.kz');
  await createUser('dev', 'dev123', 'DEVELOPER', 'Developer', 'User', 'dev@garant-beton.kz');

  console.log('\n✅ Готово! Пользователи созданы:');
  console.log('   📧 admin / admin123 (ADMIN)');
  console.log('   📧 dev / dev123 (DEVELOPER)');
  console.log('\n⚠️  ВАЖНО: Смените пароли после первого входа!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

