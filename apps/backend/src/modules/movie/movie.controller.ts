import { Controller, Param, UseGuards, Get, Query } from '@nestjs/common';
import { MovieService } from './movie.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchMovieDto } from './dto/search-movie.dto';
import { MovieSearchEntity } from './entities/movie-search.entity';
import { MovieEntity } from './entities/movie.entity';

@Controller('movie')
@UseGuards(DualAuthGuard)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Public()
  @Get('search')
  public async search(
    @Query() query: SearchMovieDto,
  ): Promise<MovieSearchEntity> {
    return this.movieService.search(query.name);
  }

  @Public()
  @Get(':id')
  public async getMovie(@Param('id') id: string): Promise<MovieEntity> {
    return this.movieService.getMovie(id);
  }
}
