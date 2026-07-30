import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { parsePrivacy } from '../user/user.service';
import { $Enums } from '@runa/database';
import { MovieUpdateData, TvUpdateData } from '@runa/connections';
import { PrismaService } from '../../providers/database/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ListExternal } from './list.external';
import ListEntity from './list.entities';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { GameService } from '../game/game.service';
import { BookService } from '../book/book.service';
import { NotificationService } from '../notification/notification.service';
import { MediaStatsService } from './media-stats.service';
import {
  ListQueryDto,
  SaveAnimeEntryDto,
  SaveMangaEntryDto,
  SaveMovieEntryDto,
  SaveTvEntryDto,
  SaveGameEntryDto,
  SaveBookEntryDto,
} from './list.dto';

function toPrismaStatus(status: any): any {
  if (!status) return 'PLANNING';
  const s = String(status).toUpperCase().replace(/\s+/g, '_');
  if (s === 'PLAN_TO_WATCH' || s === 'PLAN_TO_READ' || s === 'PLAN_TO_PLAY') return 'PLANNING';
  return s;
}

function toDate(val?: number | Date | null): Date | undefined {
  if (val === undefined || val === null) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const ms = val < 10000000000 ? val * 1000 : val;
    return new Date(ms);
  }
  return undefined;
}

function escapeXml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatMalDate(date?: Date | null): string {
  if (!date) return '0000-00-00';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '0000-00-00';
  const year = String(d.getUTCFullYear()).padStart(4, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMalAnimeStatus(status: string): string {
  switch (status) {
    case 'WATCHING':
      return 'Watching';
    case 'COMPLETED':
      return 'Completed';
    case 'ON_HOLD':
      return 'On-Hold';
    case 'DROPPED':
      return 'Dropped';
    case 'PLANNING':
    default:
      return 'Plan to Watch';
  }
}

function toMalMangaStatus(status: string): string {
  switch (status) {
    case 'READING':
      return 'Reading';
    case 'COMPLETED':
      return 'Completed';
    case 'ON_HOLD':
      return 'On-Hold';
    case 'DROPPED':
      return 'Dropped';
    case 'PLANNING':
    default:
      return 'Plan to Read';
  }
}

@Injectable()
export class ListService {
  private readonly logger = new Logger(ListService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionsManager: ListExternal,
    private readonly statsService: StatsService,
    private readonly movieService: MovieService,
    private readonly tvService: TvService,
    private readonly animeService: AnimeService,
    private readonly mangaService: MangaService,
    private readonly gameService: GameService,
    private readonly bookService: BookService,
    private readonly notificationService: NotificationService,
    private readonly mediaStatsService: MediaStatsService,
  ) {}

  private async getUserId(username: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${username} not found`);
    }
    return user.id;
  }

  private getPrismaStatus<T>(
    status: string | undefined,
    enumObj: any,
  ): T | undefined {
    if (!status || status.toLowerCase() === 'all') return undefined;
    let normalized = status.toUpperCase().trim();
    if (normalized.endsWith('TV') && normalized.length > 2) {
      const charBeforeTV = normalized.charAt(normalized.length - 3);
      if (
        charBeforeTV === ' ' ||
        charBeforeTV === '\t' ||
        charBeforeTV === '\r' ||
        charBeforeTV === '\n'
      ) {
        normalized = normalized.slice(0, -2).trim();
      }
    }
    normalized = normalized.replace(/\s+/g, '_');
    if (Object.values(enumObj).includes(normalized)) {
      return normalized as unknown as T;
    }
    return undefined;
  }

  private async getStatusCounts(
    table: any,
    username: string,
  ): Promise<Record<string, number>> {
    const countGroups = await table.groupBy({
      by: ['status'],
      where: { username: username.toLowerCase() },
      _count: { status: true },
    });

    const counts: Record<string, number> = { all: 0 };
    let total = 0;
    for (const group of countGroups) {
      const statusKey = String(group.status).toLowerCase();
      counts[statusKey] = group._count.status;
      total += group._count.status;
    }
    counts['all'] = total;
    return counts;
  }

  private getAnimeOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { anime: { titlePrimary: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { progress: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getMangaOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { manga: { titlePrimary: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { chaptersProgress: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getMovieOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { movie: { titlePrimary: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getTvOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { tv: { titlePrimary: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getGameOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { game: { titlePrimary: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { progress: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getBookOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { book: { titlePrimary: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { progressChapters: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  // ─────────────────────────── ANIME ───────────────────────────

  public async getAnimeList(
    username: string,
    requester?: string,
    query?: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.animeList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.AnimeListStatus>(
      query?.status,
      $Enums.AnimeListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (format || search || genres || year || mediaStatus) {
      whereClause.anime = {};
      if (format) whereClause.anime.format = format;
      if (search) {
        whereClause.anime.OR = [
          { titlePrimary: { contains: search, mode: 'insensitive' } },
          { titleSecondary: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.anime.genres = { hasEvery: genreList };
      }
      if (year) whereClause.anime.startDateYear = Number(year);
      if (mediaStatus) whereClause.anime.status = mediaStatus;
    }

    const [paginated, counts] = await Promise.all([
      this.prisma.client.aquilaAnimeUserListV2.paginate({
        where: whereClause,
        take: query?.limit ?? 30,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy: this.getAnimeOrderBy(query?.sort),
        select: {
          id: true,
          animeId: true,
          status: true,
          progress: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          anime: {
            select: {
              titlePrimary: true,
              titleSecondary: true,
              titleNative: true,
              coverImage: true,
              episodeCount: true,
              format: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaAnimeUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => ({
      id: item.animeId,
      title:
        item.anime.titlePrimary ??
        item.anime.titleSecondary ??
        item.anime.titleNative ??
        '',
      score: item.score,
      progress: item.progress,
      episodes: item.anime.episodeCount,
      image: item.anime.coverImage ?? '',
      format: item.anime.format,
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'anime',
      mediaStatus: item.anime.status,
    }));

    return {
      entries: mappedList,
      counts,
      pageInfo: paginated.pageInfo,
    };
  }

  public async getAnimeListEntry(username: string, animeId: number): Promise<any> {
    const out = await this.prisma.client.aquilaAnimeUserListV2.findUnique({
      where: {
        username_animeId: {
          username: username.toLowerCase(),
          animeId,
        },
      },
    });

    if (!out) {
      throw new NotFoundException('Anime not found in list');
    }
    return out;
  }

  public async upsertAnimeList(
    username: string,
    body: SaveAnimeEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.animeList);

      const animeId = Number(body.animeId);

      const oldEntry = await this.prisma.client.aquilaAnimeUserListV2.findUnique({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });

      const status = body.status
        ? toPrismaStatus(body.status)
        : (oldEntry?.status ?? 'PLANNING');

      await this.prisma.client.aquilaAnimeUserListV2.upsert({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
        update: {
          status,
          progress: body.progress,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          animeId,
          status,
          progress: body.progress ?? 0,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          rewatched: body.rewatched ?? 0,
          connections: body.connections,
          private: isPrivate,
        },
      });

      if (body.updateConnection) {
        await this.updateConnections(
          username.toLowerCase(),
          body.animeId,
          body.connections || {},
          body.status,
          body.progress,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }

      const newEntry = await this.prisma.client.aquilaAnimeUserListV2.findUnique({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('anime', animeId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update anime list',
        error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'anime');

    return {
      success: true,
      message: 'Anime list updated successfully',
    };
  }

  public async deleteAnimeList(
    username: string,
    animeId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaAnimeUserListV2.findUnique({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });

      await this.prisma.client.aquilaAnimeUserListV2.delete({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('anime', animeId, entry, null);

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections as any)) {
          const conn = (entry.connections as any)[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteAnime(providerKey, username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete anime connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'anime');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete anime from list',
        error,
      };
    }
  }

  // ─────────────────────────── MANGA ───────────────────────────

  public async getMangaList(
    username: string,
    requester?: string,
    query?: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.mangaList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.MangaListStatus>(
      query?.status,
      $Enums.MangaListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (format || search || genres || year || mediaStatus) {
      whereClause.manga = {};
      if (format) whereClause.manga.format = format;
      if (search) {
        whereClause.manga.OR = [
          { titlePrimary: { contains: search, mode: 'insensitive' } },
          { titleSecondary: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.manga.genres = { hasEvery: genreList };
      }
      if (year) whereClause.manga.startDateYear = Number(year);
      if (mediaStatus) whereClause.manga.status = mediaStatus;
    }

    const [paginated, counts] = await Promise.all([
      this.prisma.client.aquilaMangaUserListV2.paginate({
        where: whereClause,
        take: query?.limit ?? 30,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy: this.getMangaOrderBy(query?.sort),
        select: {
          id: true,
          mangaId: true,
          status: true,
          chaptersProgress: true,
          volumesProgress: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          manga: {
            select: {
              titlePrimary: true,
              titleSecondary: true,
              titleNative: true,
              coverImage: true,
              chapterCount: true,
              format: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaMangaUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => ({
      id: item.mangaId,
      title:
        item.manga.titlePrimary ??
        item.manga.titleSecondary ??
        item.manga.titleNative ??
        '',
      score: item.score,
      progress: item.chaptersProgress,
      episodes: item.manga.chapterCount,
      image: item.manga.coverImage ?? '',
      format: item.manga.format,
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'manga',
      mediaStatus: item.manga.status,
    }));

    return {
      entries: mappedList,
      counts,
      pageInfo: paginated.pageInfo,
    };
  }

  public async getMangaListEntry(username: string, mangaId: number): Promise<any> {
    const out = await this.prisma.client.aquilaMangaUserListV2.findUnique({
      where: {
        username_mangaId: {
          username: username.toLowerCase(),
          mangaId,
        },
      },
    });

    if (!out) {
      throw new NotFoundException('Manga not found in list');
    }
    return out;
  }

  public async upsertMangaList(
    username: string,
    body: SaveMangaEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.mangaList);

      const mangaId = Number(body.mangaId);

      const oldEntry = await this.prisma.client.aquilaMangaUserListV2.findUnique({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });

      const status = body.status
        ? toPrismaStatus(body.status)
        : (oldEntry?.status ?? 'PLANNING');

      await this.prisma.client.aquilaMangaUserListV2.upsert({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
        update: {
          status,
          chaptersProgress: body.chapters,
          volumesProgress: body.volumes,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          reread: body.reread,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          mangaId,
          status,
          chaptersProgress: body.chapters ?? 0,
          volumesProgress: body.volumes ?? 0,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          reread: body.reread ?? 0,
          connections: body.connections,
          private: isPrivate,
        },
      });

      const newEntry = await this.prisma.client.aquilaMangaUserListV2.findUnique({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('manga', mangaId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update manga list',
        error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'manga');

    return {
      success: true,
      message: 'Manga list updated successfully',
    };
  }

  public async deleteMangaList(
    username: string,
    mangaId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaMangaUserListV2.findUnique({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });

      await this.prisma.client.aquilaMangaUserListV2.delete({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('manga', mangaId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'manga');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete manga from list',
        error,
      };
    }
  }

  // ─────────────────────────── MOVIE ───────────────────────────

  public async getMovieList(
    username: string,
    requester?: string,
    query?: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.movieList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.MovieListStatus>(
      query?.status,
      $Enums.MovieListStatus,
    );
    const search = query?.search?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || genres || year || mediaStatus) {
      whereClause.movie = {};
      if (search) {
        whereClause.movie.OR = [
          { titlePrimary: { contains: search, mode: 'insensitive' } },
          { titleSecondary: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.movie.genres = { hasEvery: genreList };
      }
      if (year) whereClause.movie.releaseDateYear = Number(year);
      if (mediaStatus) whereClause.movie.status = mediaStatus;
    }

    const [paginated, counts] = await Promise.all([
      this.prisma.client.aquilaMovieUserListV2.paginate({
        where: whereClause,
        take: query?.limit ?? 30,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy: this.getMovieOrderBy(query?.sort),
        select: {
          id: true,
          movieId: true,
          status: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          movie: {
            select: {
              titlePrimary: true,
              titleSecondary: true,
              titleNative: true,
              coverImage: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaMovieUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => ({
      id: item.movieId,
      title:
        item.movie.titlePrimary ??
        item.movie.titleSecondary ??
        item.movie.titleNative ??
        '',
      score: item.score,
      progress: null,
      episodes: null,
      image: item.movie.coverImage ?? '',
      format: 'MOVIE',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'movie',
      mediaStatus: item.movie.status,
    }));

    return {
      entries: mappedList,
      counts,
      pageInfo: paginated.pageInfo,
    };
  }

  public async getMovieListEntry(username: string, movieId: number): Promise<any> {
    const out = await this.prisma.client.aquilaMovieUserListV2.findUnique({
      where: {
        username_movieId: {
          username: username.toLowerCase(),
          movieId,
        },
      },
    });

    if (!out) {
      throw new NotFoundException('Movie not found in list');
    }
    return out;
  }

  public async upsertMovieList(
    username: string,
    body: SaveMovieEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.movieList);

      const movieId = Number(body.movieId);
      const status = toPrismaStatus(body.status);

      const oldEntry = await this.prisma.client.aquilaMovieUserListV2.findUnique({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
      });

      await this.prisma.client.aquilaMovieUserListV2.upsert({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
        update: {
          status,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          movieId,
          status,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          rewatched: body.rewatched ?? 0,
          connections: body.connections,
          private: isPrivate,
        },
      });

      const newEntry = await this.prisma.client.aquilaMovieUserListV2.findUnique({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('movie', movieId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update movie list',
        error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'movie');

    return {
      success: true,
      message: 'Movie list updated successfully',
    };
  }

  public async deleteMovieList(
    username: string,
    movieId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaMovieUserListV2.findUnique({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
      });

      await this.prisma.client.aquilaMovieUserListV2.delete({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('movie', movieId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'movie');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete movie from list',
        error,
      };
    }
  }

  // ─────────────────────────── TV ───────────────────────────

  public async getTvList(
    username: string,
    requester?: string,
    query?: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.tvList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.TvListStatus>(
      query?.status,
      $Enums.TvListStatus,
    );
    const search = query?.search?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || genres || year || mediaStatus) {
      whereClause.tv = {};
      if (search) {
        whereClause.tv.OR = [
          { titlePrimary: { contains: search, mode: 'insensitive' } },
          { titleSecondary: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.tv.genres = { hasEvery: genreList };
      }
      if (year) whereClause.tv.firstAiredYear = Number(year);
      if (mediaStatus) whereClause.tv.status = mediaStatus;
    }

    const [paginated, counts] = await Promise.all([
      this.prisma.client.aquilaTvUserListV2.paginate({
        where: whereClause,
        take: query?.limit ?? 30,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy: this.getTvOrderBy(query?.sort),
        select: {
          id: true,
          tvId: true,
          status: true,
          progress: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          tv: {
            select: {
              titlePrimary: true,
              titleSecondary: true,
              titleNative: true,
              coverImage: true,
              episodeCount: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaTvUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => ({
      id: item.tvId,
      title:
        item.tv.titlePrimary ??
        item.tv.titleSecondary ??
        item.tv.titleNative ??
        '',
      score: item.score,
      progress: item.progress,
      episodes: item.tv.episodeCount,
      image: item.tv.coverImage ?? '',
      format: 'TV',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'tv',
      mediaStatus: item.tv.status,
    }));

    return {
      entries: mappedList,
      counts,
      pageInfo: paginated.pageInfo,
    };
  }

  public async getTvListEntry(username: string, tvId: number): Promise<any> {
    const out = await this.prisma.client.aquilaTvUserListV2.findUnique({
      where: {
        username_tvId: {
          username: username.toLowerCase(),
          tvId,
        },
      },
      include: {
        watchedEpisodes: true,
      },
    });

    if (!out) {
      throw new NotFoundException('TV show not found in list');
    }
    return out;
  }

  public async upsertTvList(
    username: string,
    body: SaveTvEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.tvList);

      const tvId = Number(body.tvId);
      const status = toPrismaStatus(body.status);

      const oldEntry = await this.prisma.client.aquilaTvUserListV2.findUnique({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
      });

      const listEntry = await this.prisma.client.aquilaTvUserListV2.upsert({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
        update: {
          status,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          tvId,
          status,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          rewatched: body.rewatched ?? 0,
          connections: body.connections,
          private: isPrivate,
        },
      });

      if (body.episodes && Array.isArray(body.episodes)) {
        await this.prisma.client.aquilaTvWatchedEpisodeV2.deleteMany({
          where: { listId: listEntry.id },
        });

        if (body.episodes.length > 0) {
          await this.prisma.client.aquilaTvWatchedEpisodeV2.createMany({
            data: body.episodes.map((ep) => ({
              listId: listEntry.id,
              seasonNum: ep.seasonNum,
              episodeNum: ep.episodeNum,
            })),
          });
        }

        await this.prisma.client.aquilaTvUserListV2.update({
          where: { id: listEntry.id },
          data: { progress: body.episodes.length },
        });
      }

      const newEntry = await this.prisma.client.aquilaTvUserListV2.findUnique({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('tv', tvId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update TV list',
        error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'tv');

    return {
      success: true,
      message: 'TV list updated successfully',
    };
  }

  public async deleteTvList(
    username: string,
    tvId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaTvUserListV2.findUnique({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
      });

      await this.prisma.client.aquilaTvUserListV2.delete({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('tv', tvId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'tv');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete TV show from list',
        error,
      };
    }
  }

  // ─────────────────────────── GAME ───────────────────────────

  public async getGameList(
    username: string,
    requester?: string,
    query?: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || (privacy as any).gameList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.GameListStatus>(
      query?.status,
      $Enums.GameListStatus,
    );
    const search = query?.search?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || genres || year || mediaStatus) {
      whereClause.game = {};
      if (search) {
        whereClause.game.OR = [
          { titlePrimary: { contains: search, mode: 'insensitive' } },
          { titleSecondary: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.game.genres = { hasEvery: genreList };
      }
      if (year) whereClause.game.releaseDateYear = Number(year);
      if (mediaStatus) whereClause.game.status = mediaStatus;
    }

    const [paginated, counts] = await Promise.all([
      this.prisma.client.aquilaGameUserListV2.paginate({
        where: whereClause,
        take: query?.limit ?? 30,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy: this.getGameOrderBy(query?.sort),
        select: {
          id: true,
          gameId: true,
          status: true,
          progress: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          game: {
            select: {
              titlePrimary: true,
              titleSecondary: true,
              titleNative: true,
              coverImage: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaGameUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => ({
      id: item.gameId,
      title:
        item.game.titlePrimary ??
        item.game.titleSecondary ??
        item.game.titleNative ??
        '',
      score: item.score,
      progress: item.progress,
      episodes: null,
      image: item.game.coverImage ?? '',
      format: 'GAME',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'game',
      mediaStatus: item.game.status,
    }));

    return {
      entries: mappedList,
      counts,
      pageInfo: paginated.pageInfo,
    };
  }

  public async getGameListEntry(username: string, gameId: number): Promise<any> {
    const out = await this.prisma.client.aquilaGameUserListV2.findUnique({
      where: {
        username_gameId: {
          username: username.toLowerCase(),
          gameId,
        },
      },
    });

    if (!out) {
      throw new NotFoundException('Game not found in list');
    }
    return out;
  }

  public async upsertGameList(
    username: string,
    body: SaveGameEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || (privacy as any).gameList);

      const gameId = Number(body.gameId);

      const oldEntry = await this.prisma.client.aquilaGameUserListV2.findUnique({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });

      const status = body.status
        ? toPrismaStatus(body.status)
        : (oldEntry?.status ?? 'PLANNING');

      await this.prisma.client.aquilaGameUserListV2.upsert({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
        update: {
          status,
          progress: body.progress,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
        },
        create: {
          username: username.toLowerCase(),
          gameId,
          status,
          progress: body.progress ?? 0,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          private: isPrivate,
        },
      });

      const newEntry = await this.prisma.client.aquilaGameUserListV2.findUnique({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('game', gameId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update game list',
        error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'game');

    return {
      success: true,
      message: 'Game list updated successfully',
    };
  }

  public async deleteGameList(
    username: string,
    gameId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaGameUserListV2.findUnique({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });

      await this.prisma.client.aquilaGameUserListV2.delete({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('game', gameId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'game');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete game from list',
        error,
      };
    }
  }

  // ─────────────────────────── BOOK ───────────────────────────

  public async getBookList(
    username: string,
    requester?: string,
    query?: ListQueryDto,
  ): Promise<{
    entries: ListEntity[];
    counts: Record<string, number>;
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || (privacy as any).bookList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.BookListStatus>(
      query?.status,
      $Enums.BookListStatus,
    );
    const search = query?.search?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || genres || year || mediaStatus) {
      whereClause.book = {};
      if (search) {
        whereClause.book.OR = [
          { titlePrimary: { contains: search, mode: 'insensitive' } },
          { titleSecondary: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.book.genres = { hasEvery: genreList };
      }
      if (year) whereClause.book.releaseDateYear = Number(year);
      if (mediaStatus) whereClause.book.status = mediaStatus;
    }

    const [paginated, counts] = await Promise.all([
      this.prisma.client.aquilaBookUserListV2.paginate({
        where: whereClause,
        take: query?.limit ?? 30,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy: this.getBookOrderBy(query?.sort),
        select: {
          id: true,
          bookId: true,
          status: true,
          progressPages: true,
          progressChapters: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          book: {
            select: {
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              chapterCount: true,
              format: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaBookUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => ({
      id: item.bookId,
      title: item.book.titlePrimary ?? item.book.titleSecondary ?? '',
      score: item.score,
      progress: item.progressChapters ?? item.progressPages ?? 0,
      episodes: item.book.chapterCount,
      image: item.book.coverImage ?? '',
      format: item.book.format ?? 'BOOK',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'book',
      mediaStatus: item.book.status,
    }));

    return {
      entries: mappedList,
      counts,
      pageInfo: paginated.pageInfo,
    };
  }

  public async getBookListEntry(username: string, bookId: number): Promise<any> {
    const out = await this.prisma.client.aquilaBookUserListV2.findUnique({
      where: {
        username_bookId: {
          username: username.toLowerCase(),
          bookId,
        },
      },
    });

    if (!out) {
      throw new NotFoundException('Book not found in list');
    }
    return out;
  }

  public async upsertBookList(
    username: string,
    body: SaveBookEntryDto,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || (privacy as any).bookList);

      const bookId = Number(body.bookId);

      const oldEntry = await this.prisma.client.aquilaBookUserListV2.findUnique({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId,
          },
        },
      });

      const status = body.status
        ? toPrismaStatus(body.status)
        : (oldEntry?.status ?? 'PLANNING');

      await this.prisma.client.aquilaBookUserListV2.upsert({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId,
          },
        },
        update: {
          status,
          progressChapters: body.chapters,
          progressVolumes: body.volumes,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
        },
        create: {
          username: username.toLowerCase(),
          bookId,
          status,
          progressChapters: body.chapters ?? 0,
          progressVolumes: body.volumes ?? 0,
          score: body.score,
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          notes: body.notes,
          private: isPrivate,
        },
      });

      const newEntry = await this.prisma.client.aquilaBookUserListV2.findUnique({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('book', bookId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update book list',
        error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'book');

    return {
      success: true,
      message: 'Book list updated successfully',
    };
  }

  public async deleteBookList(
    username: string,
    bookId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaBookUserListV2.findUnique({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId,
          },
        },
      });

      await this.prisma.client.aquilaBookUserListV2.delete({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('book', bookId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'book');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete book from list',
        error,
      };
    }
  }

  // ─────────────────────────── WATCHING / PROGRESS ───────────────────────────

  public async getWatchingList(username: string): Promise<ListEntity[]> {
    const animeWatching = await this.prisma.client.aquilaAnimeUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.AnimeListStatus.WATCHING,
      },
      include: { anime: true },
    });

    const mangaReading = await this.prisma.client.aquilaMangaUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.MangaListStatus.READING,
      },
      include: { manga: true },
    });

    const tvWatching = await this.prisma.client.aquilaTvUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.TvListStatus.WATCHING,
      },
      include: { tv: true, watchedEpisodes: true },
    });

    const moviesWatching = await this.prisma.client.aquilaMovieUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.MovieListStatus.WATCHING,
      },
      include: { movie: true },
    });

    const gamesPlaying = await this.prisma.client.aquilaGameUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.GameListStatus.PLAYING,
      },
      include: { game: true },
    });

    const booksReading = await this.prisma.client.aquilaBookUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.BookListStatus.READING,
      },
      include: { book: true },
    });

    const watchingList: ListEntity[] = [];

    animeWatching.forEach((item: any) => {
      watchingList.push({
        id: item.animeId,
        title: item.anime?.titlePrimary ?? item.anime?.titleSecondary ?? item.anime?.titleNative ?? '',
        score: item.score,
        progress: item.progress,
        episodes: item.anime?.episodeCount ?? null,
        image: item.anime?.coverImage ?? '',
        format: item.anime?.format ?? 'ANIME',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'anime',
      });
    });

    mangaReading.forEach((item: any) => {
      watchingList.push({
        id: item.mangaId,
        title: item.manga?.titlePrimary ?? item.manga?.titleSecondary ?? item.manga?.titleNative ?? '',
        score: item.score,
        progress: item.chaptersProgress ?? 0,
        episodes: item.manga?.chapterCount ?? null,
        image: item.manga?.coverImage ?? '',
        format: item.manga?.format ?? 'MANGA',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'manga',
      });
    });

    tvWatching.forEach((item: any) => {
      watchingList.push({
        id: item.tvId,
        title: item.tv?.titlePrimary ?? item.tv?.titleSecondary ?? item.tv?.titleNative ?? '',
        score: item.score,
        progress: item.progress ?? 0,
        episodes: item.tv?.episodeCount ?? null,
        image: item.tv?.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
      });
    });

    moviesWatching.forEach((item: any) => {
      watchingList.push({
        id: item.movieId,
        title: item.movie?.titlePrimary ?? item.movie?.titleSecondary ?? item.movie?.titleNative ?? '',
        score: item.score,
        progress: item.progress ?? 0,
        episodes: null,
        image: item.movie?.coverImage ?? '',
        format: 'MOVIE',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'movie',
      });
    });

    gamesPlaying.forEach((item: any) => {
      watchingList.push({
        id: item.gameId,
        title: item.game?.titlePrimary ?? item.game?.titleSecondary ?? item.game?.titleNative ?? '',
        score: item.score,
        progress: item.progress ?? 0,
        episodes: null,
        image: item.game?.coverImage ?? '',
        format: 'GAME',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'game',
      });
    });

    booksReading.forEach((item: any) => {
      watchingList.push({
        id: item.bookId,
        title: item.book?.titlePrimary ?? item.book?.titleSecondary ?? '',
        score: item.score,
        progress: item.progressChapters ?? item.progressPages ?? 0,
        episodes: item.book?.chapterCount ?? null,
        image: item.book?.coverImage ?? '',
        format: item.book?.format ?? 'BOOK',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'book',
      });
    });

    return watchingList;
  }

  public async incrementProgress(
    username: string,
    mediaType: 'anime' | 'manga' | 'tv' | 'movie' | 'game' | 'book',
    id: number,
    count = 1,
  ): Promise<any> {
    const mediaId = Number(id);
    switch (mediaType) {
      case 'anime': {
        const entry = await this.prisma.client.aquilaAnimeUserListV2.findUnique({
          where: { username_animeId: { username: username.toLowerCase(), animeId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertAnimeList(username, {
          animeId: mediaId,
          status: entry.status as any,
          progress: entry.progress + count,
        });
      }
      case 'manga': {
        const entry = await this.prisma.client.aquilaMangaUserListV2.findUnique({
          where: { username_mangaId: { username: username.toLowerCase(), mangaId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertMangaList(username, {
          mangaId: mediaId,
          status: entry.status as any,
          chapters: entry.chaptersProgress + count,
        });
      }
      case 'tv': {
        const entry = await this.prisma.client.aquilaTvUserListV2.findUnique({
          where: { username_tvId: { username: username.toLowerCase(), tvId: mediaId } },
          include: { watchedEpisodes: { select: { seasonNum: true, episodeNum: true } } },
        });
        if (!entry) throw new NotFoundException('Entry not found');

        // Fetch all episodes ordered by season then episode number
        const allEpisodes = await this.prisma.client.aquilaTvEpisodeV2.findMany({
          where: { tvId: mediaId },
          orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          select: { seasonNumber: true, episodeNumber: true },
        });

        if (allEpisodes.length === 0) {
          return { success: false, message: 'No episodes found for this show' };
        }

        // Build set of already-watched episodes
        const watchedSet = new Set(
          entry.watchedEpisodes.map((w) => `${w.seasonNum}-${w.episodeNum}`),
        );

        // Add the next `count` unwatched episodes
        let marked = 0;
        for (const ep of allEpisodes) {
          if (marked >= count) break;
          const key = `${ep.seasonNumber}-${ep.episodeNumber}`;
          if (!watchedSet.has(key)) {
            watchedSet.add(key);
            marked++;
          }
        }

        // Build the full updated episodes array and delegate to upsertTvList
        const updatedEpisodes = [...watchedSet].map((key) => {
          const [s, e] = key.split('-').map(Number);
          return { seasonNum: s, episodeNum: e };
        });

        return this.upsertTvList(username, {
          tvId: mediaId,
          status: entry.status as any,
          score: entry.score ?? undefined,
          rewatched: entry.rewatched ?? 0,
          episodes: updatedEpisodes,
        } as any);
      }
      case 'movie': {
        const entry = await this.prisma.client.aquilaMovieUserListV2.findUnique({
          where: { username_movieId: { username: username.toLowerCase(), movieId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertMovieList(username, { movieId: mediaId, status: entry.status });
      }
      case 'game': {
        const entry = await this.prisma.client.aquilaGameUserListV2.findUnique({
          where: { username_gameId: { username: username.toLowerCase(), gameId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertGameList(username, {
          gameId: mediaId,
          status: entry.status as any,
          progress: (entry.progress ?? 0) + count,
        });
      }
      case 'book': {
        const entry = await this.prisma.client.aquilaBookUserListV2.findUnique({
          where: { username_bookId: { username: username.toLowerCase(), bookId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertBookList(username, {
          bookId: mediaId,
          status: entry.status as any,
          chapters: (entry.progressChapters ?? 0) + count,
        });
      }
    }
  }

  public async toggleEpisodeWatched(
    username: string,
    tvId: number,
    seasonNum: number,
    episodeNum: number,
  ): Promise<any> {
    let listEntry = await this.prisma.client.aquilaTvUserListV2.findUnique({
      where: { username_tvId: { username: username.toLowerCase(), tvId } },
    });

    if (!listEntry) {
      listEntry = await this.prisma.client.aquilaTvUserListV2.create({
        data: {
          username: username.toLowerCase(),
          tvId,
          status: $Enums.TvListStatus.WATCHING,
        },
      });
    }

    const existing = await this.prisma.client.aquilaTvWatchedEpisodeV2.findUnique({
      where: {
        listId_seasonNum_episodeNum: {
          listId: listEntry.id,
          seasonNum,
          episodeNum,
        },
      },
    });

    if (existing) {
      await this.prisma.client.aquilaTvWatchedEpisodeV2.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.client.aquilaTvWatchedEpisodeV2.create({
        data: {
          listId: listEntry.id,
          seasonNum,
          episodeNum,
        },
      });
    }

    const count = await this.prisma.client.aquilaTvWatchedEpisodeV2.count({
      where: { listId: listEntry.id },
    });

    await this.prisma.client.aquilaTvUserListV2.update({
      where: { id: listEntry.id },
      data: { progress: count },
    });

    return { success: true, watched: !existing, count };
  }

  public async toggleSeasonWatched(
    username: string,
    tvId: number,
    seasonNum: number,
    episodes: any[],
    watched: boolean,
  ): Promise<any> {
    let listEntry = await this.prisma.client.aquilaTvUserListV2.findUnique({
      where: { username_tvId: { username: username.toLowerCase(), tvId } },
    });

    if (!listEntry) {
      listEntry = await this.prisma.client.aquilaTvUserListV2.create({
        data: {
          username: username.toLowerCase(),
          tvId,
          status: $Enums.TvListStatus.WATCHING,
        },
      });
    }

    if (watched) {
      for (const ep of episodes) {
        await this.prisma.client.aquilaTvWatchedEpisodeV2.upsert({
          where: {
            listId_seasonNum_episodeNum: {
              listId: listEntry.id,
              seasonNum,
              episodeNum: ep.episodeNum,
            },
          },
          update: {},
          create: {
            listId: listEntry.id,
            seasonNum,
            episodeNum: ep.episodeNum,
          },
        });
      }
    } else {
      await this.prisma.client.aquilaTvWatchedEpisodeV2.deleteMany({
        where: {
          listId: listEntry.id,
          seasonNum,
        },
      });
    }

    const count = await this.prisma.client.aquilaTvWatchedEpisodeV2.count({
      where: { listId: listEntry.id },
    });

    await this.prisma.client.aquilaTvUserListV2.update({
      where: { id: listEntry.id },
      data: { progress: count },
    });

    return { success: true, count };
  }

  public async getUserListFilters(username: string, mediaType: string): Promise<any> {
    const type = mediaType.toLowerCase();
    let items: any[] = [];
    if (type === 'anime') {
      items = await this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { anime: { select: { genres: true, format: true, startDateYear: true } } },
      });
    } else if (type === 'manga') {
      items = await this.prisma.client.aquilaMangaUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { manga: { select: { genres: true, format: true, startDateYear: true } } },
      });
    } else if (type === 'movie') {
      items = await this.prisma.client.aquilaMovieUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { movie: { select: { genres: true, releaseDateYear: true } } },
      });
    } else if (type === 'tv') {
      items = await this.prisma.client.aquilaTvUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { tv: { select: { genres: true, firstAiredYear: true } } },
      });
    } else if (type === 'game') {
      items = await this.prisma.client.aquilaGameUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { game: { select: { genres: true, releaseDateYear: true } } },
      });
    } else if (type === 'book') {
      items = await this.prisma.client.aquilaBookUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { book: { select: { genres: true, releaseDateYear: true } } },
      });
    }

    const genresSet = new Set<string>();
    const formatsSet = new Set<string>();
    const yearsSet = new Set<number>();

    items.forEach((item: any) => {
      const media = item.anime || item.manga || item.movie || item.tv || item.game || item.book;
      if (!media) return;
      if (media.genres && Array.isArray(media.genres)) {
        media.genres.forEach((g: string) => genresSet.add(g));
      }
      if (media.format) formatsSet.add(media.format);
      const year = media.startDateYear ?? media.releaseDateYear ?? media.firstAiredYear;
      if (year) yearsSet.add(year);
    });

    return {
      genres: Array.from(genresSet).sort(),
      formats: Array.from(formatsSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => b - a),
    };
  }

  public async getMediaSequels(
    username: string,
    mediaType: string,
    requester?: string,
    options?: {
      relationType?: string;
      releaseStatus?: string;
      includeInList?: boolean;
      search?: string;
      limit?: number;
      cursor?: string;
    },
  ): Promise<any> {
    return { sequels: [] };
  }

  // ─────────────────────────── RADARR/SONARR/EXPORT/IMPORT ───────────────────────────

  public async getRadarrMovieList(username: string): Promise<any[]> {
    const list = await this.prisma.client.aquilaMovieUserListV2.findMany({
      where: { username: username.toLowerCase() },
      include: { movie: true },
    });
    return list.map((item: any) => ({
      title: item.movie.titlePrimary,
      tmdbId: item.movie.tvDBId ?? item.movieId,
      hasFile: item.status === 'COMPLETED',
      monitored: true,
    }));
  }

  public async fetchSonarrSeries(
    username: string,
    includeTv = true,
    includeAnime = false,
  ): Promise<any[]> {
    const series: any[] = [];
    if (includeTv) {
      const tvList = await this.prisma.client.aquilaTvUserListV2.findMany({
        where: { username: username.toLowerCase() },
        include: { tv: true },
      });
      tvList.forEach((item: any) => {
        series.push({
          title: item.tv.titlePrimary,
          tvdbId: item.tv.tvDBId ?? item.tvId,
          monitored: true,
        });
      });
    }
    if (includeAnime) {
      const animeList = await this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { username: username.toLowerCase() },
        include: { anime: true },
      });
      animeList.forEach((item: any) => {
        series.push({
          title: item.anime.titlePrimary,
          tvdbId: item.anime.tvDBId ?? item.animeId,
          monitored: true,
        });
      });
    }
    return series;
  }

  public async exportRrList(username: string, types: string[]): Promise<any> {
    const exportData: Record<string, any> = {};
    if (types.length === 0 || types.includes('anime')) {
      exportData.anime = await this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { username: username.toLowerCase() },
      });
    }
    if (types.length === 0 || types.includes('manga')) {
      exportData.manga = await this.prisma.client.aquilaMangaUserListV2.findMany({
        where: { username: username.toLowerCase() },
      });
    }
    if (types.length === 0 || types.includes('movie')) {
      exportData.movie = await this.prisma.client.aquilaMovieUserListV2.findMany({
        where: { username: username.toLowerCase() },
      });
    }
    if (types.length === 0 || types.includes('tv')) {
      exportData.tv = await this.prisma.client.aquilaTvUserListV2.findMany({
        where: { username: username.toLowerCase() },
        include: { watchedEpisodes: true },
      });
    }
    if (types.length === 0 || types.includes('game')) {
      exportData.game = await this.prisma.client.aquilaGameUserListV2.findMany({
        where: { username: username.toLowerCase() },
      });
    }
    if (types.length === 0 || types.includes('book')) {
      exportData.book = await this.prisma.client.aquilaBookUserListV2.findMany({
        where: { username: username.toLowerCase() },
      });
    }
    return exportData;
  }

  public async exportMalXml(username: string, type: 'anime' | 'manga'): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException(`User ${username} not found`);
    }

    if (type === 'manga') {
      const list = await this.prisma.client.aquilaMangaUserListV2.findMany({
        where: { username: username.toLowerCase() },
        include: { manga: true },
      });

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<myanimelist>\n`;
      xml += `  <myinfo>\n`;
      xml += `    <user_name>${escapeXml(username)}</user_name>\n`;
      xml += `    <user_export_type>2</user_export_type>\n`;
      xml += `  </myinfo>\n`;

      for (const item of list) {
        let malId = item.mangaId;
        if (item.connections && typeof item.connections === 'object') {
          const malConn = (item.connections as any).mal;
          if (malConn) {
            const parsed = typeof malConn === 'object' ? Number(malConn.id) : Number(malConn);
            if (!isNaN(parsed) && parsed > 0) malId = parsed;
          }
        }

        const title = item.manga?.titlePrimary ?? item.manga?.titleSecondary ?? '';
        xml += `  <manga>\n`;
        xml += `    <manga_mangadb_id>${malId}</manga_mangadb_id>\n`;
        xml += `    <manga_title><![CDATA[${title}]]></manga_title>\n`;
        xml += `    <my_read_chapters>${item.chaptersProgress ?? 0}</my_read_chapters>\n`;
        xml += `    <my_read_volumes>${item.volumesProgress ?? 0}</my_read_volumes>\n`;
        xml += `    <my_score>${item.score ?? 0}</my_score>\n`;
        xml += `    <my_status>${toMalMangaStatus(item.status)}</my_status>\n`;
        xml += `    <my_start_date>${formatMalDate(item.startDate)}</my_start_date>\n`;
        xml += `    <my_finish_date>${formatMalDate(item.endDate)}</my_finish_date>\n`;
        xml += `    <my_comments><![CDATA[${item.notes ?? ''}]]></my_comments>\n`;
        xml += `  </manga>\n`;
      }

      xml += `</myanimelist>`;
      return xml;
    } else {
      const list = await this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { username: username.toLowerCase() },
        include: { anime: true },
      });

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<myanimelist>\n`;
      xml += `  <myinfo>\n`;
      xml += `    <user_name>${escapeXml(username)}</user_name>\n`;
      xml += `    <user_export_type>1</user_export_type>\n`;
      xml += `  </myinfo>\n`;

      for (const item of list) {
        let malId = item.animeId;
        if (item.connections && typeof item.connections === 'object') {
          const malConn = (item.connections as any).mal;
          if (malConn) {
            const parsed = typeof malConn === 'object' ? Number(malConn.id) : Number(malConn);
            if (!isNaN(parsed) && parsed > 0) malId = parsed;
          }
        }

        const title = item.anime?.titlePrimary ?? item.anime?.titleSecondary ?? '';
        xml += `  <anime>\n`;
        xml += `    <series_animedb_id>${malId}</series_animedb_id>\n`;
        xml += `    <series_title><![CDATA[${title}]]></series_title>\n`;
        xml += `    <my_watched_episodes>${item.progress ?? 0}</my_watched_episodes>\n`;
        xml += `    <my_score>${item.score ?? 0}</my_score>\n`;
        xml += `    <my_status>${toMalAnimeStatus(item.status)}</my_status>\n`;
        xml += `    <my_start_date>${formatMalDate(item.startDate)}</my_start_date>\n`;
        xml += `    <my_finish_date>${formatMalDate(item.endDate)}</my_finish_date>\n`;
        xml += `    <my_comments><![CDATA[${item.notes ?? ''}]]></my_comments>\n`;
        xml += `  </anime>\n`;
      }

      xml += `</myanimelist>`;
      return xml;
    }
  }

  public async startImport(
    username: string,
    body: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = await this.getUserId(username);
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid import data payload');
    }

    let importedCount = 0;

    if (Array.isArray(body.anime)) {
      for (const item of body.anime) {
        if (!item.animeId) continue;
        await this.prisma.client.aquilaAnimeUserListV2.upsert({
          where: {
            username_animeId: { username: username.toLowerCase(), animeId: Number(item.animeId) },
          },
          update: {
            status: toPrismaStatus(item.status),
            progress: Number(item.progress || 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            rewatched: Number(item.rewatched || 0),
            connections: item.connections || {},
          },
          create: {
            username: username.toLowerCase(),
            animeId: Number(item.animeId),
            status: toPrismaStatus(item.status),
            progress: Number(item.progress || 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            rewatched: Number(item.rewatched || 0),
            connections: item.connections || {},
          },
        });
        importedCount++;
      }
      void this.statsService.recalculate(userId, 'anime');
    }

    if (Array.isArray(body.manga)) {
      for (const item of body.manga) {
        if (!item.mangaId) continue;
        await this.prisma.client.aquilaMangaUserListV2.upsert({
          where: {
            username_mangaId: { username: username.toLowerCase(), mangaId: Number(item.mangaId) },
          },
          update: {
            status: toPrismaStatus(item.status),
            chaptersProgress: Number(item.chaptersProgress ?? item.chapters ?? 0),
            volumesProgress: Number(item.volumesProgress ?? item.volumes ?? 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            reread: Number(item.reread || 0),
            connections: item.connections || {},
          },
          create: {
            username: username.toLowerCase(),
            mangaId: Number(item.mangaId),
            status: toPrismaStatus(item.status),
            chaptersProgress: Number(item.chaptersProgress ?? item.chapters ?? 0),
            volumesProgress: Number(item.volumesProgress ?? item.volumes ?? 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            reread: Number(item.reread || 0),
            connections: item.connections || {},
          },
        });
        importedCount++;
      }
      void this.statsService.recalculate(userId, 'manga');
    }

    if (Array.isArray(body.movie)) {
      for (const item of body.movie) {
        if (!item.movieId) continue;
        await this.prisma.client.aquilaMovieUserListV2.upsert({
          where: {
            username_movieId: { username: username.toLowerCase(), movieId: Number(item.movieId) },
          },
          update: {
            status: toPrismaStatus(item.status),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            rewatched: Number(item.rewatched || 0),
            connections: item.connections || {},
          },
          create: {
            username: username.toLowerCase(),
            movieId: Number(item.movieId),
            status: toPrismaStatus(item.status),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            rewatched: Number(item.rewatched || 0),
            connections: item.connections || {},
          },
        });
        importedCount++;
      }
      void this.statsService.recalculate(userId, 'movie');
    }

    if (Array.isArray(body.tv)) {
      for (const item of body.tv) {
        if (!item.tvId) continue;
        const tvEntry = await this.prisma.client.aquilaTvUserListV2.upsert({
          where: {
            username_tvId: { username: username.toLowerCase(), tvId: Number(item.tvId) },
          },
          update: {
            status: toPrismaStatus(item.status),
            progress: Number(item.progress || 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            rewatched: Number(item.rewatched || 0),
            connections: item.connections || {},
          },
          create: {
            username: username.toLowerCase(),
            tvId: Number(item.tvId),
            status: toPrismaStatus(item.status),
            progress: Number(item.progress || 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
            rewatched: Number(item.rewatched || 0),
            connections: item.connections || {},
          },
        });

        if (Array.isArray(item.watchedEpisodes) && item.watchedEpisodes.length > 0) {
          await this.prisma.client.aquilaTvWatchedEpisodeV2.deleteMany({
            where: { listId: tvEntry.id },
          });
          await this.prisma.client.aquilaTvWatchedEpisodeV2.createMany({
            data: item.watchedEpisodes.map((ep: any) => ({
              listId: tvEntry.id,
              seasonNum: Number(ep.seasonNum),
              episodeNum: Number(ep.episodeNum),
            })),
          });
        }
        importedCount++;
      }
      void this.statsService.recalculate(userId, 'tv');
    }

    if (Array.isArray(body.game)) {
      for (const item of body.game) {
        if (!item.gameId) continue;
        await this.prisma.client.aquilaGameUserListV2.upsert({
          where: {
            username_gameId: { username: username.toLowerCase(), gameId: Number(item.gameId) },
          },
          update: {
            status: toPrismaStatus(item.status),
            progress: Number(item.progress || 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
          },
          create: {
            username: username.toLowerCase(),
            gameId: Number(item.gameId),
            status: toPrismaStatus(item.status),
            progress: Number(item.progress || 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
          },
        });
        importedCount++;
      }
      void this.statsService.recalculate(userId, 'game');
    }

    if (Array.isArray(body.book)) {
      for (const item of body.book) {
        if (!item.bookId) continue;
        await this.prisma.client.aquilaBookUserListV2.upsert({
          where: {
            username_bookId: { username: username.toLowerCase(), bookId: Number(item.bookId) },
          },
          update: {
            status: toPrismaStatus(item.status),
            progressChapters: Number(item.progressChapters ?? item.chapters ?? 0),
            progressVolumes: Number(item.progressVolumes ?? item.volumes ?? 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
          },
          create: {
            username: username.toLowerCase(),
            bookId: Number(item.bookId),
            status: toPrismaStatus(item.status),
            progressChapters: Number(item.progressChapters ?? item.chapters ?? 0),
            progressVolumes: Number(item.progressVolumes ?? item.volumes ?? 0),
            score: item.score != null ? Number(item.score) : null,
            startDate: toDate(item.startDate),
            endDate: toDate(item.endDate),
            notes: item.notes || null,
          },
        });
        importedCount++;
      }
      void this.statsService.recalculate(userId, 'book');
    }

    return {
      success: true,
      message: `Successfully imported ${importedCount} list entries`,
    };
  }

  private async updateConnections(
    username: string,
    animeId: number,
    connections: any,
    status?: string,
    progress?: number,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    rewatched?: number,
  ) {
    if (!connections || typeof connections !== 'object') return;

    for (const providerKey of Object.keys(connections)) {
      const conn = connections[providerKey];
      if (!conn) continue;

      let providerId: number;
      let connStatus = status;
      let connProgress = progress;
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connRewatched = rewatched;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
        if (conn.progressOffset !== undefined) {
          connProgress = (progress || 0) + Number(conn.progressOffset);
        } else if (conn.progress !== undefined) {
          connProgress = Number(conn.progress);
        }
        if (conn.score !== undefined) connScore = Number(conn.score);
        if (conn.startDate !== undefined) connStartDate = conn.startDate;
        if (conn.endDate !== undefined) connEndDate = conn.endDate;
        if (conn.notes !== undefined) connNotes = conn.notes;
        if (conn.rewatched !== undefined) connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      const updateData: any = {
        status: connStatus,
        progress: connProgress,
        score: connScore,
        startDate: connStartDate,
        endDate: connEndDate,
        notes: connNotes,
        rewatched: connRewatched,
      };

      await this.connectionsManager
        .syncAnime(providerKey, username, providerId, updateData)
        .catch((err) =>
          this.logger.error(
            `Failed to update connection for provider ${providerKey}`,
            err,
          ),
        );
    }
  }
}
