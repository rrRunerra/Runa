import { Module, forwardRef } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AnimeController } from './anime.controller';
import { AnimeRepository } from './anime.repository';
import { AnimeQueueService } from './anime-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { AnimeExternal } from './anime.external';
import { AnilistService } from 'src/providers/Anilist/anilist.service';
import { AnizipService } from 'src/providers/Anizip/anizip.service';
import { MalService } from 'src/providers/Mal/mal.service';
import { TvdbService } from 'src/providers/Tvdb/tvdb.service';
import { BangumiService } from 'src/providers/Bangumi/bangumi.service';
import { AniskipService } from 'src/providers/Aniskip/aniskip.service';
import { MangaModule } from '../manga/manga.module';
import { MovieModule } from '../movie/movie.module';

@Module({
  imports: [
    forwardRef(() => MangaModule),
    forwardRef(() => MovieModule),
  ],
  controllers: [AnimeController],
  providers: [
    AnimeService,
    AnimeRepository,
    AnimeQueueService,
    CacheService,
    AnimeExternal,
    AnilistService,
    AnizipService,
    MalService,
    TvdbService,
    BangumiService,
    AniskipService,
  ],
  exports: [AnimeService, AnimeRepository, AnimeQueueService],
})
export class AnimeModule {}
