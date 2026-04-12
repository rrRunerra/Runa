import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { MangaRepository } from './repositories/manga.repository';
import { MangaQueueService } from './services/manga-queue.service';

@Module({
  controllers: [MangaController],
  providers: [MangaService, MangaRepository, MangaQueueService],
  exports: [MangaService],
})
export class MangaModule {}
