import { Controller, Param, UseGuards, Get, Query, Post, Req, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { GameService } from './game.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';

@Controller('game')
@UseGuards(DualAuthGuard)
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get('search')
  async search(@Query() query: { name: string }) {
    return this.gameService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  async getGame(@Param('id') id: string) {
    return this.gameService.getGame(parseInt(id));
  }

  @Post('refresh/:id')
  async refreshGame(@Param('id') id: string, @Req() req: any) {
    const bitfield = AquilaBitField.fromRaw(req.user.permissions);
    if (!bitfield.has('MEDIA_REFRESH')) {
      throw new ForbiddenException('You do not have permission to refresh media');
    }

    const cooldownKey = `cooldown:refresh:game:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'This media was refreshed recently. Please wait before refreshing again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.gameService.getGame(parseInt(id), true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
