import { Module, forwardRef } from '@nestjs/common';
import { InternalRequestsService } from './internal-requests.service';
import { InternalRequestsController } from './internal-requests.controller';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [InternalRequestsController],
  providers: [InternalRequestsService, PrismaService],
  exports: [InternalRequestsService],
})
export class InternalRequestsModule {}


