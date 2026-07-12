import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeFormat, AnimeStatus, MangaFormat, MangaStatus, Prisma } from '@runa/database';
import { rrError } from 'src/providers/error';
import { DiscoverItemEntity } from './discover.entity';
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
    const { year, format, status, search, sort } = query;
    const where: Prisma.AquilaAnimeWhereInput = {};

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
    const { year, format, status, search, sort } = query;
    const where: Prisma.AquilaMangaWhereInput = {};

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
    const { year, status, search, sort } = query;
    const where: Prisma.AquilaMovieWhereInput = {};

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
    const { year, status, search, sort } = query;
    const where: Prisma.AquilaTvWhereInput = {};

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
    const { year, search, sort } = query;
    const where: Prisma.AquilaGameWhereInput = {};

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
    const { year, search, sort } = query;
    const where: Prisma.AquilaBookWhereInput = {};

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
}
