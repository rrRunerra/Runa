import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailSyncService } from './email-sync.service';
import { NotificationModule } from '../notification/notification.module';
import { CacheModule } from '../../providers/cache/cache.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule, CacheModule],
  controllers: [EmailController],
  providers: [EmailService, EmailSyncService],
  exports: [EmailService, EmailSyncService],
})
export class EmailModule {}
