// Проверка базы данных
const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Проверяем базу данных...');
    
    // Проверяем пользователей
    const users = await prisma.user.findMany();
    console.log('👥 Пользователи в базе:', users.length);
    
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.login}) - роль: ${user.role}`);
    });
    
    // Проверяем склады
    const warehouses = await prisma.warehouse.findMany();
    console.log('\n🏢 Склады в базе:', warehouses.length);
    
    warehouses.forEach(warehouse => {
      console.log(`  - ${warehouse.name}`);
      console.log(`    hasScales: ${warehouse.hasScales}`);
      console.log(`    scaleIpAddress: ${warehouse.scaleIpAddress}`);
      console.log(`    scaleApiKey: ${warehouse.scaleApiKey ? '***настроен***' : 'не настроен'}`);
      console.log(`    scaleComPort: ${warehouse.scaleComPort}`);
      console.log(`    scaleStatus: ${warehouse.scaleStatus}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
