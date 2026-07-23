import { Controller, Param, UseGuards, Get, Post, Query } from '@nestjs/common';
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
  async getGame(
    @Param() params: GameDetailDto | any,
  ): Promise<GameEntity | undefined> {
    const id = typeof params === 'object' && params !== null && 'id' in params ? Number(params.id) : Number(params);
    return await this.gameService.getGame(id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshGame(
    @Param() params: GameRefreshDto,
    @Query('force') forceQuery?: string,
  ): Promise<GameEntity | undefined | null> {
    const force = forceQuery === 'true' || forceQuery === '1';
    return await this.gameService.refreshGame(
      params.id,
      ...(forceQuery !== undefined ? [force] : []),
    );
  }
}
