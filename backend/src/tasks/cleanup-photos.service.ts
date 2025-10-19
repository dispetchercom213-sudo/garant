import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CleanupPhotosService {
  private readonly logger = new Logger(CleanupPhotosService.name);
  
  constructor(
    private prisma: PrismaService, 
    private settings: SettingsService
  ) {}

  async cleanupOldPhotos() {
    try {
      this.logger.log('🔄 Начинаем очистку старых фото...');
      
      // Фото старше 30 дней
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      
      const oldFixes = await this.prisma.scaleFix.findMany({ 
        where: { 
          createdAt: { lt: cutoff },
          photoPath: { not: null }
        } 
      });
      
      if (!oldFixes.length) {
        this.logger.log('✅ Нет старых фото для архивирования');
        return;
      }

      this.logger.log(`📦 Найдено ${oldFixes.length} фото для архивирования`);

      // Создаем директорию для архивов
      const backupsDir = 'backups/scale-photos';
      fs.mkdirSync(backupsDir, { recursive: true });
      
      const zipPath = path.join(backupsDir, `scale_photos_${new Date().toISOString().split('T')[0]}.zip`);
      
      // Создаем ZIP архив
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);
      
      let archivedCount = 0;
      for (const fix of oldFixes) {
        if (fix.photoPath && fs.existsSync(fix.photoPath)) {
          const filename = `${fix.warehouseId}_${fix.type}_${fix.createdAt.toISOString().split('T')[0]}_${path.basename(fix.photoPath)}`;
          archive.file(fix.photoPath, { name: filename });
          archivedCount++;
        }
      }
      
      await archive.finalize();
      
      this.logger.log(`📦 Архивировано ${archivedCount} фото в ${zipPath}`);

      // Отправляем email с архивом
      await this.sendEmailWithAttachment(zipPath, archivedCount);

      // Удаляем старые фото и записи из базы
      let deletedFiles = 0;
      for (const fix of oldFixes) {
        if (fix.photoPath && fs.existsSync(fix.photoPath)) {
          try {
            fs.unlinkSync(fix.photoPath);
            deletedFiles++;
          } catch (error) {
            this.logger.error(`❌ Ошибка удаления файла ${fix.photoPath}:`, error);
          }
        }
      }
      
      // Удаляем записи из базы данных
      await this.prisma.scaleFix.deleteMany({ 
        where: { createdAt: { lt: cutoff } } 
      });
      
      this.logger.log(`✅ Удалено ${deletedFiles} фото и ${oldFixes.length} записей из базы`);
      
    } catch (error) {
      this.logger.error('❌ Ошибка при очистке фото:', error);
      throw error;
    }
  }

  private async sendEmailWithAttachment(zipPath: string, photoCount: number) {
    try {
      const emailSettings = await this.settings.getEmailSettings();
      
      if (!emailSettings.MAIL_USER || !emailSettings.MAIL_PASS || !emailSettings.MAIL_TO) {
        this.logger.warn('⚠️ Email настройки не заполнены, пропускаем отправку');
        return;
      }

      // Создаем transporter
      const transporterConfig: any = {
        auth: {
          user: emailSettings.MAIL_USER,
          pass: emailSettings.MAIL_PASS,
        }
      };

      // Настройки для разных сервисов
      switch (emailSettings.MAIL_SERVICE) {
        case 'gmail':
          transporterConfig.service = 'gmail';
          break;
        case 'mail.ru':
          transporterConfig.host = 'smtp.mail.ru';
          transporterConfig.port = 587;
          transporterConfig.secure = false;
          break;
        case 'yandex':
          transporterConfig.host = 'smtp.yandex.ru';
          transporterConfig.port = 587;
          transporterConfig.secure = false;
          break;
        default:
          if (emailSettings.MAIL_HOST) {
            transporterConfig.host = emailSettings.MAIL_HOST;
            transporterConfig.port = parseInt(emailSettings.MAIL_PORT) || 587;
            transporterConfig.secure = emailSettings.MAIL_SECURE;
          } else {
            transporterConfig.service = 'gmail';
          }
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // Проверяем подключение
      await transporter.verify();

      const mailOptions = {
        from: `"BetonAPP Reports" <${emailSettings.MAIL_USER}>`,
        to: emailSettings.MAIL_TO,
        subject: `📦 Архив фото взвешиваний (${new Date().toLocaleDateString('ru-RU')})`,
        html: `
          <h2>📦 Архив фото взвешиваний</h2>
          <p>Дата архивирования: ${new Date().toLocaleDateString('ru-RU')}</p>
          <p>Количество фото: ${photoCount}</p>
          <p>Во вложении архив фото старше 30 дней.</p>
          <hr>
          <p><small>Автоматическая отправка от BetonAPP</small></p>
        `,
        attachments: [
          {
            filename: path.basename(zipPath),
            path: zipPath,
          }
        ],
      };

      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email отправлен: ${result.messageId}`);
      
    } catch (error) {
      this.logger.error('❌ Ошибка отправки email:', error);
      throw error;
    }
  }

  // Метод для ручного запуска очистки (для тестирования)
  async manualCleanup() {
    this.logger.log('🔧 Ручной запуск очистки фото...');
    await this.cleanupOldPhotos();
  }
}

