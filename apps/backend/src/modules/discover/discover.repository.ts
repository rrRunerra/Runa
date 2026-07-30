import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeFormat, AnimeStatus, MangaFormat, MangaStatus, MovieStatus, TvStatus, Prisma } from '@runa/database';
import { rrError } from 'src/providers/error';
import { DiscoverItemEntity, CalendarItemEntity } from './discover.entity';
import { DiscoverQueryDto } from './discover.dto';

@Injectable()
export class DiscoverRepository {
  private readonly moduleCode = 'DrRpsty-';
  private readonly logger = new Logger(DiscoverRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getYears(type: string): Promise<number[]> {
    try {
      let years: (number | null)[] = [];

      if (type === 'anime') {
        const data = await this.prisma.client.aquilaAnimeV2.findMany({
          select: { startDateYear: true },
          distinct: ['startDateYear'],
          orderBy: { startDateYear: 'desc' },
        });
        years = data.map((d) => d.startDateYear);
      } else if (type === 'manga') {
        const data = await this.prisma.client.aquilaMangaV2.findMany({
          where: { NOT: { startDateYear: null } },
          select: { startDateYear: true },
          distinct: ['startDateYear'],
          orderBy: { startDateYear: 'desc' },
        });
        years = data.map((d) => d.startDateYear);
      } else if (type === 'movie') {
        const data = await this.prisma.client.aquilaMovieV2.findMany({
          where: { NOT: { releaseDateYear: null } },
          select: { releaseDateYear: true },
          distinct: ['releaseDateYear'],
          orderBy: { releaseDateYear: 'desc' },
        });
        years = data.map((d) => d.releaseDateYear);
      } else if (type === 'tv') {
        const data = await this.prisma.client.aquilaTvV2.findMany({
          where: { NOT: { firstAiredYear: null } },
          select: { firstAiredYear: true },
          distinct: ['firstAiredYear'],
          orderBy: { firstAiredYear: 'desc' },
        });
        years = data.map((d) => d.firstAiredYear);
      } else if (type === 'game') {
        const data = await this.prisma.client.aquilaGameV2.findMany({
          where: { NOT: { releaseDateYear: null } },
          select: { releaseDateYear: true },
          distinct: ['releaseDateYear'],
          orderBy: { releaseDateYear: 'desc' },
        });
        years = data.map((d) => d.releaseDateYear);
      } else if (type === 'book') {
        const data = await this.prisma.client.aquilaBookV2.findMany({
          where: { NOT: { releaseDateYear: null } },
          select: { releaseDateYear: true },
          distinct: ['releaseDateYear'],
          orderBy: { releaseDateYear: 'desc' },
        });
        years = data.map((d) => d.releaseDateYear);
      }

      return years.filter((y): y is number => y !== null);
    } catch (err: any) {
      this.logger.error(`Failed to get years for ${type}: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTGDY001`, {
        message: `Failed to fetch discover years for ${type}`,
      });
    }
  }

  public async getStatuses(type: string): Promise<string[]> {
    try {
      if (type === 'anime') {
        return Object.values(AnimeStatus);
      } else if (type === 'manga') {
        return Object.values(MangaStatus);
      } else if (type === 'movie') {
        const data = await this.prisma.client.aquilaMovieV2.findMany({
          select: { status: true },
          distinct: ['status'],
          orderBy: { status: 'asc' },
        });
        return data.map((d) => d.status as string).filter(Boolean);
      } else if (type === 'tv') {
        const data = await this.prisma.client.aquilaTvV2.findMany({
          select: { status: true },
          distinct: ['status'],
          orderBy: { status: 'asc' },
        });
        return data.map((d) => d.status as string).filter(Boolean);
      }
      return [];
    } catch (err: any) {
      this.logger.error(`Failed to get distinct statuses: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTGDS001`, {
        message: 'Failed to get distinct statuses from database',
      });
    }
  }

  public async discover(
    type: string,
    query: DiscoverQueryDto,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 30);
    const skip = (page - 1) * limit;

    try {
      if (type === 'anime') {
        return this.discoverAnime(query, skip, limit);
      } else if (type === 'manga') {
        return this.discoverManga(query, skip, limit);
      } else if (type === 'movie') {
        return this.discoverMovie(query, skip, limit);
      } else if (type === 'tv') {
        return this.discoverTv(query, skip, limit);
      } else if (type === 'game') {
        return this.discoverGame(query, skip, limit);
      } else if (type === 'book') {
        return this.discoverBook(query, skip, limit);
      } else if (type === 'character') {
        return this.discoverCharacter(query, skip, limit);
      } else if (type === 'actor') {
        return this.discoverActor(query, skip, limit);
      }
      throw new rrError(`${this.moduleCode}IMT001`, {
        message: 'Invalid media type for discovery',
      });
    } catch (err: any) {
      this.logger.error(`Discover error for type ${type}: ${err.message}`);
      if (err instanceof rrError) throw err;
      throw new rrError(`${this.moduleCode}FTEE001`, {
        message: `Failed to discover ${type} from database`,
      });
    }
  }

  private async discoverAnime(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, format, status, search, sort, addedWithin } = query;
    const where: Prisma.AquilaAnimeV2WhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.startDateYear = Number(year);
    if (format) where.format = format as AnimeFormat;
    if (status) where.status = status as AnimeStatus;
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { titlePrimary: { contains: searchStr, mode: 'insensitive' } },
        { titleSecondary: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AquilaAnimeV2OrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ startDateYear: 'desc' }, { startDateMonth: 'desc' }, { startDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ startDateYear: 'asc' }, { startDateMonth: 'asc' }, { startDateDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titlePrimary: 'asc' }, { titleSecondary: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaAnimeV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaAnimeV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titlePrimary || item.titleSecondary || '',
      secondaryTitle: item.titleSecondary || null,
      coverImage: item.coverImage || null,
      format: item.format,
      status: item.status,
      isAdult: item.isAdult ?? false,
      year: item.startDateYear,
      averageScore: item.averageScore || null,
    }));

    return { items, totalCount };
  }

  private async discoverManga(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, format, status, search, sort, addedWithin } = query;
    const where: Prisma.AquilaMangaV2WhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.startDateYear = Number(year);
    if (format) where.format = format as MangaFormat;
    if (status) where.status = status as MangaStatus;
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { titlePrimary: { contains: searchStr, mode: 'insensitive' } },
        { titleSecondary: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AquilaMangaV2OrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ startDateYear: 'desc' }, { startDateMonth: 'desc' }, { startDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ startDateYear: 'asc' }, { startDateMonth: 'asc' }, { startDateDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titlePrimary: 'asc' }, { titleSecondary: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaMangaV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaMangaV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titlePrimary || item.titleSecondary || '',
      secondaryTitle: item.titleSecondary || null,
      coverImage: item.coverImage || null,
      format: item.format,
      status: item.status,
      isAdult: item.isAdult ?? false,
      year: item.startDateYear,
      averageScore: item.averageScore || null,
    }));

    return { items, totalCount };
  }

  private async discoverMovie(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, status, search, sort, addedWithin } = query;
    const where: Prisma.AquilaMovieV2WhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.releaseDateYear = Number(year);
    if (status) where.status = status as MovieStatus;
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { titlePrimary: { contains: searchStr, mode: 'insensitive' } },
        { titleSecondary: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AquilaMovieV2OrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ releaseDateYear: 'desc' }, { releaseDateMonth: 'desc' }, { releaseDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ releaseDateYear: 'asc' }, { releaseDateMonth: 'asc' }, { releaseDateDay: 'asc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titlePrimary: 'asc' }, { titleSecondary: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaMovieV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaMovieV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titlePrimary || item.titleSecondary || '',
      secondaryTitle: item.titleSecondary || null,
      coverImage: item.coverImage || null,
      format: 'MOVIE',
      status: item.status,
      isAdult: false,
      year: item.releaseDateYear,
      averageScore: item.averageScore || null,
    }));

    return { items, totalCount };
  }

  private async discoverTv(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, status, search, sort, addedWithin } = query;
    const where: Prisma.AquilaTvV2WhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.firstAiredYear = Number(year);
    if (status) where.status = status as TvStatus;
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { titlePrimary: { contains: searchStr, mode: 'insensitive' } },
        { titleSecondary: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AquilaTvV2OrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ firstAiredYear: 'desc' }, { firstAiredMonth: 'desc' }, { firstAiredDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ firstAiredYear: 'asc' }, { firstAiredMonth: 'asc' }, { firstAiredDay: 'asc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titlePrimary: 'asc' }, { titleSecondary: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaTvV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaTvV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titlePrimary || item.titleSecondary || '',
      secondaryTitle: item.titleSecondary || null,
      coverImage: item.coverImage || null,
      format: 'TV',
      status: item.status,
      isAdult: false,
      year: item.firstAiredYear,
      averageScore: item.averageScore || null,
    }));

    return { items, totalCount };
  }

  private async discoverGame(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, search, sort, addedWithin } = query;
    const where: Prisma.AquilaGameV2WhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.releaseDateYear = Number(year);
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { titlePrimary: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AquilaGameV2OrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ releaseDateYear: 'desc' }, { releaseDateMonth: 'desc' }, { releaseDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ releaseDateYear: 'asc' }, { releaseDateMonth: 'asc' }, { releaseDateDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titlePrimary: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaGameV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaGameV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titlePrimary || item.titleNative || '',
      secondaryTitle: item.titleNative || null,
      coverImage: item.coverImage || item.backgroundImage || null,
      format: 'GAME',
      status: null,
      isAdult: false,
      year: item.releaseDateYear,
      averageScore: item.averageScore || null,
    }));

    return { items, totalCount };
  }

  private async discoverBook(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, search, sort, addedWithin } = query;
    const where: Prisma.AquilaBookV2WhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.releaseDateYear = Number(year);
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { titlePrimary: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AquilaBookV2OrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ releaseDateYear: 'desc' }, { releaseDateMonth: 'desc' }, { releaseDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ releaseDateYear: 'asc' }, { releaseDateMonth: 'asc' }, { releaseDateDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titlePrimary: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaBookV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaBookV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titlePrimary || '',
      secondaryTitle: item.subtitle || null,
      coverImage: item.coverImage || null,
      format: 'BOOK',
      status: null,
      isAdult: false,
      year: item.releaseDateYear,
      averageScore: item.averageScore || null,
    }));

    return { items, totalCount };
  }

  public async getCalendar(
    start: Date,
    end: Date,
    username?: string,
  ): Promise<CalendarItemEntity[]> {
    try {
      const startYear = start.getUTCFullYear();
      const endYear = end.getUTCFullYear();

      let animeList: any[] = [];
      let mangaList: any[] = [];
      let tvList: any[] = [];
      let movieList: any[] = [];
      let gameList: any[] = [];
      let bookList: any[] = [];

      if (username) {
        const [animeUserLists, mangaUserLists, tvUserLists, gameUserLists, bookUserLists, movieUserLists] = await Promise.all([
          this.prisma.client.aquilaAnimeUserListV2.findMany({
            where: { username: username.toLowerCase(), status: { in: ['WATCHING', 'PLANNING'] } },
            include: { anime: true },
          }),
          this.prisma.client.aquilaMangaUserListV2.findMany({
            where: { username: username.toLowerCase(), status: { in: ['READING', 'PLANNING'] } },
            include: { manga: true },
          }),
          this.prisma.client.aquilaTvUserListV2.findMany({
            where: { username: username.toLowerCase(), status: { in: ['WATCHING', 'PLANNING'] } },
            include: { tv: true },
          }),
          this.prisma.client.aquilaGameUserListV2.findMany({
            where: { username: username.toLowerCase(), status: { in: ['PLAYING', 'PLANNING'] } },
            include: { game: true },
          }),
          this.prisma.client.aquilaBookUserListV2.findMany({
            where: { username: username.toLowerCase(), status: { in: ['READING', 'PLANNING'] } },
            // include: { book: true },
          }),
          this.prisma.client.aquilaMovieUserListV2.findMany({
            where: { username: username.toLowerCase(), status: { in: ['PLANNING'] } },
            include: { movie: true },
          }),
        ]);

        animeList = animeUserLists.map((l) => l.anime);
        mangaList = mangaUserLists.map((l) => l.manga);
        tvList = tvUserLists.map((l) => l.tv);
        gameList = gameUserLists.map((l) => l.game);
        // bookList = bookUserLists.map((l) => l.book);
        movieList = movieUserLists.map((l) => l.movie);
      } else {
        const [animes, mangas, tvs, movies, games, books] = await Promise.all([
          this.prisma.client.aquilaAnimeV2.findMany({
            where: {
              OR: [
                { startDateYear: { gte: startYear, lte: endYear } },
                { status: 'RELEASING' },
              ],
            },
          }),
          this.prisma.client.aquilaMangaV2.findMany({
            where: { startDateYear: { gte: startYear, lte: endYear } },
          }),
          this.prisma.client.aquilaTvV2.findMany(),
          this.prisma.client.aquilaMovieV2.findMany({
            where: { releaseDateYear: { gte: startYear, lte: endYear } },
          }),
          this.prisma.client.aquilaGameV2.findMany({
            where: { releaseDateYear: { gte: startYear, lte: endYear } },
          }),
          this.prisma.client.aquilaBookV2.findMany({
            where: { releaseDateYear: { gte: startYear, lte: endYear } },
          }),
        ]);

        animeList = animes;
        mangaList = mangas;
        tvList = tvs;
        movieList = movies;
        gameList = games;
        bookList = books;
      }

      const events: CalendarItemEntity[] = [];

      const isWithinRange = (date: Date) => {
        return date >= start && date <= end;
      };

      const formatDate = (date: Date) => {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      // 1. Anime
      for (const item of animeList) {
        if (!item) continue;
        if (item.startDateYear) {
          const d = new Date(Date.UTC(item.startDateYear, (item.startDateMonth || 1) - 1, item.startDateDay || 1));
          if (isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
              coverImage: item.coverImageLarge || null,
              type: 'anime',
              airDate: formatDate(d),
              event: 'premiere',
            });
          }
        }
        if (item.nextAiringEpisode) {
          const airing = item.nextAiringEpisode as { airingAt?: number; episode?: number } | null;
          if (airing && airing.airingAt) {
            const d = new Date(airing.airingAt * 1000);
            if (isWithinRange(d)) {
              events.push({
                id: item.id,
                title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
                coverImage: item.coverImageLarge || null,
                type: 'anime',
                airDate: formatDate(d),
                airingAt: airing.airingAt,
                episode: airing.episode,
                event: 'airing',
              });
            }
          }
        }
      }

      // 2. Manga
      for (const item of mangaList) {
        if (!item) continue;
        if (item.startDateYear) {
          const d = new Date(Date.UTC(item.startDateYear, (item.startDateMonth || 1) - 1, item.startDateDay || 1));
          if (isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
              coverImage: item.coverImageLarge || null,
              type: 'manga',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        }
      }

      // 3. TV Shows
      for (const item of tvList) {
        if (!item) continue;
        if (item.startDateYear) {
          const d = new Date(Date.UTC(item.startDateYear, (item.startDateMonth || 1) - 1, item.startDateDay || 1));
          if (isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
              coverImage: item.coverImage || null,
              type: 'tv',
              airDate: formatDate(d),
              event: 'premiere',
            });
          }
        }
        if (item.seasons && Array.isArray(item.seasons)) {
          for (const season of item.seasons as any[]) {
            if (season.episodes && Array.isArray(season.episodes)) {
              for (const ep of season.episodes) {
                if (ep.airDate) {
                  const d = new Date(ep.airDate + 'T00:00:00Z');
                  if (!isNaN(d.getTime()) && isWithinRange(d)) {
                    events.push({
                      id: item.id,
                      title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
                      coverImage: item.coverImage || null,
                      type: 'tv',
                      airDate: formatDate(d),
                      episode: ep.number,
                      episodeTitle: ep.name || undefined,
                      event: 'airing',
                    });
                  }
                }
              }
            }
          }
        }
      }

      // 4. Movies
      for (const item of movieList) {
        if (!item) continue;
        if (item.releaseDate) {
          const d = new Date(item.releaseDate + 'T00:00:00Z');
          if (!isNaN(d.getTime()) && isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
              coverImage: item.coverImage || null,
              type: 'movie',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        } else if (item.startDateYear) {
          const d = new Date(Date.UTC(item.startDateYear, (item.startDateMonth || 1) - 1, item.startDateDay || 1));
          if (isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleEnglish || item.titleRomaji || item.titleNative || '',
              coverImage: item.coverImage || null,
              type: 'movie',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        }
      }

      // 5. Games
      for (const item of gameList) {
        if (!item) continue;
        if (item.released) {
          const d = new Date(item.released + 'T00:00:00Z');
          if (!isNaN(d.getTime()) && isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleString || item.titleNative || '',
              coverImage: item.coverImage || null,
              type: 'game',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        } else if (item.releasedYear) {
          const d = new Date(Date.UTC(item.releasedYear, (item.releasedMonth || 1) - 1, item.releasedDay || 1));
          if (isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleString || item.titleNative || '',
              coverImage: item.coverImage || null,
              type: 'game',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        }
      }

      // 6. Books
      for (const item of bookList) {
        if (!item) continue;
        if (item.publishedDate) {
          const d = new Date(item.publishedDate + 'T00:00:00Z');
          if (!isNaN(d.getTime()) && isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleString || '',
              coverImage: item.coverImage || null,
              type: 'book',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        } else if (item.publishedYear) {
          const d = new Date(Date.UTC(item.publishedYear, (item.publishedMonth || 1) - 1, item.publishedDay || 1));
          if (isWithinRange(d)) {
            events.push({
              id: item.id,
              title: item.titleString || '',
              coverImage: item.coverImage || null,
              type: 'book',
              airDate: formatDate(d),
              event: 'release',
            });
          }
        }
      }

      return events.sort((a, b) => {
        if (a.airDate !== b.airDate) {
          return a.airDate.localeCompare(b.airDate);
        }
        if (a.airingAt && b.airingAt) {
          return a.airingAt - b.airingAt;
        }
        return String(a.title).localeCompare(String(b.title));
      });
    } catch (err: any) {
      this.logger.error(`Failed to get calendar data: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTGCD001`, {
        message: 'Failed to query calendar data from database',
      });
    }
  }

  private async discoverCharacter(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { search } = query;
    const where: Prisma.AquilaCharacterV2WhereInput = {};

    if (search) {
      const searchStr = search.trim();
      const words = searchStr.split(/\s+/).filter(Boolean);

      const searchConditions: Prisma.AquilaCharacterV2WhereInput[] = [
        { namePrimary: { contains: searchStr, mode: 'insensitive' } },
        { nameNative: { contains: searchStr, mode: 'insensitive' } },
        { nameAlternative: { hasSome: [searchStr] } },
      ];

      if (words.length > 1) {
        searchConditions.push({
          AND: words.map((word) => ({
            OR: [
              { namePrimary: { contains: word, mode: 'insensitive' } },
              { nameNative: { contains: word, mode: 'insensitive' } },
              { nameAlternative: { hasSome: [word] } },
            ],
          })),
        });
      }

      where.OR = searchConditions;
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaCharacterV2.findMany({
        where,
        skip,
        take: limit,
        orderBy: { namePrimary: 'asc' },
      }),
      this.prisma.client.aquilaCharacterV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.namePrimary || item.nameNative || 'Unknown Character',
      secondaryTitle: item.nameNative || null,
      coverImage: item.image || null,
      format: item.gender || 'Character',
      status: item.age || null,
      isAdult: false,
    }));

    return { items, totalCount };
  }

  private async discoverActor(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { search } = query;
    const where: Prisma.AquilaActorV2WhereInput = {};

    if (search) {
      const searchStr = search.trim();
      const words = searchStr.split(/\s+/).filter(Boolean);

      const searchConditions: Prisma.AquilaActorV2WhereInput[] = [
        { namePrimary: { contains: searchStr, mode: 'insensitive' } },
        { nameNative: { contains: searchStr, mode: 'insensitive' } },
        { nameAlternative: { hasSome: [searchStr] } },
      ];

      if (words.length > 1) {
        searchConditions.push({
          AND: words.map((word) => ({
            OR: [
              { namePrimary: { contains: word, mode: 'insensitive' } },
              { nameNative: { contains: word, mode: 'insensitive' } },
              { nameAlternative: { hasSome: [word] } },
            ],
          })),
        });
      }

      where.OR = searchConditions;
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaActorV2.findMany({
        where,
        skip,
        take: limit,
        orderBy: { namePrimary: 'asc' },
      }),
      this.prisma.client.aquilaActorV2.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.namePrimary || item.nameNative || 'Unknown Actor',
      secondaryTitle: item.nameNative || null,
      coverImage: item.image || null,
      format: 'Actor',
      status: null,
      isAdult: false,
    }));

    return { items, totalCount };
  }
}

