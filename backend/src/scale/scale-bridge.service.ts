import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';

export interface ScaleBridgeConfig {
  ip: string;
  port?: number;
  apiKey?: string;
  url?: string; // Для поддержки полных URL (включая https://)
}

export interface ScaleBridgeHealthResponse {
  status: string;
  version: string;
  ip: string;
  port: number;
  url: string;
  scale: {
    connected: boolean;
    currentWeight: number;
  };
}

export interface WeighCommandResponse {
  success: boolean;
  weight: number;
  photoUrl: string;
  timestamp: string;
}

@Injectable()
export class ScaleBridgeService {
  private readonly logger = new Logger(ScaleBridgeService.name);
  private axiosInstances = new Map<number, AxiosInstance>();

  constructor(private prisma: PrismaService) {}

  /**
   * Получить axios instance для конкретного склада
   */
  private getAxiosInstance(warehouseId: number, config: ScaleBridgeConfig): AxiosInstance {
    const key = warehouseId;
    
    if (!this.axiosInstances.has(key)) {
      // Определяем baseURL: если есть полный URL, используем его, иначе строим из IP и порта
      const baseURL = config.url || `http://${config.ip}:${config.port || 5055}`;
      
      const instance = axios.create({
        baseURL,
        timeout: 5000,
        headers: config.apiKey 
          ? { 
              'X-API-Key': config.apiKey,
              'ngrok-skip-browser-warning': 'true' // Обход страницы предупреждения Ngrok
            } 
          : {
              'ngrok-skip-browser-warning': 'true' // Обход страницы предупреждения Ngrok
            },
      });

      this.axiosInstances.set(key, instance);
    }

    return this.axiosInstances.get(key)!;
  }

  /**
   * Проверка доступности ScaleBridge
   */
  async checkHealth(ip: string, port: number = 5055): Promise<ScaleBridgeHealthResponse> {
    try {
      // Определяем URL: если IP содержит протокол (http/https), используем как есть, иначе строим
      const url = ip.startsWith('http') ? `${ip}/api/health` : `http://${ip}:${port}/api/health`;
      
      const response = await axios.get<ScaleBridgeHealthResponse>(url, {
        timeout: 3000,
        headers: {
          'ngrok-skip-browser-warning': 'true' // Обход страницы предупреждения Ngrok
        }
      });

      this.logger.log(`ScaleBridge health check successful: ${ip}:${port}`);
      return response.data;
    } catch (error) {
      this.logger.error(`ScaleBridge health check failed: ${ip}:${port}`, error);
      throw new HttpException(
        `Не удалось подключиться к ScaleBridge по адресу ${ip}:${port}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Получить API ключ от ScaleBridge
   */
  async getApiKey(ip: string, port: number = 5055): Promise<string> {
    try {
      // Определяем URL: если IP содержит протокол (http/https), используем как есть, иначе строим
      const baseUrl = ip.startsWith('http') ? ip : `http://${ip}:${port}`;
      
      // Сначала проверяем доступность ScaleBridge
      const healthResponse = await axios.get(`${baseUrl}/api/health`, {
        timeout: 3000,
        headers: {
          'ngrok-skip-browser-warning': 'true' // Обход страницы предупреждения Ngrok
        }
      });

      if (healthResponse.status !== 200) {
        throw new Error('ScaleBridge не отвечает');
      }

      // Пробуем получить конфигурацию без API ключа
      const response = await axios.get<any>(`${baseUrl}/api/config`, {
        timeout: 3000,
        headers: {
          'ngrok-skip-browser-warning': 'true' // Обход страницы предупреждения Ngrok
        },
        validateStatus: (status) => status < 500, // Принимаем любой статус кроме 5xx
      });

      // Проверяем разные варианты ответа
      const apiKey = response.data?.apiKey || response.data?.api_key || response.data?.key;

      if (!apiKey) {
        // Если API ключа нет, возвращаем специальное сообщение
        this.logger.warn(`API key not found in ScaleBridge config: ${ip}:${port}`);
        throw new Error(
          'API ключ не найден в конфигурации ScaleBridge. ' +
          'Убедитесь, что ScaleBridge версии 1.0.0 или выше и правильно настроен.',
        );
      }

      this.logger.log(`API key retrieved from ScaleBridge: ${ip}:${port}`);
      return apiKey;
    } catch (error: any) {
      this.logger.error(`Failed to get API key from ScaleBridge: ${ip}:${port}`, error);
      
      // Улучшенное сообщение об ошибке
      const errorMessage = error.message || 'Не удалось получить API ключ от ScaleBridge';
      throw new HttpException(
        errorMessage,
        error.response?.status === 401 || error.response?.status === 403 
          ? HttpStatus.UNAUTHORIZED 
          : HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Настроить весы для склада
   */
  async configureWarehouse(
    warehouseId: number,
    scaleIp: string,
    comPort?: string,
  ): Promise<{ apiKey: string; scaleUrl: string }> {
    try {
      // Проверяем доступность ScaleBridge
      const health = await this.checkHealth(scaleIp);

      // Получаем API ключ
      const apiKey = await this.getApiKey(scaleIp);

      // Определяем URL для сохранения
      const scaleUrl = scaleIp.startsWith('http') ? scaleIp : `http://${scaleIp}:5055`;

      // Сохраняем настройки в БД
      await this.prisma.warehouse.update({
        where: { id: warehouseId },
        data: {
          hasScales: true,
          scaleIpAddress: scaleIp,
          scaleApiKey: apiKey,
          scaleComPort: comPort || null,
          scaleStatus: 'connected',
          scaleLastSeen: new Date(),
        },
      });

      this.logger.log(`Warehouse ${warehouseId} configured with ScaleBridge: ${scaleIp}`);

      return {
        apiKey,
        scaleUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to configure warehouse ${warehouseId}`, error);
      throw error;
    }
  }

  /**
   * Тест соединения с ScaleBridge
   */
  async testConnection(
    warehouseId: number,
    scaleIp: string,
    apiKey: string,
  ): Promise<{ success: boolean; message: string; weight?: number }> {
    try {
      // Определяем конфигурацию: если IP содержит протокол, используем как URL
      const config: ScaleBridgeConfig = scaleIp.startsWith('http') 
        ? { ip: scaleIp, apiKey, url: scaleIp }
        : { ip: scaleIp, port: 5055, apiKey };
        
      const axiosInstance = this.getAxiosInstance(warehouseId, config);

      // Проверяем health
      const healthResponse = await axiosInstance.get<ScaleBridgeHealthResponse>('/api/health');

      // Пробуем получить текущий вес
      const weightResponse = await axiosInstance.get<{ weight: number; unit?: string; stable?: boolean }>('/api/weight');

      // Обновляем статус в БД
      await this.prisma.warehouse.update({
        where: { id: warehouseId },
        data: {
          scaleStatus: 'connected',
          scaleLastSeen: new Date(),
        },
      });

      // Извлекаем только число веса
      const weight = typeof weightResponse.data.weight === 'number' 
        ? weightResponse.data.weight 
        : (weightResponse.data as any).weight || 0;

      return {
        success: true,
        message: 'Соединение успешно установлено',
        weight,
      };
    } catch (error) {
      this.logger.error(`Connection test failed for warehouse ${warehouseId}`, error);

      // Обновляем статус на ошибку
      await this.prisma.warehouse.update({
        where: { id: warehouseId },
        data: {
          scaleStatus: 'error',
        },
      });

      throw new HttpException(
        'Не удалось подключиться к ScaleBridge. Проверьте IP адрес и API ключ.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Выполнить команду взвешивания
   */
  async weigh(
    warehouseId: number,
    action: 'brutto' | 'tara' | 'netto',
    orderId?: number,
  ): Promise<WeighCommandResponse> {
    try {
      // Получаем настройки склада
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: {
          scaleIpAddress: true,
          scaleApiKey: true,
          scaleStatus: true,
        },
      });

      if (!warehouse || !warehouse.scaleIpAddress || !warehouse.scaleApiKey) {
        throw new HttpException(
          'Весы не настроены для данного склада',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (warehouse.scaleStatus === 'disconnected') {
        throw new HttpException(
          'Весы отключены. Проверьте соединение.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Определяем конфигурацию: если IP содержит протокол, используем как URL
      const config: ScaleBridgeConfig = warehouse.scaleIpAddress.startsWith('http')
        ? {
            ip: warehouse.scaleIpAddress,
            apiKey: warehouse.scaleApiKey,
            url: warehouse.scaleIpAddress // Для полных URL
          }
        : {
            ip: warehouse.scaleIpAddress,
            port: 5055,
            apiKey: warehouse.scaleApiKey,
          };

      const axiosInstance = this.getAxiosInstance(warehouseId, config);

      // Отправляем команду взвешивания
      const response = await axiosInstance.post<WeighCommandResponse>('/api/command', {
        action,
        orderId,
      });

      // Обновляем статус
      await this.prisma.warehouse.update({
        where: { id: warehouseId },
        data: {
          scaleStatus: 'connected',
          scaleLastSeen: new Date(),
        },
      });

      this.logger.log(`Weighing completed for warehouse ${warehouseId}: ${action}, weight: ${response.data.weight}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Weighing failed for warehouse ${warehouseId}`, error);

      // Обновляем статус на ошибку
      await this.prisma.warehouse.update({
        where: { id: warehouseId },
        data: {
          scaleStatus: 'error',
        },
      }).catch(() => {});

      throw new HttpException(
        'Ошибка при выполнении взвешивания',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить текущий вес
   */
  async getCurrentWeight(warehouseId: number): Promise<{ weight: number; unit: string; stable: boolean }> {
    try {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: {
          scaleIpAddress: true,
          scaleApiKey: true,
        },
      });

      if (!warehouse || !warehouse.scaleIpAddress || !warehouse.scaleApiKey) {
        throw new HttpException('Весы не настроены', HttpStatus.BAD_REQUEST);
      }

      // Определяем конфигурацию: если IP содержит протокол, используем как URL
      const config: ScaleBridgeConfig = warehouse.scaleIpAddress.startsWith('http')
        ? {
            ip: warehouse.scaleIpAddress,
            apiKey: warehouse.scaleApiKey,
            url: warehouse.scaleIpAddress // Для полных URL
          }
        : {
            ip: warehouse.scaleIpAddress,
            port: 5055,
            apiKey: warehouse.scaleApiKey,
          };

      const axiosInstance = this.getAxiosInstance(warehouseId, config);
      const response = await axiosInstance.get('/api/weight');

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get current weight for warehouse ${warehouseId}`, error);
      throw new HttpException(
        'Не удалось получить текущий вес',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Поиск ScaleBridge устройств в сети
   */
  async discoverDevices(subnet: string = '192.168.1'): Promise<Array<{ ip: string; url: string; weight: number }>> {
    const devices: Array<{ ip: string; url: string; weight: number }> = [];
    const promises: Promise<void>[] = [];

    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      
      const promise = axios
        .get<ScaleBridgeHealthResponse>(`http://${ip}:5055/api/health`, { timeout: 1000 })
        .then((response) => {
          if (response.data.status === 'ok') {
            devices.push({
              ip: response.data.ip,
              url: response.data.url,
              weight: response.data.scale.currentWeight,
            });
          }
        })
        .catch(() => {
          // Игнорируем ошибки - устройство не найдено
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    this.logger.log(`Found ${devices.length} ScaleBridge devices in subnet ${subnet}`);
    return devices;
  }

  /**
   * Получить статус весов для склада
   */
  async getScaleStatus(warehouseId: number): Promise<{
    status: string;
    weight?: number;
    lastSeen?: Date;
    scaleIp?: string;
    scalePort: number;
  }> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: {
        scaleStatus: true,
        scaleLastSeen: true,
        scaleIpAddress: true,
        scaleApiKey: true,
      },
    });

    if (!warehouse || !warehouse.scaleIpAddress) {
      return {
        status: 'not_configured',
        scalePort: 5055,
      };
    }

    // Пробуем получить текущий вес
    let currentWeight: number | undefined;
    try {
      const weightData = await this.getCurrentWeight(warehouseId);
      currentWeight = weightData.weight;
    } catch (error) {
      // Игнорируем ошибку
    }

    return {
      status: warehouse.scaleStatus || 'disconnected',
      weight: currentWeight,
      lastSeen: warehouse.scaleLastSeen || undefined,
      scaleIp: warehouse.scaleIpAddress,
      scalePort: 5055,
    };
  }
}

