import { Module } from '@nestjs/common';
import { DriverWeighingHistoryService } from './driver-weighing-history.service';
import { DriverWeighingHistoryController } from './driver-weighing-history.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DriverWeighingHistoryController],
  providers: [DriverWeighingHistoryService],
  exports: [DriverWeighingHistoryService],
})
export class DriverWeighingHistoryModule {}
