import { Controller, Param, UseGuards, Get, Post } from '@nestjs/common';
import { MovieService } from './movie.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SearchMovieDto, MovieDetailDto, MovieRefreshDto } from './movie.dto';
import type { MovieSearchEntity, MovieEntity } from './movie.entities';

@Controller('movie')
@UseGuards(AuthGuard, PermissionsGuard)
export class MovieController {
  private readonly moduleCode: string = 'MoCtr-';

  constructor(private readonly movieService: MovieService) {}

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchMovieDto): Promise<MovieSearchEntity[]> {
    return this.movieService.search(params.name);
  }

  @Public()
  @Get(':id')
  async movieDetail(
    @Param() params: MovieDetailDto,
  ): Promise<MovieEntity | undefined> {
    return await this.movieService.getMovie(params.id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshMovie(
    @Param() params: MovieRefreshDto,
  ): Promise<MovieEntity | undefined | null> {
    return await this.movieService.refreshMovie(params.id);
  }
}
