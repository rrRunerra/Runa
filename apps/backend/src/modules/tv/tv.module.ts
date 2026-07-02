import { Module } from '@nestjs/common';
import { TvService } from './tv.service';
import { TvController } from './tv.controller';
import { TvRepository } from './tv.repository';
import { TvQueueService } from './tv-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { TvExternal } from './tv.external';

@Module({
  controllers: [TvController],
  providers: [
    TvService,
    TvRepository,
    TvQueueService,
    CacheService,
    TvExternal,
  ],
  exports: [TvService],
})
export class TvModule {}
