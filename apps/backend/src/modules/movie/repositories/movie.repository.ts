import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class MovieRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTvdbId(tvdbId: number) {
    return this.prisma.client.aquilaMovie.findUnique({
      where: { tvdbId },
    });
  }

  async upsert(
    tvdbId: number,
    data: Prisma.AquilaMovieCreateInput | Prisma.AquilaMovieUpdateInput,
  ) {
    return this.prisma.client.aquilaMovie.upsert({
      where: { tvdbId },
      update: data,
      create: data as Prisma.AquilaMovieCreateInput,
    });
  }

  toMedia(dbMovie: any): Media {
    return {
      id: dbMovie.tvdbId?.toString() || dbMovie.id.toString(),
      title: {
        romaji: dbMovie.titleRomaji,
        english: dbMovie.titleEnglish,
      },
      coverImage: {
        large: dbMovie.coverImage,
      },
      bannerImage: dbMovie.bannerImage,
      format: 'MOVIE',
      status: dbMovie.status,
      description: dbMovie.description || '',
      runtime: dbMovie.runtime,
      genres: dbMovie.genres || [],
      studios: dbMovie.studios?.map((name: string) => ({ name })) || [],
      characters: dbMovie.cast || [],
    };
  }
}
