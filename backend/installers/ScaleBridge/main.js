const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');

const logger = require('./logger');
const ScaleManager = require('./scale');
const ScaleEmulator = require('./scale-emulator');
const CameraManager = require('./camera');
const BackendServer = require('./backend');

class ScaleBridgeApp {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.config = null;
    this.scaleManager = null;
    this.cameraManager = null;
    this.backendServer = null;
    
    this.configPath = path.join(__dirname, 'config.json');
    
    // Инициализация при готовности приложения
    app.whenReady().then(() => {
      this.init();
    });

    // Обработка закрытия всех окон
    app.on('window-all-closed', (e) => {
      e.preventDefault();
      // Не закрываем приложение, сворачиваем в трей
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Обработка выхода
    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  async init() {
    try {
      logger.info('Запуск ScaleBridge...');

      // Загрузка конфигурации
      this.loadConfig();

      // Проверка и генерация API ключа
      this.ensureApiKey();

      // Инициализация менеджеров
      // Используем эмулятор если включен режим эмуляции
      if (this.config.emulatorMode === true) {
        logger.info('🎮 Запуск в режиме ЭМУЛЯЦИИ весов');
        this.scaleManager = new ScaleEmulator(this.config);
      } else {
        logger.info('⚖️ Запуск с реальными весами (COM-порт)');
        this.scaleManager = new ScaleManager(this.config);
      }
      
      this.cameraManager = new CameraManager(this.config);
      this.backendServer = new BackendServer(this.config, this.scaleManager, this.cameraManager);

      // Запуск backend сервера
      await this.backendServer.start();

      // Создание окна
      this.createWindow();

      // Создание трея
      this.createTray();

      // Настройка автозапуска
      if (this.config.autoStart) {
        this.setupAutoStart();
      }

      // Обработчики IPC (должны быть до создания окна)
      this.setupIpcHandlers();

      // Планирование очистки старых фото (каждый день в 3:00)
      schedule.scheduleJob('0 3 * * *', () => {
        logger.info('Запуск очистки старых фотографий');
        this.cameraManager.cleanupOldPhotos();
      });

      logger.info('ScaleBridge успешно запущен');
    } catch (error) {
      logger.error(`Ошибка инициализации: ${error.message}`);
      dialog.showErrorBox('Ошибка запуска', `Не удалось запустить ScaleBridge: ${error.message}`);
      app.quit();
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        logger.info('Конфигурация загружена');
      } else {
        // Создаём конфигурацию по умолчанию
        this.config = {
          comPort: 'COM3',
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          backendSync: true,
          backendUrl: 'http://localhost:4000',
          apiKey: '',
          cameraType: 'usb',
          cameraUrl: '',
          photosDir: path.join(__dirname, 'photos'),
          photosRetentionDays: 30,
          autoStart: true,
          language: 'ru',
          emulatorMode: false  // true = эмуляция, false = реальные весы
        };
        this.saveConfig();
      }
    } catch (error) {
      logger.error(`Ошибка загрузки конфигурации: ${error.message}`);
      throw error;
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      logger.info('Конфигурация сохранена');
    } catch (error) {
      logger.error(`Ошибка сохранения конфигурации: ${error.message}`);
      throw error;
    }
  }

  ensureApiKey() {
    if (!this.config.apiKey) {
      this.config.apiKey = uuidv4();
      this.saveConfig();
      logger.info(`Сгенерирован новый API ключ: ${this.config.apiKey}`);
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'ScaleBridge - Настройки',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'ui', 'preload.js')
      }
    });

    this.mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

    // Событие закрытия окна - сворачиваем в трей
    this.mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Открываем DevTools в режиме разработки (опционально)
    // this.mainWindow.webContents.openDevTools();
  }

  createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    this.tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Открыть ScaleBridge',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
          } else {
            this.createWindow();
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Настройки',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.webContents.send('show-settings');
          }
        }
      },
      {
        label: 'Перезапустить COM',
        click: () => {
          if (this.scaleManager) {
            this.scaleManager.reconnect();
            this.showNotification('Переподключение к весам...');
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: `Вес: ${this.scaleManager ? this.scaleManager.getCurrentWeight().weight : 0} кг`,
        enabled: false
      },
      {
        label: `Статус: ${this.scaleManager && this.scaleManager.isConnected ? 'Подключено ✓' : 'Отключено ✗'}`,
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: 'Выход',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('⚖️ ScaleBridge запущен');

    // Обновление меню трея каждые 2 секунды
    setInterval(() => {
      this.updateTrayMenu();
    }, 2000);

    this.tray.on('double-click', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
      }
    });
  }

  updateTrayMenu() {
    if (!this.tray || !this.scaleManager) return;

    const weightData = this.scaleManager.getCurrentWeight();
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Открыть ScaleBridge',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
          } else {
            this.createWindow();
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Настройки',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
          }
        }
      },
      {
        label: 'Перезапустить COM',
        click: () => {
          this.scaleManager.reconnect();
          this.showNotification('Переподключение к весам...');
        }
      },
      {
        type: 'separator'
      },
      {
        label: `Вес: ${weightData.weight} кг`,
        enabled: false
      },
      {
        label: `Статус: ${weightData.connected ? 'Подключено ✓' : 'Отключено ✗'}`,
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: 'Выход',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  setupAutoStart() {
    try {
      app.setLoginItemSettings({
        openAtLogin: this.config.autoStart,
        path: app.getPath('exe')
      });
      logger.info(`Автозапуск ${this.config.autoStart ? 'включён' : 'отключён'}`);
    } catch (error) {
      logger.error(`Ошибка настройки автозапуска: ${error.message}`);
    }
  }

  setupIpcHandlers() {
    // Получение конфигурации
    ipcMain.handle('get-config', () => {
      return this.config;
    });

    // Сохранение конфигурации
    ipcMain.handle('save-config', (event, newConfig) => {
      try {
        Object.assign(this.config, newConfig);
        this.saveConfig();

        // Обновление менеджеров
        if (this.scaleManager) {
          this.scaleManager.updateConfig(this.config);
        }
        if (this.cameraManager) {
          this.cameraManager.updateConfig(this.config);
        }

        // Обновление автозапуска
        this.setupAutoStart();

        return { success: true, message: 'Настройки сохранены' };
      } catch (error) {
        logger.error(`Ошибка сохранения настроек: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    // Получение текущего веса
    ipcMain.handle('get-weight', () => {
      return this.scaleManager.getCurrentWeight();
    });

    // Получение IP адреса
    ipcMain.handle('get-ip', async () => {
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
        
        return {
          ip: localIp,
          port: 5055,
          url: `http://${localIp}:5055`,
          allInterfaces: networkInterfaces
        };
      } catch (error) {
        logger.error(`Ошибка получения IP: ${error.message}`);
        return { ip: 'localhost', port: 5055, url: 'http://localhost:5055' };
      }
    });

    // Список COM-портов
    ipcMain.handle('get-ports', async () => {
      return await ScaleManager.listPorts();
    });

    // Тест соединения
    ipcMain.handle('test-connection', async (event, { url, apiKey }) => {
      const axios = require('axios');
      try {
        const response = await axios.get(`${url}/api/health`, {
          headers: {
            'X-API-Key': apiKey
          },
          timeout: 5000
        });
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Тест камеры
    ipcMain.handle('test-camera', async () => {
      try {
        const photoPath = await this.cameraManager.testCapture();
        return { success: true, photoPath };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Переподключение к весам
    ipcMain.handle('reconnect-scale', () => {
      try {
        this.scaleManager.reconnect();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  showNotification(message) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('notification', message);
    }
  }

  cleanup() {
    logger.info('Завершение работы ScaleBridge...');

    if (this.scaleManager) {
      this.scaleManager.disconnect();
    }

    if (this.backendServer) {
      this.backendServer.stop();
    }
  }
}

// Запуск приложения
new ScaleBridgeApp();
