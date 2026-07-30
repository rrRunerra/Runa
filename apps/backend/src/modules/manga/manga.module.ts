import { Module, forwardRef } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { MangaRepository } from './manga.repository';
import { MangaExternal } from './manga.external';
import { MangaQueueService } from './manga-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { AnilistService } from 'src/providers/Anilist/anilist.service';
import { AnizipService } from 'src/providers/Anizip/anizip.service';
import { MalService } from 'src/providers/Mal/mal.service';
import { BangumiService } from 'src/providers/Bangumi/bangumi.service';
import { AnimeModule } from '../anime/anime.module';
import { MovieModule } from '../movie/movie.module';

@Module({
  imports: [
    forwardRef(() => AnimeModule),
    forwardRef(() => MovieModule),
  ],
  controllers: [MangaController],
  providers: [
    MangaService,
    MangaRepository,
    MangaQueueService,
    CacheService,
    MangaExternal,
    AnilistService,
    AnizipService,
    MalService,
    BangumiService,
  ],
  exports: [MangaService, MangaRepository, MangaQueueService],
})
export class MangaModule {}
