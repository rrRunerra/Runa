import { Module } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AnimeController } from './anime.controller';
import { AnimeRepository } from './anime.repository';
import { AnimeQueueService } from './anime-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';

@Module({
  controllers: [AnimeController],
  providers: [AnimeService, AnimeRepository, AnimeQueueService, CacheService],
  exports: [AnimeService],
})
export class AnimeModule {}
