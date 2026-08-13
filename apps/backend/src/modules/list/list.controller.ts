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
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ListService } from './list.service';
import ListEntity from './list.entities';
import {
  ListQueryDto,
  SaveAnimeEntryDto,
  SaveMangaEntryDto,
  SaveMovieEntryDto,
  SaveTvEntryDto,
  SaveGameEntryDto,
  SaveBookEntryDto,
  IncrementProgressDto,
  ToggleEpisodeDto,
  ToggleSeasonDto,
  MediaSequelsQueryDto,
  ExportRrListQueryDto,
  ExportMalQueryDto,
} from './list.dto';

@Controller('list')
@UseGuards(AuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  // ─────────────────────────── ANIME ───────────────────────────

  @Public()
  @Get('/anime/user/:username')
  public async getAnimeList(
    @Param('username') username: string,
    @Req() req: any,
    @Query() query: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo?: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    return this.listService.getAnimeList(username, req.user?.username, query);
  }

  @Get('/anime/entry/:animeId')
  public async getAnimeListEntry(
    @Param('animeId') animeId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getAnimeListEntry(
      req.user.username,
      Number(animeId),
    );
  }

  @Post('/anime/entry/save')
  public async saveAnimeListEntry(
    @Req() req: any,
    @Body() body: SaveAnimeEntryDto,
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
    @Req() req: any,
    @Query() query: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo?: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    return this.listService.getMangaList(username, req.user?.username, query);
  }

  @Get('/manga/entry/:mangaId')
  public async getMangaListEntry(
    @Param('mangaId') mangaId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getMangaListEntry(
      req.user.username,
      Number(mangaId),
    );
  }

  @Post('/manga/entry/save')
  public async saveMangaListEntry(
    @Req() req: any,
    @Body() body: SaveMangaEntryDto,
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

  // ─────────────────────────── MOVIE ───────────────────────────

  @Public()
  @Get('/movie/user/:username')
  public async getMovieList(
    @Param('username') username: string,
    @Req() req: any,
    @Query() query: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo?: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    return this.listService.getMovieList(username, req.user?.username, query);
  }

  @Get('/movie/entry/:movieId')
  public async getMovieListEntry(
    @Param('movieId') movieId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getMovieListEntry(
      req.user.username,
      Number(movieId),
    );
  }

  @Post('/movie/entry/save')
  public async saveMovieListEntry(
    @Req() req: any,
    @Body() body: SaveMovieEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertMovieList(req.user.username, body);
  }

  @Delete('/movie/entry/:movieId')
  public async deleteMovieListEntry(
    @Param('movieId') movieId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteMovieList(req.user.username, Number(movieId));
  }

  // ─────────────────────────── TV ───────────────────────────

  @Public()
  @Get('/tv/user/:username')
  public async getTvList(
    @Param('username') username: string,
    @Req() req: any,
    @Query() query: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo?: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    return this.listService.getTvList(username, req.user?.username, query);
  }

  @Get('/tv/entry/:tvId')
  public async getTvListEntry(
    @Param('tvId') tvId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getTvListEntry(req.user.username, Number(tvId));
  }

  @Post('/tv/entry/save')
  public async saveTvListEntry(
    @Req() req: any,
    @Body() body: SaveTvEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertTvList(req.user.username, body);
  }

  @Delete('/tv/entry/:tvId')
  public async deleteTvListEntry(
    @Param('tvId') tvId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteTvList(req.user.username, Number(tvId));
  }

  // ─────────────────────────── GAME ───────────────────────────

  @Public()
  @Get('/game/user/:username')
  public async getGameList(
    @Param('username') username: string,
    @Req() req: any,
    @Query() query: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo?: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    return this.listService.getGameList(username, req.user?.username, query);
  }

  @Get('/game/entry/:gameId')
  public async getGameListEntry(
    @Param('gameId') gameId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getGameListEntry(req.user.username, Number(gameId));
  }

  @Post('/game/entry/save')
  public async saveGameListEntry(
    @Req() req: any,
    @Body() body: SaveGameEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertGameList(req.user.username, body);
  }

  @Delete('/game/entry/:gameId')
  public async deleteGameListEntry(
    @Param('gameId') gameId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteGameList(req.user.username, Number(gameId));
  }

  // ─────────────────────────── BOOK ───────────────────────────

  @Public()
  @Get('/book/user/:username')
  public async getBookList(
    @Param('username') username: string,
    @Req() req: any,
    @Query() query: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo?: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    return this.listService.getBookList(username, req.user?.username, query);
  }

  @Get('/book/entry/:bookId')
  public async getBookListEntry(
    @Param('bookId') bookId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getBookListEntry(req.user.username, Number(bookId));
  }

  @Post('/book/entry/save')
  public async saveBookListEntry(
    @Req() req: any,
    @Body() body: SaveBookEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertBookList(req.user.username, body);
  }

  @Delete('/book/entry/:bookId')
  public async deleteBookListEntry(
    @Param('bookId') bookId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteBookList(req.user.username, Number(bookId));
  }

  @Get('/watching')
  public async getWatchingList(@Req() req: any): Promise<ListEntity[]> {
    return this.listService.getWatchingList(req.user.username);
  }

  @Post('/increment')
  public async incrementProgress(
    @Req() req: any,
    @Body() body: IncrementProgressDto,
  ): Promise<any> {
    return this.listService.incrementProgress(
      req.user.username,
      body.mediaType,
      body.id,
      body.count,
    );
  }

  @Post('/tv/entry/:tvId/episode')
  public async toggleEpisode(
    @Param('tvId') tvId: string,
    @Req() req: any,
    @Body() body: ToggleEpisodeDto,
  ): Promise<any> {
    return this.listService.toggleEpisodeWatched(
      req.user.username,
      Number(tvId),
      body.seasonNum,
      body.episodeNum,
    );
  }

  @Post('/tv/entry/:tvId/season')
  public async toggleSeason(
    @Param('tvId') tvId: string,
    @Req() req: any,
    @Body() body: ToggleSeasonDto,
  ): Promise<any> {
    return this.listService.toggleSeasonWatched(
      req.user.username,
      Number(tvId),
      body.seasonNum,
      body.episodes,
      body.watched,
    );
  }

  @Public()
  @Get('/:mediaType/user/:username/counts')
  public async getUserListCounts(
    @Param('mediaType') mediaType: string,
    @Param('username') username: string,
    @Req() req: any,
  ): Promise<Record<string, number>> {
    return this.listService.getUserListCounts(mediaType, username, req.user?.username);
  }

  @Public()
  @Get('/:mediaType/user/:username/filters')
  public async getUserListFilters(
    @Param('mediaType') mediaType: string,
    @Param('username') username: string,
  ): Promise<any> {
    return this.listService.getUserListFilters(username, mediaType);
  }

  @Public()
  @Get('/:mediaType/user/:username/sequels')
  public async getUserListSequels(
    @Param('mediaType') mediaType: string,
    @Param('username') username: string,
    @Req() req: any,
    @Query() query: MediaSequelsQueryDto,
  ): Promise<any> {
    return this.listService.getMediaSequels(
      username,
      mediaType,
      req.user?.username,
      {
        relationType: query.relationType,
        releaseStatus: query.releaseStatus,
        includeInList: query.includeInList === 'true',
        search: query.search,
        limit: query.limit ?? 50,
        cursor: query.cursor,
      },
    );
  }

  // ─────────────────────────── RADARR/SONARR ───────────────────────────

  // /radarr/movie  inside radarr
  @Get('radarr/movie/api/v3/movie')
  public async getRadarrMovieList(@Req() req: any): Promise<any[]> {
    return this.listService.getRadarrMovieList(req.user.username);
  }

  // /radarr/anime  inside radarr
  @Get('radarr/anime/api/v3/movie')
  public async getRadarrAnimeMovieList(@Req() req: any): Promise<any[]> {
    return this.listService.getRadarrAnimeMovieList(req.user.username);
  }

  // /sonarr/tv  inside sonarr
  @Get('sonarr/tv/api/v3/series')
  public async getSonarrTvList(@Req() req: any): Promise<any[]> {
    return this.listService.fetchSonarrTv(req.user.username);
  }

  // /sonarr/anime  inside sonarr
  @Get('sonarr/anime/api/v3/series')
  public async getSonarrAnimeList(@Req() req: any): Promise<any[]> {
    return this.listService.fetchSonarrAnime(req.user.username);
  }

  @Get('*api/v3/qualityprofile')
  public getQualityProfiles(): any[] {
    return [
      {
        id: 1,
        name: 'Any',
      },
    ];
  }

  @Get('/export/rrlist')
  public async exportRrList(
    @Req() req: any,
    @Query() query: ExportRrListQueryDto,
  ): Promise<any> {
    const listTypes = query.types ? query.types.split(',') : [];
    return this.listService.exportRrList(req.user.username, listTypes);
  }

  @Get('/export/mal')
  public async exportMalXml(
    @Req() req: any,
    @Query() query: ExportMalQueryDto,
  ): Promise<string> {
    return this.listService.exportMalXml(req.user.username, query.type);
  }

  @Post('/import/rrlist')
  public async importRrList(
    @Req() req: any,
    @Body() body: any,
  ): Promise<{ success: boolean; message: string }> {
    return this.listService.startImport(req.user.username, body);
  }
}
