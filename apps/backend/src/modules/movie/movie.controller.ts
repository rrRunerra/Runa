import { Controller, Param, UseGuards, Get, Query, Post } from '@nestjs/common';
import { MovieService } from './movie.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchMovieDto } from './dto/search-movie.dto';
import { MovieSearchEntity } from './entities/movie-search.entity';
import { MovieEntity } from './entities/movie.entity';
import { AquilaFlags } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { rrTooManyRequestsException } from 'src/providers/error';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('movie')
@UseGuards(AuthGuard, PermissionsGuard)
export class MovieController {
  private readonly moduleCode = 'MoCtr-';

  constructor(
    private readonly movieService: MovieService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get('search')
  public async search(
    @Query() query: SearchMovieDto,
  ): Promise<MovieSearchEntity> {
    return this.movieService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  public async getMovie(@Param('id') id: string): Promise<MovieEntity> {
    return this.movieService.getMovie(id);
  }

  @Post('refresh/:id')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  public async refreshMovie(@Param('id') id: string): Promise<MovieEntity> {
    const cooldownKey = `cooldown:refresh:movie:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRRPWBRA001`, {
        message:
          'This media was refreshed recently. Please wait before refreshing again.',
      });
    }

    const result = await this.movieService.getMovie(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
