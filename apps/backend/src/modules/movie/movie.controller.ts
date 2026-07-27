import { Controller, Param, UseGuards, Get, Post, Query } from '@nestjs/common';
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
  @Get(':id/similar')
  async getSimilar(@Param() params: MovieDetailDto | any): Promise<any[]> {
    const id = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.movieService.getSimilarMovie(Number(id));
  }

  @Public()
  @Get(':id')
  async getMovie(
    @Param() params: MovieDetailDto | any,
  ): Promise<MovieEntity | undefined> {
    const id = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.movieService.getMovie(id);
  }



  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshMovie(
    @Param() params: MovieRefreshDto,
    @Query('force') forceQuery?: string,
  ): Promise<MovieEntity | undefined | null> {
    const force = forceQuery === 'true' || forceQuery === '1';
    return await this.movieService.refreshMovie(
      params.id,
      ...(forceQuery !== undefined ? [force] : []),
    );
  }
}
