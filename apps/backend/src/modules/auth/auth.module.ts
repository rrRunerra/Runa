import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PrismaModule } from 'src/providers/database/prisma.module';
import { MailModule } from 'src/providers/mail/mail.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../../common/guards/auth/auth.guard';

@Module({
  imports: [UserModule, PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
