import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { prisma } from '@runa/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public client = prisma;

  async onModuleInit() {
    this.logger.log('Connecting to database');

    await this.client.$connect().catch((err: any) => {
      this.logger.error(err);
    });
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.client.$disconnect().catch((err: any) => {
      this.logger.error(err);
    });
    this.logger.log('Disconnected from database');
  }
}
