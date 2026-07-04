import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { StatsRepository } from './stats.repository';
import { CacheService } from '../../providers/cache/cache.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, StatsRepository, CacheService],
  exports: [StatsService],
})
export class StatsModule {}
