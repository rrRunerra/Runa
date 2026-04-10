import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import ListEntity from './entities/ListEntity';
import { $Enums } from '@runa/database';

@Injectable()
export class ListService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(ListService.name);

  public async getAnimeList(userId: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaAnimeUserList.findMany({
      where: {
        userId: userId,
      },
      select: {
        animeId: true,
        status: true,
        progress: true,
        score: true,
        updatedAt: true,
        createdAt: true,
        anime: {
          select: {
            titleEnglish: true,
            titleRomaji: true,
            titleNative: true,
            coverImageLarge: true,
            episodes: true,
            format: true,
          },
        },
      },
    });

    const mappedList: ListEntity[] = list.map((item) => {
      return {
        id: item.animeId,
        title:
          item.anime.titleEnglish ??
          item.anime.titleRomaji ??
          item.anime.titleNative ??
          '',
        score: item.score,
        progress: item.progress,
        episodes: item.anime.episodes,
        image: item.anime.coverImageLarge ?? '',
        format: item.anime.format,
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
      };
    });

    return mappedList;
  }

  public async getAnimeListEntry(userId: string, animeId: number) {
    return this.prisma.client.aquilaAnimeUserList.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
    });
  }

  public async upsertAnimeList(body: {
    userId: string;
    animeId: number;
    status?: $Enums.AnimeListStatus;
    progress?: number;
    score?: number;
    startDate?: number;
    endDate?: number;
    notes?: string;
    rewatched?: number;
  }): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaAnimeUserList.upsert({
        where: {
          userId_animeId: {
            userId: body.userId,
            animeId: body.animeId,
          },
        },
        update: {
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
        },
        create: {
          userId: body.userId,
          animeId: body.animeId,
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
        },
      });
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update anime list',
        error: error,
      };
    }

    return {
      success: true,
      message: 'Anime list updated successfully',
    };
  }

  public async deleteAnimeList(
    userId: string,
    animeId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaAnimeUserList.delete({
        where: {
          userId_animeId: {
            userId,
            animeId,
          },
        },
      });
      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete anime from list',
        error: error,
      };
    }
  }
}
