import { Module } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AnimeController } from './anime.controller';
import { AnimeRepository } from './repositories/anime.repository';
import { AnimeQueueService } from './services/anime-queue.service';

@Module({
  controllers: [AnimeController],
  providers: [AnimeService, AnimeRepository, AnimeQueueService],
  exports: [AnimeService],
})
export class AnimeModule {}
