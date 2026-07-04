import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
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
    const result = await this.prisma.client.aquilaAnime.findUnique({
      where: {
        id,
      },
      include: {
        animeCharacters: {
          include: {
            character: true,
          },
        },
        animeRelations: {
          include: {
            relatedAnime: true,
            relatedManga: true,
          },
        },
        animeStudios: {
          include: {
            studio: true,
          },
        },
        relatedAnimeRelations: {
          include: {
            anime: true,
            manga: true,
          },
        },
      },
    });

    return result as unknown as AnimeEntity | null;
  }

  public async findByAnilistId(anilistId: number): Promise<any | null> {
    return this.prisma.client.aquilaAnime.findUnique({
      where: { anilistId },
      select: {
        id: true,
        anilistId: true,
        titleRomaji: true,
        coverImageLarge: true,
      },
    });
  }

  public async upsert(
    anilistId: number,
    data: {
      malId?: number | null;
      titleRomaji: string;
      coverImageLarge?: string | null;
    },
  ): Promise<any> {
    return this.prisma.client.aquilaAnime.upsert({
      where: { anilistId },
      update: {},
      create: {
        anilistId,
        malId: data.malId ?? null,
        titleRomaji: data.titleRomaji,
        coverImageLarge: data.coverImageLarge ?? null,
        format: 'UNKNOWN',
        status: 'NOT_YET_RELEASED',
      },
    });
  }
}
