import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import { TvEntity, TvSearchEntity } from './tv.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class TvRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'TvRpstry-';
  private readonly logger = new Logger(TvRepository.name);

  public async search(name: string): Promise<TvSearchEntity[]> {
    this.logger.debug(`Searching for TV series: ${name} in local db`);
    try {
      const query = name.trim().split(/\s+/).join(' & ');

      const data = await this.prisma.client.aquilaTv.findMany({
        where: {
          OR: [
            { titleEnglish: { search: query } },
            { titleRomaji: { search: query } },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: item.titleEnglish || item.titleRomaji || '',
        secondaryTitle: item.titleRomaji || null,
        coverImage: item.coverImage || null,
        averageScore: null,
        isAdult: false,
        format: 'TV',
        status: item.status || 'RELEASED',
      }));
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch TV series from db',
      });
    }
  }

  public async find(id: number): Promise<TvEntity | null> {
    const result = await this.prisma.client.aquilaTv.findUnique({
      where: { id },
      include: {
        tvActors: {
          include: { actor: true },
        },
      },
    });

    if (!result) return null;

    return {
      id: result.id,
      tvdbId: result.tvdbId,
      tmdbId: result.tmdbId,
      imdbId: result.imdbId,
      titleEnglish: result.titleEnglish,
      titleRomaji: result.titleRomaji,
      titleNative: result.titleNative,
      coverImage: result.coverImage,
      bannerImage: result.bannerImage,
      description: result.description,
      slug: result.slug,
      status: result.status,
      tvType: result.tvType,
      averageRuntime: result.averageRuntime,
      firstAired: result.firstAired,
      genres: result.genres,
      studios: result.studios,
      tags: result.tags as Record<string, any> | null,
      characters:
        result.tvActors?.map((ta) => ({
          name: ta.role || '',
          personName: ta.actor.personName || '',
          image: ta.actor.image || null,
          role: ta.actor.peopleType || null,
        })) ?? null,
      seasons: (result.seasons ?? null) as TvEntity['seasons'],
      trailers: (result.trailers ?? null) as TvEntity['trailers'],
      originalCountry: result.originalCountry,
      originalLanguage: result.originalLanguage,
      contentRating: result.contentRating,
      locked: result.locked,
      updatedAt: result.updatedAt,
    };
  }

  public async findByTvdbId(tvdbId: number): Promise<any> {
    return this.prisma.client.aquilaTv.findUnique({
      where: { tvdbId },
    });
  }

  public async upsert(
    tvdbId: number,
    data: Prisma.AquilaTvCreateInput,
  ): Promise<any> {
    return this.prisma.client.aquilaTv.upsert({
      where: { tvdbId },
      update: data,
      create: data,
    });
  }
}
