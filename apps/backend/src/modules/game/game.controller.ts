import { Controller, Param, UseGuards, Get, Query, Post } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AquilaFlags } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { rrTooManyRequestsException } from 'src/providers/error';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('game')
@UseGuards(AuthGuard, PermissionsGuard)
export class GameController {
  private readonly moduleCode = 'GeCtr-';

  constructor(
    private readonly gameService: GameService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get('search')
  async search(@Query() query: { name: string }): Promise<any> {
    return this.gameService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  async getGame(@Param('id') id: string): Promise<any> {
    return this.gameService.getGame(parseInt(id));
  }

  @Post('refresh/:id')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshGame(@Param('id') id: string): Promise<any> {
    const cooldownKey = `cooldown:refresh:game:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMRR001`, {
        message:
          'This media was refreshed recently. Please wait before refreshing again.',
      });
    }

    const result = await this.gameService.getGame(parseInt(id), true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
