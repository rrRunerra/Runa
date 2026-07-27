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
    const numericId = typeof id === 'number' ? id : Number(id);
    const result = await this.prisma.client.aquilaAnime.findUnique({
      where: {
        id: numericId,
      },
      include: {
        animeCharacters: {
          include: {
            character: true,
            voiceActor: true,
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
    const existing = await this.prisma.client.aquilaAnime.findUnique({
      where: { anilistId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      return existing;
    }

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

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaAnime.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titleEnglish: true,
          titleRomaji: true,
          titleNative: true,
          genres: true,
        },
      });

      if (!target) return [];

      const targetTitle = target.titleEnglish || target.titleRomaji || target.titleNative || '';
      const firstWord = targetTitle.trim().split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const titleKey = firstWord && firstWord.length >= 2 ? firstWord : null;

      const whereConditions: any[] = [];
      if (target.genres && target.genres.length > 0) {
        whereConditions.push({ genres: { hasSome: target.genres } });
      }
      if (titleKey) {
        whereConditions.push({ titleEnglish: { contains: titleKey, mode: 'insensitive' } });
        whereConditions.push({ titleRomaji: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaAnime.findMany({
        where: {
          id: { not: numericId },
          ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
        },
        select: {
          id: true,
          titleEnglish: true,
          titleRomaji: true,
          titleNative: true,
          coverImageLarge: true,
          genres: true,
          averageScore: true,
          format: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaAnime.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titleEnglish: true,
            titleRomaji: true,
            titleNative: true,
            coverImageLarge: true,
            genres: true,
            averageScore: true,
            format: true,
          },
          take: 12,
        });

        const existingIds = new Set(candidates.map((c) => c.id));
        for (const fb of fallback) {
          if (!existingIds.has(fb.id)) {
            candidates.push(fb);
          }
        }
      }

      const scored = candidates.map((item) => {
        let score = 0;
        const itemTitle = (item.titleEnglish || item.titleRomaji || item.titleNative || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.genres && item.genres) {
          const overlap = item.genres.filter((g) => target.genres.includes(g)).length;
          score += overlap * 3;
        }
        if (item.averageScore) {
          score += item.averageScore / 20;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titleEnglish || item.titleRomaji || item.titleNative || 'Untitled',
        coverImage: item.coverImageLarge || null,
        type: 'ANIME',
      }));
    } catch (err) {
      this.logger.error(`Anime findSimilar error: ${err}`);
      return [];
    }
  }
}


