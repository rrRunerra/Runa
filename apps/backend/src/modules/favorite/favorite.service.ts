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
}
