import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Post,
  Body,
  Delete,
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
  @Get('/anime/:userId')
  public async getAnimeList(
    @Param('userId') userId: string,
  ): Promise<ListEntity[]> {
    return this.listService.getAnimeList(userId);
  }

  @Public()
  @Get('/anime/:userId/:animeId')
  public async getAnimeListEntry(
    @Param('userId') userId: string,
    @Param('animeId') animeId: string,
  ) {
    return this.listService.getAnimeListEntry(userId, Number(animeId));
  }

  @Post('/anime/upsert')
  public async upsertAnimeList(
    @Body()
    body: {
      userId: string;
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
    return this.listService.upsertAnimeList(body);
  }

  @Delete('/anime/:userId/:animeId')
  public async deleteAnimeList(
    @Param('userId') userId: string,
    @Param('animeId') animeId: string,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteAnimeList(userId, Number(animeId));
  }

  // ─────────────────────────── MANGA ───────────────────────────

  @Public()
  @Get('/manga/:userId')
  public async getMangaList(
    @Param('userId') userId: string,
  ): Promise<ListEntity[]> {
    return this.listService.getMangaList(userId);
  }

  @Public()
  @Get('/manga/:userId/:mangaId')
  public async getMangaListEntry(
    @Param('userId') userId: string,
    @Param('mangaId') mangaId: string,
  ) {
    return this.listService.getMangaListEntry(userId, Number(mangaId));
  }

  @Post('/manga/upsert')
  public async upsertMangaList(
    @Body()
    body: {
      userId: string;
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
    return this.listService.upsertMangaList(body);
  }

  @Delete('/manga/:userId/:mangaId')
  public async deleteMangaList(
    @Param('userId') userId: string,
    @Param('mangaId') mangaId: string,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteMangaList(userId, Number(mangaId));
  }
}
