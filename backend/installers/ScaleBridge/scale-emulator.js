const EventEmitter = require('events');
const logger = require('./logger');

/**
 * Эмулятор весов для тестирования без физического оборудования
 * Имитирует поведение реальных весов с генерацией случайного веса
 */
class ScaleEmulator extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.currentWeight = 0;
    this.isConnected = false;
    this.simulationInterval = null;
    this.targetWeight = 0;
    this.weightChangeSpeed = 100; // кг в секунду
    
    logger.info('🎮 РЕЖИМ ЭМУЛЯЦИИ ВЕСОВ АКТИВИРОВАН');
    logger.info('⚠️ Подключение к физическим весам отключено');
    
    this.connect();
  }

  connect() {
    logger.info('🔄 Эмулятор весов: подключение...');
    
    // Имитируем задержку подключения
    setTimeout(() => {
      this.isConnected = true;
      this.currentWeight = 0;
      this.targetWeight = this.getRandomWeight();
      
      logger.info('✅ Эмулятор весов: подключено успешно');
      this.emit('connected');
      
      // Запускаем симуляцию изменения веса
      this.startSimulation();
    }, 1000);
  }

  startSimulation() {
    // Обновляем вес каждые 500мс
    this.simulationInterval = setInterval(() => {
      // Плавно изменяем вес к целевому значению
      const diff = this.targetWeight - this.currentWeight;
      
      if (Math.abs(diff) < 0.1) {
        // Достигли целевого веса - генерируем новый
        this.currentWeight = this.targetWeight;
        this.targetWeight = this.getRandomWeight();
      } else {
        // Плавно движемся к целевому весу
        const step = (diff > 0 ? 1 : -1) * Math.min(Math.abs(diff), this.weightChangeSpeed * 0.5);
        this.currentWeight += step;
      }
      
      // Округляем до 1 знака
      this.currentWeight = Math.round(this.currentWeight * 10) / 10;
      
      // Отправляем событие обновления веса
      this.emit('weight', this.currentWeight);
    }, 500);
  }

  getRandomWeight() {
    // Генерируем случайный вес от 0 до 25000 кг (типичный диапазон для грузовых весов)
    const scenarios = [
      0,      // Пустые весы
      6200,   // Тара (пустой автомобиль)
      18460,  // Брутто (автомобиль с материалом)
      12000,  // Средний вес
      25000,  // Максимальная загрузка
    ];
    
    // С вероятностью 70% выбираем из сценариев, иначе случайное
    if (Math.random() < 0.7) {
      return scenarios[Math.floor(Math.random() * scenarios.length)];
    } else {
      return Math.floor(Math.random() * 25000);
    }
  }

  getCurrentWeight() {
    return {
      weight: Math.round(this.currentWeight * 10) / 10,
      unit: 'kg',
      connected: this.isConnected
    };
  }

  disconnect() {
    logger.info('🔄 Эмулятор весов: отключение...');
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    this.isConnected = false;
    this.currentWeight = 0;
    
    logger.info('✅ Эмулятор весов: отключено');
  }

  reconnect() {
    logger.info('🔄 Эмулятор весов: переподключение...');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  updateConfig(newConfig) {
    logger.info('⚙️ Эмулятор весов: обновление конфигурации');
    this.config = { ...this.config, ...newConfig };
    // Эмулятор не требует переподключения при изменении настроек
  }

  // Ручная установка веса (для тестирования)
  setWeight(weight) {
    logger.info(`🎯 Эмулятор весов: установка веса ${weight} кг`);
    this.currentWeight = weight;
    this.targetWeight = weight;
    this.emit('weight', weight);
  }

  // Симуляция погрузки/разгрузки
  simulateLoad() {
    logger.info('📦 Эмулятор весов: симуляция погрузки');
    this.targetWeight = 18460; // Брутто
  }

  simulateUnload() {
    logger.info('📤 Эмулятор весов: симуляция разгрузки');
    this.targetWeight = 6200; // Тара
  }

  simulateEmpty() {
    logger.info('🚫 Эмулятор весов: симуляция пустых весов');
    this.targetWeight = 0;
  }

  static async listPorts() {
    // Эмулятор не использует реальные порты
    logger.info('📋 Эмулятор весов: список портов (виртуальные)');
    return [
      {
        path: 'EMULATOR',
        manufacturer: 'ScaleBridge Emulator',
        serialNumber: 'EMU-001',
        vendorId: '0000',
        productId: '0000'
      }
    ];
  }
}

module.exports = ScaleEmulator;










