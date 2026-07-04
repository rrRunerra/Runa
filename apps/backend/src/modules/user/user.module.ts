import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { MailModule } from '../../providers/mail/mail.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [FilesModule, MailModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
