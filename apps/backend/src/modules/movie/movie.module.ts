import { Module } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { MovieRepository } from './repositories/movie.repository';
import { MovieQueueService } from './services/movie-queue.service';

@Module({
  controllers: [MovieController],
  providers: [MovieService, MovieRepository, MovieQueueService],
  exports: [MovieService],
})
export class MovieModule {}
