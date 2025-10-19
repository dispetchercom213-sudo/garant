import { Module } from '@nestjs/common';
import { InternalRequestsService } from './internal-requests.service';
import { InternalRequestsController } from './internal-requests.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [InternalRequestsController],
  providers: [InternalRequestsService, PrismaService],
  exports: [InternalRequestsService],
})
export class InternalRequestsModule {}


