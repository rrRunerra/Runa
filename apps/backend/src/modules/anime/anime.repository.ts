import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../common/types/types';
import { AnimeEntity, AnimeSearchEntity } from './anime.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class AnimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'AeRpstry-';
  private readonly logger = new Logger(AnimeRepository.name);

  public async search(name: string): Promise<AnimeSearchEntity[]> {
    this.logger.debug(`Searching for anime: ${name} in local db`);
    try {
      const query = name.trim().split(/\s+/).join(' & ');

      const data = await this.prisma.client.aquilaAnime.findMany({
        where: {
          OR: [
            {
              titleEnglish: {
                search: query,
              },
            },
            {
              titleRomaji: {
                search: query,
              },
            },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: item.titleEnglish || item.titleRomaji || '',
        secondaryTitle: item.titleRomaji || null,
        coverImage: item.coverImageLarge || null,
        averageScore: item.averageScore || null,
        isAdult: item.isAdult || false,
        format: item.format,
        status: item.status,
      }));
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch anime from db',
      });
    }
  }

  public async find(id: number): Promise<AnimeEntity | null> {
    return await this.prisma.client.aquilaAnime.findUnique({
      where: {
        id,
      },
      include: {
        animeCharacters: true,
        animeRelations: true,
        animeStudios: true,
        relatedAnimeRelations: true,
      },
    });
  }

  async findByAnilistId(anilistId: number): Promise<any> {
    return this.prisma.client.aquilaAnime.findUnique({
      where: { anilistId },
    });
  }

  async upsert(
    anilistId: number,
    data: Prisma.AquilaAnimeCreateInput | Prisma.AquilaAnimeUpdateInput,
  ): Promise<any> {
    return this.prisma.client.aquilaAnime.upsert({
      where: { anilistId },
      update: data,
      create: data as Prisma.AquilaAnimeCreateInput,
    });
  }

  toMedia(dbAnime: any): Media {
    return {
      id: dbAnime.anilistId?.toString() || dbAnime.id.toString(),
      anilistId: dbAnime.anilistId,
      malId: dbAnime.malId,
      title: {
        romaji: dbAnime.titleRomaji,
        english: dbAnime.titleEnglish,
        native: dbAnime.titleNative,
      },
      coverImage: {
        extraLarge: dbAnime.coverImageLarge,
        large: dbAnime.coverImageLarge,
      },
      bannerImage: dbAnime.bannerImage,
      format: dbAnime.format,
      status: dbAnime.status,
      description: dbAnime.description || '',
      startDate: dbAnime.startDateYear
        ? {
            year: dbAnime.startDateYear,
            month: dbAnime.startDateMonth,
            day: dbAnime.startDateDay,
          }
        : undefined,
      endDate: dbAnime.endDateYear
        ? {
            year: dbAnime.endDateYear,
            month: dbAnime.endDateMonth,
            day: dbAnime.endDateDay,
          }
        : undefined,
      season: dbAnime.season,
      seasonYear: dbAnime.seasonYear,
      episodes: dbAnime.episodes,
      duration: dbAnime.duration,
      genres: dbAnime.genres || [],
      source: dbAnime.source,
      tags: dbAnime.tags,
      // relations: dbAnime.relations,
      // characters: dbAnime.characters,
      // studios: dbAnime.studios?.map((name: string) => ({ name })),
      averageScore: dbAnime.averageScore,
      // popularity: dbAnime.popularity,
      favourites: dbAnime.favourites,
      // trending: dbAnime.trending,
      // meanScore: dbAnime.meanScore,
      synonyms: dbAnime.synonyms || [],
      hashtag: dbAnime.hashtag,
      countryOfOrigin: dbAnime.countryOfOrigin,
      nextAiringEpisode: dbAnime.nextAiringEpisode,
      trailers: dbAnime.trailers,
    };
  }
}
