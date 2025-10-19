const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const logger = require('./logger');

class BackendServer {
  constructor(config, scaleManager, cameraManager) {
    this.config = config;
    this.scaleManager = scaleManager;
    this.cameraManager = cameraManager;
    this.app = express();
    this.server = null;
    this.port = 5055;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Статические файлы (фотографии)
    this.app.use('/photos', express.static(path.join(__dirname, 'photos')));

    // Логирование запросов
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Получение текущего веса
    this.app.get('/api/weight', (req, res) => {
      try {
        const weightData = this.scaleManager.getCurrentWeight();
        res.json(weightData);
      } catch (error) {
        logger.error(`Ошибка получения веса: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // Захват фото
    this.app.post('/api/capture', async (req, res) => {
      try {
        const { filename } = req.body;
        const photoFilename = filename || `capture-${Date.now()}.jpg`;
        
        const photoPath = await this.cameraManager.capturePhoto(photoFilename);
        
        res.json({
          success: true,
          photoPath,
          photoUrl: `http://localhost:${this.port}/photos/${path.basename(path.dirname(photoPath))}/${path.basename(photoPath)}`
        });
      } catch (error) {
        logger.error(`Ошибка захвата фото: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // Команда от backend (brutto/tara/netto)
    this.app.post('/api/command', async (req, res) => {
      try {
        const { action, orderId } = req.body;
        
        if (!action) {
          return res.status(400).json({ error: 'Требуется параметр action (brutto|tara|netto)' });
        }

        logger.info(`Получена команда: ${action}${orderId ? ` для заказа ${orderId}` : ''}`);

        // Получаем текущий вес
        const weightData = this.scaleManager.getCurrentWeight();
        logger.info(`📊 Текущий вес: ${weightData.weight} ${weightData.unit}`);

        // Делаем фото (если камера доступна)
        let photoUrl = null;
        
        try {
          const photoResult = await this.cameraManager.captureWithWeight(action, orderId || 0, weightData.weight);
          
          if (photoResult && photoResult.success && photoResult.photoPath) {
            // Обработка пути к фото (может быть строка или массив)
            const photoPath = Array.isArray(photoResult.photoPath) 
              ? photoResult.photoPath[0] 
              : photoResult.photoPath;
            
            if (photoPath && typeof photoPath === 'string') {
              const filename = path.basename(photoPath);
              const dirname = path.basename(path.dirname(photoPath));
              photoUrl = `http://localhost:${this.port}/photos/${dirname}/${filename}`;
              logger.info(`📸 Фото сохранено: ${photoUrl}`);
            }
          } else if (photoResult && photoResult.noCamera) {
            logger.info(`ℹ️ Фото не сделано - камера недоступна (продолжаем без фото)`);
          }
        } catch (photoError) {
          logger.warn(`⚠️ Ошибка при создании фото (продолжаем без фото): ${photoError.message}`);
          // Продолжаем работу без фото
        }

        const responseData = {
          success: true,
          weight: weightData.weight,
          unit: weightData.unit || 'kg',
          action: action,
          orderId: orderId,
          photoUrl: photoUrl,
          timestamp: new Date().toISOString()
        };

        // Локальный CSV лог событий brutto/tara
        try {
          const cfg = this.config.logging || {};
          if (cfg.enableEventsCsv) {
            const logsDir = cfg.logsDir || './logs';
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const dayDir = path.join(__dirname, logsDir, `${yyyy}-${mm}-${dd}`);
            if (!fs.existsSync(dayDir)) fs.mkdirSync(dayDir, { recursive: true });
            const file = path.join(dayDir, 'events.csv');
            const exists = fs.existsSync(file);
            const stream = fs.createWriteStream(file, { flags: 'a' });
            if (!exists) stream.write('timestamp,action,weight,unit,orderId,photoUrl\n');
            const safePhoto = photoUrl ? photoUrl.replace(/"/g, '""') : '';
            stream.write(`${responseData.timestamp},${action},${weightData.weight},${responseData.unit},${orderId || ''},"${safePhoto}"\n`);
            stream.end();
          }
        } catch (logErr) {
          logger.warn(`Не удалось записать events.csv: ${logErr.message}`);
        }

        // Отправляем данные на backend если включена синхронизация
        if (this.config.backendSync && this.config.backendUrl && this.config.apiKey) {
          try {
            await this.sendToBackend(responseData);
          } catch (syncError) {
            logger.warn(`⚠️ Ошибка синхронизации с Backend: ${syncError.message}`);
            // Продолжаем работу без синхронизации
          }
        }

        res.json(responseData);

      } catch (error) {
        logger.error(`❌ Ошибка обработки команды: ${error.message}`);
        res.status(500).json({ 
          success: false,
          error: error.message 
        });
      }
    });

    // Получение конфигурации
    this.app.get('/api/config', (req, res) => {
      res.json({
        comPort: this.config.comPort,
        baudRate: this.config.baudRate,
        backendUrl: this.config.backendUrl,
        cameraType: this.config.cameraType,
        connected: this.scaleManager.isConnected
      });
    });

    // Обновление конфигурации
    this.app.post('/api/config', (req, res) => {
      try {
        const newConfig = req.body;
        Object.assign(this.config, newConfig);
        
        // Сохраняем конфигурацию в файл
        const fs = require('fs');
        fs.writeFileSync(
          path.join(__dirname, 'config.json'),
          JSON.stringify(this.config, null, 2),
          'utf8'
        );

        logger.info('Конфигурация обновлена');
        res.json({ success: true, message: 'Конфигурация сохранена' });
      } catch (error) {
        logger.error(`Ошибка обновления конфигурации: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // Список доступных COM-портов
    this.app.get('/api/ports', async (req, res) => {
      try {
        const ScaleManager = require('./scale');
        const ports = await ScaleManager.listPorts();
        res.json({ ports });
      } catch (error) {
        logger.error(`Ошибка получения списка портов: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // Тест соединения с backend
    this.app.post('/api/test-connection', async (req, res) => {
      try {
        const { url, apiKey } = req.body;
        
        const response = await axios.get(`${url}/api/health`, {
          headers: {
            'X-API-Key': apiKey
          },
          timeout: 5000
        });

        res.json({
          success: true,
          message: 'Соединение успешно',
          response: response.data
        });
      } catch (error) {
        logger.error(`Ошибка тестирования соединения: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Тестовый снимок
    this.app.post('/api/test-camera', async (req, res) => {
      try {
        const photoPath = await this.cameraManager.testCapture();
        res.json({
          success: true,
          photoPath,
          photoUrl: `http://localhost:${this.port}/photos/${path.basename(path.dirname(photoPath))}/${path.basename(photoPath)}`
        });
      } catch (error) {
        logger.error(`Ошибка тестирования камеры: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Переподключение к весам
    this.app.post('/api/reconnect', (req, res) => {
      try {
        this.scaleManager.reconnect();
        res.json({ success: true, message: 'Переподключение инициировано' });
      } catch (error) {
        logger.error(`Ошибка переподключения: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // Получение IP адреса
    this.app.get('/api/ip', (req, res) => {
      try {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        
        let localIp = 'localhost';
        
        // Ищем первый не-внутренний IPv4 адрес
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
              localIp = iface.address;
              break;
            }
          }
          if (localIp !== 'localhost') break;
        }
        
        res.json({
          ip: localIp,
          port: this.port,
          url: `http://${localIp}:${this.port}`,
          networkInterfaces: networkInterfaces
        });
      } catch (error) {
        logger.error(`Ошибка получения IP: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      try {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        
        let localIp = 'localhost';
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
              localIp = iface.address;
              break;
            }
          }
          if (localIp !== 'localhost') break;
        }

        res.json({
          status: 'ok',
          version: '1.0.0',
          ip: localIp,
          port: this.port,
          url: `http://${localIp}:${this.port}`,
          scale: {
            connected: this.scaleManager.isConnected,
            currentWeight: this.scaleManager.getCurrentWeight()
          }
        });
      } catch (error) {
        logger.error(`Ошибка health check: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
  }

  async sendToBackend(data) {
    try {
      const url = `${this.config.backendUrl}/api/weights/capture`;
      
      logger.info(`Отправка данных на backend: ${url}`);

      const response = await axios.post(url, {
        apiKey: this.config.apiKey,
        ...data
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        timeout: 10000
      });

      logger.info(`Данные успешно отправлены на backend: ${response.status}`);
      return response.data;
    } catch (error) {
      logger.error(`Ошибка отправки на backend: ${error.message}`);
      throw error;
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`Backend сервер запущен на http://localhost:${this.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error(`Ошибка запуска сервера: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Backend сервер остановлен');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  restart() {
    logger.info('Перезапуск backend сервера...');
    return this.stop().then(() => this.start());
  }
}

module.exports = BackendServer;

