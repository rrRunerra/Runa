import { Module } from '@nestjs/common';
import { CacheModule } from '../../providers/cache/cache.module';
import { PrismaModule } from '../../providers/database/prisma.module';
import { RankingsController } from './rankings.controller';
import { RankingsRepository } from './rankings.repository';
import { RankingsService } from './rankings.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [RankingsController],
  providers: [RankingsService, RankingsRepository],
  exports: [RankingsService],
})
export class RankingsModule {}
