import { Module } from '@nestjs/common';
import { ConcreteMarksService } from './concrete-marks.service';
import { ConcreteMarksController } from './concrete-marks.controller';

@Module({
  controllers: [ConcreteMarksController],
  providers: [ConcreteMarksService],
  exports: [ConcreteMarksService],
})
export class ConcreteMarksModule {}