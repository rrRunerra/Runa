import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Post,
  Body,
  Delete,
  Req,
} from '@nestjs/common';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ListService } from './list.service';
import ListEntity from './entities/ListEntity';
import { $Enums } from '@runa/database';

@Controller('list')
@UseGuards(DualAuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  // ─────────────────────────── ANIME ───────────────────────────

  @Public()
  @Get('/anime/user/:username')
  public async getAnimeList(
    @Param('username') username: string,
  ): Promise<ListEntity[]> {
    return this.listService.getAnimeList(username);
  }

  @Get('/anime/entry/:animeId')
  public async getAnimeListEntry(
    @Param('animeId') animeId: string,
    @Req() req: any,
  ) {
    return this.listService.getAnimeListEntry(
      req.user.username,
      Number(animeId),
    );
  }

  @Post('/anime/entry/save')
  public async saveAnimeListEntry(
    @Req() req: any,
    @Body()
    body: {
      animeId: number;
      status?: $Enums.AnimeListStatus;
      progress?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      updateConnection?: boolean;
      connections?: {
        anilist?: number;
        mal?: number;
      };
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertAnimeList(req.user.username, body);
  }

  @Delete('/anime/entry/:animeId')
  public async deleteAnimeListEntry(
    @Param('animeId') animeId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteAnimeList(req.user.username, Number(animeId));
  }

  // ─────────────────────────── MANGA ───────────────────────────

  @Public()
  @Get('/manga/user/:username')
  public async getMangaList(
    @Param('username') username: string,
  ): Promise<ListEntity[]> {
    return this.listService.getMangaList(username);
  }

  @Get('/manga/entry/:mangaId')
  public async getMangaListEntry(
    @Param('mangaId') mangaId: string,
    @Req() req: any,
  ) {
    return this.listService.getMangaListEntry(
      req.user.username,
      Number(mangaId),
    );
  }

  @Post('/manga/entry/save')
  public async saveMangaListEntry(
    @Req() req: any,
    @Body()
    body: {
      mangaId: number;
      status?: $Enums.MangaListStatus;
      chapters?: number;
      volumes?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      reread?: number;
      updateConnection?: boolean;
      connections?: {
        anilist?: number;
        mal?: number;
      };
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertMangaList(req.user.username, body);
  }

  @Delete('/manga/entry/:mangaId')
  public async deleteMangaListEntry(
    @Param('mangaId') mangaId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteMangaList(req.user.username, Number(mangaId));
  }
}
