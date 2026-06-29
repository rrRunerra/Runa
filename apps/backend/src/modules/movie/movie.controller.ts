import { Controller, Param, UseGuards, Get, Query, Post, Req, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { MovieService } from './movie.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchMovieDto } from './dto/search-movie.dto';
import { MovieSearchEntity } from './entities/movie-search.entity';
import { MovieEntity } from './entities/movie.entity';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';

@Controller('movie')
@UseGuards(DualAuthGuard)
export class MovieController {
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
  public async refreshMovie(@Param('id') id: string, @Req() req: any): Promise<MovieEntity> {
    const bitfield = AquilaBitField.fromRaw(req.user.permissions);
    if (!bitfield.has('MEDIA_REFRESH')) {
      throw new ForbiddenException('You do not have permission to refresh media');
    }

    const cooldownKey = `cooldown:refresh:movie:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'This media was refreshed recently. Please wait before refreshing again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.movieService.getMovie(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
