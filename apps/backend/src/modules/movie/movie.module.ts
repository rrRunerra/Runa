import { Module, forwardRef } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { MovieRepository } from './movie.repository';
import { MovieQueueService } from './movie-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MovieExternal } from './movie.external';
import { AnimeModule } from '../anime/anime.module';
import { MangaModule } from '../manga/manga.module';

@Module({
  imports: [
    forwardRef(() => AnimeModule),
    forwardRef(() => MangaModule),
  ],
  controllers: [MovieController],
  providers: [
    MovieService,
    MovieRepository,
    MovieQueueService,
    CacheService,
    MovieExternal,
  ],
  exports: [MovieService, MovieRepository, MovieQueueService],
})
export class MovieModule {}
