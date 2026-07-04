import { Module } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { MovieRepository } from './movie.repository';
import { MovieQueueService } from './movie-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MovieExternal } from './movie.external';

@Module({
  controllers: [MovieController],
  providers: [
    MovieService,
    MovieRepository,
    MovieQueueService,
    CacheService,
    MovieExternal,
  ],
  exports: [MovieService],
})
export class MovieModule {}
