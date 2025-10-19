const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class ScaleManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.port = null;
    this.parser = null;
    this.currentWeight = 0;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.pollingTimer = null; // таймер периодического опроса весов
    this.serialLogStream = null;
    
    this.connect();
  }

  connect() {
    try {
      logger.info(`Подключение к COM-порту: ${this.config.comPort}`);
      
      this.port = new SerialPort({
        path: this.config.comPort,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        parity: this.config.parity,
        stopBits: this.config.stopBits,
        autoOpen: false,
        lock: false
      });

      // Основной парсер по CRLF. Некоторые весы используют только \n — ниже добавим сырой обработчик.
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.port.open((err) => {
        if (err) {
          logger.error(`Ошибка открытия COM-порта: ${err.message}`);
          this.scheduleReconnect();
          return;
        }

        this.isConnected = true;
        logger.info('COM-порт успешно открыт');
        this.emit('connected');
        
        // Очистка таймера переподключения
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Запускаем периодический опрос, если включен в конфиге
        this.startPolling();

        // Открываем файл для CSV-лога потока, если включено
        this.openSerialLog();
      });

      this.parser.on('data', (data) => {
        this.parseWeight(data);
      });

      // Дополнительный прием сырых данных (ASCII). Некоторые весы не присылают CRLF.
      this.port.on('data', (buffer) => {
        try {
          // Пробуем ASCII, так как большинство весов отдают ASCII, а UTF-8 вызывает кракозябры
          const ascii = buffer.toString('ascii');
          const trimmed = ascii.trim();
          if (trimmed.length > 0) {
            this.parseWeight(trimmed);
          }
        } catch (e) {
          logger.warn(`Ошибка обработки сырых данных: ${e.message}`);
        }
      });

      this.port.on('error', (err) => {
        logger.error(`Ошибка COM-порта: ${err.message}`);
        this.isConnected = false;
        this.emit('error', err);
      });

      this.port.on('close', () => {
        logger.warn('COM-порт закрыт');
        this.isConnected = false;
        this.emit('disconnected');
        this.stopPolling();
        this.closeSerialLog();
        this.scheduleReconnect();
      });

    } catch (error) {
      logger.error(`Ошибка инициализации COM-порта: ${error.message}`);
      this.scheduleReconnect();
    }
  }

  parseWeight(data) {
    try {
      // Парсинг данных с весов
      const cleanData = data.trim();
      
      // Логируем только если данные не пустые
      if (cleanData.length > 0) {
        logger.info(`📊 Получены данные с весов: "${cleanData}"`);
      }
      
      // Пропускаем пустые строки
      if (cleanData.length === 0) {
        return;
      }
      
      // Поддержка различных форматов весов:
      let weight = null;
      
      // Формат 1: "ST,GS,+012345.0kg" или "ST,GS,012345.0"
      if (cleanData.includes('ST,GS,') || cleanData.includes('ST,GS')) {
        const parts = cleanData.split(',');
        if (parts.length >= 3) {
          const weightPart = parts[2].replace(/[^\d.+-]/g, '');
          weight = parseFloat(weightPart);
        }
      }
      
      // Формат 2: "GS,+012345.0kg"
      else if (cleanData.includes('GS,')) {
        const parts = cleanData.split(',');
        if (parts.length >= 2) {
          const weightPart = parts[1].replace(/[^\d.+-]/g, '');
          weight = parseFloat(weightPart);
        }
      }
      
      // Формат 3: "+012345.0 kg" или "12345.0kg"
      else if (cleanData.match(/[-+]?\s*\d+[\.,]?\d*\s*(kg|кг)?/i)) {
        const weightPart = cleanData.replace(/[^\d.+-]/g, '').replace(',', '.');
        weight = parseFloat(weightPart);
      }
      
      // Формат 4: Просто число "12345.5" или "12345,5"
      else {
        const weightPart = cleanData.replace(/[^\d.+-]/g, '').replace(',', '.');
        weight = parseFloat(weightPart);
      }
      
      // Формат 5: Обработка шумных данных с символами [00] и 'а'
      // Ищем паттерны типа "ааа[00]аа[00]" - возможно это закодированный вес
      if (weight === null && cleanData.includes('[00]') && cleanData.includes('а')) {
        // Попробуем найти числа в конце или начале строки
        const numbersInString = cleanData.match(/\d+/g);
        if (numbersInString && numbersInString.length > 0) {
          // Возьмем последнее найденное число как потенциальный вес
          const lastNumber = numbersInString[numbersInString.length - 1];
          const potentialWeight = parseInt(lastNumber);
          
          // Если число выглядит как вес (от 0 до 50000)
          if (potentialWeight >= 0 && potentialWeight <= 50000) {
            weight = potentialWeight;
            logger.info(`🔍 Найден потенциальный вес в шумных данных: ${weight} кг`);
          }
        }
      }
      
      // Формат 6: Обработка данных с символами ASCII
      // Если в данных много непечатаемых символов, попробуем их интерпретировать
      if (weight === null && cleanData.includes('а') && cleanData.length > 20) {
        // Попробуем найти числа в любом формате
        const allNumbers = cleanData.match(/\d+/g);
        if (allNumbers && allNumbers.length > 0) {
          // Возьмем самое большое число как потенциальный вес
          const maxNumber = Math.max(...allNumbers.map(n => parseInt(n)));
          if (maxNumber >= 0 && maxNumber <= 50000) {
            weight = maxNumber;
            logger.info(`🔍 Найден максимальный вес в данных: ${weight} кг`);
          }
        }
      }
      
      // Проверка и обновление веса
      if (weight !== null && !isNaN(weight) && isFinite(weight)) {
        // Округляем до 1 знака после запятой
        this.currentWeight = Math.round(weight * 10) / 10;
        this.emit('weight', this.currentWeight);
        logger.info(`✅ Распознан вес: ${this.currentWeight} кг`);
        // Пишем CSV-строку
        this.writeSerialCsv(cleanData, this.currentWeight);
      } else {
        logger.warn(`⚠️ Не удалось распознать вес из строки: "${cleanData}"`);
        // Для отладки покажем первые 50 символов
        const preview = cleanData.length > 50 ? cleanData.substring(0, 50) + '...' : cleanData;
        logger.warn(`🔍 Предварительный просмотр данных: "${preview}"`);
        // Всё равно логируем входящую строку (без распознанного веса)
        this.writeSerialCsv(cleanData, '');
      }
    } catch (error) {
      logger.error(`❌ Ошибка парсинга веса: ${error.message}`);
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    logger.info('Попытка переподключения через 5 секунд...');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  getCurrentWeight() {
    return {
      weight: Math.round(this.currentWeight * 10) / 10,
      unit: 'kg',
      connected: this.isConnected
    };
  }

  disconnect() {
    logger.info('Отключение от весов...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPolling();

    if (this.port && this.port.isOpen) {
      this.port.close((err) => {
        if (err) {
          logger.error(`Ошибка закрытия порта: ${err.message}`);
        }
      });
    }

    this.isConnected = false;
  }

  reconnect() {
    logger.info('Ручное переподключение к весам');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.reconnect();
  }

  // Включение периодического опроса весов для моделей, требующих команд для ответа
  startPolling() {
    try {
      if (!this.config || this.config.pollingEnabled !== true) {
        return;
      }

      // Перезапускаем, если уже был запущен
      this.stopPolling();

      const intervalMs = Number(this.config.pollingIntervalMs) || 500;
      logger.info(`Включен опрос весов каждые ${intervalMs} мс`);
      this.pollingTimer = setInterval(() => {
        this.sendPollingCommand();
      }, intervalMs);
    } catch (e) {
      logger.warn(`Не удалось запустить опрос весов: ${e.message}`);
    }
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      logger.info('Опрос весов остановлен');
    }
  }

  sendPollingCommand() {
    try {
      if (!this.port || !this.port.isOpen) return;
      // Команда опроса настраивается в конфиге. Укажите ту, на которую отвечают весы в Termite.
      // Например: "S\r\n", "P\r\n", "W\r\n" или иной код производителя.
      const command = this.config.pollingCommand || 'S\r\n';
      const toSend = Buffer.from(command, 'ascii');
      this.port.write(toSend, (err) => {
        if (err) {
          logger.warn(`Ошибка отправки команды опроса: ${err.message}`);
        }
      });
    } catch (e) {
      logger.warn(`Ошибка при опросе весов: ${e.message}`);
    }
  }

  // === CSV логирование входящих строк ===
  ensureLogsDir() {
    try {
      const logsDir = (this.config.logging && this.config.logging.logsDir) || './logs';
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      // Поддиректория по дате
      const dayDir = path.join(logsDir, this.getTodayFolder());
      if (!fs.existsSync(dayDir)) {
        fs.mkdirSync(dayDir, { recursive: true });
      }
      return dayDir;
    } catch (e) {
      logger.warn(`Не удалось создать каталог логов: ${e.message}`);
      return './';
    }
  }

  getTodayFolder() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  openSerialLog() {
    try {
      if (!this.config.logging || this.config.logging.enableSerialCsv !== true) return;
      const dayDir = this.ensureLogsDir();
      const filePath = path.join(dayDir, 'serial.csv');
      const header = 'timestamp,raw,weight\n';
      const exists = fs.existsSync(filePath);
      this.serialLogStream = fs.createWriteStream(filePath, { flags: 'a' });
      if (!exists) {
        this.serialLogStream.write(header);
      }
      this.cleanupOldLogs();
      logger.info(`Лог входящих данных: ${filePath}`);
    } catch (e) {
      logger.warn(`Не удалось открыть CSV лог: ${e.message}`);
    }
  }

  closeSerialLog() {
    if (this.serialLogStream) {
      try {
        this.serialLogStream.end();
      } catch (_) {}
      this.serialLogStream = null;
    }
  }

  writeSerialCsv(raw, weight) {
    try {
      if (!this.serialLogStream) return;
      const ts = new Date().toISOString();
      const safeRaw = String(raw).replace(/"/g, '""');
      const line = `${ts},"${safeRaw}",${weight}\n`;
      this.serialLogStream.write(line);
    } catch (e) {
      // не шумим
    }
  }

  cleanupOldLogs() {
    try {
      const logsDir = (this.config.logging && this.config.logging.logsDir) || './logs';
      const keepDays = (this.config.logging && this.config.logging.retentionDays) || 14;
      if (!fs.existsSync(logsDir)) return;
      const entries = fs.readdirSync(logsDir, { withFileTypes: true });
      const now = Date.now();
      entries.forEach((ent) => {
        if (ent.isDirectory()) {
          const dirPath = path.join(logsDir, ent.name);
          // ожидание формата YYYY-MM-DD
          const m = /^\d{4}-\d{2}-\d{2}$/.exec(ent.name);
          if (m) {
            const time = new Date(ent.name).getTime();
            const ageDays = (now - time) / (1000 * 60 * 60 * 24);
            if (ageDays > keepDays) {
              // удаляем старую папку
              fs.rmSync(dirPath, { recursive: true, force: true });
            }
          }
        }
      });
    } catch (_) {}
  }

  // Получение списка доступных COM-портов
  static async listPorts() {
    try {
      const ports = await SerialPort.list();
      logger.info(`Найдено ${ports.length} COM-портов`);
      
      const formattedPorts = ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Неизвестно',
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId
      }));
      
      // Логируем найденные порты
      formattedPorts.forEach(port => {
        logger.info(`Порт: ${port.path} - ${port.manufacturer}`);
      });
      
      return formattedPorts;
    } catch (error) {
      logger.error(`Ошибка получения списка портов: ${error.message}`);
      // Возвращаем пустой массив, но не падаем
      return [];
    }
  }
}

module.exports = ScaleManager;
