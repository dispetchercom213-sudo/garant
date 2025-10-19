import { Module } from '@nestjs/common';
import { ScaleController } from './scale.controller';
import { ScaleBridgeService } from './scale-bridge.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [ScaleController],
  providers: [PrismaService, ScaleBridgeService],
  exports: [ScaleBridgeService],
})
export class ScaleModule {}

