import { Injectable } from '@nestjs/common';

import { Favorite, FavoriteType } from '@runa/database';

import { PrismaService } from '../../providers/database/prisma.service';

@Injectable()
export class FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<Favorite | null> {
    return this.prisma.client.favorite.findUnique({
      where: { userId_type_mediaId: { userId, type, mediaId: targetId } },
    });
  }

  async create(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<Favorite> {
    return this.prisma.client.favorite.create({
      data: { userId, type, mediaId: targetId },
    });
  }

  async delete(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<void> {
    await this.prisma.client.favorite.delete({
      where: { userId_type_mediaId: { userId, type, mediaId: targetId } },
    });
  }

  async findManyByUserId(
    userId: string,
    type?: FavoriteType,
  ): Promise<Favorite[]> {
    return this.prisma.client.favorite.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
  }

  async resolveMedia(type: FavoriteType, mediaId: string) {
    const num = Number(mediaId);

    switch (type) {
      case FavoriteType.ANIME:
        return this.prisma.client.aquilaAnimeV2.findUnique({
          where: { id: num },
          select: {
            titlePrimary: true,
            titleSecondary: true,
            titleNative: true,
            coverImage: true,
          },
        });
      case FavoriteType.MANGA:
        return this.prisma.client.aquilaMangaV2.findUnique({
          where: { id: num },
          select: {
            titlePrimary: true,
            titleSecondary: true,
            titleNative: true,
            coverImage: true,
          },
        });
      case FavoriteType.TV:
        return this.prisma.client.aquilaTvV2.findUnique({
          where: { id: num },
          select: { titlePrimary: true, coverImage: true },
        });
      case FavoriteType.MOVIE:
        return this.prisma.client.aquilaMovieV2.findUnique({
          where: { id: num },
          select: { titlePrimary: true, coverImage: true },
        });
      case FavoriteType.GAME:
        return this.prisma.client.aquilaGameV2.findUnique({
          where: { id: num },
          select: { titlePrimary: true, coverImage: true },
        });
      case FavoriteType.BOOK:
        return this.prisma.client.aquilaBookV2.findUnique({
          where: { id: num },
          select: { titlePrimary: true, coverImage: true },
        });
      case FavoriteType.USER:
        return this.prisma.client.user.findUnique({
          where: { id: mediaId },
          select: { username: true, displayName: true, avatarUrl: true },
        });
      case FavoriteType.CHARACTER:
        return this.prisma.client.aquilaCharacterV2.findUnique({
          where: { id: num },
          select: {
            namePrimary: true,
            nameNative: true,
            image: true,
          },
        });
      case FavoriteType.ACTOR:
      case FavoriteType.STAFF:
        return this.prisma.client.aquilaActorV2.findUnique({
          where: { id: num },
          select: {
            namePrimary: true,
            nameNative: true,
            image: true,
          },
        });
      case FavoriteType.STUDIO:
        return this.prisma.client.aquilaStudioV2.findUnique({
          where: { id: num },
          select: {
            name: true,
          },
        });
      case FavoriteType.MUSIC:
        return null;
      default:
        return null;
    }
  }
}
