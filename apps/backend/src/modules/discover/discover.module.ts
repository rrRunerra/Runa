import { Module } from '@nestjs/common';
import { PrismaModule } from '../../providers/database/prisma.module';
import { CacheModule } from '../../providers/cache/cache.module';
import { DiscoverRepository } from './discover.repository';
import { DiscoverService } from './discover.service';
import { DiscoverController } from './discover.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [DiscoverController],
  providers: [DiscoverService, DiscoverRepository],
  exports: [DiscoverService],
})
export class DiscoverModule {}
