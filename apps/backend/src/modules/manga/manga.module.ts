import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { MangaRepository } from './manga.repository';
import { MangaExternal } from './manga.external';
import { MangaQueueService } from './manga-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';

@Module({
  controllers: [MangaController],
  providers: [
    MangaService,
    MangaRepository,
    MangaQueueService,
    CacheService,
    MangaExternal,
  ],
  exports: [MangaService],
})
export class MangaModule {}
