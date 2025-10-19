import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const settings = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
  }

  async updateSettings(data: Record<string, string>) {
    const promises = Object.entries(data).map(([key, value]) =>
      this.prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );
    await Promise.all(promises);
    return this.getAll();
  }

  async get(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async set(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async delete(key: string) {
    return this.prisma.systemSetting.delete({
      where: { key },
    });
  }

  // Специальные методы для email настроек
  async getEmailSettings() {
    const settings = await this.getAll();
    return {
      MAIL_SERVICE: settings.MAIL_SERVICE || 'gmail',
      MAIL_USER: settings.MAIL_USER || '',
      MAIL_PASS: settings.MAIL_PASS || '',
      MAIL_TO: settings.MAIL_TO || '',
      MAIL_HOST: settings.MAIL_HOST || '',
      MAIL_PORT: settings.MAIL_PORT || '587',
      MAIL_SECURE: settings.MAIL_SECURE === 'true',
    };
  }

  async updateEmailSettings(emailData: {
    MAIL_SERVICE?: string;
    MAIL_USER?: string;
    MAIL_PASS?: string;
    MAIL_TO?: string;
    MAIL_HOST?: string;
    MAIL_PORT?: string;
    MAIL_SECURE?: boolean;
  }) {
    const dataToSave: Record<string, string> = {};
    
    if (emailData.MAIL_SERVICE) dataToSave.MAIL_SERVICE = emailData.MAIL_SERVICE;
    if (emailData.MAIL_USER) dataToSave.MAIL_USER = emailData.MAIL_USER;
    if (emailData.MAIL_PASS) dataToSave.MAIL_PASS = emailData.MAIL_PASS;
    if (emailData.MAIL_TO) dataToSave.MAIL_TO = emailData.MAIL_TO;
    if (emailData.MAIL_HOST) dataToSave.MAIL_HOST = emailData.MAIL_HOST;
    if (emailData.MAIL_PORT) dataToSave.MAIL_PORT = emailData.MAIL_PORT;
    if (emailData.MAIL_SECURE !== undefined) dataToSave.MAIL_SECURE = emailData.MAIL_SECURE.toString();

    await this.updateSettings(dataToSave);
    return this.getEmailSettings();
  }
}

