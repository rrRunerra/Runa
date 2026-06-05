import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRawgId(rawgId: number) {
    return this.prisma.client.aquilaGame.findUnique({
      where: { rawgId },
    });
  }

  async upsert(
    rawgId: number,
    data: Prisma.AquilaGameCreateInput | Prisma.AquilaGameUpdateInput,
  ) {
    return this.prisma.client.aquilaGame.upsert({
      where: { rawgId },
      update: data,
      create: data as Prisma.AquilaGameCreateInput,
    });
  }

  toMedia(dbGame: any): Media {
    return {
      id: dbGame.rawgId.toString(),
      title: {
        romaji: dbGame.titleString,
        english: dbGame.titleString,
        native: null,
      },
      coverImage: {
        extraLarge: dbGame.coverImage,
        large: dbGame.coverImage,
      },
      bannerImage: null,
      format: 'Game',
      status: 'Released',
      description: dbGame.description || '',
      startDate: dbGame.releasedYear
        ? {
            year: dbGame.releasedYear,
            month: dbGame.releasedMonth,
            day: dbGame.releasedDay,
          }
        : undefined,
      genres: [
        ...(dbGame.platforms || []).map((p: string) => `Platform: ${p}`),
        ...(dbGame.genres || []),
      ],
      studios: dbGame.developers?.map((name: string) => ({ name })) || [],
      averageScore: dbGame.averageScore,
      popularity: dbGame.popularity,
    };
  }
}
