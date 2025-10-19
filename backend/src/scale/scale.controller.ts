import { Controller, Get, Post, Param, Body, NotFoundException, UseGuards, Res, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { ScaleBridgeService } from './scale-bridge.service';

@Controller('scale')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScaleController {
  constructor(
    private prisma: PrismaService,
    private scaleBridgeService: ScaleBridgeService,
  ) {}

  @Get(':warehouseId/read')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  async readWeight(@Param('warehouseId') warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ 
      where: { id: Number(warehouseId) },
      select: { id: true, name: true, scaleActive: true, scaleUrl: true }
    });
    
    if (!warehouse?.scaleActive || !warehouse?.scaleUrl) {
      throw new NotFoundException('Склад без весов или весы не активны');
    }

    try {
      const response = await fetch(`${warehouse.scaleUrl}/api/weight`);
      const data = await response.json() as { weight: number };
      return { 
        weight: data.weight ?? 0,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name
      };
    } catch (error) {
      throw new NotFoundException('Ошибка подключения к весам');
    }
  }

  @Post(':warehouseId/fix')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  async fix(@Param('warehouseId') warehouseId: string, @Body() body: { type: 'brutto' | 'tara' }) {
    const warehouse = await this.prisma.warehouse.findUnique({ 
      where: { id: Number(warehouseId) },
      select: { 
        id: true, 
        name: true, 
        scaleActive: true, 
        scaleUrl: true,
        cameraActive: true,
        cameraUrl: true
      }
    });
    
    if (!warehouse?.scaleActive || !warehouse?.scaleUrl) {
      throw new NotFoundException('Нет ScaleBridge или весы не активны');
    }

    if (!body.type || !['brutto', 'tara'].includes(body.type)) {
      throw new NotFoundException('Тип должен быть brutto или tara');
    }

    try {
      // Получаем текущий вес
      const weightResponse = await fetch(`${warehouse.scaleUrl}/api/weight`);
      const weightData = await weightResponse.json() as { weight: number };
      
      let photoPath: string | null = null;

      // Делаем снимок, если камера активна
      if (warehouse.cameraActive && warehouse.cameraUrl) {
        try {
          const imgResponse = await fetch(`${warehouse.scaleUrl}/api/snapshot`);
          const buffer = Buffer.from(await imgResponse.arrayBuffer());
          
          // Создаем директорию для фото
          const uploadsDir = 'uploads/scale-photos';
          fs.mkdirSync(uploadsDir, { recursive: true });
          
          const filename = `snapshot_${warehouseId}_${body.type}_${Date.now()}.jpg`;
          photoPath = `${uploadsDir}/${filename}`;
          
          await fs.promises.writeFile(photoPath, buffer);
        } catch (photoError) {
          console.error('Ошибка при создании фото:', photoError);
          // Продолжаем без фото
        }
      }

      // Сохраняем в базу данных
      const scaleFix = await this.prisma.scaleFix.create({
        data: {
          warehouseId: Number(warehouseId),
          type: body.type,
          weight: weightData.weight,
          photoPath: photoPath,
        },
        include: {
          warehouse: {
            select: { id: true, name: true }
          }
        }
      });

      return {
        id: scaleFix.id,
        weight: scaleFix.weight,
        type: scaleFix.type,
        photoPath: scaleFix.photoPath,
        warehouseName: scaleFix.warehouse.name,
        createdAt: scaleFix.createdAt
      };

    } catch (error) {
      console.error('Ошибка при фиксации веса:', error);
      throw new NotFoundException('Ошибка при фиксации веса и фото');
    }
  }

  @Get(':warehouseId/history')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  async getHistory(@Param('warehouseId') warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: Number(warehouseId) },
      select: { id: true, name: true }
    });

    if (!warehouse) {
      throw new NotFoundException('Склад не найден');
    }

    const fixes = await this.prisma.scaleFix.findMany({
      where: { warehouseId: Number(warehouseId) },
      orderBy: { createdAt: 'desc' },
      take: 50, // Последние 50 записей
      include: {
        warehouse: {
          select: { id: true, name: true }
        }
      }
    });

    return {
      warehouse,
      fixes
    };
  }

  @Get('download')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async downloadInstaller(@Res() res: Response) {
    const filePath = path.resolve(process.cwd(), 'installers', 'ScaleBridgeSetup.exe');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: 'Установщик ScaleBridge не найден',
        error: 'INSTALLER_NOT_FOUND'
      });
    }

    const fileName = 'ScaleBridgeSetup.exe';
    const fileSize = fs.statSync(filePath).size;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize.toString());

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Ошибка при отправке файла:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'Ошибка при скачивании установщика',
          error: 'DOWNLOAD_ERROR'
        });
      }
    });
  }

  // ==================== ScaleBridge Integration Endpoints ====================

  /**
   * Получить статус весов для склада
   * GET /scale/:warehouseId/status
   */
  @Get(':warehouseId/status')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  async getScaleStatus(@Param('warehouseId') warehouseId: string) {
    return this.scaleBridgeService.getScaleStatus(Number(warehouseId));
  }

  /**
   * Настроить весы для склада
   * POST /scale/:warehouseId/configure
   */
  @Post(':warehouseId/configure')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async configureScales(
    @Param('warehouseId') warehouseId: string,
    @Body() body: { scaleIp: string; comPort?: string },
  ) {
    return this.scaleBridgeService.configureWarehouse(
      Number(warehouseId),
      body.scaleIp,
      body.comPort,
    );
  }

  /**
   * Получить API ключ от ScaleBridge
   * POST /scale/:warehouseId/get-api-key
   */
  @Post(':warehouseId/get-api-key')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async getApiKey(
    @Param('warehouseId') warehouseId: string,
    @Body() body: { scaleIp: string },
  ) {
    const apiKey = await this.scaleBridgeService.getApiKey(body.scaleIp);
    
    // Сохраняем API ключ в БД
    await this.prisma.warehouse.update({
      where: { id: Number(warehouseId) },
      data: {
        scaleIpAddress: body.scaleIp,
        scaleApiKey: apiKey,
      },
    });

    return {
      success: true,
      apiKey,
      scaleUrl: `http://${body.scaleIp}:5055`,
    };
  }

  /**
   * Тест соединения с ScaleBridge
   * POST /scale/:warehouseId/test-connection
   */
  @Post(':warehouseId/test-connection')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async testConnection(
    @Param('warehouseId') warehouseId: string,
    @Body() body: { scaleIp: string; apiKey: string },
  ) {
    return this.scaleBridgeService.testConnection(
      Number(warehouseId),
      body.scaleIp,
      body.apiKey,
    );
  }

  /**
   * Выполнить взвешивание
   * POST /scale/:warehouseId/weigh
   */
  @Post(':warehouseId/weigh')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.DRIVER)
  async weigh(
    @Param('warehouseId') warehouseId: string,
    @Body() body: { action: 'brutto' | 'tara' | 'netto'; orderId?: number },
  ) {
    return this.scaleBridgeService.weigh(
      Number(warehouseId),
      body.action,
      body.orderId,
    );
  }

  /**
   * Получить текущий вес
   * GET /scale/:warehouseId/current-weight
   */
  @Get(':warehouseId/current-weight')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR, UserRole.OPERATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.DRIVER)
  async getCurrentWeight(@Param('warehouseId') warehouseId: string) {
    return this.scaleBridgeService.getCurrentWeight(Number(warehouseId));
  }

  /**
   * Поиск ScaleBridge устройств в сети
   * GET /scale/discover?subnet=192.168.1
   */
  @Get('discover')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DIRECTOR)
  async discoverDevices(@Query('subnet') subnet?: string) {
    return this.scaleBridgeService.discoverDevices(subnet);
  }

  /**
   * Отладка: проверить что возвращает ScaleBridge
   * GET /scale/debug-config?ip=172.17.128.1
   */
  @Get('debug-config')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  async debugConfig(@Query('ip') ip: string) {
    try {
      const healthResponse = await fetch(`http://${ip}:5055/api/health`);
      const healthData = await healthResponse.json();

      const configResponse = await fetch(`http://${ip}:5055/api/config`);
      const configData = await configResponse.json();

      return {
        success: true,
        ip,
        health: healthData,
        config: configData,
        configKeys: Object.keys(configData),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        ip,
      };
    }
  }
}

