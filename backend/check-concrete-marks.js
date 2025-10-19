const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConcreteMarks() {
  try {
    console.log('🔍 Проверяем марки бетона в базе данных...');
    
    const concreteMarks = await prisma.concreteMark.findMany({
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });
    
    console.log('📋 Найдено марок бетона:', concreteMarks.length);
    
    if (concreteMarks.length === 0) {
      console.log('❌ Марки бетона не найдены в базе данных!');
      console.log('💡 Создайте марку бетона через API или админку');
    } else {
      console.log('✅ Марки бетона:');
      concreteMarks.forEach(mark => {
        console.log(`  - ID: ${mark.id}, Название: ${mark.name}, Материалы: ${mark.materials.length}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке марок бетона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConcreteMarks();
