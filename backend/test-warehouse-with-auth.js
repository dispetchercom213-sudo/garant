// Тест API складов с авторизацией
const axios = require('axios');

async function testWarehouseAPIWithAuth() {
  try {
    console.log('🔍 Тестируем API складов с авторизацией...');
    
    // Сначала логинимся
    console.log('🔐 Логинимся...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Авторизация успешна, токен получен');
    
    // Теперь получаем склады с токеном
    console.log('📡 Отправляем запрос к /api/v1/warehouses с токеном...');
    const response = await axios.get('http://localhost:4000/api/v1/warehouses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Ответ получен:');
    console.log('📊 Статус:', response.status);
    console.log('📋 Количество складов:', response.data.length);
    
    // Проверим, есть ли поля ScaleBridge в первом складе
    if (response.data && response.data.length > 0) {
      const warehouse = response.data[0];
      console.log('🏢 Первый склад:', warehouse.name);
      console.log('⚖️ hasScales:', warehouse.hasScales);
      console.log('🌐 scaleIpAddress:', warehouse.scaleIpAddress);
      console.log('🔑 scaleApiKey:', warehouse.scaleApiKey ? '***настроен***' : 'не настроен');
      console.log('📡 scaleComPort:', warehouse.scaleComPort);
      console.log('📊 scaleStatus:', warehouse.scaleStatus);
      console.log('🕐 scaleLastSeen:', warehouse.scaleLastSeen);
      
      // Покажем все поля склада
      console.log('\n📋 Все поля склада:');
      Object.keys(warehouse).forEach(key => {
        console.log(`  ${key}: ${warehouse[key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:');
    console.error('📋 Статус:', error.response?.status);
    console.error('💬 Сообщение:', error.response?.data?.message);
    console.error('🔍 Полный ответ:', error.response?.data);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Backend не запущен на порту 4000');
    }
  }
}

testWarehouseAPIWithAuth();
