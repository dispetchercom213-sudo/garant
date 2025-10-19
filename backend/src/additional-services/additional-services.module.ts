import { Module } from '@nestjs/common';
import { AdditionalServicesService } from './additional-services.service';
import { AdditionalServicesController } from './additional-services.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdditionalServicesController],
  providers: [AdditionalServicesService],
  exports: [AdditionalServicesService],
})
export class AdditionalServicesModule {}

