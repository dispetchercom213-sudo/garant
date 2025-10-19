import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('🗄️  База данных PostgreSQL подключена');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🗄️  Подключение к базе данных закрыто');
  }

  // Утилиты для работы с базой данных
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    const models = Reflect.ownKeys(this).filter(key => typeof key === 'string' && key[0] !== '_');
    
    return Promise.all(
      models.map((modelKey) => this[modelKey as string].deleteMany())
    );
  }

  // Расчёт расстояния по формуле Хаверсина с 20% поправкой
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Применяем 20% поправку как указано в требованиях
    return distance * 1.2;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Генерация уникального номера документа
  async generateDocumentNumber(prefix: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Ищем последний номер за сегодня
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const lastInvoice = await this.invoice.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/\d+$/);
      if (match) {
        sequence = parseInt(match[0]) + 1;
      }
    }

    return `${prefix}-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
  }
}



