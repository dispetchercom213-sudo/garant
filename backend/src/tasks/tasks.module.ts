import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { CleanupPhotosService } from './cleanup-photos.service';
import { CleanupPhotosCron } from './cleanup-photos.cron';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SettingsModule
  ],
  providers: [
    PrismaService,
    CleanupPhotosService,
    CleanupPhotosCron
  ],
  exports: [CleanupPhotosService]
})
export class TasksModule {}

