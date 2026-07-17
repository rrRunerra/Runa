import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../../providers/database/prisma.module';

import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FriendsModule)],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
