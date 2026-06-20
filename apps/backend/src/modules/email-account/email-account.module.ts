import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailAccountController } from './email-account.controller';
import { EmailAccountService } from './email-account.service';
import { EmailSyncService } from './email-sync.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule],
  controllers: [EmailAccountController],
  providers: [EmailAccountService, EmailSyncService],
  exports: [EmailAccountService, EmailSyncService],
})
export class EmailAccountModule {}
