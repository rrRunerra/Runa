import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MangaEntity, MangaSearchEntity } from './manga.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class MangaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'MaRpstry-';
  private readonly logger = new Logger(MangaRepository.name);

  public async search(name: string): Promise<MangaSearchEntity[]> {
    this.logger.debug(`Searching for manga: ${name} in local db`);
    try {
      const query = name.trim().split(/\s+/).join(' & ');

      const data = await this.prisma.client.aquilaManga.findMany({
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
        message: 'Failed to fetch manga from db',
      });
    }
  }

  public async find(id: number): Promise<MangaEntity | null> {
    const result = await this.prisma.client.aquilaManga.findUnique({
      where: {
        id,
      },
      include: {
        mangaCharacters: {
          include: {
            character: true,
          },
        },
        mangaMangaRelations: {
          include: {
            relatedAnime: true,
            relatedManga: true,
          },
        },
        mangaRelatedMangaRelations: {
          include: {
            anime: true,
            manga: true,
          },
        },
        mangaStudios: {
          include: {
            studio: true,
          },
        },
      },
    });

    return result as unknown as MangaEntity | null;
  }
}
