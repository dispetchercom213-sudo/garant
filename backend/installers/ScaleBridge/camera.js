const NodeWebcam = require('node-webcam');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class CameraManager {
  constructor(config) {
    this.config = config;
    this.photosDir = config.photosDir || './photos';
    
    // Создаём директорию для фото если её нет
    if (!fs.existsSync(this.photosDir)) {
      fs.mkdirSync(this.photosDir, { recursive: true });
    }

    // Настройки для node-webcam
    this.webcamOpts = {
      width: 1280,
      height: 720,
      quality: 100,
      delay: 0,
      saveShots: true,
      output: 'jpeg',
      device: false,
      callbackReturn: 'location',
      verbose: false
    };
  }

  async capturePhoto(filename, metadata = {}) {
    try {
      // Создаём поддиректорию с текущей датой
      const today = new Date().toISOString().split('T')[0];
      const dayDir = path.join(this.photosDir, today);
      
      if (!fs.existsSync(dayDir)) {
        fs.mkdirSync(dayDir, { recursive: true });
      }

      if (this.config.cameraType === 'rtsp') {
        const rtspUrls = this.config.rtspUrls || [];
        if (rtspUrls.length === 0) {
          throw new Error('Не указаны RTSP URL камер');
        }
        
        const photos = [];
        for (let i = 0; i < rtspUrls.length; i++) {
          const url = rtspUrls[i];
          const deviceFilename = rtspUrls.length > 1 
            ? filename.replace('.jpg', `_rtsp${i + 1}.jpg`)
            : filename;
          const fullPath = path.join(dayDir, deviceFilename);
          
          try {
            const photoPath = await this.captureRTSP(fullPath, url);
            photos.push(photoPath);
            logger.info(`Фото с RTSP камеры ${i + 1} сохранено: ${photoPath}`);
          } catch (error) {
            logger.error(`Ошибка захвата с RTSP камеры ${i + 1}: ${error.message}`);
          }
        }
        
        return photos.length === 1 ? photos[0] : photos;
      } else {
        // Если выбрано несколько камер - делаем несколько фото
        const cameraDevices = this.config.cameraDevices || [0];
        const photos = [];
        
        for (let i = 0; i < cameraDevices.length; i++) {
          const deviceId = cameraDevices[i];
          const deviceFilename = cameraDevices.length > 1 
            ? filename.replace('.jpg', `_camera${deviceId}.jpg`)
            : filename;
          const fullPath = path.join(dayDir, deviceFilename);
          
          try {
            const photoPath = await this.captureUSB(fullPath, deviceId);
            photos.push(photoPath);
            logger.info(`Фото с камеры ${deviceId} сохранено: ${photoPath}`);
          } catch (error) {
            logger.error(`Ошибка захвата с камеры ${deviceId}: ${error.message}`);
          }
        }
        
        // Возвращаем массив путей или один путь
        return photos.length === 1 ? photos[0] : photos;
      }
    } catch (error) {
      logger.error(`Ошибка захвата фото: ${error.message}`);
      throw error;
    }
  }

  captureUSB(outputPath, deviceId = 0) {
    return new Promise((resolve, reject) => {
      const opts = {
        ...this.webcamOpts,
        device: deviceId // Указываем конкретную камеру
      };
      
      const webcam = NodeWebcam.create(opts);
      
      webcam.capture(outputPath, (err, data) => {
        if (err) {
          logger.error(`Ошибка захвата USB камеры ${deviceId}: ${err.message}`);
          reject(err);
          return;
        }
        
        logger.info(`Фото с камеры ${deviceId} сохранено: ${outputPath}`);
        resolve(outputPath);
      });
    });
  }

  captureRTSP(outputPath, rtspUrl) {
    return new Promise((resolve, reject) => {
      const url = rtspUrl || this.config.cameraUrl;
      if (!url) {
        reject(new Error('RTSP URL не указан'));
        return;
      }
      
      // Используем ffmpeg для захвата кадра из RTSP потока
      const command = `ffmpeg -y -rtsp_transport tcp -i "${url}" -frames:v 1 -q:v 2 "${outputPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Ошибка захвата RTSP: ${error.message}`);
          reject(error);
          return;
        }
        
        logger.info(`Фото из RTSP потока сохранено: ${outputPath}`);
        resolve(outputPath);
      });
    });
  }

  async captureWithWeight(weightType, orderId, weight) {
    const timestamp = Date.now();
    const filename = `${weightType}-${orderId}-${timestamp}.jpg`;
    
    try {
      const photoPath = await this.capturePhoto(filename, {
        weightType,
        orderId,
        weight,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        photoPath,
        filename,
        timestamp
      };
    } catch (error) {
      logger.warn(`⚠️ Фото не сделано (камера недоступна): ${error.message}`);
      // Возвращаем успех БЕЗ фото - продолжаем работу
      return {
        success: true,
        photoPath: null,
        filename: null,
        timestamp,
        noCamera: true
      };
    }
  }

  // Очистка старых фотографий
  cleanupOldPhotos() {
    try {
      const retentionMs = this.config.photosRetentionDays * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (!fs.existsSync(this.photosDir)) {
        return;
      }

      const dirs = fs.readdirSync(this.photosDir);

      dirs.forEach(dir => {
        const dirPath = path.join(this.photosDir, dir);
        const stat = fs.statSync(dirPath);

        if (stat.isDirectory()) {
          const dirAge = now - stat.mtimeMs;

          if (dirAge > retentionMs) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            logger.info(`Удалена устаревшая директория с фото: ${dir}`);
          }
        }
      });
    } catch (error) {
      logger.error(`Ошибка очистки старых фото: ${error.message}`);
    }
  }

  // Тестовый снимок
  async testCapture() {
    const testFilename = `test-${Date.now()}.jpg`;
    return await this.capturePhoto(testFilename, { test: true });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = CameraManager;


