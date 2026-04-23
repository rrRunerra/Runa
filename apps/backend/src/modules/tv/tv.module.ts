import { Module } from '@nestjs/common';
import { TvService } from './tv.service';
import { TvController } from './tv.controller';
import { TvRepository } from './repositories/tv.repository';
import { TvQueueService } from './services/tv-queue.service';

@Module({
  controllers: [TvController],
  providers: [TvService, TvRepository, TvQueueService],
  exports: [TvService],
})
export class TvModule {}
