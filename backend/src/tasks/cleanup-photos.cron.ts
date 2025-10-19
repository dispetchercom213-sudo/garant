import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupPhotosService } from './cleanup-photos.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CleanupPhotosCron {
  constructor(private readonly cleanupService: CleanupPhotosService) {}
  
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    try {
      await this.cleanupService.cleanupOldPhotos();
    } catch (error) {
      console.error('Ошибка в cron задаче очистки фото:', error);
    }
  }

  // Дополнительная задача для ежедневной очистки старых архивов
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleArchiveCleanup() {
    try {
      const backupsDir = 'uploads/backups';
      if (fs.existsSync(backupsDir)) {
        const files = fs.readdirSync(backupsDir);
        const now = Date.now();
        const weekInMs = 7 * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах
        
        for (const file of files) {
          const filePath = path.join(backupsDir, file);
          const stats = fs.statSync(filePath);
          
          // Удаляем архивы старше недели
          if (now - stats.mtime.getTime() > weekInMs) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Удален старый архив: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка в cron задаче очистки архивов:', error);
    }
  }
}

