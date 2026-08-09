import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
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
import { AnimeQueueService } from '../anime/anime-queue.service';
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

// Runa List Service - updated connection lookup
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
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
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

  private async fetchOrderedMediaList(
    model: any,
    whereClause: any,
    statusOrder: string[],
    statusEnum: string | undefined,
    query: ListQueryDto | undefined,
    orderBy: any,
    select: any,
  ): Promise<{
    data: any[];
    pageInfo: { nextCursor: string | null; hasMore: boolean; count: number };
  }> {
    const limit = query?.limit ? Number(query.limit) : 30;
    const take = Math.min(Math.max(1, limit), 100);

    if (statusEnum) {
      return model.paginate({
        where: whereClause,
        take,
        cursor: query?.cursor ? (Number(query.cursor) as any) : undefined,
        cursorField: 'id',
        orderBy,
        select,
      });
    }

    let startIndex = 0;
    let startCursorId: number | null = null;

    if (query?.cursor) {
      const cursorStr = String(query.cursor);
      if (cursorStr.startsWith('s_')) {
        const parts = cursorStr.split('_');
        if (parts.length >= 3) {
          startIndex = parseInt(parts[1], 10) || 0;
          const parsedId = parseInt(parts[2], 10);
          startCursorId = isNaN(parsedId) || parsedId === 0 ? null : parsedId;
        }
      } else {
        const parsedId = parseInt(cursorStr, 10);
        if (!isNaN(parsedId)) {
          startCursorId = parsedId;
        }
      }
    }

    const collected: any[] = [];
    let currentStatusIndex = Math.min(
      Math.max(0, startIndex),
      statusOrder.length - 1,
    );
    let currentCursorId: number | null = startCursorId;
    let hasMore = false;
    let nextCursor: string | null = null;

    while (currentStatusIndex < statusOrder.length && collected.length < take) {
      const currentStatus = statusOrder[currentStatusIndex];
      const needed = take - collected.length;
      const remainingToFetch = needed + 1;

      const rows = await model.findMany({
        where: {
          ...whereClause,
          status: currentStatus,
        },
        take: remainingToFetch,
        ...(currentCursorId
          ? { cursor: { id: currentCursorId }, skip: 1 }
          : {}),
        orderBy,
        select,
      });

      if (rows.length === 0) {
        currentStatusIndex++;
        currentCursorId = null;
        continue;
      }

      if (rows.length > needed) {
        collected.push(...rows.slice(0, needed));
        hasMore = true;
        const lastItem = collected[collected.length - 1];
        nextCursor = `s_${currentStatusIndex}_${lastItem.id}`;
        break;
      }

      collected.push(...rows);
      currentStatusIndex++;
      currentCursorId = null;

      if (collected.length === take) {
        if (currentStatusIndex < statusOrder.length) {
          const nextItem = await model.findFirst({
            where: {
              ...whereClause,
              status: { in: statusOrder.slice(currentStatusIndex) },
            },
            select: { id: true, status: true },
          });
          if (nextItem) {
            hasMore = true;
            const nextStatusIdx = statusOrder.indexOf(nextItem.status);
            nextCursor = `s_${nextStatusIdx >= 0 ? nextStatusIdx : currentStatusIndex}_0`;
          }
        }
        break;
      }
    }

    return {
      data: collected,
      pageInfo: {
        count: collected.length,
        nextCursor: hasMore ? nextCursor : null,
        hasMore,
      },
    };
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
      this.fetchOrderedMediaList(
        this.prisma.client.aquilaAnimeUserListV2,
        whereClause,
        [
          $Enums.AnimeListStatus.WATCHING,
          $Enums.AnimeListStatus.ON_HOLD,
          $Enums.AnimeListStatus.COMPLETED,
          $Enums.AnimeListStatus.DROPPED,
          $Enums.AnimeListStatus.PLANNING,
        ],
        statusEnum,
        query,
        this.getAnimeOrderBy(query?.sort),
        {
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
      ),
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

      const connectionsToSync = body.connections || oldEntry?.connections || {};

      if (body.updateConnection || (connectionsToSync && Object.keys(connectionsToSync).length > 0)) {
        await this.updateConnections(
          username.toLowerCase(),
          body.animeId,
          connectionsToSync,
          status,
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
            typeof conn === 'object' ? Number(conn.id ?? conn.providerId) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteAnime(providerKey.toLowerCase(), username.toLowerCase(), providerId)
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
      this.fetchOrderedMediaList(
        this.prisma.client.aquilaMangaUserListV2,
        whereClause,
        [
          $Enums.MangaListStatus.READING,
          $Enums.MangaListStatus.ON_HOLD,
          $Enums.MangaListStatus.COMPLETED,
          $Enums.MangaListStatus.DROPPED,
          $Enums.MangaListStatus.PLANNING,
        ],
        statusEnum,
        query,
        this.getMangaOrderBy(query?.sort),
        {
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
      ),
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

      const connectionsToSync = body.connections || oldEntry?.connections || {};
      if (body.updateConnection || (connectionsToSync && Object.keys(connectionsToSync).length > 0)) {
        await this.updateMangaConnections(
          username.toLowerCase(),
          body.mangaId,
          connectionsToSync,
          status,
          body.chapters,
          body.volumes,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.reread,
        );
      }

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

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections as any)) {
          const conn = (entry.connections as any)[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id ?? conn.providerId) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteManga(providerKey.toLowerCase(), username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete manga connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

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
      this.fetchOrderedMediaList(
        this.prisma.client.aquilaMovieUserListV2,
        whereClause,
        [
          $Enums.MovieListStatus.WATCHING,
          $Enums.MovieListStatus.ON_HOLD,
          $Enums.MovieListStatus.COMPLETED,
          $Enums.MovieListStatus.DROPPED,
          $Enums.MovieListStatus.PLANNING,
        ],
        statusEnum,
        query,
        this.getMovieOrderBy(query?.sort),
        {
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
      ),
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

      const connectionsToSync = body.connections || oldEntry?.connections || {};
      if (body.updateConnection || (connectionsToSync && Object.keys(connectionsToSync).length > 0)) {
        await this.updateMovieConnections(
          username.toLowerCase(),
          body.movieId,
          connectionsToSync,
          status,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }

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

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections as any)) {
          const conn = (entry.connections as any)[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id ?? conn.providerId) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteMovie(providerKey.toLowerCase(), username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete movie connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

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
      this.fetchOrderedMediaList(
        this.prisma.client.aquilaTvUserListV2,
        whereClause,
        [
          $Enums.TvListStatus.WATCHING,
          $Enums.TvListStatus.ON_HOLD,
          $Enums.TvListStatus.COMPLETED,
          $Enums.TvListStatus.DROPPED,
          $Enums.TvListStatus.PLANNING,
        ],
        statusEnum,
        query,
        this.getTvOrderBy(query?.sort),
        {
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
          watchedEpisodes: {
            select: {
              seasonNum: true,
              episodeNum: true,
            },
          },
        },
      ),
      this.getStatusCounts(this.prisma.client.aquilaTvUserListV2, username),
    ]);

    const mappedList: ListEntity[] = paginated.data.map((item: any) => {
      const watched = Array.isArray(item.watchedEpisodes) ? item.watchedEpisodes : [];
      const watchedCount = watched.length;
      const progress = (item.progress && item.progress > 0) ? item.progress : watchedCount;

      let meta: { season: number; episode: number } | undefined = undefined;
      if (watched.length > 0) {
        const regular = watched.filter((w: any) => w.seasonNum > 0);
        const candidates = regular.length > 0 ? regular : watched;
        const sorted = [...candidates].sort((a, b) => {
          if (b.seasonNum !== a.seasonNum) return b.seasonNum - a.seasonNum;
          return b.episodeNum - a.episodeNum;
        });
        meta = { season: sorted[0].seasonNum, episode: sorted[0].episodeNum };
      }

      return {
        id: item.tvId,
        title:
          item.tv.titlePrimary ??
          item.tv.titleSecondary ??
          item.tv.titleNative ??
          '',
        score: item.score,
        progress,
        episodes: item.tv.episodeCount,
        image: item.tv.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
        mediaStatus: item.tv.status,
        ...(meta && { meta }),
      };
    });

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

      const watchedEps = await this.prisma.client.aquilaTvWatchedEpisodeV2.findMany({
        where: { listId: listEntry.id },
        select: { seasonNum: true, episodeNum: true },
      });
      void this.updateTvConnections(
        username.toLowerCase(),
        tvId,
        newEntry?.connections || body.connections,
        body.status,
        body.score,
        watchedEps,
        body.startDate,
        body.endDate,
        body.notes,
        body.rewatched,
      );
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

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections as any)) {
          const conn = (entry.connections as any)[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id ?? conn.providerId) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteTv(providerKey.toLowerCase(), username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete TV connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

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
      this.fetchOrderedMediaList(
        this.prisma.client.aquilaGameUserListV2,
        whereClause,
        [
          $Enums.GameListStatus.PLAYING,
          $Enums.GameListStatus.ON_HOLD,
          $Enums.GameListStatus.COMPLETED,
          $Enums.GameListStatus.DROPPED,
          $Enums.GameListStatus.PLANNING,
        ],
        statusEnum,
        query,
        this.getGameOrderBy(query?.sort),
        {
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
      ),
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
      this.fetchOrderedMediaList(
        this.prisma.client.aquilaBookUserListV2,
        whereClause,
        [
          $Enums.BookListStatus.READING,
          $Enums.BookListStatus.ON_HOLD,
          $Enums.BookListStatus.COMPLETED,
          $Enums.BookListStatus.DROPPED,
          $Enums.BookListStatus.PLANNING,
        ],
        statusEnum,
        query,
        this.getBookOrderBy(query?.sort),
        {
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
      ),
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
      orderBy: { updatedAt: 'desc' },
    });

    const mangaReading = await this.prisma.client.aquilaMangaUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.MangaListStatus.READING,
      },
      include: { manga: true },
      orderBy: { updatedAt: 'desc' },
    });

    const tvWatching = await this.prisma.client.aquilaTvUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.TvListStatus.WATCHING,
      },
      include: { tv: true, watchedEpisodes: true },
      orderBy: { updatedAt: 'desc' },
    });

    const moviesWatching = await this.prisma.client.aquilaMovieUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.MovieListStatus.WATCHING,
      },
      include: { movie: true },
      orderBy: { updatedAt: 'desc' },
    });

    const gamesPlaying = await this.prisma.client.aquilaGameUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.GameListStatus.PLAYING,
      },
      include: { game: true },
      orderBy: { updatedAt: 'desc' },
    });

    const booksReading = await this.prisma.client.aquilaBookUserListV2.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.BookListStatus.READING,
      },
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
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
      const watched = Array.isArray(item.watchedEpisodes) ? item.watchedEpisodes : [];
      const watchedCount = watched.length;
      const progress = (item.progress && item.progress > 0) ? item.progress : watchedCount;

      let meta: { season: number; episode: number } | undefined = undefined;
      if (watched.length > 0) {
        const regular = watched.filter((w: any) => w.seasonNum > 0);
        const candidates = regular.length > 0 ? regular : watched;
        const sorted = [...candidates].sort((a, b) => {
          if (b.seasonNum !== a.seasonNum) return b.seasonNum - a.seasonNum;
          return b.episodeNum - a.episodeNum;
        });
        meta = { season: sorted[0].seasonNum, episode: sorted[0].episodeNum };
      }

      watchingList.push({
        id: item.tvId,
        title: item.tv?.titlePrimary ?? item.tv?.titleSecondary ?? item.tv?.titleNative ?? '',
        score: item.score,
        progress,
        episodes: item.tv?.episodeCount ?? null,
        image: item.tv?.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
        ...(meta && { meta }),
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

    watchingList.sort((a, b) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return dateB - dateA;
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
          score: entry.score ?? undefined,
          progress: entry.progress + count,
          startDate: entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
          endDate: entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
          notes: entry.notes ?? undefined,
          rewatched: entry.rewatched ?? undefined,
          updateConnection: true,
          connections: entry.connections as any,
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
          score: entry.score ?? undefined,
          chapters: (entry.chaptersProgress ?? 0) + count,
          volumes: entry.volumesProgress ?? undefined,
          startDate: entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
          endDate: entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
          notes: entry.notes ?? undefined,
          reread: entry.reread ?? undefined,
          updateConnection: true,
          connections: entry.connections as any,
        });
      }
      case 'tv': {
        const entry = await this.prisma.client.aquilaTvUserListV2.findUnique({
          where: { username_tvId: { username: username.toLowerCase(), tvId: mediaId } },
          include: { watchedEpisodes: { select: { seasonNum: true, episodeNum: true } } },
        });
        if (!entry) throw new NotFoundException('Entry not found');

        // Fetch all non-special episodes (seasonNumber > 0) ordered by season then episode number
        let allEpisodes = await this.prisma.client.aquilaTvEpisodeV2.findMany({
          where: {
            tvId: mediaId,
            seasonNumber: { gt: 0 },
          },
          orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          select: { seasonNumber: true, episodeNumber: true },
        });

        // Fallback if no regular season episodes are found
        if (allEpisodes.length === 0) {
          allEpisodes = await this.prisma.client.aquilaTvEpisodeV2.findMany({
            where: { tvId: mediaId },
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
            select: { seasonNumber: true, episodeNumber: true },
          });
        }

        if (allEpisodes.length === 0) {
          const newProgress = (entry.progress || 0) + count;
          await this.prisma.client.aquilaTvUserListV2.update({
            where: {
              username_tvId: { username: username.toLowerCase(), tvId: mediaId },
            },
            data: { progress: newProgress },
          });
          void this.updateTvConnections(
            username.toLowerCase(),
            mediaId,
            entry.connections,
            entry.status,
            entry.score ?? undefined,
            [],
            entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
            entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
            entry.notes ?? undefined,
            entry.rewatched ?? 0,
          );
          return { success: true, count: newProgress };
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

        if (marked === 0) {
          const newProgress = (entry.progress || 0) + count;
          await this.prisma.client.aquilaTvUserListV2.update({
            where: {
              username_tvId: { username: username.toLowerCase(), tvId: mediaId },
            },
            data: { progress: newProgress },
          });
          void this.updateTvConnections(
            username.toLowerCase(),
            mediaId,
            entry.connections,
            entry.status,
            entry.score ?? undefined,
            entry.watchedEpisodes,
            entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
            entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
            entry.notes ?? undefined,
            entry.rewatched ?? 0,
          );
          return { success: true, count: newProgress };
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
          startDate: entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
          endDate: entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
          notes: entry.notes ?? undefined,
          episodes: updatedEpisodes,
          updateConnection: true,
          connections: entry.connections as any,
        } as any);
      }
      case 'movie': {
        const entry = await this.prisma.client.aquilaMovieUserListV2.findUnique({
          where: { username_movieId: { username: username.toLowerCase(), movieId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertMovieList(username, {
          movieId: mediaId,
          status: entry.status as any,
          score: entry.score ?? undefined,
          startDate: entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
          endDate: entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
          notes: entry.notes ?? undefined,
          rewatched: entry.rewatched ?? undefined,
          updateConnection: true,
          connections: entry.connections as any,
        });
      }
      case 'game': {
        const entry = await this.prisma.client.aquilaGameUserListV2.findUnique({
          where: { username_gameId: { username: username.toLowerCase(), gameId: mediaId } },
        });
        if (!entry) throw new NotFoundException('Entry not found');
        return this.upsertGameList(username, {
          gameId: mediaId,
          status: entry.status as any,
          score: entry.score ?? undefined,
          progress: (entry.progress ?? 0) + count,
          startDate: entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
          endDate: entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
          notes: entry.notes ?? undefined,
          updateConnection: true,
          connections: entry.connections as any,
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
          score: entry.score ?? undefined,
          chapters: (entry.progressChapters ?? 0) + count,
          volumes: entry.progressVolumes ?? undefined,
          startDate: entry.startDate ? Math.floor(entry.startDate.getTime() / 1000) : undefined,
          endDate: entry.endDate ? Math.floor(entry.endDate.getTime() / 1000) : undefined,
          notes: entry.notes ?? undefined,
          connections: entry.connections as any,
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

    const watchedEps = await this.prisma.client.aquilaTvWatchedEpisodeV2.findMany({
      where: { listId: listEntry.id },
      select: { seasonNum: true, episodeNum: true },
    });
    void this.updateTvConnections(
      username.toLowerCase(),
      tvId,
      listEntry.connections,
      listEntry.status,
      listEntry.score ?? undefined,
      watchedEps,
    );

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
      if (Array.isArray(episodes)) {
        const episodeNums = episodes
          .map((ep) => {
            const epNum =
              typeof ep === 'number'
                ? ep
                : typeof ep === 'object' && ep !== null
                  ? (ep.episodeNum ?? ep.number ?? ep.episode_number)
                  : undefined;
            return typeof epNum === 'number' && !isNaN(epNum) ? epNum : undefined;
          })
          .filter((epNum): epNum is number => epNum !== undefined);

        if (episodeNums.length > 0) {
          await this.prisma.client.aquilaTvWatchedEpisodeV2.createMany({
            data: episodeNums.map((episodeNum) => ({
              listId: listEntry.id,
              seasonNum,
              episodeNum,
            })),
            skipDuplicates: true,
          });
        }
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

    const watchedEps = await this.prisma.client.aquilaTvWatchedEpisodeV2.findMany({
      where: { listId: listEntry.id },
      select: { seasonNum: true, episodeNum: true },
    });
    void this.updateTvConnections(
      username.toLowerCase(),
      tvId,
      listEntry.connections,
      listEntry.status,
      listEntry.score ?? undefined,
      watchedEps,
    );

    return { success: true, count };
  }

  public async getUserListFilters(username: string, mediaType: string): Promise<any> {
    const type = mediaType.toLowerCase();
    let items: any[] = [];
    if (type === 'anime') {
      items = await this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { anime: { select: { genres: true, format: true, startDateYear: true, status: true } } },
      });
    } else if (type === 'manga') {
      items = await this.prisma.client.aquilaMangaUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { manga: { select: { genres: true, format: true, startDateYear: true, status: true } } },
      });
    } else if (type === 'movie') {
      items = await this.prisma.client.aquilaMovieUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { movie: { select: { genres: true, releaseDateYear: true, status: true } } },
      });
    } else if (type === 'tv') {
      items = await this.prisma.client.aquilaTvUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { tv: { select: { genres: true, firstAiredYear: true, status: true } } },
      });
    } else if (type === 'game') {
      items = await this.prisma.client.aquilaGameUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { game: { select: { genres: true, releaseDateYear: true, status: true } } },
      });
    } else if (type === 'book') {
      items = await this.prisma.client.aquilaBookUserListV2.findMany({
        where: { username: username.toLowerCase() },
        select: { book: { select: { genres: true, releaseDateYear: true, status: true } } },
      });
    }

    const genresSet = new Set<string>();
    const formatsSet = new Set<string>();
    const yearsSet = new Set<number>();
    const statusesSet = new Set<string>();

    items.forEach((item: any) => {
      const media = item.anime || item.manga || item.movie || item.tv || item.game || item.book;
      if (!media) return;
      if (media.genres && Array.isArray(media.genres)) {
        media.genres.forEach((g: string) => genresSet.add(g));
      }
      if (media.format) formatsSet.add(media.format);
      if (media.status) statusesSet.add(media.status);
      const year = media.startDateYear ?? media.releaseDateYear ?? media.firstAiredYear;
      if (year) yearsSet.add(year);
    });

    return {
      genres: Array.from(genresSet).sort(),
      formats: Array.from(formatsSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => b - a),
      statuses: Array.from(statusesSet).sort(),
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
    try {
      const cleanUsername = username.toLowerCase();
      const typeLower = mediaType.toLowerCase();
      const typeUpper = (
        typeLower === 'movie' ? 'MOVIE' : typeLower.toUpperCase()
      ) as $Enums.MediaType;

      const includeInList = options?.includeInList ?? false;
      const search = options?.search?.trim().toLowerCase();
      const limit = options?.limit ?? 50;

      // 1. Fetch user list items for the requested media type
      let userListEntries: any[] = [];
      if (typeLower === 'anime') {
        userListEntries = await this.prisma.client.aquilaAnimeUserListV2.findMany({
          where: { username: cleanUsername },
          include: { anime: true },
        });
      } else if (typeLower === 'manga') {
        userListEntries = await this.prisma.client.aquilaMangaUserListV2.findMany({
          where: { username: cleanUsername },
          include: { manga: true },
        });
      } else if (typeLower === 'tv') {
        userListEntries = await this.prisma.client.aquilaTvUserListV2.findMany({
          where: { username: cleanUsername },
          include: { tv: true },
        });
      } else if (typeLower === 'movie') {
        userListEntries = await this.prisma.client.aquilaMovieUserListV2.findMany({
          where: { username: cleanUsername },
          include: { movie: true },
        });
      } else if (typeLower === 'game') {
        userListEntries = await this.prisma.client.aquilaGameUserListV2.findMany({
          where: { username: cleanUsername },
          include: { game: true },
        });
      } else if (typeLower === 'book') {
        userListEntries = await this.prisma.client.aquilaBookUserListV2.findMany({
          where: { username: cleanUsername },
          include: { book: true },
        });
      }

      if (!userListEntries || userListEntries.length === 0) {
        return { items: [], sequels: [], totalCount: 0 };
      }

      // Map base media items & extract base media IDs
      const baseMediaMap = new Map<number, { id: number; title: string; coverImage?: string }>();
      const userMediaIds: number[] = [];

      for (const entry of userListEntries) {
        const media = entry.anime || entry.manga || entry.tv || entry.movie || entry.game || entry.book;
        if (media && media.id) {
          userMediaIds.push(media.id);
          const title = media.titlePrimary || media.title || media.titleEnglish || media.name || 'Unknown';
          const coverImage = media.coverImage || media.posterPath || media.posterImage || undefined;
          baseMediaMap.set(media.id, {
            id: media.id,
            title,
            coverImage,
          });
        }
      }

      if (userMediaIds.length === 0) {
        return { items: [], sequels: [], totalCount: 0 };
      }

      // 2. Fetch user list entries across ALL media types to check if target media is already in list
      const [
        userAnimeList,
        userMangaList,
        userTvList,
        userMovieList,
        userGameList,
        userBookList,
      ] = await Promise.all([
        this.prisma.client.aquilaAnimeUserListV2.findMany({ where: { username: cleanUsername }, select: { animeId: true, status: true, score: true } }),
        this.prisma.client.aquilaMangaUserListV2.findMany({ where: { username: cleanUsername }, select: { mangaId: true, status: true, score: true } }),
        this.prisma.client.aquilaTvUserListV2.findMany({ where: { username: cleanUsername }, select: { tvId: true, status: true, score: true } }),
        this.prisma.client.aquilaMovieUserListV2.findMany({ where: { username: cleanUsername }, select: { movieId: true, status: true, score: true } }),
        this.prisma.client.aquilaGameUserListV2.findMany({ where: { username: cleanUsername }, select: { gameId: true, status: true, score: true } }),
        this.prisma.client.aquilaBookUserListV2.findMany({ where: { username: cleanUsername }, select: { bookId: true, status: true, score: true } }),
      ]);

      const userListMap = new Map<string, { status: string; score: number | null }>();
      userAnimeList.forEach((e: any) => userListMap.set(`ANIME_${e.animeId}`, { status: e.status, score: e.score }));
      userMangaList.forEach((e: any) => userListMap.set(`MANGA_${e.mangaId}`, { status: e.status, score: e.score }));
      userTvList.forEach((e: any) => userListMap.set(`TV_${e.tvId}`, { status: e.status, score: e.score }));
      userMovieList.forEach((e: any) => userListMap.set(`MOVIE_${e.movieId}`, { status: e.status, score: e.score }));
      userGameList.forEach((e: any) => userListMap.set(`GAME_${e.gameId}`, { status: e.status, score: e.score }));
      userBookList.forEach((e: any) => userListMap.set(`BOOK_${e.bookId}`, { status: e.status, score: e.score }));

      // 3. Query AquilaMediaRelationV2 for relations
      const rawRelations = await this.prisma.client.aquilaMediaRelationV2.findMany({
        where: {
          OR: [
            { sourceType: typeUpper, sourceId: { in: userMediaIds } },
            { targetType: typeUpper, targetId: { in: userMediaIds } },
          ],
        },
      });

      const invertRel = (rel: string) => {
        if (rel === 'SEQUEL') return 'PREQUEL';
        if (rel === 'PREQUEL') return 'SEQUEL';
        return rel;
      };

      const targetCandidates: Array<{
        baseMediaId: number;
        targetType: $Enums.MediaType;
        targetId: number;
        relationType: string;
      }> = [];

      for (const r of rawRelations) {
        if (r.sourceType === typeUpper && userMediaIds.includes(r.sourceId)) {
          targetCandidates.push({
            baseMediaId: r.sourceId,
            targetType: r.targetType,
            targetId: r.targetId,
            relationType: r.type,
          });
        } else if (r.targetType === typeUpper && userMediaIds.includes(r.targetId)) {
          targetCandidates.push({
            baseMediaId: r.targetId,
            targetType: r.sourceType,
            targetId: r.sourceId,
            relationType: invertRel(r.type),
          });
        }
      }



      // Title-based franchise matching for TV and Movies
      if (typeLower === 'tv' || typeLower === 'movie') {
        for (const entry of userListEntries) {
          const media = entry.tv || entry.movie;
          if (!media || !media.id) continue;

          const baseTitle = (media.titlePrimary || media.title || media.name || media.titleSecondary || '').trim();
          if (!baseTitle) continue;

          let rootTitle = baseTitle.split(/[:\-–—]/)[0].trim();
          if (rootTitle.length < 3 || ['the', 'a', 'an'].includes(rootTitle.toLowerCase())) {
            rootTitle = baseTitle;
          }

          if (rootTitle.length < 3) continue;

          if (typeLower === 'tv') {
            const matchingTvs = await this.prisma.client.aquilaTvV2.findMany({
              where: {
                id: { notIn: userMediaIds },
                OR: [
                  { titlePrimary: { contains: rootTitle, mode: 'insensitive'  } },
                  { titleSecondary: { contains: rootTitle, mode: 'insensitive' } },
                  { titleNative: { contains: rootTitle, mode: 'insensitive' } },
                ],
              },
              take: 10,
              orderBy: { popularity: 'desc' },
            });

            for (const item of matchingTvs) {
              targetCandidates.push({
                baseMediaId: media.id,
                targetType: $Enums.MediaType.TV,
                targetId: item.id,
                relationType: 'SIMILAR',
              });
            }
          } else if (typeLower === 'movie') {
            const matchingMovies = await this.prisma.client.aquilaMovieV2.findMany({
              where: {
                id: { notIn: userMediaIds },
                OR: [
                  { titlePrimary: { contains: rootTitle, mode: 'insensitive' } },
                  { titleSecondary: { contains: rootTitle, mode: 'insensitive' } },
                  { titleNative: { contains: rootTitle, mode: 'insensitive' } },
                ],
              },
              take: 10,
              orderBy: { popularity: 'desc' },
            });

            for (const item of matchingMovies) {
              targetCandidates.push({
                baseMediaId: media.id,
                targetType: $Enums.MediaType.MOVIE,
                targetId: item.id,
                relationType: 'SIMILAR',
              });
            }
          }
        }
      }

      // Filter target candidates based on relationType option and includeInList
      const filteredCandidates = targetCandidates.filter((cand) => {
        if (options?.relationType && cand.relationType.toUpperCase() !== options.relationType.toUpperCase()) {
          return false;
        }
        const listKey = `${cand.targetType}_${cand.targetId}`;
        const isAlreadyInList = userListMap.has(listKey);
        if (!includeInList && isAlreadyInList) {
          return false;
        }
        return true;
      });

      // Deduplicate candidates by (targetType, targetId)
      const uniqueCandidatesMap = new Map<string, typeof filteredCandidates[0]>();
      for (const cand of filteredCandidates) {
        const key = `${cand.targetType}_${cand.targetId}`;
        if (!uniqueCandidatesMap.has(key)) {
          uniqueCandidatesMap.set(key, cand);
        }
      }

      const candidatesList = Array.from(uniqueCandidatesMap.values());

      // 4. Fetch target media items from DB
      const idsByType = new Map<$Enums.MediaType, number[]>();
      for (const cand of candidatesList) {
        const existing = idsByType.get(cand.targetType) || [];
        existing.push(cand.targetId);
        idsByType.set(cand.targetType, existing);
      }

      const mediaDetailsMap = new Map<string, any>();

      if (idsByType.has($Enums.MediaType.ANIME)) {
        const animes = await this.prisma.client.aquilaAnimeV2.findMany({
          where: { id: { in: idsByType.get($Enums.MediaType.ANIME)! } },
        });
        animes.forEach((a: any) => mediaDetailsMap.set(`ANIME_${a.id}`, a));
      }
      if (idsByType.has($Enums.MediaType.MANGA)) {
        const mangas = await this.prisma.client.aquilaMangaV2.findMany({
          where: { id: { in: idsByType.get($Enums.MediaType.MANGA)! } },
        });
        mangas.forEach((m: any) => mediaDetailsMap.set(`MANGA_${m.id}`, m));
      }
      if (idsByType.has($Enums.MediaType.TV)) {
        const tvs = await this.prisma.client.aquilaTvV2.findMany({
          where: { id: { in: idsByType.get($Enums.MediaType.TV)! } },
        });
        tvs.forEach((t: any) => mediaDetailsMap.set(`TV_${t.id}`, t));
      }
      if (idsByType.has($Enums.MediaType.MOVIE)) {
        const movies = await this.prisma.client.aquilaMovieV2.findMany({
          where: { id: { in: idsByType.get($Enums.MediaType.MOVIE)! } },
        });
        movies.forEach((m: any) => mediaDetailsMap.set(`MOVIE_${m.id}`, m));
      }
      if (idsByType.has($Enums.MediaType.GAME)) {
        const games = await this.prisma.client.aquilaGameV2.findMany({
          where: { id: { in: idsByType.get($Enums.MediaType.GAME)! } },
        });
        games.forEach((g: any) => mediaDetailsMap.set(`GAME_${g.id}`, g));
      }
      if (idsByType.has($Enums.MediaType.BOOK)) {
        const books = await this.prisma.client.aquilaBookV2.findMany({
          where: { id: { in: idsByType.get($Enums.MediaType.BOOK)! } },
        });
        books.forEach((b: any) => mediaDetailsMap.set(`BOOK_${b.id}`, b));
      }

      // 5. Construct items
      const items: any[] = [];

      for (const cand of candidatesList) {
        const mediaKey = `${cand.targetType}_${cand.targetId}`;
        const media = mediaDetailsMap.get(mediaKey);
        if (!media) continue;

        const title =
          media.titlePrimary ||
          media.title ||
          media.name ||
          media.titleSecondary ||
          media.titleNative ||
          'Unknown';
        const titleEnglish = media.titlePrimary || media.titleEnglish || media.name || media.title;
        const titleRomaji = media.titleSecondary || media.titleRomaji;

        if (search) {
          const matchesTitle =
            title.toLowerCase().includes(search) ||
            (titleEnglish && titleEnglish.toLowerCase().includes(search)) ||
            (titleRomaji && titleRomaji.toLowerCase().includes(search));
          if (!matchesTitle) continue;
        }

        const baseMedia = baseMediaMap.get(cand.baseMediaId) || {
          id: cand.baseMediaId,
          title: 'User List Item',
        };

        const userEntry = userListMap.get(mediaKey);

        const coverImage =
          media.coverImage ||
          media.posterPath ||
          media.posterImage ||
          media.coverUrl ||
          undefined;

        let year: number | undefined = undefined;
        if (typeof media.startDateYear === 'number' && media.startDateYear > 0) {
          year = media.startDateYear;
        } else if (typeof media.releaseYear === 'number' && media.releaseYear > 0) {
          year = media.releaseYear;
        } else if (typeof media.publishedYear === 'number' && media.publishedYear > 0) {
          year = media.publishedYear;
        } else if (media.firstAirDate) {
          const d = new Date(media.firstAirDate);
          if (!isNaN(d.getTime())) year = d.getFullYear();
        } else if (media.releaseDate) {
          const d = new Date(media.releaseDate);
          if (!isNaN(d.getTime())) year = d.getFullYear();
        }

        items.push({
          id: media.id,
          mediaType: cand.targetType.toLowerCase(),
          title,
          titleEnglish,
          titleRomaji,
          coverImage,
          format: media.format ? String(media.format) : undefined,
          status: media.status ? String(media.status) : undefined,
          score:
            typeof media.averageScore === 'number'
              ? media.averageScore
              : typeof media.averageVote === 'number'
              ? media.averageVote
              : typeof media.rating === 'number'
              ? media.rating
              : undefined,
          episodes:
            typeof media.episodeCount === 'number'
              ? media.episodeCount
              : Array.isArray(media.episodes)
              ? media.episodes.length
              : undefined,
          chapters: media.chapterCount,
          volumes: media.volumeCount,
          year,
          relationType: cand.relationType,
          isAddedToList: !!userEntry,
          userListStatus: userEntry?.status ?? null,
          userListScore: userEntry?.score ?? null,
          baseMedia: {
            id: baseMedia.id,
            title: baseMedia.title,
            coverImage: baseMedia.coverImage,
          },
        });
      }

      const slicedItems = items.slice(0, limit);

      return {
        items: slicedItems,
        sequels: slicedItems,
        totalCount: items.length,
      };
    } catch (error) {
      this.logger.error(`Error in getMediaSequels for user ${username}: ${(error as Error).message}`, (error as Error).stack);
      return { items: [], sequels: [], totalCount: 0 };
    }
  }

  // ─────────────────────────── RADARR/SONARR/EXPORT/IMPORT ───────────────────────────

  public async getRadarrMovieList(username: string): Promise<any[]> {
    const list = await this.prisma.client.aquilaMovieUserListV2.findMany({
      where: { username: username.toLowerCase(), status: 'PLANNING' },
      include: { movie: true },
    });
    return list.map((item: any) => {
      let tmdbId: number | undefined = item.movie.tmdbId ?? undefined;
      if (!tmdbId && Array.isArray(item.movie.sources)) {
        const tmdbSource = item.movie.sources.find(
          (s: any) => s.provider === 'TMDB',
        );
        if (tmdbSource?.externalId) {
          const parsed = parseInt(tmdbSource.externalId, 10);
          if (!isNaN(parsed)) tmdbId = parsed;
        }
      }
      return {
        title: item.movie.titlePrimary,
        imdbId: item.movie.imdbId ?? undefined,
        tmdbId,
        year: item.movie.releaseDateYear ?? undefined,
        hasFile: item.status === 'COMPLETED',
        monitored: true,
      };
    });
  }

  public async fetchSonarrSeries(
    username: string,
    includeTv = true,
    includeAnime = false,
  ): Promise<any[]> {
    const series: any[] = [];
    if (includeTv) {
      const tvList = await this.prisma.client.aquilaTvUserListV2.findMany({
        where: { username: username.toLowerCase(), status: 'PLANNING' },
        include: { tv: true },
      });
      tvList.forEach((item: any) => {
        if (item.tv.tvDBId) {
          series.push({
            title: item.tv.titlePrimary,
            tvdbId: item.tv.tvDBId,
            monitored: true,
          });
        }
      });
    }
    if (includeAnime) {
      const animeList = await this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { username: username.toLowerCase(), status: 'PLANNING' },
        include: { anime: true },
      });
      for (const item of animeList) {
        if (item.anime.tvDBId) {
          series.push({
            title: item.anime.titlePrimary,
            tvdbId: item.anime.tvDBId,
            monitored: true,
          });
        } else {
          const userId = await this.getUserId(username).catch(() => null);
          if (userId) {
            void this.notificationService.create(userId, {
              title: 'Missing TVDB ID for Anime',
              message: `TVDB ID is missing for anime "${item.anime.titlePrimary}". Series has been queued for a metadata update.`,
              type: 'INFO',
            });
          }
          const anilistId = item.anime.anilistId ?? item.anime.id;
          if (anilistId) {
            this.logger.log(
              `[Sonarr] TVDB ID missing for anime "${item.anime.titlePrimary}" (AniList ID: ${anilistId}). Queued for background update.`,
            );
            void this.animeQueueService.addUpsertJob(anilistId, {
              force: true,
              skipRelations: true,
            });
          }
        }
      }
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

  private async resolveAnimeId(item: any): Promise<number | null> {
    const rawLocal = item.animeId ?? item.media?.animeId;
    const localId = rawLocal != null ? Number(rawLocal) : NaN;
    if (!isNaN(localId) && localId > 0) {
      const existing = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { id: localId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawAnilist = item.anilistId ?? item.media?.anilistId ?? item.media?.id;
    const anilistId = rawAnilist != null ? Number(rawAnilist) : NaN;
    if (!isNaN(anilistId) && anilistId > 0) {
      const title =
        item.media?.titleString ||
        item.media?.titlePrimary ||
        (typeof item.media?.title === 'string'
          ? item.media.title
          : item.media?.title?.english || item.media?.title?.userPreferred) ||
        item.title ||
        undefined;
      const rawCover = item.media?.coverImage || item.coverImage;
      const coverImage =
        typeof rawCover === 'string'
          ? rawCover
          : rawCover?.large || rawCover?.medium || undefined;
      try {
        const anime = await this.animeService.ensureAnime(
          anilistId,
          title,
          coverImage,
        );
        if (anime?.id) return anime.id;
      } catch (err) {
        this.logger.warn(`Failed to ensure anime ${anilistId}: ${err}`);
      }
    }

    const rawMal = item.malId ?? item.media?.malId;
    const malId = rawMal != null ? Number(rawMal) : NaN;
    if (!isNaN(malId) && malId > 0) {
      const existing = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { malId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    return null;
  }

  private async resolveMangaId(item: any): Promise<number | null> {
    const rawLocal = item.mangaId ?? item.media?.mangaId;
    const localId = rawLocal != null ? Number(rawLocal) : NaN;
    if (!isNaN(localId) && localId > 0) {
      const existing = await this.prisma.client.aquilaMangaV2.findUnique({
        where: { id: localId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawAnilist = item.anilistId ?? item.media?.anilistId ?? item.media?.id;
    const anilistId = rawAnilist != null ? Number(rawAnilist) : NaN;
    if (!isNaN(anilistId) && anilistId > 0) {
      const title =
        item.media?.titleString ||
        item.media?.titlePrimary ||
        (typeof item.media?.title === 'string'
          ? item.media.title
          : item.media?.title?.english || item.media?.title?.userPreferred) ||
        item.title ||
        undefined;
      const rawCover = item.media?.coverImage || item.coverImage;
      const coverImage =
        typeof rawCover === 'string'
          ? rawCover
          : rawCover?.large || rawCover?.medium || undefined;
      try {
        const manga = await this.mangaService.ensureManga(
          anilistId,
          title,
          coverImage,
        );
        if (manga?.id) return manga.id;
      } catch (err) {
        this.logger.warn(`Failed to ensure manga ${anilistId}: ${err}`);
      }
    }

    const rawMal = item.malId ?? item.media?.malId;
    const malId = rawMal != null ? Number(rawMal) : NaN;
    if (!isNaN(malId) && malId > 0) {
      const existing = await this.prisma.client.aquilaMangaV2.findUnique({
        where: { malId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    return null;
  }

  private async resolveMovieId(item: any): Promise<number | null> {
    const rawLocal = item.movieId ?? item.media?.movieId;
    const localId = rawLocal != null ? Number(rawLocal) : NaN;
    if (!isNaN(localId) && localId > 0) {
      const existing = await this.prisma.client.aquilaMovieV2.findUnique({
        where: { id: localId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawImdb = item.imdbId ?? item.media?.imdbId;
    if (rawImdb && typeof rawImdb === 'string') {
      const existing = await this.prisma.client.aquilaMovieV2.findUnique({
        where: { imdbId: rawImdb },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawTmdb = item.tmdbId ?? item.media?.tmdbId;
    const tmdbId = rawTmdb != null ? Number(rawTmdb) : NaN;
    if (!isNaN(tmdbId) && tmdbId > 0) {
      const existing = await this.prisma.client.aquilaMovieV2.findUnique({
        where: { tmdbId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawTvdb = item.tvDBId ?? item.media?.tvDBId;
    const tvDBId = rawTvdb != null ? Number(rawTvdb) : NaN;
    if (!isNaN(tvDBId) && tvDBId > 0) {
      const title =
        item.media?.titleString ||
        item.media?.titlePrimary ||
        item.title ||
        undefined;
      const rawCover = item.media?.coverImage || item.coverImage;
      const coverImage =
        typeof rawCover === 'string'
          ? rawCover
          : rawCover?.large || rawCover?.medium || undefined;
      try {
        const movie = await this.movieService.ensureMovie(
          tvDBId,
          title,
          coverImage,
        );
        if (movie?.id) return movie.id;
      } catch (err) {
        this.logger.warn(`Failed to ensure movie ${tvDBId}: ${err}`);
      }
    }

    return null;
  }

  private async resolveTvId(item: any): Promise<number | null> {
    const rawLocal = item.tvId ?? item.media?.tvId;
    const localId = rawLocal != null ? Number(rawLocal) : NaN;
    if (!isNaN(localId) && localId > 0) {
      const existing = await this.prisma.client.aquilaTvV2.findUnique({
        where: { id: localId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawTvdb = item.tvDBId ?? item.media?.tvDBId;
    const tvDBId = rawTvdb != null ? Number(rawTvdb) : NaN;
    if (!isNaN(tvDBId) && tvDBId > 0) {
      const title =
        item.media?.titleString ||
        item.media?.titlePrimary ||
        item.title ||
        undefined;
      const rawCover = item.media?.coverImage || item.coverImage;
      const coverImage =
        typeof rawCover === 'string'
          ? rawCover
          : rawCover?.large || rawCover?.medium || undefined;
      try {
        const tv = await this.tvService.ensureTv(
          tvDBId,
          title,
          coverImage,
        );
        if (tv?.id) return tv.id;
      } catch (err) {
        this.logger.warn(`Failed to ensure TV ${tvDBId}: ${err}`);
      }
    }

    const rawTmdb = item.tmdbId ?? item.media?.tmdbId ?? item.media?.id;
    const tmdbId = rawTmdb != null ? Number(rawTmdb) : NaN;
    if (!isNaN(tmdbId) && tmdbId > 0) {
      const existing = await this.prisma.client.aquilaTvV2.findUnique({
        where: { tmdbId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    return null;
  }

  private async resolveGameId(item: any): Promise<number | null> {
    const rawLocal = item.gameId ?? item.media?.gameId;
    const localId = rawLocal != null ? Number(rawLocal) : NaN;
    if (!isNaN(localId) && localId > 0) {
      const existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { id: localId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawRawg = item.rawgId ?? item.media?.rawgId ?? item.media?.id;
    const rawgId = rawRawg != null ? Number(rawRawg) : NaN;
    if (!isNaN(rawgId) && rawgId > 0) {
      const title =
        item.media?.titleString ||
        item.media?.titlePrimary ||
        item.title ||
        undefined;
      const rawCover = item.media?.coverImage || item.coverImage;
      const coverImage =
        typeof rawCover === 'string'
          ? rawCover
          : rawCover?.large || rawCover?.medium || undefined;
      try {
        const game = await this.gameService.ensureGame(
          rawgId,
          title,
          coverImage,
        );
        if (game?.id) return game.id;
      } catch (err) {
        this.logger.warn(`Failed to ensure game ${rawgId}: ${err}`);
      }
    }

    const rawIgdb = item.igdbId ?? item.media?.igdbId;
    const igdbId = rawIgdb != null ? Number(rawIgdb) : NaN;
    if (!isNaN(igdbId) && igdbId > 0) {
      const existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { igdbId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    return null;
  }

  private async resolveBookId(item: any): Promise<number | null> {
    const rawLocal = item.bookId ?? item.media?.bookId;
    const localId = rawLocal != null ? Number(rawLocal) : NaN;
    if (!isNaN(localId) && localId > 0) {
      const existing = await this.prisma.client.aquilaBookV2.findUnique({
        where: { id: localId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const rawGbook =
      item.googleBookId ??
      item.googleBooksId ??
      item.media?.googleBookId ??
      item.media?.googleBooksId ??
      item.media?.id;
    const gBookId = rawGbook != null ? String(rawGbook).trim() : '';
    if (gBookId) {
      const title =
        item.media?.titleString ||
        item.media?.titlePrimary ||
        item.title ||
        undefined;
      const rawCover = item.media?.coverImage || item.coverImage;
      const coverImage =
        typeof rawCover === 'string'
          ? rawCover
          : rawCover?.large || rawCover?.medium || undefined;
      try {
        const book = await this.bookService.ensureBook(
          gBookId,
          title,
          coverImage,
        );
        if (book?.id) return book.id;
      } catch (err) {
        this.logger.warn(`Failed to ensure book ${gBookId}: ${err}`);
      }
    }

    return null;
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
        const animeId = await this.resolveAnimeId(item);
        if (!animeId) continue;
        await this.prisma.client.aquilaAnimeUserListV2.upsert({
          where: {
            username_animeId: { username: username.toLowerCase(), animeId },
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
            animeId,
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
        const mangaId = await this.resolveMangaId(item);
        if (!mangaId) continue;
        await this.prisma.client.aquilaMangaUserListV2.upsert({
          where: {
            username_mangaId: { username: username.toLowerCase(), mangaId },
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
            mangaId,
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
        const movieId = await this.resolveMovieId(item);
        if (!movieId) continue;
        await this.prisma.client.aquilaMovieUserListV2.upsert({
          where: {
            username_movieId: { username: username.toLowerCase(), movieId },
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
            movieId,
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
        const tvId = await this.resolveTvId(item);
        if (!tvId) continue;
        const tvEntry = await this.prisma.client.aquilaTvUserListV2.upsert({
          where: {
            username_tvId: { username: username.toLowerCase(), tvId },
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
            tvId,
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
        const gameId = await this.resolveGameId(item);
        if (!gameId) continue;
        await this.prisma.client.aquilaGameUserListV2.upsert({
          where: {
            username_gameId: { username: username.toLowerCase(), gameId },
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
            gameId,
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
        const bookId = await this.resolveBookId(item);
        if (!bookId) continue;
        await this.prisma.client.aquilaBookUserListV2.upsert({
          where: {
            username_bookId: { username: username.toLowerCase(), bookId },
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
            bookId,
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
        .syncAnime(providerKey.toLowerCase(), username.toLowerCase(), providerId, updateData)
        .catch((err) =>
          this.logger.error(
            `Failed to update connection for provider ${providerKey}`,
            err,
          ),
        );
    }
  }

  private async updateTvConnections(
    username: string,
    tvId: number,
    connections: any,
    status?: string,
    score?: number,
    watchedEpisodes?: { seasonNum: number; episodeNum: number }[],
    startDate?: number,
    endDate?: number,
    notes?: string,
    rewatched?: number,
  ) {
    try {
      const userConns = await this.prisma.client.connections.findMany({
        where: { username: username.toLowerCase() },
        select: { provider: true },
      });

      if (!userConns || userConns.length === 0) return;

      const tvShow = await this.prisma.client.aquilaTvV2.findUnique({
        where: { id: tvId },
        select: { tmdbId: true, tvDBId: true, traktId: true },
      });

      const mergedConnMap: Record<string, any> = {
        ...(typeof connections === 'object' && connections !== null ? connections : {}),
      };

      for (const uConn of userConns) {
        const pKey = uConn.provider.toLowerCase();
        if (!mergedConnMap[pKey] && !mergedConnMap[uConn.provider]) {
          const fallbackId = tvShow?.tmdbId || tvShow?.tvDBId || tvShow?.traktId || tvId;
          if (fallbackId) {
            mergedConnMap[pKey] = fallbackId;
          }
        }
      }

      for (const providerKey of Object.keys(mergedConnMap)) {
        const conn = mergedConnMap[providerKey];
        if (!conn) continue;

        let providerId: number;
        let connStatus = status;
        let connScore = score;
        let connStartDate = startDate;
        let connEndDate = endDate;
        let connNotes = notes;
        let connRewatched = rewatched;

        if (typeof conn === 'object' && conn !== null) {
          providerId = Number(conn.id ?? conn.simklId ?? conn.providerId);
          if (conn.status !== undefined) connStatus = conn.status;
          if (conn.score !== undefined) connScore = Number(conn.score);
          if (conn.startDate !== undefined) connStartDate = conn.startDate;
          if (conn.endDate !== undefined) connEndDate = conn.endDate;
          if (conn.notes !== undefined) connNotes = conn.notes;
          if (conn.rewatched !== undefined) connRewatched = Number(conn.rewatched);
        } else {
          providerId = Number(conn);
        }

        if (Number.isNaN(providerId) || providerId <= 0) continue;

        const updateData: TvUpdateData = {
          status: connStatus,
          score: connScore,
          watchedEpisodes,
          startDate: connStartDate,
          endDate: connEndDate,
          notes: connNotes,
          rewatched: connRewatched,
        };

        await this.connectionsManager
          .syncTv(providerKey.toLowerCase(), username.toLowerCase(), providerId, updateData)
          .catch((err) =>
            this.logger.error(
              `Failed to update TV connection for provider ${providerKey}`,
              err,
            ),
          );
      }
    } catch (err: any) {
      this.logger.error(`Error updating TV connections for ${username}:`, err);
    }
  }

  private async updateMangaConnections(
    username: string,
    mangaId: number,
    connections: any,
    status?: string,
    chapters?: number,
    volumes?: number,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    reread?: number,
  ) {
    if (!connections || typeof connections !== 'object') return;

    for (const providerKey of Object.keys(connections)) {
      const conn = connections[providerKey];
      if (!conn) continue;

      let providerId: number;
      let connStatus = status;
      let connChapters = chapters;
      let connVolumes = volumes;
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connReread = reread;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
        if (conn.chaptersOffset !== undefined) {
          connChapters = (chapters || 0) + Number(conn.chaptersOffset);
        } else if (conn.chapters !== undefined) {
          connChapters = Number(conn.chapters);
        } else if (conn.progress !== undefined) {
          connChapters = Number(conn.progress);
        }
        if (conn.volumesOffset !== undefined) {
          connVolumes = (volumes || 0) + Number(conn.volumesOffset);
        } else if (conn.volumes !== undefined) {
          connVolumes = Number(conn.volumes);
        }
        if (conn.score !== undefined) connScore = Number(conn.score);
        if (conn.startDate !== undefined) connStartDate = conn.startDate;
        if (conn.endDate !== undefined) connEndDate = conn.endDate;
        if (conn.notes !== undefined) connNotes = conn.notes;
        if (conn.reread !== undefined) connReread = Number(conn.reread);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      const updateData: any = {
        status: connStatus,
        chapters: connChapters,
        volumes: connVolumes,
        score: connScore,
        startDate: connStartDate,
        endDate: connEndDate,
        notes: connNotes,
        reread: connReread,
      };

      await this.connectionsManager
        .syncManga(providerKey.toLowerCase(), username.toLowerCase(), providerId, updateData)
        .catch((err) =>
          this.logger.error(
            `Failed to update manga connection for provider ${providerKey}`,
            err,
          ),
        );
    }
  }

  private async updateMovieConnections(
    username: string,
    movieId: number,
    connections: any,
    status?: string,
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
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connRewatched = rewatched;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
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
        score: connScore,
        startDate: connStartDate,
        endDate: connEndDate,
        notes: connNotes,
        rewatched: connRewatched,
      };

      await this.connectionsManager
        .syncMovie(providerKey.toLowerCase(), username.toLowerCase(), providerId, updateData)
        .catch((err) =>
          this.logger.error(
            `Failed to update movie connection for provider ${providerKey}`,
            err,
          ),
        );
    }
  }
}
