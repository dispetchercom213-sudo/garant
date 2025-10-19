const axios = require('axios');

async function testConcreteMarksAPI() {
  try {
    console.log('🔍 Тестируем API марок бетона...');
    
    const response = await axios.get('http://localhost:4000/api/v1/concrete-marks', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Статус ответа:', response.status);
    console.log('📋 Данные ответа:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data) {
      console.log('📦 Количество марок бетона:', response.data.data.length);
      response.data.data.forEach(mark => {
        console.log(`  - ID: ${mark.id}, Название: ${mark.name}, Материалы: ${mark.materials ? mark.materials.length : 0}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка API:', error.message);
    if (error.response) {
      console.error('📋 Статус:', error.response.status);
      console.error('📋 Данные ошибки:', error.response.data);
    }
  }
}

testConcreteMarksAPI();
