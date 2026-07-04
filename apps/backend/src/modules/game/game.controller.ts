import { Controller, Param, UseGuards, Get, Post } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SearchGameDto, GameDetailDto, GameRefreshDto } from './game.dto';
import type { GameSearchEntity, GameEntity } from './game.entities';

@Controller('game')
@UseGuards(AuthGuard, PermissionsGuard)
export class GameController {
  private readonly moduleCode: string = 'GeCtr-';

  constructor(private readonly gameService: GameService) {}

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchGameDto): Promise<GameSearchEntity[]> {
    return this.gameService.search(params.name);
  }

  @Public()
  @Get(':id')
  async gameDetail(
    @Param() params: GameDetailDto,
  ): Promise<GameEntity | undefined> {
    return await this.gameService.getGame(params.id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshGame(
    @Param() params: GameRefreshDto,
  ): Promise<GameEntity | undefined | null> {
    return await this.gameService.refreshGame(params.id);
  }
}
