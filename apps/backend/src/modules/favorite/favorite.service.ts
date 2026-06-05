import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { Favorite, FavoriteType } from '@runa/database';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, dto: CreateFavoriteDto): Promise<Favorite> {
    const existing = await this.prisma.client.favorite.findUnique({
      where: {
        userId_type_mediaId: {
          userId,
          type: dto.type,
          mediaId: dto.mediaId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.client.favorite.create({
      data: {
        userId,
        type: dto.type,
        mediaId: dto.mediaId,
      },
    });
  }

  async removeFavorite(
    userId: string,
    type: FavoriteType,
    mediaId: string,
  ): Promise<{ success: boolean }> {
    try {
      await this.prisma.client.favorite.delete({
        where: {
          userId_type_mediaId: {
            userId,
            type,
            mediaId,
          },
        },
      });
      return { success: true };
    } catch {
      throw new NotFoundException('Favorite not found');
    }
  }

  async getFavorites(userId: string, type?: FavoriteType): Promise<Favorite[]> {
    return this.prisma.client.favorite.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getFavoriteStatus(
    userId: string,
    type: FavoriteType,
    mediaId: string,
  ): Promise<{ favorited: boolean }> {
    const favorite = await this.prisma.client.favorite.findUnique({
      where: {
        userId_type_mediaId: {
          userId,
          type,
          mediaId,
        },
      },
    });

    return { favorited: !!favorite };
  }

  async getFavoritesByUsername(username: string, type?: FavoriteType) {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException(`User ${username} not found`);
    }
    const favorites = await this.prisma.client.favorite.findMany({
      where: {
        userId: user.id,
        ...(type ? { type } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const resolvedFavorites: {
      id: string;
      userId: string;
      type: FavoriteType;
      mediaId: string;
      createdAt: Date;
      title: string;
      image: string;
    }[] = [];
    for (const fav of favorites) {
      let mediaDetails: any = null;
      const mediaIdNum = Number(fav.mediaId);

      try {
        if (fav.type === FavoriteType.ANIME) {
          mediaDetails = await this.prisma.client.aquilaAnime.findUnique({
            where: { anilistId: mediaIdNum },
          });
        } else if (fav.type === FavoriteType.MANGA) {
          mediaDetails = await this.prisma.client.aquilaManga.findUnique({
            where: { anilistId: mediaIdNum },
          });
        } else if (fav.type === FavoriteType.TV) {
          mediaDetails = await this.prisma.client.aquilaTv.findUnique({
            where: { tvdbId: mediaIdNum },
          });
        } else if (fav.type === FavoriteType.MOVIE) {
          mediaDetails = await this.prisma.client.aquilaMovie.findUnique({
            where: { tvdbId: mediaIdNum },
          });
        } else if (fav.type === FavoriteType.GAME) {
          mediaDetails = await this.prisma.client.aquilaGame.findUnique({
            where: { rawgId: mediaIdNum },
          });
        } else if (fav.type === FavoriteType.BOOK) {
          mediaDetails = await this.prisma.client.aquilaBook.findUnique({
            where: { openLibraryId: fav.mediaId },
          });
        }
      } catch (err) {
        // Silently skip on error
      }

      let title = '';
      let image = '';

      if (mediaDetails) {
        if (fav.type === FavoriteType.ANIME || fav.type === FavoriteType.MANGA) {
          title = mediaDetails.titleEnglish ?? mediaDetails.titleRomaji ?? mediaDetails.titleNative ?? '';
          image = mediaDetails.coverImageLarge ?? '';
        } else if (fav.type === FavoriteType.TV) {
          title = mediaDetails.titleEnglish ?? mediaDetails.titleRomaji ?? '';
          image = mediaDetails.coverImage ?? '';
        } else if (fav.type === FavoriteType.MOVIE) {
          title = mediaDetails.titleEnglish ?? mediaDetails.titleRomaji ?? '';
          image = mediaDetails.coverImage ?? '';
        } else if (fav.type === FavoriteType.GAME) {
          title = mediaDetails.titleString ?? '';
          image = mediaDetails.coverImage ?? '';
        } else if (fav.type === FavoriteType.BOOK) {
          title = mediaDetails.titleString ?? '';
          image = mediaDetails.coverImage ?? '';
        }
      }

      resolvedFavorites.push({
        id: fav.id,
        userId: fav.userId,
        type: fav.type,
        mediaId: fav.mediaId,
        createdAt: fav.createdAt,
        title,
        image,
      });
    }

    return resolvedFavorites;
  }
}
