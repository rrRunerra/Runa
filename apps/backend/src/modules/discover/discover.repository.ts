import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeFormat, AnimeStatus, MangaFormat, MangaStatus, Prisma } from '@runa/database';
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
        const data = await this.prisma.client.aquilaAnime.findMany({
          where: { startDateYear: { not: null } },
          select: { startDateYear: true },
          distinct: ['startDateYear'],
          orderBy: { startDateYear: 'desc' },
        });
        years = data.map((d) => d.startDateYear);
      } else if (type === 'manga') {
        const data = await this.prisma.client.aquilaManga.findMany({
          where: { startDateYear: { not: null } },
          select: { startDateYear: true },
          distinct: ['startDateYear'],
          orderBy: { startDateYear: 'desc' },
        });
        years = data.map((d) => d.startDateYear);
      } else if (type === 'movie') {
        const data = await this.prisma.client.aquilaMovie.findMany({
          where: { startDateYear: { not: null } },
          select: { startDateYear: true },
          distinct: ['startDateYear'],
          orderBy: { startDateYear: 'desc' },
        });
        years = data.map((d) => d.startDateYear);
      } else if (type === 'tv') {
        const data = await this.prisma.client.aquilaTv.findMany({
          where: { startDateYear: { not: null } },
          select: { startDateYear: true },
          distinct: ['startDateYear'],
          orderBy: { startDateYear: 'desc' },
        });
        years = data.map((d) => d.startDateYear);
      } else if (type === 'game') {
        const data = await this.prisma.client.aquilaGame.findMany({
          where: { releasedYear: { not: null } },
          select: { releasedYear: true },
          distinct: ['releasedYear'],
          orderBy: { releasedYear: 'desc' },
        });
        years = data.map((d) => d.releasedYear);
      } else if (type === 'book') {
        const data = await this.prisma.client.aquilaBook.findMany({
          where: { publishedYear: { not: null } },
          select: { publishedYear: true },
          distinct: ['publishedYear'],
          orderBy: { publishedYear: 'desc' },
        });
        years = data.map((d) => d.publishedYear);
      }

      return years.filter((y): y is number => y !== null);
    } catch (err: any) {
      this.logger.error(`Failed to get distinct years: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTGDY001`, {
        message: 'Failed to get distinct years from database',
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
        const data = await this.prisma.client.aquilaMovie.findMany({
          where: { status: { not: null } },
          select: { status: true },
          distinct: ['status'],
          orderBy: { status: 'asc' },
        });
        return data.map((d) => d.status as string).filter(Boolean);
      } else if (type === 'tv') {
        const data = await this.prisma.client.aquilaTv.findMany({
          where: { status: { not: null } },
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
    const where: Prisma.AquilaAnimeWhereInput = {};

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
      const searchStr = search.trim().split(/\s+/).join(' & ');
      where.OR = [
        { titleEnglish: { search: searchStr } },
        { titleRomaji: { search: searchStr } },
      ];
    }

    let orderBy: Prisma.AquilaAnimeOrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ startDateYear: 'desc' }, { startDateMonth: 'desc' }, { startDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ startDateYear: 'asc' }, { startDateMonth: 'asc' }, { startDateDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titleEnglish: 'asc' }, { titleRomaji: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaAnime.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaAnime.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titleEnglish || item.titleRomaji || '',
      secondaryTitle: item.titleRomaji || null,
      coverImage: item.coverImageLarge || null,
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
    const where: Prisma.AquilaMangaWhereInput = {};

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
      const searchStr = search.trim().split(/\s+/).join(' & ');
      where.OR = [
        { titleEnglish: { search: searchStr } },
        { titleRomaji: { search: searchStr } },
      ];
    }

    let orderBy: Prisma.AquilaMangaOrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ startDateYear: 'desc' }, { startDateMonth: 'desc' }, { startDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ startDateYear: 'asc' }, { startDateMonth: 'asc' }, { startDateDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titleEnglish: 'asc' }, { titleRomaji: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaManga.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaManga.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titleEnglish || item.titleRomaji || '',
      secondaryTitle: item.titleRomaji || null,
      coverImage: item.coverImageLarge || null,
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
    const where: Prisma.AquilaMovieWhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.startDateYear = Number(year);
    if (status) where.status = status;
    if (search) {
      const searchStr = search.trim().split(/\s+/).join(' & ');
      where.OR = [
        { titleEnglish: { search: searchStr } },
        { titleRomaji: { search: searchStr } },
      ];
    }

    let orderBy: Prisma.AquilaMovieOrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ startDateYear: 'desc' }, { startDateMonth: 'desc' }, { startDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ startDateYear: 'asc' }, { startDateMonth: 'asc' }, { startDateDay: 'asc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titleEnglish: 'asc' }, { titleRomaji: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaMovie.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaMovie.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titleEnglish || item.titleRomaji || '',
      secondaryTitle: item.titleRomaji || null,
      coverImage: item.coverImage || null,
      format: 'MOVIE',
      status: item.status,
      isAdult: false,
      year: item.startDateYear,
      averageScore: null,
    }));

    return { items, totalCount };
  }

  private async discoverTv(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, status, search, sort, addedWithin } = query;
    const where: Prisma.AquilaTvWhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.startDateYear = Number(year);
    if (status) where.status = status;
    if (search) {
      const searchStr = search.trim().split(/\s+/).join(' & ');
      where.OR = [
        { titleEnglish: { search: searchStr } },
        { titleRomaji: { search: searchStr } },
      ];
    }

    let orderBy: Prisma.AquilaTvOrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ startDateYear: 'desc' }, { startDateMonth: 'desc' }, { startDateDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ startDateYear: 'asc' }, { startDateMonth: 'asc' }, { startDateDay: 'asc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titleEnglish: 'asc' }, { titleRomaji: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaTv.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaTv.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titleEnglish || item.titleRomaji || '',
      secondaryTitle: item.titleRomaji || null,
      coverImage: item.coverImage || null,
      format: 'TV',
      status: item.status,
      isAdult: false,
      year: item.startDateYear,
      averageScore: null,
    }));

    return { items, totalCount };
  }

  private async discoverGame(
    query: DiscoverQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: DiscoverItemEntity[]; totalCount: number }> {
    const { year, search, sort, addedWithin } = query;
    const where: Prisma.AquilaGameWhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.releasedYear = Number(year);
    if (search) {
      const searchStr = search.trim().split(/\s+/).join(' & ');
      where.OR = [
        { titleString: { search: searchStr } },
      ];
    }

    let orderBy: Prisma.AquilaGameOrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ releasedYear: 'desc' }, { releasedMonth: 'desc' }, { releasedDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ releasedYear: 'asc' }, { releasedMonth: 'asc' }, { releasedDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titleString: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaGame.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaGame.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titleString || item.titleNative || '',
      secondaryTitle: item.titleNative || null,
      coverImage: item.coverImage || item.backgroundImage || null,
      format: 'GAME',
      status: null,
      isAdult: false,
      year: item.releasedYear,
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
    const where: Prisma.AquilaBookWhereInput = {};

    if (addedWithin) {
      const days = Number(addedWithin);
      if (!isNaN(days)) {
        const createdAfter = new Date();
        createdAfter.setDate(createdAfter.getDate() - days);
        where.createdAt = { gte: createdAfter };
      }
    }

    if (year) where.publishedYear = Number(year);
    if (search) {
      const searchStr = search.trim().split(/\s+/).join(' & ');
      where.OR = [
        { titleString: { search: searchStr } },
      ];
    }

    let orderBy: Prisma.AquilaBookOrderByWithRelationInput[] = [];
    if (sort === 'latest') {
      orderBy = [{ publishedYear: 'desc' }, { publishedMonth: 'desc' }, { publishedDay: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ publishedYear: 'asc' }, { publishedMonth: 'asc' }, { publishedDay: 'asc' }];
    } else if (sort === 'score') {
      orderBy = [{ averageRating: 'desc' }, { id: 'desc' }];
    } else if (sort === 'alphabetical') {
      orderBy = [{ titleString: 'asc' }];
    } else {
      orderBy = [{ id: 'desc' }];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaBook.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaBook.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.titleString || '',
      secondaryTitle: item.subtitle || null,
      coverImage: item.coverImage || null,
      format: 'BOOK',
      status: null,
      isAdult: false,
      year: item.publishedYear,
      averageScore: item.averageRating || null,
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
          this.prisma.client.aquilaAnimeUserList.findMany({
            where: { username: username.toLowerCase(), status: { in: ['WATCHING', 'PLANNING'] } },
            include: { anime: true },
          }),
          this.prisma.client.aquilaMangaUserList.findMany({
            where: { username: username.toLowerCase(), status: { in: ['READING', 'PLANNING'] } },
            include: { manga: true },
          }),
          this.prisma.client.aquilaTvUserList.findMany({
            where: { username: username.toLowerCase(), status: { in: ['WATCHING', 'PLANNING'] } },
            include: { tv: true },
          }),
          this.prisma.client.aquilaGameUserList.findMany({
            where: { username: username.toLowerCase(), status: { in: ['PLAYING', 'PLANNING'] } },
            include: { game: true },
          }),
          this.prisma.client.aquilaBookUserList.findMany({
            where: { username: username.toLowerCase(), status: { in: ['READING', 'PLANNING'] } },
            include: { book: true },
          }),
          this.prisma.client.aquilaMovieUserList.findMany({
            where: { username: username.toLowerCase(), status: { in: ['PLANNING'] } },
            include: { movie: true },
          }),
        ]);

        animeList = animeUserLists.map((l) => l.anime);
        mangaList = mangaUserLists.map((l) => l.manga);
        tvList = tvUserLists.map((l) => l.tv);
        gameList = gameUserLists.map((l) => l.game);
        bookList = bookUserLists.map((l) => l.book);
        movieList = movieUserLists.map((l) => l.movie);
      } else {
        const [animes, mangas, tvs, movies, games, books] = await Promise.all([
          this.prisma.client.aquilaAnime.findMany({
            where: {
              OR: [
                { startDateYear: { gte: startYear, lte: endYear } },
                { status: 'RELEASING' },
              ],
            },
          }),
          this.prisma.client.aquilaManga.findMany({
            where: { startDateYear: { gte: startYear, lte: endYear } },
          }),
          this.prisma.client.aquilaTv.findMany(),
          this.prisma.client.aquilaMovie.findMany({
            where: { startDateYear: { gte: startYear, lte: endYear } },
          }),
          this.prisma.client.aquilaGame.findMany({
            where: { releasedYear: { gte: startYear, lte: endYear } },
          }),
          this.prisma.client.aquilaBook.findMany({
            where: { publishedYear: { gte: startYear, lte: endYear } },
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
    const where: Prisma.AquilaCharacterWhereInput = {};

    if (search) {
      const searchStr = search.trim();
      const words = searchStr.split(/\s+/).filter(Boolean);

      const searchConditions: Prisma.AquilaCharacterWhereInput[] = [
        { nameFirst: { contains: searchStr, mode: 'insensitive' } },
        { nameMiddle: { contains: searchStr, mode: 'insensitive' } },
        { nameLast: { contains: searchStr, mode: 'insensitive' } },
        { nameNative: { contains: searchStr, mode: 'insensitive' } },
        { nameAlternative: { hasSome: [searchStr] } },
      ];

      if (words.length > 1) {
        searchConditions.push({
          AND: words.map((word) => ({
            OR: [
              { nameFirst: { contains: word, mode: 'insensitive' } },
              { nameMiddle: { contains: word, mode: 'insensitive' } },
              { nameLast: { contains: word, mode: 'insensitive' } },
              { nameNative: { contains: word, mode: 'insensitive' } },
              { nameAlternative: { hasSome: [word] } },
            ],
          })),
        });
      }

      where.OR = searchConditions;
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaCharacter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nameFirst: 'asc' },
      }),
      this.prisma.client.aquilaCharacter.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: [item.nameFirst, item.nameMiddle, item.nameLast].filter(Boolean).join(' ') || item.nameNative || 'Unknown Character',
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
    const where: Prisma.AquilaActorWhereInput = {};

    if (search) {
      const searchStr = search.trim();
      const words = searchStr.split(/\s+/).filter(Boolean);

      const searchConditions: Prisma.AquilaActorWhereInput[] = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { personName: { contains: searchStr, mode: 'insensitive' } },
      ];

      if (words.length > 1) {
        searchConditions.push({
          AND: words.map((word) => ({
            OR: [
              { name: { contains: word, mode: 'insensitive' } },
              { personName: { contains: word, mode: 'insensitive' } },
            ],
          })),
        });
      }

      where.OR = searchConditions;
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaActor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.client.aquilaActor.count({ where }),
    ]);

    const items = data.map((item) => ({
      id: item.id,
      title: item.name || item.personName || 'Unknown Actor',
      secondaryTitle: item.personName || null,
      coverImage: item.image || null,
      format: item.peopleType || 'Actor',
      status: null,
      isAdult: false,
    }));

    return { items, totalCount };
  }
}

