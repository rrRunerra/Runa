import { Module } from '@nestjs/common';

import { MediaModule } from '../media/media.module';
import { MailModule } from '../../providers/mail/mail.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [MediaModule, MailModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
